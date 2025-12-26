"""Database models for document storage and workflow management."""
from datetime import datetime
from typing import Optional
from sqlalchemy import Column, Integer, String, Text, DateTime, JSON, Float, ForeignKey
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
from pgvector.sqlalchemy import Vector
import uuid

from database import Base


class Document(Base):
    """Model for storing documents with embeddings for vector search."""
    
    __tablename__ = "documents"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    filename = Column(String(255), nullable=False)
    content = Column(Text, nullable=False)
    content_type = Column(String(50), nullable=False)  # pdf, docx, txt, etc.
    file_size = Column(Integer)  # Size in bytes
    
    # Vector embedding for semantic search (OpenAI embeddings are 1536 dimensions)
    embedding = Column(Vector(1536), nullable=True)
    
    # Metadata (renamed to avoid conflict with SQLAlchemy's metadata)
    doc_metadata = Column(JSON, nullable=True)  # Store any additional metadata
    
    # Chunking information (for large documents)
    chunk_index = Column(Integer, default=0)  # Which chunk this is (0 for non-chunked)
    total_chunks = Column(Integer, default=1)  # Total chunks for this document
    parent_doc_id = Column(UUID(as_uuid=True), ForeignKey('documents.id', ondelete='CASCADE'), nullable=True)  # Reference to parent if chunked
    
    # Timestamps
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)
    
    def __repr__(self):
        return f"<Document(id={self.id}, filename='{self.filename}', type='{self.content_type}')>"


class Workflow(Base):
    """Model for storing user-created workflows."""
    
    __tablename__ = "workflows"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    name = Column(String(255), nullable=False)
    description = Column(Text, nullable=True)
    
    # Workflow definition (stored as JSON)
    # Structure: { nodes: [...], edges: [...], config: {...} }
    workflow_data = Column(JSON, nullable=False)
    
    # User/owner information (can be extended with user table later)
    owner_id = Column(String(255), nullable=True)
    
    # Status tracking
    status = Column(String(50), default="draft")  # draft, active, archived
    version = Column(Integer, default=1)
    
    # Execution statistics
    execution_count = Column(Integer, default=0)
    last_executed_at = Column(DateTime, nullable=True)
    average_execution_time = Column(Float, nullable=True)  # In seconds
    
    # Tags for organization
    tags = Column(JSON, nullable=True)  # Array of tag strings
    
    # Timestamps
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)
    
    # Relationships - cascade delete executions when workflow is deleted
    executions = relationship("WorkflowExecution", back_populates="workflow", cascade="all, delete-orphan")
    
    def __repr__(self):
        return f"<Workflow(id={self.id}, name='{self.name}', status='{self.status}')>"


class WorkflowExecution(Base):
    """Model for tracking workflow execution history."""
    
    __tablename__ = "workflow_executions"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    workflow_id = Column(UUID(as_uuid=True), ForeignKey('workflows.id', ondelete='CASCADE'), nullable=False)
    
    # Execution details
    status = Column(String(50), nullable=False)  # running, completed, failed
    started_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    completed_at = Column(DateTime, nullable=True)
    execution_time = Column(Float, nullable=True)  # Duration in seconds
    
    # Input/Output
    input_data = Column(JSON, nullable=True)
    output_data = Column(JSON, nullable=True)
    error_message = Column(Text, nullable=True)
    
    # Execution logs/trace
    execution_log = Column(JSON, nullable=True)  # Array of log entries
    
    # Relationships
    workflow = relationship("Workflow", back_populates="executions")
    
    def __repr__(self):
        return f"<WorkflowExecution(id={self.id}, workflow_id={self.workflow_id}, status='{self.status}')>"
