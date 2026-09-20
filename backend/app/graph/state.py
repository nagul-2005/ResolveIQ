from typing import List, Dict, Any, Optional, Literal, TypedDict, Annotated
import operator

class ServiceDeskState(TypedDict):
    """
    LangGraph orchestrator state schema for ResolveIQ IT Service Desk.
    """
    # Conversation thread
    messages: Annotated[List[Dict[str, Any]], operator.add]
    user_id: str
    session_id: str

    # Intent Classification
    classified_intent: Optional[Literal["informational", "actionable", "mixed"]]
    intent_reasoning: Optional[str]

    # RAG Context
    retrieved_context: List[Dict[str, Any]]
    generated_answer: Optional[str]
    citations: List[Dict[str, Any]]

    # Tool / Action State
    selected_tool: Optional[Dict[str, Any]] # e.g. {"name": "...", "params": {...}, "description": "..."}
    
    # Human-in-the-loop Gates
    verification_status: Literal["unverified", "pending", "verified"]
    confirmation_status: Literal["not_required", "pending", "approved", "rejected"]
    
    # Execution & Final Output
    action_result: Optional[Dict[str, Any]]
    final_response: Optional[str]
    audit_metadata: Optional[Dict[str, Any]]
    interrupt_payload: Optional[Dict[str, Any]]
