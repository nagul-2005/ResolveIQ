from typing import Dict, Any, List
from app.graph.state import ServiceDeskState

async def respond_node(state: ServiceDeskState) -> Dict[str, Any]:
    """Node: respond formats the final unified user response."""
    intent = state.get("classified_intent", "informational")
    generated_answer = state.get("generated_answer")
    action_result = state.get("action_result")
    selected_tool = state.get("selected_tool")
    confirmation_status = state.get("confirmation_status")
    verification_status = state.get("verification_status")

    response_parts: List[str] = []

    # 1. If action was rejected by user
    if confirmation_status == "rejected":
        tool_name = selected_tool.get("name") if selected_tool else "action"
        response_parts.append(f"⛔ **Action Cancelled**: The request to execute `{tool_name}` was declined. No changes were made to your systems or tickets.")

    # 2. If action was executed
    elif action_result:
        if action_result.get("success"):
            tool_name = selected_tool.get("name") if selected_tool else "Operation"
            
            if tool_name == "unlock_account":
                response_parts.append(f"✅ **Account Unlocked Successfully**\n\n{action_result.get('message')}\n\n- **User ID**: `{action_result.get('user_id')}`\n- **Status**: `Active / Unlocked`\n- **Directory Service**: Corporate Active Directory (Mocked LDAP)\n\nYou may now log in with your credentials.")
            elif tool_name == "reset_password":
                response_parts.append(f"🔑 **Temporary Password Generated**\n\n- **User**: `{action_result.get('user_id')}`\n- **Temporary Password**: `{action_result.get('temporary_password')}`\n- **Action Required**: Must change password on first login.\n\n*{action_result.get('message')}*")
            elif tool_name == "create_ticket":
                response_parts.append(f"🎫 **JIRA Ticket Created**: `{action_result.get('ticket_id')}`\n\n- **Issue Type**: {action_result.get('issue_type')}\n- **Priority**: {action_result.get('priority')}\n- **Assignee**: {action_result.get('assignee')}\n- **Description**: {action_result.get('description')}\n\n*Our IT service desk team has received this ticket and will process it shortly.*")
            elif tool_name == "check_ticket_status":
                response_parts.append(f"📋 **Ticket Status Details**: `{action_result.get('ticket_id')}`\n\n- **Status**: `{action_result.get('status')}`\n- **Priority**: {action_result.get('priority')}\n- **Requester**: `{action_result.get('user_id')}`\n- **Assignee**: {action_result.get('assignee')}\n- **Description**: {action_result.get('description')}\n- **Resolution Notes**: {action_result.get('resolution_notes') or 'In progress'}")
            elif tool_name == "grant_access_request":
                response_parts.append(f"🔒 **Privileged Access Request Submitted**: `{action_result.get('request_id')}`\n\n- **Requested Resource**: `{action_result.get('resource')}`\n- **Status**: `Pending Approval` (Never auto-granted)\n- **Assigned Approver**: `{action_result.get('approver_id')}`\n\n*Per SOC2 compliance policy, elevated access requests require explicit manager/SecOps approval.*")
            elif tool_name == "escalate_ticket":
                response_parts.append(f"⚡ **Ticket Escalated**: `{action_result.get('ticket_id')}`\n\n- **New Status**: `{action_result.get('status')}`\n- **New Priority**: `{action_result.get('priority')}`\n- **New Assignee**: `{action_result.get('assignee')}`\n\n*{action_result.get('message')}*")
            elif tool_name == "close_ticket":
                response_parts.append(f"🏁 **Ticket Closed**: `{action_result.get('ticket_id')}`\n\n- **Status**: `Closed`\n- **Resolution Notes**: {action_result.get('resolution_notes')}")
            else:
                response_parts.append(f"✅ **Action Executed**: {action_result.get('message', 'Operation completed successfully.')}")
        else:
            response_parts.append(f"❌ **Action Failed**: {action_result.get('error', 'An error occurred during execution.')}")

    # 3. Grounded RAG answer is ONLY included for informational or mixed intents
    if generated_answer and intent in ["informational", "mixed"]:
        if response_parts:
            response_parts.append("\n---\n")
        response_parts.append(generated_answer)

    # Fallback if empty
    if not response_parts:
        response_parts.append("Your request has been processed.")

    final_text = "\n\n".join(response_parts)
    
    new_message = {
        "role": "assistant",
        "content": final_text
    }

    return {
        "final_response": final_text,
        "messages": [new_message]
    }
