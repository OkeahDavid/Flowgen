"""Low-level DB CRUD endpoints for documents and workflows."""

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List, Optional
from pydantic import BaseModel
from uuid import UUID
from datetime import datetime

from app.database import get_db
from app.services.workflow_service import WorkflowService
from app.models import Document

router = APIRouter(prefix="/api", tags=["database"])


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


class WorkflowResponseModel(BaseModel):
    id: UUID
    name: str
    description: Optional[str]
    workflow_data: Optional[dict] = None
    status: str
    version: int
    execution_count: int
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


@router.post("/documents", response_model=DocumentResponse)
async def create_document(doc: DocumentCreate, db: Session = Depends(get_db)):
    d = Document(filename=doc.filename, content=doc.content, content_type=doc.content_type, file_size=doc.file_size)
    db.add(d)
    db.commit()
    db.refresh(d)
    return d


@router.get("/documents", response_model=List[DocumentResponse])
async def list_documents(skip: int = 0, limit: int = 100, db: Session = Depends(get_db)):
    return db.query(Document).offset(skip).limit(limit).all()


@router.delete("/documents/{doc_identifier}")
async def delete_document(doc_identifier: str, db: Session = Depends(get_db)):
    try:
        doc_id = UUID(doc_identifier)
        doc = db.query(Document).filter(Document.id == doc_id).first()
        if doc:
            db.query(Document).filter(Document.filename == doc.filename).delete()
            db.commit()
            return {"message": "Document deleted"}
    except ValueError:
        deleted = db.query(Document).filter(Document.filename == doc_identifier).delete()
        if deleted:
            db.commit()
            return {"message": "Document deleted"}
    raise HTTPException(status_code=404, detail="Document not found")


@router.post("/workflows", response_model=WorkflowResponseModel)
async def create_workflow_db(workflow: WorkflowCreate, db: Session = Depends(get_db)):
    return WorkflowService.create_workflow(
        db=db, name=workflow.name, description=workflow.description,
        workflow_data=workflow.workflow_data, tags=workflow.tags,
    )


@router.get("/workflows", response_model=List[WorkflowResponseModel])
async def list_workflows_db(status: Optional[str] = None, skip: int = 0, limit: int = 100, db: Session = Depends(get_db)):
    return WorkflowService.get_all_workflows(db=db, status=status, skip=skip, limit=limit)


@router.get("/workflows/{workflow_id}", response_model=WorkflowResponseModel)
async def get_workflow_db(workflow_id: UUID, db: Session = Depends(get_db)):
    wf = WorkflowService.get_workflow(db=db, workflow_id=workflow_id)
    if not wf:
        raise HTTPException(status_code=404, detail="Workflow not found")
    return wf


@router.delete("/workflows/{workflow_id}")
async def delete_workflow_db(workflow_id: UUID, db: Session = Depends(get_db)):
    if not WorkflowService.delete_workflow(db=db, workflow_id=workflow_id):
        raise HTTPException(status_code=404, detail="Workflow not found")
    return {"message": "Workflow deleted"}
