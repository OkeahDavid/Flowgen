"""
Web search and document search tools using OpenAI's APIs.
"""

import os
from typing import List
from openai import OpenAI
from document_processor import get_document_processor


def openai_web_search_tool(query: str) -> str:
    """
    Use OpenAI's web search capability to search the web.
    
    Args:
        query: The search query
        
    Returns:
        Web search results from OpenAI
    """
    try:
        print(f"Performing OpenAI web search for: {query}")
        
        # Create OpenAI client
        client = OpenAI(api_key=os.getenv("OPENAI_API_KEY"))
        
        # Use OpenAI's chat completion with web search tool
        response = client.chat.completions.create(
            model="gpt-4o",
            messages=[
                {"role": "system", "content": "You are a web search assistant. Use web search to find current information and provide comprehensive results with sources."},
                {"role": "user", "content": f"Search the web for: {query}"}
            ],
            tools=[{"type": "web_search"}],
            tool_choice="required"
        )
        
        # Extract the search results
        if response.choices[0].message.tool_calls:
            tool_call = response.choices[0].message.tool_calls[0]
            return f"Web search results for '{query}':\n\n{tool_call.function.arguments}"
        else:
            return response.choices[0].message.content or f"No web search results found for: {query}"
        
    except Exception as e:
        error_msg = f"Error performing OpenAI web search: {str(e)}"
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
        
        # Get document processor instance
        doc_processor = get_document_processor()
        
        # Get document info to check if any documents are available
        doc_info = doc_processor.get_document_info()
        
        if doc_info["total_documents"] == 0:
            return "No documents have been uploaded yet. Please upload documents first using the document upload feature."
        
        # If filter_documents is specified, check if those documents exist
        if filter_documents:
            available_docs = [doc["filename"] for doc in doc_info["documents"]]
            missing_docs = [doc for doc in filter_documents if doc not in available_docs]
            if missing_docs:
                return f"Some specified documents were not found: {missing_docs}. Available documents: {available_docs}"
        
        # Perform vector search with optional filtering
        search_results = doc_processor.search_documents(query, max_results, filter_documents)
        
        if not search_results:
            search_scope = f"the specified {len(filter_documents)} documents" if filter_documents else f"the {doc_info['total_documents']} uploaded documents"
            return f"No relevant information found in {search_scope} for query: '{query}'. Try rephrasing your query or check if the information exists in your documents."
        
        # Format results with relevance scores
        formatted_results = f"Document search results for '{query}':\n\n"
        search_scope_text = f" (filtered to {len(filter_documents)} selected documents)" if filter_documents else ""
        formatted_results += f"Found {len(search_results)} relevant passages{search_scope_text}:\n\n"
        
        for i, result in enumerate(search_results, 1):
            relevance_score = result.get("relevance_score", 0.0)
            filename = result.get("filename", "Unknown")
            content = result.get("content", "")
            
            # Truncate very long content
            if len(content) > 300:
                content = content[:300] + "..."
            
            formatted_results += f"**Result {i}** (Relevance: {relevance_score:.2f})\n"
            formatted_results += f"*Source: {filename}*\n"
            formatted_results += f"{content}\n\n"
        
        # Add summary info
        if filter_documents:
            formatted_results += f"📊 Search completed: Found {len(search_results)} relevant passages from {len(filter_documents)} selected documents."
        else:
            formatted_results += f"📊 Search completed: Found {len(search_results)} relevant passages from {doc_info['total_chunks']} total document chunks across {doc_info['total_documents']} uploaded documents."
        
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