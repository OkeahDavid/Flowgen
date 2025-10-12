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
from autogen_agentchat.conditions import MaxMessageTermination, TextMentionTermination
from autogen_agentchat.messages import TextMessage
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
    
    # Validate API key format
    if api_key.startswith("your_") or api_key == "your_openai_api_key_here":
        raise HTTPException(status_code=500, detail="Please set a valid OpenAI API key in the .env file")
    
    print(f"Creating OpenAI client with API key: {api_key[:10]}...")
    return OpenAIChatCompletionClient(model="gpt-4o-mini", api_key=api_key)

def create_agent(agent_config: AgentConfig, client: OpenAIChatCompletionClient) -> AssistantAgent:
    """Create an AutoGen agent based on configuration"""
    base_config = AGENT_CONFIGS.get(agent_config.type, {})
    system_message = agent_config.system_message or base_config.get("system_message", "You are a helpful AI assistant.")
    
    print(f"Creating agent {agent_config.id} of type {agent_config.type}")
    print(f"System message: {system_message[:100]}...")
    
    try:
        agent = AssistantAgent(
            name=agent_config.id,
            model_client=client,
            system_message=system_message
        )
        print(f"Successfully created agent {agent_config.id}")
        return agent
    except Exception as e:
        print(f"Error creating agent {agent_config.id}: {str(e)}")
        raise

def build_workflow_team(agents: List[AgentConfig], connections: List[Connection], client: OpenAIChatCompletionClient):
    """Build AutoGen GraphFlow team from agent configuration"""
    # Create agents
    agent_instances = []
    agent_map = {}
    
    for agent_config in agents:
        agent = create_agent(agent_config, client)
        agent_instances.append(agent)
        agent_map[agent_config.id] = agent
    
    if len(agent_instances) == 0:
        raise ValueError("No agents provided for workflow")
    
    # Build the graph using DiGraphBuilder
    builder = DiGraphBuilder()
    
    # Add all agents to the graph
    for agent in agent_instances:
        builder.add_node(agent)
    
    # Add edges based on connections
    if connections:
        for connection in connections:
            source_agent = agent_map.get(connection.source_id)
            target_agent = agent_map.get(connection.target_id)
            
            if source_agent and target_agent:
                print(f"Adding edge: {connection.source_id} -> {connection.target_id}")
                # Add condition if specified
                if connection.condition:
                    builder.add_edge(source_agent, target_agent, condition=connection.condition)
                else:
                    builder.add_edge(source_agent, target_agent)
            else:
                print(f"Warning: Could not find agents for connection {connection.source_id} -> {connection.target_id}")
    else:
        # If no connections specified, create a sequential flow
        for i in range(len(agent_instances) - 1):
            builder.add_edge(agent_instances[i], agent_instances[i + 1])
    
    # Build and validate the graph
    graph = builder.build()
    
    # Create termination condition
    termination_condition = MaxMessageTermination(max_messages=20)
    
    # Create the GraphFlow team
    team = GraphFlow(
        participants=builder.get_participants(),
        graph=graph,
        termination_condition=termination_condition
    )
    
    return team, agent_instances

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
        
        # Build workflow team
        team, agent_instances = build_workflow_team(request.agents, request.connections, client)
        
        # Store workflow info
        workflows[workflow_id] = {
            "id": workflow_id,
            "status": "running",
            "agents": request.agents,
            "connections": request.connections,
            "task": request.task,
            "created_at": datetime.now().isoformat(),
            "team": team,
            "agent_instances": agent_instances
        }
        
        # Execute workflow asynchronously
        asyncio.create_task(execute_workflow(workflow_id, team, request.task))
        
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

async def execute_workflow(workflow_id: str, team, task: str):
    """Execute workflow asynchronously and store results"""
    try:
        print(f"Starting workflow execution for {workflow_id} with task: {task}")
        
        # Run the GraphFlow workflow using run_stream
        messages = []
        async for event in team.run_stream(task=task):
            print(f"Workflow event: {event}")
            messages.append(event)
        
        print(f"Workflow {workflow_id} completed successfully")
        
        # Store results - GraphFlow returns different event structure
        workflows[workflow_id]["status"] = "completed"
        workflows[workflow_id]["result"] = {
            "messages": [
                {
                    "source": getattr(msg, 'source', 'unknown'),
                    "content": getattr(msg, 'content', str(msg)),
                    "type": getattr(msg, 'type', 'text'),
                    "models_usage": getattr(msg, 'models_usage', None)
                } for msg in messages
            ],
            "total_events": len(messages),
            "stop_reason": "completed"
        }
        workflows[workflow_id]["completed_at"] = datetime.now().isoformat()
        
    except Exception as e:
        print(f"Error in workflow {workflow_id}: {str(e)}")
        import traceback
        traceback.print_exc()
        
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

if __name__ == "__main__":
    import uvicorn
    port = int(os.getenv("BACKEND_PORT", 8000))
    host = os.getenv("BACKEND_HOST", "0.0.0.0")
    uvicorn.run("main:app", host=host, port=port, reload=True)
