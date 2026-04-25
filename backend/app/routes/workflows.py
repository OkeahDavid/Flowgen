"""Workflow endpoints: create, execute, stream, status, list, delete."""

import asyncio
import json
import logging
from datetime import datetime
from typing import Dict, Any, Optional
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Request, Header
from fastapi.responses import StreamingResponse

from agent_framework.openai import OpenAIChatCompletionClient

from app.config import OPENAI_API_KEY, OPENAI_MODEL, DEMO_TOKEN
from app.database import SessionLocal
from app.schemas import WorkflowRequest, WorkflowResponse
from app.agents.builder import build_workflow
from app.agents.configs import AGENT_CONFIGS
from app.services.workflow_service import WorkflowService

logger = logging.getLogger(__name__)

router = APIRouter()


def _create_openai_client() -> OpenAIChatCompletionClient:
    if not OPENAI_API_KEY or OPENAI_API_KEY.startswith("your_"):
        raise HTTPException(status_code=500, detail="OpenAI API key not configured")
    return OpenAIChatCompletionClient(model=OPENAI_MODEL, api_key=OPENAI_API_KEY)


def _verify_demo_token(authorization: Optional[str] = Header(None)):
    if not DEMO_TOKEN:
        return True
    if not authorization:
        raise HTTPException(status_code=401, detail="Authorization header required.")
    token = authorization.replace("Bearer ", "").strip()
    if token != DEMO_TOKEN:
        raise HTTPException(status_code=401, detail="Invalid demo token.")
    return True


# ── Agent types ──────────────────────────────────────────────────────────────

@router.get("/agent-types")
async def get_agent_types():
    return AGENT_CONFIGS


# ── Create + fire-and-forget execution ───────────────────────────────────────

@router.post("/workflow/create", response_model=WorkflowResponse)
async def create_workflow_endpoint(
    request: WorkflowRequest,
    req: Request,
    _: bool = Depends(_verify_demo_token),
):
    logger.info(f"Workflow creation from {req.client.host} – Task: {request.task[:50]}…")
    db = SessionLocal()
    try:
        client = _create_openai_client()
        workflow, agent_instances = build_workflow(request.agents, request.connections, client)

        db_workflow = WorkflowService.create_workflow(
            db=db,
            name=f"Workflow {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}",
            description=f"Task: {request.task[:100]}…",
            workflow_data={
                "agents": [a.model_dump() for a in request.agents],
                "connections": [c.model_dump() for c in request.connections],
                "task": request.task,
            },
            tags=["auto-generated"],
            status="running",
        )
        workflow_id = str(db_workflow.id)

        asyncio.create_task(_execute_workflow(workflow_id, workflow, request.task, db_workflow.id))

        return WorkflowResponse(workflow_id=workflow_id, status="running")

    except Exception as e:
        if "workflow_id" in locals():
            return WorkflowResponse(workflow_id=workflow_id, status="error", error=str(e))
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        db.close()


# ── SSE streaming endpoint ───────────────────────────────────────────────────

