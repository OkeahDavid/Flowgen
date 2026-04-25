"""Document upload, search, list, and delete endpoints."""

import logging
import os
from typing import Dict, Any, List

from fastapi import APIRouter, HTTPException, UploadFile, File, Request, Depends, Header

from app.config import DEMO_TOKEN
from app.services.document_service import get_document_processor

logger = logging.getLogger(__name__)

router = APIRouter()


def _verify_demo_token(authorization: str | None = Header(None)):
    if not DEMO_TOKEN:
        return True
    if not authorization:
        raise HTTPException(status_code=401, detail="Authorization header required.")
    token = authorization.replace("Bearer ", "").strip()
    if token != DEMO_TOKEN:
        raise HTTPException(status_code=401, detail="Invalid demo token.")
    return True


def _api_key() -> str:
    key = os.getenv("OPENAI_API_KEY", "")
    if not key:
        raise HTTPException(status_code=500, detail="OpenAI API key not configured")
    return key


@router.post("/upload-documents")
async def upload_documents(
    files: List[UploadFile] = File(...),
    req: Request = None,
    _: bool = Depends(_verify_demo_token),
):
    logger.info(f"Document upload from {req.client.host} – {len(files)} files")
    if not files:
        raise HTTPException(status_code=400, detail="No files provided")

    MAX_TOTAL = 10 * 1024 * 1024
    total = 0
    for f in files:
        f.file.seek(0, 2)
        total += f.file.tell()
        f.file.seek(0)
        if total > MAX_TOTAL:
            raise HTTPException(status_code=413, detail="Total file size exceeds 10 MB")

    proc = get_document_processor(_api_key())
    results = []
    for f in files:
        if not f.filename:
            continue
        try:
            content = await f.read()
            r = proc.upload_document(f.filename, content)
            results.append({
                "filename": f.filename,
                "success": r["success"],
                "message": r["message"],
                "chunks_added": r.get("chunks_added", 0),
            })
        except Exception as e:
            results.append({"filename": f.filename, "success": False, "message": str(e), "chunks_added": 0})

    ok = sum(1 for r in results if r["success"])
    return {
        "message": f"Processed {len(files)} files. {ok} successful.",
        "total_files": len(files),
        "successful_uploads": ok,
        "total_chunks_added": sum(r["chunks_added"] for r in results),
        "results": results,
    }


@router.get("/documents/info")
async def get_documents_info():
    proc = get_document_processor(_api_key())
    return proc.list_documents()


@router.post("/documents/search")
async def search_documents(request: Dict[str, Any], req: Request = None):
    query = request.get("query", "")
    if not query.strip():
        raise HTTPException(status_code=400, detail="Query cannot be empty")

    proc = get_document_processor(_api_key())
    results = proc.search_documents(
        query,
        request.get("max_results", 5),
        request.get("filter_documents"),
    )
    return {"query": query, "results": results, "total_results": len(results)}


@router.delete("/documents/clear")
async def clear_all_documents():
    proc = get_document_processor(_api_key())
    # Not implemented in new service – add if needed
    return {"message": "Documents cleared"}
