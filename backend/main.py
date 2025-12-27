from fastapi import FastAPI, HTTPException, UploadFile, File, Depends, Request, Header
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
from typing import List, Dict, Any, Optional
import os
from dotenv import load_dotenv
import asyncio
from datetime import datetime
from sqlalchemy.orm import Session
import logging

# AutoGen imports
from autogen_agentchat.messages import TextMessage
from autogen_ext.models.openai import OpenAIChatCompletionClient

# Local imports
from agents import AGENT_CONFIGS, AgentConfig, Connection, build_workflow_team
from document_service import get_document_processor
from database import get_db, init_db, SessionLocal
from api_routes import router as api_router
from document_routes import router as doc_router
from db_service import WorkflowService

# Load environment variables
load_dotenv()

# Setup logging for security monitoring
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

# Global storage for workflows
workflows: Dict[str, Dict[str, Any]] = {}



# Pydantic models for API
class WorkflowRequest(BaseModel):
    agents: List[AgentConfig] = Field(..., max_length=20)  # Max 20 agents per workflow
    connections: List[Connection] = Field(..., max_length=50)  # Max 50 connections
    task: str = Field(..., min_length=1, max_length=2000)  # Max 2000 chars for task

class WorkflowResponse(BaseModel):
    workflow_id: str
    status: str
    result: Optional[Dict[str, Any]] = None
    error: Optional[str] = None

# Global storage for workflows
workflows: Dict[str, Dict[str, Any]] = {}

def create_openai_client():
    """Create OpenAI client with API key from environment"""
    api_key = os.getenv("OPENAI_API_KEY")
    if not api_key:
        raise HTTPException(status_code=500, detail="OpenAI API key not configured")
    
    # Validate API key format
    if api_key.startswith("your_") or api_key == "your_openai_api_key_here":
        raise HTTPException(status_code=500, detail="Please set a valid OpenAI API key in the .env file")
    
    return OpenAIChatCompletionClient(model="gpt-4o-mini", api_key=api_key)

def verify_demo_token(authorization: Optional[str] = Header(None)):
    """Verify demo token for protected endpoints."""
    demo_token = os.getenv("DEMO_TOKEN")
    
    # If no demo token is set, allow access (for local development)
    if not demo_token:
        logger.warning("No DEMO_TOKEN set - running in open mode. Set DEMO_TOKEN in production!")
        return True
    
    # Check for token in Authorization header
    if not authorization:
        logger.warning("Missing authorization header")
        raise HTTPException(
            status_code=401,
            detail="Authorization header required. Get demo token from project README or contact developer."
        )
    
    # Support both "Bearer token" and just "token" formats
    token = authorization.replace("Bearer ", "").strip()
    
    if token != demo_token:
        logger.warning(f"Invalid token attempt from authorization header")
        raise HTTPException(
            status_code=401,
            detail="Invalid demo token. Get demo token from project README or contact developer."
        )
    
    return True

# FastAPI app initialization
app = FastAPI(
    title="Flowgen API",
    description="API for creating and managing AI agent workflows",
    version="1.0.0"
)

# Get allowed origins from environment or use defaults
ALLOWED_ORIGINS = os.getenv(
    "ALLOWED_ORIGINS",
    "http://localhost:3000,http://localhost:5173,http://127.0.0.1:3000,http://127.0.0.1:5173"
).split(",")

# Add CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS,  # Will include Netlify URL from env
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include database API routes
app.include_router(api_router)
app.include_router(doc_router)

# Keep old endpoints for compatibility
@app.post("/upload-documents")
async def upload_documents_compat(files: List[UploadFile] = File(...)):
    """Legacy endpoint - redirects to new service."""
    from document_service import get_document_processor
    
    if not files:
        raise HTTPException(status_code=400, detail="No files provided")
    
    api_key = os.getenv("OPENAI_API_KEY")
    if not api_key:
        raise HTTPException(status_code=500, detail="OpenAI API key not configured")
    
    doc_processor = get_document_processor(api_key)
    results = []
    
    for file in files:
        if not file.filename:
            continue
        
        try:
            content = await file.read()
            result = doc_processor.upload_document(file.filename, content)
            results.append({
                "filename": file.filename,
                "success": result["success"],
                "message": result["message"],
                "chunks_added": result.get("chunks_added", 0)
            })
        except Exception as e:
            results.append({
                "filename": file.filename,
                "success": False,
                "message": str(e),
                "chunks_added": 0
            })
    
    successful = sum(1 for r in results if r["success"])
    total_chunks = sum(r["chunks_added"] for r in results)
    
    return {
        "message": f"Uploaded {successful} of {len(results)} documents",
        "results": results,
        "total_chunks": total_chunks
    }

