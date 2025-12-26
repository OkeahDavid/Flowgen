"""
Document management endpoints using the new clean document service.
"""
from fastapi import APIRouter, HTTPException, UploadFile, File
from typing import List, Dict, Any
import os

from document_service import get_document_processor

router = APIRouter()


@router.post("/documents/upload")
async def upload_documents(files: List[UploadFile] = File(...)):
    """Upload and process documents."""
    if not files:
        raise HTTPException(status_code=400, detail="No files provided")
    
    api_key = os.getenv("OPENAI_API_KEY")
    if not api_key:
        raise HTTPException(status_code=500, detail="OpenAI API key not configured")
    
    doc_processor = get_document_processor(api_key)
    results = []
    
    for file in files:
        if not file.filename:
            continue
        
        try:
            content = await file.read()
            result = doc_processor.upload_document(file.filename, content)
            results.append({
                "filename": file.filename,
                "success": result["success"],
                "message": result["message"],
                "chunks_added": result.get("chunks_added", 0)
            })
        except Exception as e:
            results.append({
                "filename": file.filename,
                "success": False,
                "message": str(e),
                "chunks_added": 0
            })
    
    successful = sum(1 for r in results if r["success"])
    total_chunks = sum(r["chunks_added"] for r in results)
    
    return {
        "message": f"Processed {len(files)} files. {successful} successful.",
        "total_files": len(files),
        "successful_uploads": successful,
        "total_chunks_added": total_chunks,
        "results": results
    }


@router.get("/documents/list")
async def list_documents():
    """List all documents."""
    api_key = os.getenv("OPENAI_API_KEY")
    if not api_key:
        raise HTTPException(status_code=500, detail="OpenAI API key not configured")
    
    doc_processor = get_document_processor(api_key)
    return doc_processor.list_documents()


@router.delete("/documents/{doc_id}")
async def delete_document(doc_id: str):
    """Delete a document by ID."""
    api_key = os.getenv("OPENAI_API_KEY")
    if not api_key:
        raise HTTPException(status_code=500, detail="OpenAI API key not configured")
    
    doc_processor = get_document_processor(api_key)
    success = doc_processor.delete_document(doc_id)
    
    if not success:
        raise HTTPException(status_code=404, detail="Document not found")
    
    return {"message": "Document deleted successfully"}


@router.post("/documents/search")
async def search_documents(request: Dict[str, Any]):
    """Search documents using vector similarity."""
    query = request.get("query", "")
    max_results = request.get("max_results", 5)
    filter_filenames = request.get("filter_documents", None)
    
    if not query.strip():
        raise HTTPException(status_code=400, detail="Query cannot be empty")
    
    api_key = os.getenv("OPENAI_API_KEY")
    if not api_key:
        raise HTTPException(status_code=500, detail="OpenAI API key not configured")
    
    doc_processor = get_document_processor(api_key)
    results = doc_processor.search_documents(query, max_results, filter_filenames)
    
    return {
        "query": query,
        "results": results,
        "total_results": len(results)
    }
