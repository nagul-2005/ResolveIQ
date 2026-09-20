import pytest
from app.rag.store import knowledge_store

def test_rag_ingestion_and_search():
    knowledge_store.ingest_articles()
    assert len(knowledge_store.chunks) > 0

    # Search for VPN
    results = knowledge_store.hybrid_search("How do I connect to corporate VPN?", top_k=2)
    assert len(results) > 0
    assert results[0]["doc_id"] == "DOC-VPN-001"
    assert "GlobalProtect" in results[0]["content"]

def test_rag_metadata_filter():
    results = knowledge_store.hybrid_search("access permissions", category="Security & Compliance")
    for r in results:
        assert r["category"] == "Security & Compliance"
