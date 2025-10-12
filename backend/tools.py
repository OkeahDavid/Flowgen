"""
Web search and document search tools for AutoGen agents.
"""

import requests
from bs4 import BeautifulSoup
from ddgs import DDGS
from typing import List


def web_search_tool(query: str, max_results: int = 5) -> str:
    """
    Search the web using DuckDuckGo and return formatted results.
    
    Args:
        query: The search query
        max_results: Maximum number of results to return
        
    Returns:
        Formatted search results as a string
    """
    try:
        print(f"Performing web search for: {query}")
        
        with DDGS() as ddgs:
            results = list(ddgs.text(query, max_results=max_results))
            
        if not results:
            return f"No results found for query: {query}"
            
        formatted_results = f"Web search results for '{query}':\n\n"
        
        for i, result in enumerate(results, 1):
            title = result.get('title', 'No title')
            body = result.get('body', 'No description')
            href = result.get('href', 'No URL')
            
            formatted_results += f"{i}. **{title}**\n"
            formatted_results += f"   {body}\n"
            formatted_results += f"   Source: {href}\n\n"
            
        print(f"Web search completed. Found {len(results)} results.")
        return formatted_results
        
    except Exception as e:
        error_msg = f"Error performing web search: {str(e)}"
        print(error_msg)
        return error_msg


def scrape_webpage_tool(url: str) -> str:
    """
    Scrape content from a webpage.
    
    Args:
        url: The URL to scrape
        
    Returns:
        Scraped content as a string
    """
    try:
        print(f"Scraping webpage: {url}")
        
        headers = {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
        }
        
        response = requests.get(url, headers=headers, timeout=10)
        response.raise_for_status()
        
        soup = BeautifulSoup(response.content, 'html.parser')
        
        # Remove script and style elements
        for script in soup(["script", "style"]):
            script.decompose()
            
        # Get text content
        text = soup.get_text()
        
        # Clean up text
        lines = (line.strip() for line in text.splitlines())
        chunks = (phrase.strip() for line in lines for phrase in line.split("  "))
        text = ' '.join(chunk for chunk in chunks if chunk)
        
        # Limit content length
        if len(text) > 2000:
            text = text[:2000] + "... [Content truncated]"
            
        print(f"Successfully scraped webpage. Content length: {len(text)}")
        return f"Content from {url}:\n\n{text}"
        
    except Exception as e:
        error_msg = f"Error scraping webpage {url}: {str(e)}"
        print(error_msg)
        return error_msg


def document_search_tool(query: str, documents: List[str] = None) -> str:
    """
    Search through documents for relevant information.
    
    Args:
        query: The search query
        documents: List of document content to search through
        
    Returns:
        Search results from documents
    """
    try:
        print(f"Performing document search for: {query}")
        
        if not documents:
            return "No documents provided for search. Please upload documents first."
            
        results = []
        query_lower = query.lower()
        
        for i, doc in enumerate(documents):
            if query_lower in doc.lower():
                # Find sentences containing the query
                sentences = doc.split('.')
                relevant_sentences = [s.strip() for s in sentences if query_lower in s.lower()]
                
                if relevant_sentences:
                    for sentence in relevant_sentences[:3]:  # Limit to 3 sentences per document
                        results.append(f"Document {i+1}: {sentence}.")
                        
        if not results:
            return f"No relevant information found in documents for query: {query}"
            
        formatted_results = f"Document search results for '{query}':\n\n"
        formatted_results += "\n".join(results)
        
        print(f"Document search completed. Found {len(results)} relevant passages.")
        return formatted_results
        
    except Exception as e:
        error_msg = f"Error performing document search: {str(e)}"
        print(error_msg)
        return error_msg


def get_web_search_tools() -> List:
    """Get list of web search tools for agents"""
    return [web_search_tool, scrape_webpage_tool]


def get_document_search_tools() -> List:
    """Get list of document search tools for agents"""
    return [document_search_tool]