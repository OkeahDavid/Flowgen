from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List, Dict, Any, Optional
import os
from dotenv import load_dotenv
import asyncio
from datetime import datetime

# AutoGen imports
from autogen_agentchat.agents import AssistantAgent
from autogen_agentchat.teams import DiGraphBuilder, GraphFlow
from autogen_agentchat.conditions import MaxMessageTermination
from autogen_ext.models.openai import OpenAIChatCompletionClient

# Load environment variables
load_dotenv()

app = FastAPI(title="Flowgen API", description="AI Agent Orchestration API", version="1.0.0")

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://localhost:5173"],  # React frontend URLs
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Pydantic models
class AgentConfig(BaseModel):
    id: str
    name: str
    type: str  # "web_search", "document_search", "summarizer"
    system_message: str

class Connection(BaseModel):
    source_id: str
    target_id: str
    condition: Optional[str] = None

class WorkflowRequest(BaseModel):
    agents: List[AgentConfig]
    connections: List[Connection]
    task: str

class WorkflowResponse(BaseModel):
    workflow_id: str
    status: str
    result: Optional[Dict[str, Any]] = None
    error: Optional[str] = None

# Agent type configurations
AGENT_CONFIGS = {
    "web_search": {
        "name": "Web Search Agent",
        "system_message": "You are a web search agent. Search for information on the web related to the given query and provide comprehensive results with sources."
    },
    "document_search": {
        "name": "Document Search Agent", 
        "system_message": "You are a document search agent. Search through documents and extract relevant information based on the query. Provide detailed summaries of findings."
    },
    "summarizer": {
        "name": "Summarizer Agent",
        "system_message": "You are a summarizer agent. Take the provided information and create concise, well-structured summaries that capture the key points."
    }
}

# Global storage for workflows
workflows: Dict[str, Dict[str, Any]] = {}

def create_openai_client():
    """Create OpenAI client with API key from environment"""
    api_key = os.getenv("OPENAI_API_KEY")
    if not api_key:
        raise HTTPException(status_code=500, detail="OpenAI API key not configured")
    return OpenAIChatCompletionClient(model="gpt-4o-mini", api_key=api_key)

def create_agent(agent_config: AgentConfig, client: OpenAIChatCompletionClient) -> AssistantAgent:
    """Create an AutoGen agent based on configuration"""
    base_config = AGENT_CONFIGS.get(agent_config.type, {})
    system_message = agent_config.system_message or base_config.get("system_message", "You are a helpful AI assistant.")
    
    return AssistantAgent(
        name=agent_config.id,
        model_client=client,
        system_message=system_message
    )

def build_workflow_graph(agents: List[AgentConfig], connections: List[Connection], client: OpenAIChatCompletionClient):
    """Build AutoGen GraphFlow from agent configuration"""
    # Create agents
    agent_instances = {}
    for agent_config in agents:
        agent_instances[agent_config.id] = create_agent(agent_config, client)
    
    # Build graph
    builder = DiGraphBuilder()
    
    # Add nodes
    for agent in agent_instances.values():
        builder.add_node(agent)
    
    # Add edges
    for connection in connections:
        source_agent = agent_instances[connection.source_id]
        target_agent = agent_instances[connection.target_id]
        
        if connection.condition:
            builder.add_edge(source_agent, target_agent, condition=connection.condition)
        else:
            builder.add_edge(source_agent, target_agent)
    
    # Build and validate graph
    graph = builder.build()
    
    # Create flow
    participants = list(agent_instances.values())
    termination_condition = MaxMessageTermination(20)  # Max 20 messages
    
    flow = GraphFlow(
        participants=participants,
        graph=graph,
        termination_condition=termination_condition
    )
    
    return flow

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
async def create_workflow(request: WorkflowRequest):
    """Create and execute a workflow with the specified agents and connections"""
    workflow_id = f"workflow_{len(workflows) + 1}_{int(datetime.now().timestamp())}"
    
    try:
        # Create OpenAI client
        client = create_openai_client()
        
        # Build workflow graph
        flow = build_workflow_graph(request.agents, request.connections, client)
        
        # Store workflow info
        workflows[workflow_id] = {
            "id": workflow_id,
            "status": "running",
            "agents": request.agents,
            "connections": request.connections,
            "task": request.task,
            "created_at": datetime.now().isoformat(),
            "flow": flow
        }
        
        # Execute workflow asynchronously
        asyncio.create_task(execute_workflow(workflow_id, flow, request.task))
        
        return WorkflowResponse(
            workflow_id=workflow_id,
            status="running"
        )
        
    except Exception as e:
        return WorkflowResponse(
            workflow_id=workflow_id,
            status="error",
            error=str(e)
        )

async def execute_workflow(workflow_id: str, flow: GraphFlow, task: str):
    """Execute workflow asynchronously and store results"""
    try:
        # Run the workflow
        result = await flow.run(task=task)
        
        # Store results
        workflows[workflow_id]["status"] = "completed"
        workflows[workflow_id]["result"] = {
            "messages": [
                {
                    "source": msg.source,
                    "content": msg.content,
                    "type": msg.type,
                    "models_usage": msg.models_usage.__dict__ if msg.models_usage else None
                } for msg in result.messages
            ],
            "stop_reason": result.stop_reason
        }
        workflows[workflow_id]["completed_at"] = datetime.now().isoformat()
        
    except Exception as e:
        workflows[workflow_id]["status"] = "error"
        workflows[workflow_id]["error"] = str(e)
        workflows[workflow_id]["completed_at"] = datetime.now().isoformat()

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
    """List all workflows with their status"""
    return [
        {
            "id": wf["id"],
            "status": wf["status"],
            "task": wf["task"],
            "created_at": wf["created_at"],
            "completed_at": wf.get("completed_at"),
            "agent_count": len(wf["agents"])
        }
        for wf in workflows.values()
    ]

@app.delete("/workflow/{workflow_id}")
async def delete_workflow(workflow_id: str):
    """Delete a workflow"""
    if workflow_id not in workflows:
        raise HTTPException(status_code=404, detail="Workflow not found")
    
    del workflows[workflow_id]
    return {"message": f"Workflow {workflow_id} deleted successfully"}

if __name__ == "__main__":
    import uvicorn
    port = int(os.getenv("BACKEND_PORT", 8000))
    host = os.getenv("BACKEND_HOST", "0.0.0.0")
    uvicorn.run("main:app", host=host, port=port, reload=True)
