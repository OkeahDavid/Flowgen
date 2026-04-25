"""
Standalone workflow test – verifies agent creation, workflow building,
and execution without needing the frontend or FastAPI server.

Usage:
    cd backend
    uv run python -m tests.test_workflow

Set OPENAI_API_KEY in .env before running.
"""

import asyncio
import sys
import os
import time

# Ensure the backend root is on sys.path so `app` package is importable
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from dotenv import load_dotenv

load_dotenv()

from agent_framework.openai import OpenAIChatCompletionClient
from app.schemas import AgentConfig, Connection
from app.agents.builder import build_workflow
from app.agents.configs import AGENT_CONFIGS


# ── Helpers ──────────────────────────────────────────────────────────────────

def header(text: str):
    print(f"\n{'='*60}")
    print(f"  {text}")
    print(f"{'='*60}")


def step(text: str):
    print(f"\n  ▸ {text}")


def ok(text: str):
    print(f"  ✓ {text}")


def fail(text: str):
    print(f"  ✗ {text}")


# ── Tests ────────────────────────────────────────────────────────────────────

def test_agent_configs():
    """Verify all agent type definitions are present."""
    header("1. Agent Configs")
    for key, cfg in AGENT_CONFIGS.items():
        ok(f"{key}: {cfg['name']}")
    assert len(AGENT_CONFIGS) >= 3, "Expected at least 3 agent types"
    ok(f"All {len(AGENT_CONFIGS)} agent types loaded")


def test_build_workflow_topology():
    """Build a workflow and verify executor graph without calling OpenAI."""
    header("2. Workflow Topology (no API call)")

    agents = [
        AgentConfig(id="a1", name="Search", type="summarizer"),
        AgentConfig(id="a2", name="Summarizer", type="summarizer"),
    ]
    connections = [Connection(source_id="a1", target_id="a2")]

    api_key = os.getenv("OPENAI_API_KEY", "")
    if not api_key:
        fail("OPENAI_API_KEY not set – skipping build test")
        return

    client = OpenAIChatCompletionClient(model="gpt-4o-mini", api_key=api_key)
    workflow, instances = build_workflow(agents, connections, client)

    ok(f"Built workflow with {len(instances)} agents")
    ok(f"Start executor: {workflow.get_start_executor()}")
    ok(f"Output executors: {workflow.get_output_executors()}")
    ok(f"All executors: {[str(e) for e in workflow.get_executors_list()]}")


async def test_single_agent_execution():
    """Run a single summarizer agent (cheapest call) and check output."""
    header("3. Single-Agent Execution")

    api_key = os.getenv("OPENAI_API_KEY", "")
    if not api_key:
        fail("OPENAI_API_KEY not set – skipping execution test")
        return

    agents = [AgentConfig(id="summarizer_1", name="Summarizer", type="summarizer")]
    connections = []

    client = OpenAIChatCompletionClient(model="gpt-4o-mini", api_key=api_key)
    workflow, instances = build_workflow(agents, connections, client)

    task = "Summarize the key benefits of renewable energy in 3 bullet points."
    step(f"Task: {task}")

    t0 = time.time()
    result = await workflow.run(task)
    elapsed = time.time() - t0

    outputs = result.get_outputs()
    step(f"Execution time: {elapsed:.1f}s")
    step(f"Total events: {len(result)}")
    step(f"Outputs: {len(outputs)}")

    for i, out in enumerate(outputs):
        print(f"\n  ── Output {i+1} ──")
        if isinstance(out, dict):
            print(f"  Source: {out.get('source', 'unknown')}")
            content = out.get("content", str(out))
        else:
            content = str(out)
        # Print content with indentation
        for line in content.split("\n"):
            print(f"    {line}")

    assert len(outputs) > 0, "Expected at least one output"
    ok("Single-agent execution passed")


async def test_two_agent_pipeline():
    """Run a two-agent pipeline (summarizer → creative_writer) with streaming."""
    header("4. Two-Agent Pipeline (streamed)")

    api_key = os.getenv("OPENAI_API_KEY", "")
    if not api_key:
        fail("OPENAI_API_KEY not set – skipping pipeline test")
        return

    agents = [
        AgentConfig(id="summarizer_1", name="Summarizer", type="summarizer"),
        AgentConfig(id="writer_1", name="Writer", type="creative_writer"),
    ]
    connections = [Connection(source_id="summarizer_1", target_id="writer_1")]

    client = OpenAIChatCompletionClient(model="gpt-4o-mini", api_key=api_key)
    workflow, instances = build_workflow(agents, connections, client)

    task = "Explain quantum computing in simple terms."
    step(f"Task: {task}")

    t0 = time.time()

    # Use streaming to show step-by-step events
    stream = workflow.run(task, stream=True)
    event_count = 0
    async for event in stream:
        event_count += 1
        evt_type = str(getattr(event, "type", "event"))

        if evt_type == "executor_invoked":
            eid = getattr(event, "executor_id", "?")
            step(f"[{evt_type}] Agent '{eid}' started processing")
        elif evt_type == "executor_completed":
            eid = getattr(event, "executor_id", "?")
            step(f"[{evt_type}] Agent '{eid}' finished")
        elif evt_type == "data":
            eid = getattr(event, "executor_id", "?")
            data = getattr(event, "data", None)
            text = getattr(data, "text", str(data)) if data else ""
            preview = text[:120].replace("\n", " ")
            step(f"[{evt_type}] Agent '{eid}' data: {preview}…")
        elif evt_type == "output":
            eid = getattr(event, "executor_id", "?")
            data = getattr(event, "data", None)
            step(f"[{evt_type}] Final output from '{eid}'")
        elif evt_type in ("superstep_started", "superstep_completed"):
            step(f"[{evt_type}] iteration={getattr(event, 'data', '?')}")
        elif evt_type in ("started", "status"):
            step(f"[{evt_type}]")
        else:
            step(f"[{evt_type}] {str(getattr(event, 'data', ''))[:80]}")

    elapsed = time.time() - t0

    # Get final result
    final = await stream.get_final_response()
    outputs = final.get_outputs()

    step(f"Execution time: {elapsed:.1f}s")
    step(f"Total streamed events: {event_count}")
    step(f"Final outputs: {len(outputs)}")

    for i, out in enumerate(outputs):
        print(f"\n  ── Output {i+1} ──")
        if isinstance(out, dict):
            content = out.get("content", str(out))
        else:
            content = str(out)
        for line in content.split("\n"):
            print(f"    {line}")

    assert len(outputs) > 0, "Expected at least one output"
    ok("Two-agent pipeline passed")


# ── Main ─────────────────────────────────────────────────────────────────────

async def main():
    header("Flowgen Workflow Tests")
    print(f"  OPENAI_API_KEY: {'set' if os.getenv('OPENAI_API_KEY') else 'NOT SET'}")

    test_agent_configs()
    test_build_workflow_topology()
    await test_single_agent_execution()
    await test_two_agent_pipeline()

    header("All Tests Passed ✓")


if __name__ == "__main__":
    asyncio.run(main())
