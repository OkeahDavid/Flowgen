"""Database service layer for workflow operations."""

from typing import List, Optional, Dict, Any
from sqlalchemy.orm import Session
from sqlalchemy import desc
from uuid import UUID
from datetime import datetime

from app.models import Workflow, WorkflowExecution


class WorkflowService:
    @staticmethod
    def create_workflow(
        db: Session,
        name: str,
        workflow_data: Dict[str, Any],
        description: Optional[str] = None,
        owner_id: Optional[str] = None,
        tags: Optional[List[str]] = None,
        status: Optional[str] = None,
    ) -> Workflow:
        workflow = Workflow(
            name=name,
            description=description,
            workflow_data=workflow_data,
            owner_id=owner_id,
            tags=tags,
            status=status or "draft",
        )
        db.add(workflow)
        db.commit()
        db.refresh(workflow)
        return workflow

    @staticmethod
    def get_workflow(db: Session, workflow_id: UUID) -> Optional[Workflow]:
        return db.query(Workflow).filter(Workflow.id == workflow_id).first()

    @staticmethod
    def get_all_workflows(
        db: Session,
        owner_id: Optional[str] = None,
        status: Optional[str] = None,
        skip: int = 0,
        limit: int = 100,
    ) -> List[Workflow]:
        query = db.query(Workflow)
        if owner_id:
            query = query.filter(Workflow.owner_id == owner_id)
        if status:
            query = query.filter(Workflow.status == status)
        return query.order_by(desc(Workflow.updated_at)).offset(skip).limit(limit).all()

    @staticmethod
    def update_workflow(
        db: Session,
        workflow_id: UUID,
        name: Optional[str] = None,
        description: Optional[str] = None,
        workflow_data: Optional[Dict[str, Any]] = None,
        status: Optional[str] = None,
        tags: Optional[List[str]] = None,
    ) -> Optional[Workflow]:
        workflow = db.query(Workflow).filter(Workflow.id == workflow_id).first()
        if workflow:
            if name is not None:
                workflow.name = name
            if description is not None:
                workflow.description = description
            if workflow_data is not None:
                workflow.workflow_data = workflow_data
                workflow.version += 1
            if status is not None:
                workflow.status = status
            if tags is not None:
                workflow.tags = tags
            db.commit()
            db.refresh(workflow)
        return workflow

    @staticmethod
    def delete_workflow(db: Session, workflow_id: UUID) -> bool:
        workflow = db.query(Workflow).filter(Workflow.id == workflow_id).first()
        if workflow:
            db.query(WorkflowExecution).filter(WorkflowExecution.workflow_id == workflow_id).delete()
            db.delete(workflow)
            db.commit()
            return True
        return False

    @staticmethod
    def record_execution(
        db: Session,
        workflow_id: UUID,
        status: str,
        started_at: datetime,
        completed_at: Optional[datetime] = None,
        input_data: Optional[Dict[str, Any]] = None,
        output_data: Optional[Dict[str, Any]] = None,
        error_message: Optional[str] = None,
        execution_log: Optional[List[Dict[str, Any]]] = None,
    ) -> WorkflowExecution:
        execution = WorkflowExecution(
            workflow_id=workflow_id,
            status=status,
            started_at=started_at,
            completed_at=completed_at,
            input_data=input_data,
            output_data=output_data,
            error_message=error_message,
            execution_log=execution_log,
        )
        if completed_at and started_at:
            execution.execution_time = (completed_at - started_at).total_seconds()

        db.add(execution)

        workflow = db.query(Workflow).filter(Workflow.id == workflow_id).first()
        if workflow and status == "completed":
            workflow.execution_count += 1
            workflow.last_executed_at = completed_at
            if execution.execution_time:
                if workflow.average_execution_time:
                    workflow.average_execution_time = (
                        workflow.average_execution_time * (workflow.execution_count - 1)
                        + execution.execution_time
                    ) / workflow.execution_count
                else:
                    workflow.average_execution_time = execution.execution_time

        db.commit()
        db.refresh(execution)
        return execution
