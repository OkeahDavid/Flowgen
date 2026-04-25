"""Web search and document search tools for agents."""

import os
from typing import List, Annotated
from openai import OpenAI
from pydantic import Field
from agent_framework import tool


@tool
def openai_web_search_tool(
    query: Annotated[str, Field(description="The search query to find information on the web")],
) -> str:
    """Use OpenAI's native web search capability via the Responses API."""
    try:
        from datetime import datetime
        from app.config import OPENAI_MODEL

        current_date = datetime.now()
        current_full_date = current_date.strftime("%B %d, %Y")

        print(f"Performing OpenAI web search for: {query}")
        print(f"Current date context: {current_full_date}")

        # Use the configured model (gpt-4o-mini by default) – reasoning models
        # like o4-mini have very low RPM limits and cause 429 errors.
        model = OPENAI_MODEL or "gpt-4o"
        client = OpenAI(api_key=os.getenv("OPENAI_API_KEY"))
        response = client.responses.create(
            model=model,
            tools=[{"type": "web_search"}],
            input=query,
        )

        if response.output_text:
            formatted_result = (
                f"Web search results for '{query}' (searched: {current_full_date}):\n\n"
                f"{response.output_text}"
            )

            if hasattr(response, "output") and response.output:
                for item in response.output:
                    if item.type == "message" and hasattr(item, "content"):
                        for content in item.content:
                            if hasattr(content, "annotations") and content.annotations:
                                formatted_result += "\n\n**Sources:**\n"
                                for annotation in content.annotations:
                                    if annotation.type == "url_citation":
                                        formatted_result += f"- [{annotation.title}]({annotation.url})\n"

            formatted_result += f"\n\nSearch completed using OpenAI's web search for {current_full_date}."
            print("OpenAI web search completed successfully.")
            return formatted_result
        else:
            return f"No web search results found for: {query}"

    except Exception as e:
        print(f"Error performing OpenAI web search: {e}")
        return _fallback_web_search(query)


def _fallback_web_search(query: str) -> str:
    """Fallback web search using DuckDuckGo."""
    try:
        from datetime import datetime
        from ddgs import DDGS

        current_month_year = datetime.now().strftime("%B %Y")
        enhanced_query = f"{query} {current_month_year} recent news latest"

        with DDGS() as ddgs:
            search_results = list(ddgs.text(enhanced_query, max_results=5))

        if not search_results:
            return f"No web search results found for: {query}"

        formatted = f"Web search results for '{query}' (searched: {current_month_year}):\n\n"
        for i, result in enumerate(search_results, 1):
            title = result.get("title", "No title")
            snippet = result.get("body", "No description")[:300]
            url = result.get("href", "No URL")
            formatted += f"**Result {i}**\n*Title: {title}*\n*URL: {url}*\n{snippet}\n\n"

        return formatted

    except Exception as e:
        return f"Error performing fallback web search: {e}"


@tool
def document_search_tool(
    query: Annotated[str, Field(description="The search query")],
    max_results: Annotated[int, Field(description="Maximum number of results")] = 5,
    filter_documents: Annotated[List[str] | None, Field(description="Optional list of filenames to search")] = None,
) -> str:
    """Search through uploaded documents using vector similarity search."""
    try:
        from app.services.document_service import get_document_processor

        print(f"Performing vector document search for: {query}")

        api_key = os.getenv("OPENAI_API_KEY")
        if not api_key:
            return "Error: OpenAI API key not configured."

        doc_processor = get_document_processor(api_key)
        doc_info = doc_processor.list_documents()
        documents = doc_info.get("documents", [])

        if not documents:
            return "No documents have been uploaded yet."

        search_results = doc_processor.search_documents(query, max_results, filter_documents)

        if not search_results:
            return f"No relevant information found for query: '{query}'."

        formatted = f"Document search results for '{query}':\n\n"
        for i, result in enumerate(search_results, 1):
            score = result.get("relevance_score", 0.0)
            fname = result.get("filename", "Unknown")
            content = result.get("content", "")[:2000]
            formatted += f"**Result {i}** (Relevance: {score:.2f})\n*Source: {fname}*\n{content}\n\n"

        return formatted

    except Exception as e:
        return f"Error performing document search: {e}"


def create_document_search_tool(filter_documents: List[str] | None = None):
    """Create a document search tool optionally scoped to specific files."""

    @tool
    def filtered_document_search_tool(
        query: Annotated[str, Field(description="The search query")],
        max_results: Annotated[int, Field(description="Maximum number of results")] = 5,
    ) -> str:
        """Search through selected uploaded documents using vector search."""
        return document_search_tool(query, max_results, filter_documents)

    return filtered_document_search_tool


def get_web_search_tools() -> List:
    return [openai_web_search_tool]


def get_document_search_tools(filter_documents: List[str] | None = None) -> List:
    return [create_document_search_tool(filter_documents)]
