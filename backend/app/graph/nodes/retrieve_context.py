from typing import Dict, Any, List
from app.graph.state import ServiceDeskState
from app.rag.store import knowledge_store

async def retrieve_context_node(state: ServiceDeskState) -> Dict[str, Any]:
    """Node: retrieve_context via Weaviate/FastEmbed hybrid search."""
    latest_message = ""
    for msg in reversed(state.get("messages", [])):
        if msg.get("role") == "user":
            latest_message = msg.get("content", "")
            break

    if not latest_message:
        return {"retrieved_context": []}

    # Perform hybrid search with top_k=3
    results = knowledge_store.hybrid_search(
        query=latest_message,
        top_k=3,
        alpha=0.65
    )

    return {
        "retrieved_context": results
    }
