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
import os


# Agent type configurations
AGENT_CONFIGS = {
    "web_search": {
        "name": "Web Search Agent",
        "system_message": "You are a web search agent with access to current web search tools. When users ask for information, use the web search tool to find the most recent and up-to-date information from the internet. The search tool automatically includes current date context to ensure relevance. Always use your tools to provide current, accurate information with proper source citations."
    },
    "document_search": {
        "name": "Document Search Agent", 
        "system_message": "You MUST call the document_search_tool function for every user query. This is not optional. Documents are already uploaded in the system. Call document_search_tool(query='[user question]') first, then provide your answer based on the search results. Never respond without using the tool."
    },
    "summarizer": {
        "name": "Summarizer Agent",
        "system_message": "You are a summarizer agent. Take the provided information and create concise, well-structured summaries that capture the key points. Focus on clarity and completeness while maintaining brevity."
    }
}


# Note: AgentConfig and Connection are defined as Pydantic models in main.py
# We'll work with the Pydantic models directly


def create_agent(agent_config: AgentConfig, client: OpenAIChatCompletionClient) -> AssistantAgent:
    """Create an AutoGen AssistantAgent with OpenAI-powered tools"""
    base_config = AGENT_CONFIGS.get(agent_config.type, {})
    system_message = agent_config.system_message or base_config.get("system_message", "You are a helpful AI assistant.")
    
    print(f"Creating AssistantAgent {agent_config.id} of type {agent_config.type}")
    print(f"System message: {system_message[:100]}...")
    
    # Get tools based on agent type
    tools = []
    if agent_config.type == "web_search":
        tools = get_web_search_tools()
        print(f"Adding OpenAI-powered web search tools to agent {agent_config.id}")
        
        # Enhanced system message for web search
        from datetime import datetime
        current_date = datetime.now().strftime("%B %d, %Y")
        
        system_message = f"""You are a web search specialist with access to current web search capabilities.

CURRENT DATE: {current_date}

INSTRUCTIONS:
1. Use the openai_web_search_tool to find the most current information from the internet
2. The search tool automatically adds current date context to ensure recent results
3. Always search before providing answers about current events or recent information
4. Provide comprehensive answers based on the most recent search results
5. Include sources and links when available
6. If search results are insufficient, explain what you found

You have access to real-time web search that prioritizes current information."""
        
    elif agent_config.type == "document_search":
        # Get selected documents from agent configuration
        selected_documents = None
        if agent_config.config and agent_config.config.get("uploadedFiles"):
            selected_documents = agent_config.config["uploadedFiles"]
            print(f"Agent {agent_config.id} configured to search {len(selected_documents)} specific documents: {selected_documents}")
        else:
            print(f"Agent {agent_config.id} will search all available documents")
        
        tools = get_document_search_tools(selected_documents)
        print(f"Adding document search tools to agent {agent_config.id}")
        
        # Enhanced system message for document search
        if selected_documents:
            doc_list = ", ".join(selected_documents)
            system_message = f"""You are a document search specialist with access to specific uploaded documents: {doc_list}.

CRITICAL INSTRUCTIONS:
1. You MUST call filtered_document_search_tool(query="[user's question]") for EVERY user query
2. NEVER provide answers without first searching the documents
3. Use the exact user question as the search query
4. Provide comprehensive answers based on the search results from the selected documents
5. If no relevant information is found, state this clearly

You have access to {len(selected_documents)} selected documents and must search them for all queries."""
        else:
            system_message = """You are a document search specialist with access to uploaded documents.

CRITICAL INSTRUCTIONS:
1. You MUST call filtered_document_search_tool(query="[user's question]") for EVERY user query
2. NEVER provide answers without first searching the documents
3. Use the exact user question as the search query
4. Provide comprehensive answers based on the search results
5. If no relevant information is found, state this clearly

You have access to uploaded documents and must search them for all queries."""
    
    try:
        agent = AssistantAgent(
            name=agent_config.id,
            model_client=client,
            system_message=system_message,
            tools=tools if tools else None,
            reflect_on_tool_use=True,
            max_tool_iterations=3
        )
        print(f"Successfully created AssistantAgent {agent_config.id} with {len(tools)} tools")
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