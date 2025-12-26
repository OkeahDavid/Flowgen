"""
Web search and document search tools using OpenAI's APIs.
"""

import os
from typing import List
from openai import OpenAI
from document_service import get_document_processor


def openai_web_search_tool(query: str) -> str:
    """
    Use OpenAI's native web search capability via the Responses API.
    
    Args:
        query: The search query
        
    Returns:
        Web search results from OpenAI with citations
    """
    try:
        # Add current date context to the query for more relevant results
        from datetime import datetime
        current_date = datetime.now()
        current_month_year = current_date.strftime("%B %Y")  # e.g., "October 2025"
        current_full_date = current_date.strftime("%B %d, %Y")  # e.g., "October 12, 2025"
        
        # Enhance query with current date context
        enhanced_query = f"{query} {current_month_year} recent news latest updates"
        
        print(f"Performing OpenAI web search for: {enhanced_query}")
        print(f"Current date context: {current_full_date}")
        
        # Create OpenAI client
        client = OpenAI(api_key=os.getenv("OPENAI_API_KEY"))
        
        # Use OpenAI's Responses API with web search tool
        response = client.responses.create(
            model="o4-mini",
            tools=[{"type": "web_search"}],
            input=enhanced_query
        )
        
        # Extract the response
        if response.output_text:
            formatted_result = f"Web search results for '{query}' (searched: {current_month_year}):\n\n{response.output_text}"
            
            # Add citation information if available
            if hasattr(response, 'output') and response.output:
                for item in response.output:
                    if item.type == "message" and hasattr(item, 'content'):
                        for content in item.content:
                            if hasattr(content, 'annotations') and content.annotations:
                                formatted_result += "\n\n **Sources:**\n"
                                for annotation in content.annotations:
                                    if annotation.type == "url_citation":
                                        formatted_result += f"- [{annotation.title}]({annotation.url})\n"
            
            formatted_result += f"\n\n Search completed using OpenAI's web search for {current_full_date}."
            print(f"OpenAI web search completed successfully.")
            return formatted_result
        else:
            return f"No web search results found for: {query}"
        
    except Exception as e:
        error_msg = f"Error performing OpenAI web search: {str(e)}"
        print(error_msg)
        # Fallback to DuckDuckGo if OpenAI web search fails
        return fallback_web_search_tool(query)


def fallback_web_search_tool(query: str) -> str:
    """
    Fallback web search using DuckDuckGo search when OpenAI web search is unavailable.
    
    Args:
        query: The search query
        
    Returns:
        Web search results with titles, snippets, and URLs
    """
    try:
        # Add current date context to the query
        from datetime import datetime
        current_date = datetime.now()
        current_month_year = current_date.strftime("%B %Y")  # e.g., "October 2025"
        
        # Enhance query with current date context
        enhanced_query = f"{query} {current_month_year} recent news latest"
        
        print(f"Performing fallback web search for: {enhanced_query}")
        
        from ddgs import DDGS
        
        # Perform web search using DuckDuckGo
        with DDGS() as ddgs:
            search_results = list(ddgs.text(enhanced_query, max_results=5))
        
        if not search_results:
            return f"No web search results found for: {query}"
        
        # Format results
        formatted_results = f"Web search results for '{query}' (searched: {current_month_year}):\n\n"
        
        for i, result in enumerate(search_results, 1):
            title = result.get("title", "No title")
            snippet = result.get("body", "No description")
            url = result.get("href", "No URL")
            
            # Truncate very long snippets
            if len(snippet) > 300:
                snippet = snippet[:300] + "..."
            
            formatted_results += f"**Result {i}**\n"
            formatted_results += f"*Title: {title}*\n"
            formatted_results += f"*URL: {url}*\n"
            formatted_results += f"{snippet}\n\n"
        
        formatted_results += f" Search completed: Found {len(search_results)} results from the web (fallback search for {current_month_year})."
        
        print(f"Fallback web search completed. Found {len(search_results)} results.")
        return formatted_results
        
    except Exception as e:
        error_msg = f"Error performing fallback web search: {str(e)}"
        print(error_msg)
        return error_msg