@router.post("/workflow/stream")
async def stream_workflow(
    request: WorkflowRequest,
    req: Request,
    _: bool = Depends(_verify_demo_token),
):
    """Create and execute a workflow, streaming events as SSE."""
    logger.info(f"Workflow stream from {req.client.host} – Task: {request.task[:50]}…")

    client = _create_openai_client()
    workflow, _agents = build_workflow(request.agents, request.connections, client)

    # Save to DB
    db = SessionLocal()
    try:
        db_wf = WorkflowService.create_workflow(
            db=db,
            name=f"Workflow {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}",
            description=f"Task: {request.task[:100]}…",
            workflow_data={
                "agents": [a.model_dump() for a in request.agents],
                "connections": [c.model_dump() for c in request.connections],
                "task": request.task,
            },
            tags=["auto-generated"],
            status="running",
        )
        workflow_id = str(db_wf.id)
    finally:
        db.close()

    async def event_generator():
        started_at = datetime.now()
        db = SessionLocal()
        try:
            # Send workflow ID immediately
            yield _sse({"type": "workflow_started", "workflow_id": workflow_id})

            stream = workflow.run(request.task, stream=True)
            async for event in stream:
                evt_type = str(getattr(event, "type", "event"))
                payload: Dict[str, Any] = {"type": evt_type}

                if evt_type == "executor_invoked":
                    payload["executor_id"] = getattr(event, "executor_id", "")
                    payload["message"] = f"Agent {payload['executor_id']} started"
                elif evt_type == "executor_completed":
                    payload["executor_id"] = getattr(event, "executor_id", "")
                    payload["message"] = f"Agent {payload['executor_id']} finished"
                elif evt_type == "data":
                    data = getattr(event, "data", None)
                    payload["executor_id"] = getattr(event, "executor_id", "")
                    # AgentResponse has a .text attribute
                    if hasattr(data, "text"):
                        payload["content"] = data.text
                    else:
                        payload["content"] = str(data) if data else ""
                elif evt_type == "output":
                    data = getattr(event, "data", None)
                    payload["executor_id"] = getattr(event, "executor_id", "")
                    if isinstance(data, dict):
                        payload["content"] = data.get("content", str(data))
                        payload["source"] = data.get("source", payload["executor_id"])
                        # Token-level streaming fields
                        if data.get("streaming"):
                            payload["type"] = "token"
                            payload["chunk"] = data.get("chunk", "")
                        elif data.get("done"):
                            payload["type"] = "agent_done"
                    else:
                        payload["content"] = str(data) if data else ""
                elif evt_type == "superstep_started":
                    payload["iteration"] = getattr(event, "data", None)
                elif evt_type == "superstep_completed":
                    payload["iteration"] = getattr(event, "data", None)
                elif evt_type in ("failed", "executor_failed"):
                    details = getattr(event, "details", None) or getattr(event, "data", None)
                    payload["error"] = str(details) if details else "Unknown error"
                    payload["executor_id"] = getattr(event, "executor_id", "")
                else:
                    # started, status, warning, error, etc.
                    payload["data"] = str(getattr(event, "data", ""))

                yield _sse(payload)

            # Get final result
            final = await stream.get_final_response()
            outputs = final.get_outputs()

            messages = []
            for output in outputs:
                if isinstance(output, dict):
                    # Skip intermediate streaming chunks, only keep final outputs
                    if output.get("streaming"):
                        continue
                    messages.append({
                        "source": output.get("source", "agent"),
                        "content": output.get("content", str(output)),
                    })
                else:
                    messages.append({"source": "agent", "content": str(output)})

            result_data = {
                "messages": messages,
                "total_events": len(final),
                "stop_reason": "completed",
            }

            yield _sse({"type": "workflow_completed", "result": result_data})

            # Persist
            try:
                WorkflowService.record_execution(
                    db=db,
                    workflow_id=UUID(workflow_id),
                    status="completed",
                    started_at=started_at,
                    completed_at=datetime.now(),
                    input_data={"task": request.task},
                    output_data=result_data,
                )
                WorkflowService.update_workflow(db=db, workflow_id=UUID(workflow_id), status="completed")
            except Exception:
                db.rollback()

        except Exception as e:
            import traceback
            traceback.print_exc()
            yield _sse({"type": "workflow_error", "error": str(e)})
            try:
                WorkflowService.record_execution(
                    db=db,
                    workflow_id=UUID(workflow_id),
                    status="failed",
                    started_at=started_at,
                    completed_at=datetime.now(),
                    input_data={"task": request.task},
                    error_message=str(e),
                )
                WorkflowService.update_workflow(db=db, workflow_id=UUID(workflow_id), status="failed")
            except Exception:
                db.rollback()
        finally:
            db.close()

    return StreamingResponse(event_generator(), media_type="text/event-stream")


# ── Status / list / delete (polling fallback) ────────────────────────────────

