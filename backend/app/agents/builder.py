"""Agent creation and workflow building."""

from typing import List, Dict
from datetime import datetime

from agent_framework import Agent, WorkflowBuilder, executor, WorkflowContext
from agent_framework.openai import OpenAIChatCompletionClient

from app.schemas import AgentConfig, Connection
from app.agents.configs import AGENT_CONFIGS
from app.agents.tools import get_web_search_tools, get_document_search_tools


def create_agent(agent_config: AgentConfig, client: OpenAIChatCompletionClient) -> Agent:
    """Create an Agent Framework Agent with tools based on type."""
    base_config = AGENT_CONFIGS.get(agent_config.type, {})
    system_message = agent_config.system_message or base_config.get(
        "system_message", "You are a helpful AI assistant."
    )

    print(f"Creating Agent {agent_config.id} of type {agent_config.type}")
    print(f"Instructions: {system_message[:100]}...")

    tools = []
    if agent_config.type == "web_search":
        tools = get_web_search_tools()
        print(f"Adding OpenAI-powered web search tools to agent {agent_config.id}")

        current_date = datetime.now().strftime("%B %d, %Y")
        system_message = (
            "You are a web search specialist with access to current web search capabilities.\n\n"
            f"CURRENT DATE: {current_date}\n\n"
            "INSTRUCTIONS:\n"
            "1. Use the openai_web_search_tool to find the most current information from the internet\n"
            "2. The search tool automatically adds current date context to ensure recent results\n"
            "3. Always search before providing answers about current events or recent information\n"
            "4. Provide comprehensive answers based on the most recent search results\n"
            "5. Include sources and links when available\n"
            "6. If search results are insufficient, explain what you found\n\n"
            "You have access to real-time web search that prioritizes current information."
        )

    elif agent_config.type == "document_search":
        selected_documents = None
        if agent_config.config and agent_config.config.get("uploadedFiles"):
            selected_documents = agent_config.config["uploadedFiles"]
            print(f"Agent {agent_config.id} configured to search {len(selected_documents)} specific documents")
        else:
            print(f"Agent {agent_config.id} will search all available documents")

        tools = get_document_search_tools(selected_documents)

        if selected_documents:
            doc_list = ", ".join(selected_documents)
            system_message = (
                f"You are a document search specialist with access to specific uploaded documents: {doc_list}.\n\n"
                "CRITICAL INSTRUCTIONS:\n"
                '1. You MUST call filtered_document_search_tool(query="[user\'s question]") for EVERY user query\n'
                "2. NEVER provide answers without first searching the documents\n"
                "3. Use the exact user question as the search query\n"
                "4. Provide comprehensive answers based on the search results\n"
                "5. If no relevant information is found, state this clearly\n\n"
                f"You have access to {len(selected_documents)} selected documents and must search them for all queries."
            )
        else:
            system_message = (
                "You are a document search specialist with access to uploaded documents.\n\n"
                "CRITICAL INSTRUCTIONS:\n"
                '1. You MUST call filtered_document_search_tool(query="[user\'s question]") for EVERY user query\n'
                "2. NEVER provide answers without first searching the documents\n"
                "3. Use the exact user question as the search query\n"
                "4. Provide comprehensive answers based on the search results\n"
                "5. If no relevant information is found, state this clearly"
            )

    agent = Agent(
        name=agent_config.id,
        client=client,
        instructions=system_message,
        tools=tools if tools else None,
    )
    print(f"Successfully created Agent {agent_config.id} with {len(tools)} tools")
    return agent


def build_workflow(
    agents: List[AgentConfig],
    connections: List[Connection],
    client: OpenAIChatCompletionClient,
):
    """Build an Agent Framework Workflow from the visual graph definition."""
    agent_instances = {}
    for agent_config in agents:
        agent = create_agent(agent_config, client)
        agent_instances[agent_config.id] = agent

    targets = {conn.target_id for conn in connections}
    sources = {conn.source_id for conn in connections}
    entry_points = [aid for aid in agent_instances if aid not in targets]
    terminal_nodes = {aid for aid in agent_instances if aid not in sources}

    if not entry_points:
        entry_points = [agents[0].id]

    adjacency: Dict[str, List[str]] = {}
    for conn in connections:
        adjacency.setdefault(conn.source_id, []).append(conn.target_id)

    executors = {}
    for agent_id, agent_inst in agent_instances.items():
        is_terminal = agent_id in terminal_nodes
        downstream = adjacency.get(agent_id, [])
        executors[agent_id] = _make_executor(agent_id, agent_inst, is_terminal, downstream)

    start_exec = executors[entry_points[0]]
    builder = WorkflowBuilder(start_executor=start_exec)

    for conn in connections:
        src_exec = executors.get(conn.source_id)
        tgt_exec = executors.get(conn.target_id)
        if src_exec and tgt_exec:
            builder.add_edge(src_exec, tgt_exec)
            print(f"Adding edge: {conn.source_id} -> {conn.target_id}")

    workflow = builder.build()
    print(f"Built workflow with {len(agent_instances)} agents and {len(connections)} connections")
    return workflow, list(agent_instances.values())


def _make_executor(agent_id: str, agent_inst: Agent, is_terminal: bool, downstream: List[str]):
    """Create an executor function for a specific agent."""
    if is_terminal:

        @executor(id=agent_id)
        async def terminal_exec(input_msg: str, ctx: WorkflowContext) -> None:
            stream = agent_inst.run(input_msg, stream=True)
            full_text = ""
            async for update in stream:
                chunk = update.text or ""
                if chunk:
                    full_text += chunk
                    await ctx.yield_output({"source": agent_id, "content": full_text, "chunk": chunk, "streaming": True})
            final = await stream.get_final_response()
            full_text = final.text or full_text
            await ctx.yield_output({"source": agent_id, "content": full_text, "done": True})

        return terminal_exec
    else:

        @executor(id=agent_id)
        async def relay_exec(input_msg: str, ctx: WorkflowContext) -> None:
            stream = agent_inst.run(input_msg, stream=True)
            full_text = ""
            async for update in stream:
                chunk = update.text or ""
                if chunk:
                    full_text += chunk
                    await ctx.yield_output({"source": agent_id, "content": full_text, "chunk": chunk, "streaming": True})
            final = await stream.get_final_response()
            full_text = final.text or full_text
            await ctx.yield_output({"source": agent_id, "content": full_text, "done": True})
            await ctx.send_message(full_text)

        return relay_exec
