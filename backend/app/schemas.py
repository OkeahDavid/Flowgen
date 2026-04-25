"""Pydantic schemas for API request/response validation."""

from typing import List, Dict, Any, Optional
from pydantic import BaseModel, Field


class AgentConfig(BaseModel):
    id: str
    name: str
    type: str
    system_message: Optional[str] = None
    position: Optional[Dict[str, float]] = None
    config: Optional[Dict[str, Any]] = None


class Connection(BaseModel):
    source_id: str
    target_id: str


class WorkflowRequest(BaseModel):
    agents: List[AgentConfig] = Field(..., max_length=20)
    connections: List[Connection] = Field(..., max_length=50)
    task: str = Field(..., min_length=1, max_length=2000)


class WorkflowResponse(BaseModel):
    workflow_id: str
    status: str
    result: Optional[Dict[str, Any]] = None
    error: Optional[str] = None
