"""Database service layer for document and workflow operations."""
from typing import List, Optional, Dict, Any
from sqlalchemy.orm import Session
from sqlalchemy import desc, func
from pgvector.sqlalchemy import Vector
import numpy as np
from uuid import UUID

from models import Document, Workflow, WorkflowExecution
from datetime import datetime


class DocumentService:
    """Service for document-related database operations."""
    
    @staticmethod
    def create_document(
        db: Session,
        filename: str,
        content: str,
        content_type: str,
        embedding: Optional[List[float]] = None,
        file_size: Optional[int] = None,
        doc_metadata: Optional[Dict[str, Any]] = None,
        chunk_index: int = 0,
        total_chunks: int = 1,
        parent_doc_id: Optional[UUID] = None,
    ) -> Document:
        """Create a new document with optional embedding."""
        doc = Document(
            filename=filename,
            content=content,
            content_type=content_type,
            file_size=file_size,
            embedding=embedding,
            doc_metadata=doc_metadata,
            chunk_index=chunk_index,
            total_chunks=total_chunks,
            parent_doc_id=parent_doc_id,
        )
        db.add(doc)
        db.commit()
        db.refresh(doc)
        return doc
    
    @staticmethod
    def get_document(db: Session, doc_id: UUID) -> Optional[Document]:
        """Get a document by ID."""
        return db.query(Document).filter(Document.id == doc_id).first()
    
    @staticmethod
    def get_all_documents(db: Session, skip: int = 0, limit: int = 100) -> List[Document]:
        """Get all documents with pagination."""
        return db.query(Document).offset(skip).limit(limit).all()
    
    @staticmethod
    def search_documents_by_similarity(
        db: Session,
        query_embedding: List[float],
        limit: int = 10,
        threshold: float = 0.7
    ) -> List[tuple[Document, float]]:
        """
        Search documents by vector similarity.
        Returns documents with their similarity scores.
        """
        results = db.query(
            Document,
            Document.embedding.cosine_distance(query_embedding).label("distance")
        ).filter(
            Document.embedding.isnot(None)
        ).order_by(
            Document.embedding.cosine_distance(query_embedding)
        ).limit(limit).all()
        
        # Convert distance to similarity score (1 - distance)
        # Filter by threshold
        results_with_similarity = [
            (doc, 1 - distance) 
            for doc, distance in results 
            if (1 - distance) >= threshold
        ]
        
        return results_with_similarity
    
    @staticmethod
    def update_document_embedding(
        db: Session, 
        doc_id: UUID, 
        embedding: List[float]
    ) -> Optional[Document]:
        """Update the embedding for a document."""
        doc = db.query(Document).filter(Document.id == doc_id).first()
        if doc:
            doc.embedding = embedding
            db.commit()
            db.refresh(doc)
        return doc
    
    @staticmethod
    def delete_document(db: Session, doc_id: UUID) -> bool:
        """Delete a document by ID."""
        doc = db.query(Document).filter(Document.id == doc_id).first()
        if doc:
            db.delete(doc)
            db.commit()
            return True
        return False


class WorkflowService:
    """Service for workflow-related database operations."""
    
    @staticmethod
    def create_workflow(
        db: Session,
        name: str,
        workflow_data: Dict[str, Any],
        description: Optional[str] = None,
        owner_id: Optional[str] = None,
        tags: Optional[List[str]] = None,
    ) -> Workflow:
        """Create a new workflow."""
        workflow = Workflow(
            name=name,
            description=description,
            workflow_data=workflow_data,
            owner_id=owner_id,
            tags=tags,
        )
        db.add(workflow)
        db.commit()
        db.refresh(workflow)
        return workflow
    
    @staticmethod
    def get_workflow(db: Session, workflow_id: UUID) -> Optional[Workflow]:
        """Get a workflow by ID."""
        return db.query(Workflow).filter(Workflow.id == workflow_id).first()
    
    @staticmethod
    def get_all_workflows(
        db: Session,
        owner_id: Optional[str] = None,
        status: Optional[str] = None,
        skip: int = 0,
        limit: int = 100
    ) -> List[Workflow]:
        """Get workflows with optional filtering."""
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
        """Update a workflow."""
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
        """Delete a workflow by ID."""
        workflow = db.query(Workflow).filter(Workflow.id == workflow_id).first()
        if workflow:
            # Also delete associated executions
            db.query(WorkflowExecution).filter(
                WorkflowExecution.workflow_id == workflow_id
            ).delete()
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
        """Record a workflow execution."""
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
        
        # Update workflow execution statistics
        workflow = db.query(Workflow).filter(Workflow.id == workflow_id).first()
        if workflow and status == "completed":
            workflow.execution_count += 1
            workflow.last_executed_at = completed_at
            
            # Update average execution time
            if execution.execution_time:
                if workflow.average_execution_time:
                    workflow.average_execution_time = (
                        (workflow.average_execution_time * (workflow.execution_count - 1) + 
                         execution.execution_time) / workflow.execution_count
                    )
                else:
                    workflow.average_execution_time = execution.execution_time
        
        db.commit()
        db.refresh(execution)
        return execution
    
    @staticmethod
    def get_workflow_executions(
        db: Session,
        workflow_id: UUID,
        skip: int = 0,
        limit: int = 50
    ) -> List[WorkflowExecution]:
        """Get execution history for a workflow."""
        return db.query(WorkflowExecution).filter(
            WorkflowExecution.workflow_id == workflow_id
        ).order_by(desc(WorkflowExecution.started_at)).offset(skip).limit(limit).all()
