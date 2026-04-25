"""FastAPI application entry point."""

import logging
from datetime import datetime

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.config import ALLOWED_ORIGINS
from app.database import init_db
from app.routes.workflows import router as workflow_router
from app.routes.documents import router as document_router
from app.routes.api import router as api_router

logging.basicConfig(level=logging.INFO, format="%(asctime)s - %(name)s - %(levelname)s - %(message)s")

app = FastAPI(title="Flowgen API", description="API for AI agent workflows", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(workflow_router)
app.include_router(document_router)
app.include_router(api_router)


@app.on_event("startup")
async def startup_event():
    try:
        init_db()
    except Exception:
        pass


@app.get("/")
async def root():
    return {"message": "Flowgen API is running"}


@app.get("/health")
async def health_check():
    return {"status": "healthy", "timestamp": datetime.now().isoformat()}
