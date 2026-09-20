import asyncio
from typing import List, Dict, Any
from app.rag.store import knowledge_store

GOLDEN_RETRIEVAL_DATASET = [
    {
        "query": "How do I connect to the corporate VPN on a Mac?",
        "expected_doc_id": "DOC-VPN-001",
        "category": "Network & Connectivity"
    },
    {
        "query": "What is the policy for resetting my Okta MFA token or lost phone?",
        "expected_doc_id": "DOC-AUTH-002",
        "category": "Identity & Access"
    },
    {
        "query": "How can a guest connect to office Wi-Fi network?",
        "expected_doc_id": "DOC-WIFI-003",
        "category": "Network & Connectivity"
    },
    {
        "query": "How often can I request a new laptop or secondary monitor?",
        "expected_doc_id": "DOC-HARDWARE-004",
        "category": "Hardware & Workstation"
    },
    {
        "query": "What is the procedure to get elevated production AWS access?",
        "expected_doc_id": "DOC-ACCESS-005",
        "category": "Security & Compliance"
    },
    {
        "query": "How do I create a new shared Google inbox for our team?",
        "expected_doc_id": "DOC-EMAIL-006",
        "category": "Collaboration Tools"
    }
]

def run_retrieval_eval(top_k: int = 3) -> Dict[str, Any]:
    """Evaluates retrieval Precision@1, Precision@K, Recall@K, and MRR over golden dataset."""
    if not knowledge_store.is_initialized:
        knowledge_store.ingest_articles()

    total = len(GOLDEN_RETRIEVAL_DATASET)
    p_at_1_hits = 0
    p_at_k_hits = 0
    reciprocal_ranks = []
    details = []

    for item in GOLDEN_RETRIEVAL_DATASET:
        query = item["query"]
        expected_doc = item["expected_doc_id"]
        results = knowledge_store.hybrid_search(query, top_k=top_k)

        retrieved_doc_ids = [r["doc_id"] for r in results]
        
        hit_at_1 = retrieved_doc_ids[0] == expected_doc if retrieved_doc_ids else False
        hit_at_k = expected_doc in retrieved_doc_ids
        
        rank = -1
        if expected_doc in retrieved_doc_ids:
            rank = retrieved_doc_ids.index(expected_doc) + 1
            reciprocal_ranks.append(1.0 / rank)
        else:
            reciprocal_ranks.append(0.0)

        if hit_at_1:
            p_at_1_hits += 1
        if hit_at_k:
            p_at_k_hits += 1

        details.append({
            "query": query,
            "expected_doc_id": expected_doc,
            "retrieved_top_doc": retrieved_doc_ids[0] if retrieved_doc_ids else None,
            "retrieved_docs": retrieved_doc_ids,
            "rank": rank,
            "passed": hit_at_k
        })

    p_at_1 = p_at_1_hits / total
    recall_at_k = p_at_k_hits / total
    mrr = sum(reciprocal_ranks) / total

    return {
        "benchmark": "Retrieval Precision & Recall",
        "total_test_cases": total,
        "precision_at_1": round(p_at_1, 4),
        "recall_at_k": round(recall_at_k, 4),
        "mrr": round(mrr, 4),
        "score_percent": round(recall_at_k * 100, 1),
        "details": details
    }

if __name__ == "__main__":
    res = run_retrieval_eval()
    print("--- Retrieval Benchmark Results ---")
    print(f"Total Test Cases: {res['total_test_cases']}")
    print(f"Precision@1: {res['precision_at_1'] * 100}%")
    print(f"Recall@{3}: {res['recall_at_k'] * 100}%")
    print(f"MRR: {res['mrr']}")
