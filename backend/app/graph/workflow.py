import os
from typing import Literal, Dict, Any, Optional
from langgraph.graph import StateGraph, START, END
from langgraph.checkpoint.memory import MemorySaver
from app.graph.state import ServiceDeskState
from app.graph.nodes.classify_intent import classify_intent_node
from app.graph.nodes.retrieve_context import retrieve_context_node
from app.graph.nodes.generate_answer import generate_answer_node
from app.graph.nodes.select_tool import select_tool_node
from app.graph.nodes.verify_identity import verify_identity_node
from app.graph.nodes.request_confirmation import request_confirmation_node
from app.graph.nodes.execute_tool import execute_tool_node
from app.graph.nodes.respond import respond_node

def route_intent(state: ServiceDeskState) -> Literal["retrieve_context", "select_tool", "mixed_path"]:
    """Conditional edge: Routes based on classified intent."""
    intent = state.get("classified_intent", "informational")
    if intent == "actionable":
        return "select_tool"
    elif intent == "mixed":
        return "mixed_path"
    else:
        return "retrieve_context"

def route_verification(state: ServiceDeskState) -> Literal["request_confirmation", "respond"]:
    """Conditional edge: Proceed to confirmation if verified, else respond."""
    status = state.get("verification_status", "verified")
    if status == "verified":
        return "request_confirmation"
    return "respond"

def route_confirmation(state: ServiceDeskState) -> Literal["execute_tool", "respond"]:
    """Conditional edge: Execute tool only if user approved."""
    status = state.get("confirmation_status", "pending")
    if status == "approved":
        return "execute_tool"
    return "respond"

def create_service_desk_graph(checkpointer: Optional[Any] = None):
    """Builds and compiles the ResolveIQ LangGraph StateGraph with checkpointing."""
    builder = StateGraph(ServiceDeskState)

    # Add Nodes
    builder.add_node("classify_intent", classify_intent_node)
    builder.add_node("retrieve_context", retrieve_context_node)
    builder.add_node("generate_answer", generate_answer_node)
    builder.add_node("select_tool", select_tool_node)
    builder.add_node("verify_identity", verify_identity_node)
    builder.add_node("request_confirmation", request_confirmation_node)
    builder.add_node("execute_tool", execute_tool_node)
    builder.add_node("respond", respond_node)

    # Graph Edges
    builder.add_edge(START, "classify_intent")

    # Conditional Branching after Intent Classification
    builder.add_conditional_edges(
        "classify_intent",
        route_intent,
        {
            "retrieve_context": "retrieve_context",
            "select_tool": "select_tool",
            "mixed_path": "retrieve_context"
        }
    )

    # RAG Branch
    def after_generate_answer(state: ServiceDeskState) -> Literal["select_tool", "respond"]:
        intent = state.get("classified_intent")
        if intent == "mixed":
            return "select_tool"
        return "respond"

    builder.add_edge("retrieve_context", "generate_answer")
    builder.add_conditional_edges(
        "generate_answer",
        after_generate_answer,
        {
            "select_tool": "select_tool",
            "respond": "respond"
        }
    )

    # Action Branch
    builder.add_edge("select_tool", "verify_identity")

    # Verification Gate Edge
    builder.add_conditional_edges(
        "verify_identity",
        route_verification,
        {
            "request_confirmation": "request_confirmation",
            "respond": "respond"
        }
    )

    # Confirmation Gate Edge
    builder.add_conditional_edges(
        "request_confirmation",
        route_confirmation,
        {
            "execute_tool": "execute_tool",
            "respond": "respond"
        }
    )

    # Execution & Completion
    builder.add_edge("execute_tool", "respond")
    builder.add_edge("respond", END)

    # Checkpointer selection (AsyncPostgresSaver passed from lifespan or fallback MemorySaver)
    if checkpointer is None:
        checkpointer = MemorySaver()
    compiled_graph = builder.compile(checkpointer=checkpointer)
    return compiled_graph
