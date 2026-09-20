from typing import Dict, Any
from langgraph.types import interrupt
from app.graph.state import ServiceDeskState
from app.services.ad_ldap_service import ad_ldap_service

# Tools that strictly mandate MFA/OTP identity verification
SENSITIVE_TOOLS = {"unlock_account", "reset_password", "grant_access_request"}

async def verify_identity_node(state: ServiceDeskState) -> Dict[str, Any]:
    """
    Node: verify_identity checks session authentication and triggers a LangGraph
    interrupt if identity verification (OTP) is needed.
    """
    selected_tool = state.get("selected_tool")
    if not selected_tool:
        return {"verification_status": "verified"}

    tool_name = selected_tool.get("name")
    user_id = state.get("user_id", "alex.chen")
    current_status = state.get("verification_status", "unverified")

    # If the tool is not sensitive (e.g. check_ticket_status), we don't strictly require MFA gate
    if tool_name not in SENSITIVE_TOOLS:
        return {"verification_status": "verified"}

    # If already verified in this conversation thread session
    if current_status == "verified":
        return {"verification_status": "verified"}

    # Generate an OTP for verification
    otp = await ad_ldap_service.generate_otp(user_id)
    print(f"[verify_identity] Sensitive action '{tool_name}' for '{user_id}'. Generated OTP '{otp}'. Interrupting graph.")

    # Interrupt execution and yield verification payload to caller
    interrupt_data = {
        "type": "verification_required",
        "user_id": user_id,
        "tool_name": tool_name,
        "message": f"Identity verification required for sensitive operation '{tool_name}'. An MFA code has been dispatched to {user_id}.",
        "hint": f"Demo OTP Code: {otp} (or 123456)"
    }

    # LangGraph human-in-the-loop interrupt
    resume_payload = interrupt(interrupt_data)

    # When resumed via POST /auth/verify with resume_payload:
    if resume_payload and resume_payload.get("verified"):
        return {
            "verification_status": "verified",
            "interrupt_payload": None
        }

    return {
        "verification_status": "unverified",
        "interrupt_payload": interrupt_data
    }