@router.get("/workflow/{workflow_id}", response_model=WorkflowResponse)
async def get_workflow_status(workflow_id: str):
    db = SessionLocal()
    try:
        db_wf = WorkflowService.get_workflow(db, UUID(workflow_id))
        if not db_wf:
            raise HTTPException(status_code=404, detail="Workflow not found")

        result = None
        error = None
        if db_wf.executions:
            latest = max(db_wf.executions, key=lambda e: e.started_at)
            result = latest.output_data
            error = latest.error_message

        return WorkflowResponse(
            workflow_id=workflow_id,
            status=db_wf.status or "unknown",
            result=result,
            error=error,
        )
    except HTTPException:
        raise
    except Exception:
        raise HTTPException(status_code=404, detail="Workflow not found")
    finally:
        db.close()


@router.get("/workflows")
async def list_workflows_endpoint():
    db = SessionLocal()
    try:
        db_workflows = WorkflowService.get_all_workflows(db)
        result = []
        for wf in db_workflows:
            data = wf.workflow_data or {}
            agents = data.get("agents", [])
            connections = data.get("connections", [])
            result.append({
                "id": str(wf.id),
                "status": wf.status,
                "task": data.get("task", ""),
                "created_at": wf.created_at.isoformat() if wf.created_at else None,
                "completed_at": wf.last_executed_at.isoformat() if wf.last_executed_at else None,
                "agent_count": len(agents),
                "connection_count": len(connections),
                "agent_types": list(set(a.get("type", "") for a in agents)),
                "has_results": any(e.output_data for e in wf.executions) if wf.executions else False,
                "error": wf.executions[-1].error_message if wf.executions and wf.executions[-1].error_message else None,
            })
        return result
    finally:
        db.close()


@router.delete("/workflow/{workflow_id}")
async def delete_workflow_endpoint(workflow_id: str):
    db = SessionLocal()
    try:
        deleted = WorkflowService.delete_workflow(db, UUID(workflow_id))
        if not deleted:
            raise HTTPException(status_code=404, detail="Workflow not found")
        return {"message": f"Workflow {workflow_id} deleted"}
    finally:
        db.close()


# ── Helpers ──────────────────────────────────────────────────────────────────

def _sse(data: dict) -> str:
    """Format a dict as an SSE data line."""
    return f"data: {json.dumps(data)}\n\n"


async def _execute_workflow(workflow_id: str, workflow, task: str, db_id=None):
    """Background execution (non-streaming fallback)."""
    db = SessionLocal()
    started_at = datetime.now()
    try:
        result = await workflow.run(task)
        outputs = result.get_outputs()

        messages = []
        for output in outputs:
            messages.append({"source": "agent", "content": str(output), "type": "agent"})

        if not messages:
            for evt in result:
                evt_type = str(getattr(evt, "type", "event"))
                evt_data = getattr(evt, "data", getattr(evt, "text", str(evt)))
                messages.append({"source": evt_type, "content": str(evt_data), "type": evt_type})

        result_data = {"messages": messages, "total_events": len(result), "stop_reason": "completed"}

        WorkflowService.record_execution(
            db=db,
            workflow_id=UUID(workflow_id),
            status="completed",
            started_at=started_at,
            completed_at=datetime.now(),
            input_data={"task": task},
            output_data=result_data,
        )
        WorkflowService.update_workflow(db=db, workflow_id=UUID(workflow_id), status="completed")

    except Exception as e:
        import traceback
        traceback.print_exc()
        try:
            db.rollback()
            WorkflowService.record_execution(
                db=db,
                workflow_id=UUID(workflow_id),
                status="failed",
                started_at=started_at,
                completed_at=datetime.now(),
                input_data={"task": task},
                error_message=str(e),
            )
            WorkflowService.update_workflow(db=db, workflow_id=UUID(workflow_id), status="failed")
        except Exception:
            db.rollback()
    finally:
        db.close()
