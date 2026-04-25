"""
Agent creation and workflow building functionality.
Migrated from AutoGen to Microsoft Agent Framework.
"""

from typing import List, Dict, Any, Optional
from pydantic import BaseModel

from agent_framework import Agent, WorkflowBuilder, executor, WorkflowContext
from agent_framework.openai import OpenAIChatCompletionClient
from tools import get_web_search_tools, get_document_search_tools
import os


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
    },
    "creative_writer": {
        "name": "Creative Writer Agent",
        "system_message": "You are a creative writer agent. Generate compelling, original content including articles, stories, marketing copy, blog posts, and creative writing. Focus on engaging prose, vivid descriptions, and strong narrative structure. Adapt your tone and style to match the context and audience."
    }
}


def create_agent(agent_config: AgentConfig, client: OpenAIChatCompletionClient) -> Agent:
    """Create an Agent Framework Agent with tools based on type"""
    base_config = AGENT_CONFIGS.get(agent_config.type, {})
    system_message = agent_config.system_message or base_config.get("system_message", "You are a helpful AI assistant.")

    print(f"Creating Agent {agent_config.id} of type {agent_config.type}")
    print(f"Instructions: {system_message[:100]}...")

    # Get tools based on agent type
    tools = []
    if agent_config.type == "web_search":
        tools = get_web_search_tools()
        print(f"Adding OpenAI-powered web search tools to agent {agent_config.id}")

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
        selected_documents = None
        if agent_config.config and agent_config.config.get("uploadedFiles"):
            selected_documents = agent_config.config["uploadedFiles"]
            print(f"Agent {agent_config.id} configured to search {len(selected_documents)} specific documents: {selected_documents}")
        else:
            print(f"Agent {agent_config.id} will search all available documents")

        tools = get_document_search_tools(selected_documents)
        print(f"Adding document search tools to agent {agent_config.id}")

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
        agent = Agent(
            name=agent_config.id,
            client=client,
            instructions=system_message,
            tools=tools if tools else None,
        )
        print(f"Successfully created Agent {agent_config.id} with {len(tools)} tools")
        return agent
    except Exception as e:
        print(f"Error creating agent {agent_config.id}: {str(e)}")
        raise


def build_workflow(agents: List[AgentConfig], connections: List[Connection], client: OpenAIChatCompletionClient):
    """Build Agent Framework Workflow from agent configuration.
    
    Translates the user's visual graph (agents + connections) into a
    WorkflowBuilder with executor functions wrapping each Agent.
    """
    # Create agent instances
    agent_instances = {}
    for agent_config in agents:
        agent = create_agent(agent_config, client)
        agent_instances[agent_config.id] = agent

    # Determine graph topology
    # Find which agents have no incoming connections (entry points)
    targets = {conn.target_id for conn in connections}
    sources = {conn.source_id for conn in connections}
    entry_points = [aid for aid in agent_instances if aid not in targets]
    # Agents with no outgoing connections are terminal nodes
    terminal_nodes = {aid for aid in agent_instances if aid not in sources}

    if not entry_points:
        # If all agents have incoming connections, use the first agent as entry
        entry_points = [agents[0].id]

    # Build adjacency list
    adjacency: Dict[str, List[str]] = {}
    for conn in connections:
        adjacency.setdefault(conn.source_id, []).append(conn.target_id)

    # Create executor functions for each agent
    executors = {}

    for agent_id, agent_inst in agent_instances.items():
        is_terminal = agent_id in terminal_nodes
        downstream = adjacency.get(agent_id, [])

        # Create executor with closure over agent and routing info
        exec_fn = _make_executor(agent_id, agent_inst, is_terminal, downstream)
        executors[agent_id] = exec_fn

    # Build the workflow
    start_exec = executors[entry_points[0]]
    builder = WorkflowBuilder(start_executor=start_exec)

    # Add edges based on connections
    for conn in connections:
        src_exec = executors.get(conn.source_id)
        tgt_exec = executors.get(conn.target_id)
        if src_exec and tgt_exec:
            builder.add_edge(src_exec, tgt_exec)
            print(f"Adding edge: {conn.source_id} -> {conn.target_id}")
        else:
            print(f"Warning: Could not find executors for connection {conn.source_id} -> {conn.target_id}")

    workflow = builder.build()
    print(f"Built workflow with {len(agent_instances)} agents and {len(connections)} connections")
    return workflow, list(agent_instances.values())


def _make_executor(agent_id: str, agent_inst: Agent, is_terminal: bool, downstream: List[str]):
    """Create an executor function for a specific agent."""
    if is_terminal:
        @executor(id=agent_id)
        async def terminal_exec(input_msg: str, ctx: WorkflowContext) -> None:
            result = await agent_inst.run(input_msg)
            await ctx.yield_output({"source": agent_id, "content": result.text})
        return terminal_exec
    else:
        @executor(id=agent_id)
        async def relay_exec(input_msg: str, ctx: WorkflowContext) -> None:
            result = await agent_inst.run(input_msg)
            await ctx.send_message(result.text)
        return relay_exec