from typing import Dict, Any
from app.graph.state import ServiceDeskState
from app.services.jira_service import jira_service
from app.services.ad_ldap_service import ad_ldap_service
from app.db.audit import log_tool_execution

# Tools with external side-effects
SIDE_EFFECT_TOOLS = {
    "create_ticket",
    "unlock_account",
    "reset_password",
    "grant_access_request",
    "escalate_ticket",
    "close_ticket"
}

async def execute_tool_node(state: ServiceDeskState) -> Dict[str, Any]:
    """
    Node: execute_tool.
    SECURITY ENFORCEMENT:
    Ensures that any tool with side effects is strictly rejected if confirmation_status != 'approved'.
    Executes the tool, then records an immutable audit log entry.
    """
    selected_tool = state.get("selected_tool")
    if not selected_tool:
        return {"action_result": None}

    tool_name = selected_tool.get("name")
    params = selected_tool.get("params", {})
    user_id = state.get("user_id", "alex.chen")
    confirmation_status = state.get("confirmation_status")

    # Strict Node-Level Security Guard
    if tool_name in SIDE_EFFECT_TOOLS and confirmation_status != "approved":
        error_msg = f"Security Policy Violation: Tool '{tool_name}' execution blocked because confirmation_status is '{confirmation_status}' (must be 'approved')."
        print(f"[execute_tool] {error_msg}")
        
        # Log blocked attempt to audit trail
        await log_tool_execution(
            user_id=user_id,
            tool_name=tool_name,
            params=params,
            confirmed_by="security_guard_blocked",
            execution_status="blocked",
            result={"error": error_msg}
        )
        
        return {
            "action_result": {
                "success": False,
                "error": error_msg,
                "blocked": True
            }
        }

    # Execute the appropriate service
    result: Dict[str, Any] = {}
    execution_status = "success"

    try:
        if tool_name == "create_ticket":
            result = await jira_service.create_ticket(
                user_id=params.get("user_id", user_id),
                issue_type=params.get("issue_type", "IT Support"),
                description=params.get("description", "IT Service Request"),
                priority=params.get("priority", "Medium")
            )
        elif tool_name == "check_ticket_status":
            result = await jira_service.check_ticket_status(params.get("ticket_id", "JIRA-1021"))
        elif tool_name == "unlock_account":
            result = await ad_ldap_service.unlock_account(params.get("user_id", user_id))
        elif tool_name == "reset_password":
            result = await ad_ldap_service.reset_password(params.get("user_id", user_id))
        elif tool_name == "grant_access_request":
            result = await ad_ldap_service.grant_access_request(
                user_id=params.get("user_id", user_id),
                resource=params.get("resource", "Corporate Resource"),
                approver_id=params.get("approver_id", "secops-lead@company.io")
            )
        elif tool_name == "escalate_ticket":
            result = await jira_service.escalate_ticket(
                ticket_id=params.get("ticket_id", "JIRA-1021"),
                priority=params.get("priority", "Critical")
            )
        elif tool_name == "close_ticket":
            result = await jira_service.close_ticket(
                ticket_id=params.get("ticket_id", "JIRA-1021"),
                resolution_notes=params.get("resolution_notes", "Resolved via ResolveIQ")
            )
        else:
            result = {"success": False, "error": f"Unknown tool '{tool_name}'"}
            execution_status = "failed"
    except Exception as e:
        result = {"success": False, "error": str(e)}
        execution_status = "failed"

    # Persist immutable audit log entry
    audit_row = await log_tool_execution(
        user_id=user_id,
        tool_name=tool_name,
        params=params,
        confirmed_by="user_approved" if confirmation_status == "approved" else "system_readonly",
        execution_status=execution_status,
        result=result
    )

    return {
        "action_result": result,
        "audit_metadata": {
            "audit_id": audit_row.id,
            "tool_name": tool_name,
            "execution_status": execution_status,
            "timestamp": audit_row.timestamp.isoformat()
        }
    }