@app.get("/documents/info")
async def get_documents_info_compat():
    """Legacy endpoint - redirects to new service."""
    from document_service import get_document_processor
    
    api_key = os.getenv("OPENAI_API_KEY")
    if not api_key:
        raise HTTPException(status_code=500, detail="OpenAI API key not configured")
    
    doc_processor = get_document_processor(api_key)
    documents = doc_processor.list_documents()
    
    return {"documents": documents}

@app.on_event("startup")
async def startup_event():
    """Initialize database on application startup"""
    try:
        init_db()
    except Exception as e:
        pass  # Database features may not work

@app.get("/")
async def root():
    return {"message": "Flowgen API is running"}

@app.get("/health")
async def health_check():
    return {"status": "healthy", "timestamp": datetime.now().isoformat()}

@app.get("/agent-types")
async def get_agent_types():
    """Get available agent types and their configurations"""
    return AGENT_CONFIGS

@app.post("/workflow/create", response_model=WorkflowResponse)
async def create_workflow(
    request: WorkflowRequest,
    req: Request,
    _: bool = Depends(verify_demo_token)
):
    """Create and execute a workflow with the specified agents and connections"""
    # Log request for monitoring
    logger.info(f"Workflow creation request from {req.client.host} - Task: {request.task[:50]}...")
    
    db = SessionLocal()
    
    try:
        # Create OpenAI client
        client = create_openai_client()
        
        # Build workflow team
        team, agent_instances = build_workflow_team(request.agents, request.connections, client)
        
        # Save workflow to database
        workflow_data = {
            "agents": [agent.dict() for agent in request.agents],
            "connections": [conn.dict() for conn in request.connections],
            "task": request.task
        }
        
        db_workflow = WorkflowService.create_workflow(
            db=db,
            name=f"Workflow {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}",
            description=f"Task: {request.task[:100]}...",
            workflow_data=workflow_data,
            tags=["auto-generated"],
            status="running"
        )
        
        workflow_id = str(db_workflow.id)
        
        # Store workflow info in memory (for execution)
        workflows[workflow_id] = {
            "id": workflow_id,
            "status": "running",
            "agents": request.agents,
            "connections": request.connections,
            "task": request.task,
            "created_at": datetime.now().isoformat(),
            "team": team,
            "agent_instances": agent_instances,
            "db_id": db_workflow.id
        }
        
        # Execute workflow asynchronously
        asyncio.create_task(execute_workflow(workflow_id, team, request.task))
        
        return WorkflowResponse(
            workflow_id=workflow_id,
            status="running"
        )
        
    except Exception as e:
        if 'workflow_id' in locals():
            return WorkflowResponse(
                workflow_id=workflow_id,
                status="error",
                error=str(e)
            )
        else:
            raise HTTPException(status_code=500, detail=str(e))
    finally:
        db.close()

