from typing import Dict, Any
from langgraph.types import interrupt
from app.graph.state import ServiceDeskState

SIDE_EFFECT_TOOLS = {
    "create_ticket": {"impact": "Low", "risk": "Will create a new ticket in JIRA Service Management."},
    "unlock_account": {"impact": "High", "risk": "Will unlock the Active Directory user account and re-enable login."},
    "reset_password": {"impact": "Critical", "risk": "Will invalidate current password and issue temporary credentials."},
    "grant_access_request": {"impact": "High", "risk": "Will submit a formal privileged access request to SecOps for approval."},
    "escalate_ticket": {"impact": "Medium", "risk": "Will bump ticket priority to Critical and alert On-Call IT Manager."},
    "close_ticket": {"impact": "Low", "risk": "Will mark the JIRA ticket as Closed with resolution notes."}
}

async def request_confirmation_node(state: ServiceDeskState) -> Dict[str, Any]:
    """
    Node: request_confirmation surfaces a structured confirmation card to the user
    and pauses graph execution until the user clicks Approve or Cancel.
    """
    selected_tool = state.get("selected_tool")
    if not selected_tool:
        return {"confirmation_status": "not_required"}

    tool_name = selected_tool.get("name")
    
    # Read-only tools (like check_ticket_status) do not need confirmation
    if tool_name not in SIDE_EFFECT_TOOLS:
        return {"confirmation_status": "approved"}

    current_confirmation = state.get("confirmation_status", "pending")
    if current_confirmation in ["approved", "rejected"]:
        return {"confirmation_status": current_confirmation}

    tool_meta = SIDE_EFFECT_TOOLS[tool_name]
    confirm_payload = {
        "type": "confirmation_required",
        "tool_name": tool_name,
        "parameters": selected_tool.get("params", {}),
        "impact_level": tool_meta["impact"],
        "risk_description": tool_meta["risk"],
        "summary": selected_tool.get("description", f"Execute action: {tool_name}")
    }

    # Interrupt execution and yield confirmation card payload
    resume_payload = interrupt(confirm_payload)

    # When resumed from POST /chat/confirm with resume_payload:
    if resume_payload and resume_payload.get("action") == "approve":
        return {
            "confirmation_status": "approved",
            "interrupt_payload": None
        }
    elif resume_payload and resume_payload.get("action") in ["reject", "cancel"]:
        return {
            "confirmation_status": "rejected",
            "interrupt_payload": None
        }

    return {
        "confirmation_status": "pending",
        "interrupt_payload": confirm_payload
    }
