"""
Agent creation and workflow building functionality.
"""

from typing import List, Dict, Any, Optional, TYPE_CHECKING
from pydantic import BaseModel

if TYPE_CHECKING:
    pass

class AgentConfig(BaseModel):
    id: str
    name: str
    type: str
    system_message: str
    position: Optional[Dict[str, float]] = None
    config: Optional[Dict[str, Any]] = None

class Connection(BaseModel):
    source_id: str
    target_id: str
from autogen_agentchat.agents import AssistantAgent
from autogen_agentchat.teams import DiGraphBuilder, GraphFlow
from autogen_agentchat.conditions import MaxMessageTermination, TextMentionTermination
from autogen_ext.models.openai import OpenAIChatCompletionClient
from tools import get_web_search_tools, get_document_search_tools


# Agent type configurations
AGENT_CONFIGS = {
    "web_search": {
        "name": "Web Search Agent",
        "system_message": "You are a web search agent with access to web search tools. When users ask for information, use the web_search_tool to find current information on the web. You can also use scrape_webpage_tool to get detailed content from specific URLs. Always use your tools to provide up-to-date and accurate information with sources."
    },
    "document_search": {
        "name": "Document Search Agent", 
        "system_message": "You are a document search agent with access to document search tools. Use the document_search_tool to find relevant information within uploaded documents. Provide detailed summaries of your findings with references to the source documents."
    },
    "summarizer": {
        "name": "Summarizer Agent",
        "system_message": "You are a summarizer agent. Take the provided information and create concise, well-structured summaries that capture the key points. Focus on clarity and completeness while maintaining brevity."
    }
}


# Note: AgentConfig and Connection are defined as Pydantic models in main.py
# We'll work with the Pydantic models directly


def create_agent(agent_config: AgentConfig, client: OpenAIChatCompletionClient) -> AssistantAgent:
    """Create an AutoGen agent based on configuration"""
    base_config = AGENT_CONFIGS.get(agent_config.type, {})
    system_message = agent_config.system_message or base_config.get("system_message", "You are a helpful AI assistant.")
    
    print(f"Creating agent {agent_config.id} of type {agent_config.type}")
    print(f"System message: {system_message[:100]}...")
    
    # Get tools based on agent type
    tools = []
    if agent_config.type == "web_search":
        tools = get_web_search_tools()
        print(f"Adding web search tools to agent {agent_config.id}")
    elif agent_config.type == "document_search":
        tools = get_document_search_tools()
        print(f"Adding document search tools to agent {agent_config.id}")
    
    try:
        agent = AssistantAgent(
            name=agent_config.id,
            model_client=client,
            system_message=system_message,
            tools=tools if tools else None
        )
        print(f"Successfully created agent {agent_config.id} with {len(tools)} tools")
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

    # Build graph
    builder = DiGraphBuilder()
    
    # Add agents to graph
    for agent in agent_instances:
        builder.add_node(agent)
    
    # Add connections
    for connection in connections:
        source_agent = agent_map.get(connection.source_id)
        target_agent = agent_map.get(connection.target_id)
        
        if source_agent and target_agent:
            builder.add_edge(source_agent, target_agent)
            print(f"Adding edge: {connection.source_id} -> {connection.target_id}")
        else:
            print(f"Warning: Could not find agents for connection {connection.source_id} -> {connection.target_id}")
    
    # Add termination conditions
    termination = MaxMessageTermination(max_messages=20)
    
    # Create the GraphFlow team
    team = GraphFlow(
        participants=agent_instances,
        graph=builder.build(),
        termination_condition=termination
    )
    
    print(f"Built workflow team with {len(agent_instances)} agents and {len(connections)} connections")
    return team, agent_instances