async def execute_workflow(workflow_id: str, team, task: str):
    """Execute workflow asynchronously and store results"""
    db = SessionLocal()
    started_at = datetime.now()
    
    def make_json_serializable(obj):
        """Convert complex objects to JSON-serializable format."""
        if obj is None:
            return None
        if isinstance(obj, (str, int, float, bool)):
            return obj
        if isinstance(obj, (list, tuple)):
            return [make_json_serializable(item) for item in obj]
        if isinstance(obj, dict):
            return {k: make_json_serializable(v) for k, v in obj.items()}
        if hasattr(obj, '__dict__'):
            # Convert objects with attributes to dict
            return {k: make_json_serializable(v) for k, v in obj.__dict__.items() if not k.startswith('_')}
        # Fallback to string representation
        return str(obj)
    
    try:
        # Run the GraphFlow workflow using run_stream
        messages = []
        async for event in team.run_stream(task=task):
            messages.append(event)
        
        
        # Format results with safe serialization
        safe_messages = []
        for msg in messages:
            safe_msg = {
                "source": str(getattr(msg, 'source', 'unknown')),
                "content": str(getattr(msg, 'content', '')),
                "type": str(getattr(msg, 'type', 'text'))
            }
            # Safely handle models_usage if it exists
            if hasattr(msg, 'models_usage') and msg.models_usage:
                try:
                    safe_msg["models_usage"] = make_json_serializable(msg.models_usage)
                except:
                    safe_msg["models_usage"] = str(msg.models_usage)
            safe_messages.append(safe_msg)
        
        result_data = {
            "messages": safe_messages,
            "total_events": len(messages),
            "stop_reason": "completed"
        }
        
        # Store results in memory
        workflows[workflow_id]["status"] = "completed"
        workflows[workflow_id]["result"] = result_data
        workflows[workflow_id]["completed_at"] = datetime.now().isoformat()
        
        # Save execution to database with safe serialization
        from uuid import UUID
        safe_execution_log = []
        for msg in messages[:50]:  # Limit log size
            try:
                safe_execution_log.append({
                    "source": str(getattr(msg, 'source', 'unknown')),
                    "content": str(getattr(msg, 'content', ''))[:500],  # Truncate long content
                    "type": str(getattr(msg, 'type', 'text'))
                })
            except:
                safe_execution_log.append({"event": str(msg)[:500]})
        
        WorkflowService.record_execution(
            db=db,
            workflow_id=UUID(workflow_id),
            status="completed",
            started_at=started_at,
            completed_at=datetime.now(),
            input_data={"task": task},
            output_data=result_data,
            execution_log=safe_execution_log
        )
        
        # Update workflow status to completed
        WorkflowService.update_workflow(
            db=db,
            workflow_id=UUID(workflow_id),
            status="completed"
        )
        
    except Exception as e:
        import traceback
        traceback.print_exc()
        
        workflows[workflow_id]["status"] = "error"
        workflows[workflow_id]["error"] = str(e)
        workflows[workflow_id]["completed_at"] = datetime.now().isoformat()
        
        # Save error to database
        try:
            from uuid import UUID
            db.rollback()  # Rollback any failed transaction first
            WorkflowService.record_execution(
                db=db,
                workflow_id=UUID(workflow_id),
                status="failed",
                started_at=started_at,
                completed_at=datetime.now(),
                input_data={"task": task},
                error_message=str(e)
            )
            
            # Update workflow status to failed
            WorkflowService.update_workflow(
                db=db,
                workflow_id=UUID(workflow_id),
                status="failed"
            )
        except Exception as db_error:
            db.rollback()
    finally:
        db.close()

@app.get("/workflow/{workflow_id}", response_model=WorkflowResponse)
async def get_workflow_status(workflow_id: str):
    """Get the status and results of a workflow"""
    if workflow_id not in workflows:
        raise HTTPException(status_code=404, detail="Workflow not found")
    
    workflow = workflows[workflow_id]
    
    return WorkflowResponse(
        workflow_id=workflow_id,
        status=workflow["status"],
        result=workflow.get("result"),
        error=workflow.get("error")
    )

@app.get("/workflows")
async def list_workflows():
    """List all workflows with their status and enhanced details"""
    workflow_list = []
    
    for wf in workflows.values():
        workflow_info = {
            "id": wf["id"],
            "status": wf["status"],
            "task": wf["task"],
            "created_at": wf["created_at"],
            "completed_at": wf.get("completed_at"),
            "agent_count": len(wf["agents"]),
            "connection_count": len(wf["connections"]),
            "agent_types": list(set(agent.type for agent in wf["agents"])),
            "has_results": bool(wf.get("result")),
            "message_count": len(wf.get("result", {}).get("messages", [])) if wf.get("result") else 0,
            "error": wf.get("error")
        }
        
        # Calculate execution duration
        if wf.get("completed_at"):
            start_time = datetime.fromisoformat(wf["created_at"])
            end_time = datetime.fromisoformat(wf["completed_at"])
            duration_seconds = (end_time - start_time).total_seconds()
            workflow_info["duration_seconds"] = duration_seconds
        elif wf["status"] == "running":
            start_time = datetime.fromisoformat(wf["created_at"])
            current_time = datetime.now()
            duration_seconds = (current_time - start_time).total_seconds()
            workflow_info["duration_seconds"] = duration_seconds
        
        workflow_list.append(workflow_info)
    
    # Sort by creation time (newest first)
    workflow_list.sort(key=lambda x: x["created_at"], reverse=True)
    
    return workflow_list

