from typing import Dict, Any, Literal
from pydantic import BaseModel, Field
from langchain_core.messages import SystemMessage, HumanMessage
from app.graph.state import ServiceDeskState
from app.graph.llm import get_groq_llm

class IntentClassification(BaseModel):
    intent: Literal["informational", "actionable", "mixed"] = Field(
        description="Classification: 'actionable' if user wants an action executed (raise/create ticket, broken hardware, unlock, reset password, escalate, close, grant access); 'informational' if user is only asking how-to/policy questions; 'mixed' if user is asking for general documentation AND requesting a ticket/action."
    )
    reasoning: str = Field(
        description="Brief explanation of why this intent was chosen."
    )

CLASSIFY_PROMPT = """You are the IT Service Desk Intent Classifier for ResolveIQ.
Classify the user's latest query accurately:

1. 'actionable': The user wants the service desk to perform an action or create a ticket.
   Examples of 'actionable':
   - "I need to raise a ticket, my monitor isn't turning on"
   - "Create a ticket for my broken charger"
   - "My laptop won't boot, please open a ticket"
   - "Unlock my account"
   - "Reset my corporate password"
   - "Escalate ticket JIRA-1021"
   - "Grant me access to AWS RDS"

2. 'informational': The user is purely seeking information, explanations, or policies without requesting an action or ticket.
   Examples of 'informational':
   - "What is the policy for monitor refreshes?"
   - "How do I configure GlobalProtect VPN on macOS?"
   - "What are the rules for Wi-Fi certificates?"

3. 'mixed': The user asks for information AND simultaneously asks to open a ticket or take action.
"""

async def classify_intent_node(state: ServiceDeskState) -> Dict[str, Any]:
    """Node: classify_intent using structured LLM output with robust action detection."""
    latest_message = ""
    for msg in reversed(state.get("messages", [])):
        if msg.get("role") == "user":
            latest_message = msg.get("content", "")
            break

    if not latest_message:
        return {
            "classified_intent": "informational",
            "intent_reasoning": "No user query found in conversation history.",
            "generated_answer": None,
            "citations": [],
            "action_result": None
        }

    lower = latest_message.lower()
    
    # Priority keyword signals for immediate action detection
    action_keywords = [
        "raise a ticket", "raise ticket", "create a ticket", "create ticket",
        "open a ticket", "open ticket", "submit a ticket", "submit ticket",
        "file a ticket", "file ticket", "need a ticket", "log a ticket",
        "unlock", "reset password", "change password", "escalate", 
        "close ticket", "grant access", "request access", "locked out", 
        "lockout", "not turning on", "broken", "won't turn on", "not working"
    ]

    has_explicit_action = any(k in lower for k in action_keywords)
    has_pure_info = any(k in lower for k in ["what is the policy", "policy on", "how do i connect", "guide for", "explain"])

    try:
        llm = get_groq_llm(temperature=0.0)
        structured_llm = llm.with_structured_output(IntentClassification)
        result: IntentClassification = await structured_llm.ainvoke([
            SystemMessage(content=CLASSIFY_PROMPT),
            HumanMessage(content=f"User query: {latest_message}")
        ])
        intent = result.intent
        reasoning = result.reasoning

        # Safety override: if user explicitly said "raise a ticket" or "create ticket", guarantee actionable routing
        if has_explicit_action and intent == "informational":
            intent = "actionable"
            reasoning = f"User explicitly requested ticket creation or action: '{latest_message}'"
    except Exception as e:
        print(f"[classify_intent] LLM structured output notice: {e}. Using deterministic heuristic.")
        if has_explicit_action and has_pure_info:
            intent = "mixed"
        elif has_explicit_action:
            intent = "actionable"
        else:
            intent = "informational"
        reasoning = f"Heuristic classification based on keyword signals in: '{latest_message}'"

    return {
        "classified_intent": intent,
        "intent_reasoning": reasoning,
        "generated_answer": None if intent == "actionable" else state.get("generated_answer"),
        "citations": [] if intent == "actionable" else state.get("citations", []),
        "action_result": None,
        "selected_tool": None if intent == "informational" else state.get("selected_tool")
    }