def document_search_tool(query: str = "", max_results: int = 5, filter_documents: List[str] = None) -> str:
    """
    Search through uploaded documents using our existing vector search.
    
    Args:
        query: The search query - pass the user's question directly here
        max_results: Maximum number of results to return (default: 5)
        filter_documents: Optional list of document filenames to search in (if None, searches all documents)
        
    Returns:
        Detailed search results from uploaded documents with content and relevance scores
    """
    try:
        print(f"Performing vector document search for: {query}")
        if filter_documents:
            print(f"Filtering search to documents: {filter_documents}")
        
        # Get OpenAI API key
        api_key = os.getenv("OPENAI_API_KEY")
        if not api_key:
            return "Error: OpenAI API key not configured. Please set the OPENAI_API_KEY environment variable."
        
        # Get document processor instance
        doc_processor = get_document_processor(api_key)
        
        # Get document list
        doc_info = doc_processor.list_documents()
        documents = doc_info.get("documents", [])
        
        if not documents:
            return "No documents have been uploaded yet. Please upload documents first using the document upload feature."
        
        # If filter_documents is specified, check if those documents exist
        if filter_documents:
            available_docs = [doc["filename"] for doc in documents]
            missing_docs = [doc for doc in filter_documents if doc not in available_docs]
            if missing_docs:
                return f"Some specified documents were not found: {missing_docs}. Available documents: {available_docs}"
        
        # Perform vector search with optional filtering
        search_results = doc_processor.search_documents(query, max_results, filter_documents)
        
        if not search_results:
            search_scope = f"the specified {len(filter_documents)} documents" if filter_documents else f"{len(documents)} uploaded documents"
            return f"No relevant information found in {search_scope} for query: '{query}'. Try rephrasing your query or check if the information exists in your documents."
        
        # Format results with relevance scores
        formatted_results = f"Document search results for '{query}':\n\n"
        search_scope_text = f" (filtered to {len(filter_documents)} selected documents)" if filter_documents else ""
        formatted_results += f"Found {len(search_results)} relevant passages{search_scope_text}:\n\n"
        
        for i, result in enumerate(search_results, 1):
            relevance_score = result.get("relevance_score", 0.0)
            filename = result.get("filename", "Unknown")
            content = result.get("content", "")
            
            # Truncate very long content (increased from 300 to 2000 for better context)
            if len(content) > 2000:
                content = content[:2000] + "..."
            
            formatted_results += f"**Result {i}** (Relevance: {relevance_score:.2f})\n"
            formatted_results += f"*Source: {filename}*\n"
            formatted_results += f"{content}\n\n"
        
        # Add summary info
        total_chunks = sum(doc.get("chunk_count", 0) for doc in documents)
        if filter_documents:
            formatted_results += f" Search completed: Found {len(search_results)} relevant passages from {len(filter_documents)} selected documents."
        else:
            formatted_results += f" Search completed: Found {len(search_results)} relevant passages from {total_chunks} total document chunks across {len(documents)} uploaded documents."

        print(f"Vector document search completed. Found {len(search_results)} relevant passages.")
        return formatted_results
        
    except Exception as e:
        error_msg = f"Error performing document search: {str(e)}"
        print(error_msg)
        return error_msg


def get_web_search_tools() -> List:
    """Get list of web search tools for agents"""
    return [openai_web_search_tool]


def create_document_search_tool(filter_documents: List[str] = None):
    """Create a document search tool with specific document filtering"""
    def filtered_document_search_tool(query: str = "", max_results: int = 5) -> str:
        """Search through selected uploaded documents using vector search."""
        return document_search_tool(query, max_results, filter_documents)
    
    # Update the docstring to reflect the filtering
    if filter_documents:
        filtered_document_search_tool.__doc__ = f"""
        Search through selected uploaded documents ({', '.join(filter_documents)}) using vector search.
        
        Args:
            query: The search query - pass the user's question directly here
            max_results: Maximum number of results to return (default: 5)
            
        Returns:
            Detailed search results from the selected documents with content and relevance scores
        """
    
    return filtered_document_search_tool


def get_document_search_tools(filter_documents: List[str] = None) -> List:
    """Get list of document search tools for agents"""
    return [create_document_search_tool(filter_documents)]