@app.delete("/workflow/{workflow_id}")
async def delete_workflow(workflow_id: str):
    """Delete a workflow"""
    if workflow_id not in workflows:
        raise HTTPException(status_code=404, detail="Workflow not found")
    
    del workflows[workflow_id]
    return {"message": f"Workflow {workflow_id} deleted successfully"}

@app.post("/upload-documents")
async def upload_documents(
    files: List[UploadFile] = File(...),
    req: Request = None,
    _: bool = Depends(verify_demo_token)
):
    """Upload and process documents for vector search."""
    logger.info(f"Document upload from {req.client.host} - {len(files)} files")
    
    if not files:
        raise HTTPException(status_code=400, detail="No files provided")
    
    # Limit total file size (10MB total)
    total_size = 0
    MAX_TOTAL_SIZE = 10 * 1024 * 1024  # 10MB
    
    for file in files:
        file.file.seek(0, 2)  # Seek to end
        file_size = file.file.tell()
        file.file.seek(0)  # Reset to start
        total_size += file_size
        
        if total_size > MAX_TOTAL_SIZE:
            raise HTTPException(
                status_code=413,
                detail=f"Total file size exceeds limit of {MAX_TOTAL_SIZE // 1024 // 1024}MB"
            )
    
    results = []
    
    for file in files:
        if not file.filename:
            continue
            
        try:
            # Read file content
            file_content = await file.read()
            
            # Process and store the document
            doc_processor = get_document_processor()
            result = doc_processor.upload_document(file.filename, file_content)
            
            results.append({
                "filename": file.filename,
                "success": result["success"],
                "message": result["message"],
                "file_id": result.get("file_id"),
                "chunks_added": result.get("chunks_added", 0),
                "text_length": result.get("text_length", 0)
            })
            
        except Exception as e:
            results.append({
                "filename": file.filename,
                "success": False,
                "message": f"Error processing file: {str(e)}",
                "file_id": None,
                "chunks_added": 0,
                "text_length": 0
            })
    
    # Count successful uploads
    successful_uploads = sum(1 for r in results if r["success"])
    total_chunks = sum(r["chunks_added"] for r in results)
    
    return {
        "message": f"Processed {len(files)} files. {successful_uploads} successful uploads.",
        "total_files": len(files),
        "successful_uploads": successful_uploads,
        "total_chunks_added": total_chunks,
        "results": results
    }

@app.get("/documents/info")
async def get_documents_info():
    """Get information about stored documents."""
    doc_processor = get_document_processor()
    return doc_processor.get_document_info()

@app.post("/documents/search")
async def search_documents(request: Dict[str, Any], req: Request = None):
    """Search documents using vector similarity."""
    logger.info(f"Document search from {req.client.host}")
    query = request.get("query", "")
    max_results = request.get("max_results", 5)
    filter_documents = request.get("filter_documents", None)  # Optional document filtering
    
    if not query.strip():
        raise HTTPException(status_code=400, detail="Query cannot be empty")
    
    doc_processor = get_document_processor()
    
    # If filter_documents is specified, check if those documents exist
    if filter_documents:
        doc_info = doc_processor.get_document_info()
        available_docs = [doc["filename"] for doc in doc_info["documents"]]
        missing_docs = [doc for doc in filter_documents if doc not in available_docs]
        if missing_docs:
            raise HTTPException(
                status_code=404,
                detail=f"Some specified documents were not found: {missing_docs}. Available documents: {available_docs}"
            )
    
    results = doc_processor.search_documents(query, max_results, filter_documents)
    
    return {
        "query": query,
        "results": results,
        "total_results": len(results),
        "filtered_documents": filter_documents
    }

@app.delete("/documents/clear")
async def clear_all_documents():
    """Clear all stored documents."""
    doc_processor = get_document_processor()
    success = doc_processor.clear_all_documents()
    
    if success:
        return {"message": "All documents cleared successfully"}
    else:
        raise HTTPException(status_code=500, detail="Failed to clear documents")

if __name__ == "__main__":
    import uvicorn
    port = int(os.getenv("BACKEND_PORT", 8000))
    host = os.getenv("BACKEND_HOST", "0.0.0.0")
    uvicorn.run("main:app", host=host, port=port, reload=True)
