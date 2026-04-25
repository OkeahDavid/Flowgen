"""Entry point – re-exports the FastAPI app from the app package.

Start with:
    uvicorn main:app --reload
or:
    uv run uvicorn main:app --reload
"""

from app.main import app  # noqa: F401

if __name__ == "__main__":
    import uvicorn
    import os

    port = int(os.getenv("BACKEND_PORT", 8000))
    host = os.getenv("BACKEND_HOST", "0.0.0.0")
    uvicorn.run("main:app", host=host, port=port, reload=True)
