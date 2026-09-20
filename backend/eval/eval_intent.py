import asyncio
from typing import List, Dict, Any
from app.graph.nodes.classify_intent import classify_intent_node

GOLDEN_INTENT_DATASET = [
    {
        "query": "How do I configure GlobalProtect VPN on my Windows machine?",
        "expected_intent": "informational"
    },
    {
        "query": "What is the password policy and how many attempts before lockout?",
        "expected_intent": "informational"
    },
    {
        "query": "Please unlock my Active Directory account for user alex.chen",
        "expected_intent": "actionable"
    },
    {
        "query": "Reset my corporate password right now",
        "expected_intent": "actionable"
    },
    {
        "query": "Please create a ticket for my broken laptop charger",
        "expected_intent": "actionable"
    },
    {
        "query": "Escalate ticket JIRA-1021 to critical priority immediately",
        "expected_intent": "actionable"
    },
    {
        "query": "I am having trouble with VPN timeouts, please open a ticket with IT support",
        "expected_intent": "mixed"
    },
    {
        "query": "Can you explain the monitor policy and also create a ticket to order a 4K monitor?",
        "expected_intent": "mixed"
    }
]

async def run_intent_eval() -> Dict[str, Any]:
    """Runs intent classification benchmark against the golden intent dataset."""
    total = len(GOLDEN_INTENT_DATASET)
    correct = 0
    details = []

    for item in GOLDEN_INTENT_DATASET:
        query = item["query"]
        expected = item["expected_intent"]

        state = {
            "messages": [{"role": "user", "content": query}],
            "user_id": "alex.chen"
        }

        res = await classify_intent_node(state)
        predicted = res.get("classified_intent")
        reasoning = res.get("intent_reasoning")

        is_correct = (predicted == expected)
        if is_correct:
            correct += 1

        details.append({
            "query": query,
            "expected_intent": expected,
            "predicted_intent": predicted,
            "reasoning": reasoning,
            "passed": is_correct
        })

    accuracy = correct / total

    return {
        "benchmark": "Intent Classification Accuracy",
        "total_test_cases": total,
        "correct": correct,
        "accuracy": round(accuracy, 4),
        "score_percent": round(accuracy * 100, 1),
        "details": details
    }

if __name__ == "__main__":
    res = asyncio.run(run_intent_eval())
    print("--- Intent Classification Benchmark Results ---")
    print(f"Total: {res['total_test_cases']}, Correct: {res['correct']}, Accuracy: {res['accuracy'] * 100}%")
