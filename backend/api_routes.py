"""Example API endpoints for database operations."""
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List, Optional
from pydantic import BaseModel
from uuid import UUID
from datetime import datetime

from database import get_db
from db_service import DocumentService, WorkflowService

# Create router
router = APIRouter(prefix="/api", tags=["database"])


# Pydantic models for API requests/responses
class DocumentCreate(BaseModel):
    filename: str
    content: str
    content_type: str
    file_size: Optional[int] = None

class DocumentResponse(BaseModel):
    id: UUID
    filename: str
    content_type: str
    file_size: Optional[int]
    created_at: datetime
    
    class Config:
        from_attributes = True


class WorkflowCreate(BaseModel):
    name: str
    description: Optional[str] = None
    workflow_data: dict
    tags: Optional[List[str]] = None

class WorkflowUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    workflow_data: Optional[dict] = None
    status: Optional[str] = None
    tags: Optional[List[str]] = None

class WorkflowResponse(BaseModel):
    id: UUID
    name: str
    description: Optional[str]
    status: str
    version: int
    execution_count: int
    created_at: datetime
    updated_at: datetime
    
    class Config:
        from_attributes = True


# Document endpoints
@router.post("/documents", response_model=DocumentResponse)
async def create_document(
    doc: DocumentCreate,
    db: Session = Depends(get_db)
):
    """Create a new document (without embedding initially)."""
    document = DocumentService.create_document(
        db=db,
        filename=doc.filename,
        content=doc.content,
        content_type=doc.content_type,
        file_size=doc.file_size,
    )
    return document


@router.get("/documents", response_model=List[DocumentResponse])
async def list_documents(
    skip: int = 0,
    limit: int = 100,
    db: Session = Depends(get_db)
):
    """List all documents."""
    documents = DocumentService.get_all_documents(db=db, skip=skip, limit=limit)
    return documents


@router.get("/documents/{doc_id}", response_model=DocumentResponse)
async def get_document(
    doc_id: UUID,
    db: Session = Depends(get_db)
):
    """Get a specific document by ID."""
    document = DocumentService.get_document(db=db, doc_id=doc_id)
    if not document:
        raise HTTPException(status_code=404, detail="Document not found")
    return document


@router.delete("/documents/{doc_identifier}")
async def delete_document(
    doc_identifier: str,
    db: Session = Depends(get_db)
):
    """Delete a document by ID or filename (including all chunks)."""
    # Try to parse as UUID first
    try:
        doc_id = UUID(doc_identifier)
        # Get the document to find its filename
        from models import Document
        doc = db.query(Document).filter(Document.id == doc_id).first()
        if doc:
            filename = doc.filename
            # Delete all chunks with this filename
            success = DocumentService.delete_document_by_filename(db=db, filename=filename)
        else:
            success = False
    except ValueError:
        # If not a UUID, treat as filename
        success = DocumentService.delete_document_by_filename(db=db, filename=doc_identifier)
    
    if not success:
        raise HTTPException(status_code=404, detail="Document not found")
    return {"message": "Document deleted successfully"}


# Workflow endpoints
@router.post("/workflows", response_model=WorkflowResponse)
async def create_workflow(
    workflow: WorkflowCreate,
    db: Session = Depends(get_db)
):
    """Create a new workflow."""
    wf = WorkflowService.create_workflow(
        db=db,
        name=workflow.name,
        description=workflow.description,
        workflow_data=workflow.workflow_data,
        tags=workflow.tags,
    )
    return wf


@router.get("/workflows", response_model=List[WorkflowResponse])
async def list_workflows(
    status: Optional[str] = None,
    skip: int = 0,
    limit: int = 100,
    db: Session = Depends(get_db)
):
    """List all workflows with optional status filter."""
    workflows = WorkflowService.get_all_workflows(
        db=db,
        status=status,
        skip=skip,
        limit=limit
    )
    return workflows


@router.get("/workflows/{workflow_id}", response_model=WorkflowResponse)
async def get_workflow(
    workflow_id: UUID,
    db: Session = Depends(get_db)
):
    """Get a specific workflow by ID."""
    workflow = WorkflowService.get_workflow(db=db, workflow_id=workflow_id)
    if not workflow:
        raise HTTPException(status_code=404, detail="Workflow not found")
    return workflow


@router.put("/workflows/{workflow_id}", response_model=WorkflowResponse)
async def update_workflow(
    workflow_id: UUID,
    workflow: WorkflowUpdate,
    db: Session = Depends(get_db)
):
    """Update a workflow."""
    updated = WorkflowService.update_workflow(
        db=db,
        workflow_id=workflow_id,
        name=workflow.name,
        description=workflow.description,
        workflow_data=workflow.workflow_data,
        status=workflow.status,
        tags=workflow.tags,
    )
    if not updated:
        raise HTTPException(status_code=404, detail="Workflow not found")
    return updated


@router.delete("/workflows/{workflow_id}")
async def delete_workflow(
    workflow_id: UUID,
    db: Session = Depends(get_db)
):
    """Delete a workflow and its execution history."""
    success = WorkflowService.delete_workflow(db=db, workflow_id=workflow_id)
    if not success:
        raise HTTPException(status_code=404, detail="Workflow not found")
    return {"message": "Workflow deleted successfully"}
