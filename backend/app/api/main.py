import sys
import io
from typing import Optional

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
from app.graph.workflow import create_service_desk_graph

def get_psycopg_conn_string(database_url: str) -> Optional[str]:
    """Converts a database URL into a psycopg-compatible postgresql:// string."""
    if not database_url or "sqlite" in database_url.lower():
        return None
    url = database_url
    if "+asyncpg" in url:
        url = url.replace("postgresql+asyncpg://", "postgresql://")
    elif "+psycopg" in url:
        url = url.replace("postgresql+psycopg://", "postgresql://")
    return url

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup: initialize database and ingest KB articles
    print("[ResolveIQ] Initializing database & seed records...")
    await init_db()
    print("[ResolveIQ] Ingesting Knowledge Base into Vector Store...")
    knowledge_store.ingest_articles()

    # Determine Checkpointer type (AsyncPostgresSaver vs MemorySaver fallback)
    conn_string = get_psycopg_conn_string(settings.DATABASE_URL)

    if conn_string:
        try:
            from langgraph.checkpoint.postgres.aio import AsyncPostgresSaver
            print(f"[ResolveIQ] Initializing AsyncPostgresSaver checkpointer...")
            async with AsyncPostgresSaver.from_conn_string(conn_string) as checkpointer:
                print("[ResolveIQ] Setting up LangGraph Postgres checkpoint tables...")
                await checkpointer.setup()
                app.state.service_desk_app = create_service_desk_graph(checkpointer)
                print("[ResolveIQ] System startup complete with Postgres checkpointer. Ready to serve.")
                yield
                print("[ResolveIQ] Shutting down Postgres checkpointer connection pool.")
        except Exception as e:
            print(f"[ResolveIQ] AsyncPostgresSaver setup notice: {e}. Falling back to MemorySaver.")
            from langgraph.checkpoint.memory import MemorySaver
            app.state.service_desk_app = create_service_desk_graph(MemorySaver())
            yield
    else:
        print("[ResolveIQ] SQLite / local DB detected. Initializing MemorySaver checkpointer.")
        from langgraph.checkpoint.memory import MemorySaver
        app.state.service_desk_app = create_service_desk_graph(MemorySaver())
        yield

    print("[ResolveIQ] Shutting down application.")

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
