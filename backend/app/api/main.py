import sys
import io

# Ensure UTF-8 stdout/stderr on Windows
if sys.platform == "win32":
    try:
        sys.stdout.reconfigure(encoding='utf-8', errors='replace')
        sys.stderr.reconfigure(encoding='utf-8', errors='replace')
    except Exception:
        pass

from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.config import settings
from app.db.database import init_db
from app.rag.store import knowledge_store
from app.api.routes import router as api_router

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup: initialize database and ingest KB articles
    print("[ResolveIQ] Initializing database & seed records...")
    await init_db()
    print("[ResolveIQ] Ingesting Knowledge Base into Vector Store...")
    knowledge_store.ingest_articles()
    print("[ResolveIQ] System startup complete. Ready to serve.")
    yield
    # Shutdown
    print("[ResolveIQ] Shutting down.")

app = FastAPI(
    title=settings.PROJECT_NAME,
    version=settings.VERSION,
    lifespan=lifespan,
    docs_url="/docs",
    redoc_url="/redoc"
)

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Mount Routes
app.include_router(api_router, prefix="/api")

@app.get("/")
async def root():
    return {
        "app": "ResolveIQ IT Service Desk",
        "status": "online",
        "docs": "/docs"
    }

@app.get("/health")
async def health():
    return {
        "status": "healthy",
        "version": settings.VERSION,
        "knowledge_chunks": len(knowledge_store.chunks),
        "database": "connected"
    }

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("app.api.main:app", host=settings.HOST, port=settings.PORT, reload=True)
