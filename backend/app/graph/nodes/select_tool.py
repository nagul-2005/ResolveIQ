import json
import re
from typing import Dict, Any, Optional, Literal
from pydantic import BaseModel, Field
from langchain_core.messages import SystemMessage, HumanMessage
from app.graph.state import ServiceDeskState
from app.graph.llm import get_groq_llm
from app.tools.definitions import ALL_TOOLS

class ToolSelectionSchema(BaseModel):
    tool_name: Literal[
        "create_ticket",
        "check_ticket_status",
        "unlock_account",
        "reset_password",
        "grant_access_request",
        "escalate_ticket",
        "close_ticket",
        "none"
    ] = Field(description="The exact name of the tool to execute, or 'none' if no tool is required.")
    parameters: Dict[str, Any] = Field(
        default_factory=dict,
        description="The key-value arguments for the tool."
    )
    explanation: str = Field(description="Why this tool was chosen and what action it will perform.")

SELECT_TOOL_PROMPT = """You are the IT Service Desk Action Selector for ResolveIQ.
Your role is to map the user's intent to one of the following available service desk tools:

AVAILABLE TOOLS & SIGNATURES:
1. `unlock_account(user_id: str)`: Unlock a locked AD user account.
2. `reset_password(user_id: str)`: Reset user corporate password and send temp token.
3. `create_ticket(user_id: str, issue_type: str, description: str)`: Create a JIRA ticket for hardware, network, software, etc.
4. `check_ticket_status(ticket_id: str)`: Check status of existing ticket (e.g. 'JIRA-1021').
5. `grant_access_request(user_id: str, resource: str, approver_id: str)`: Route access request for sensitive resources (e.g., AWS, K8s, GitHub Admin) to SecOps.
6. `escalate_ticket(ticket_id: str, priority: str)`: Escalate ticket priority to 'High' or 'Critical'.
7. `close_ticket(ticket_id: str, resolution_notes: str)`: Close resolved ticket.

Default user_id: If the user does not specify a different username, use the active session user_id provided.
"""

async def select_tool_node(state: ServiceDeskState) -> Dict[str, Any]:
    """Node: select_tool using LLM function selection."""
    latest_message = ""
    for msg in reversed(state.get("messages", [])):
        if msg.get("role") == "user":
            latest_message = msg.get("content", "")
            break

    user_id = state.get("user_id", "alex.chen")

    try:
        llm = get_groq_llm(temperature=0.0)
        structured_llm = llm.with_structured_output(ToolSelectionSchema)
        selection: ToolSelectionSchema = await structured_llm.ainvoke([
            SystemMessage(content=SELECT_TOOL_PROMPT),
            HumanMessage(content=f"Active User ID: '{user_id}'\nUser Request: '{latest_message}'")
        ])

        if selection.tool_name == "none":
            return {"selected_tool": None}

        params = selection.parameters or {}
        if "user_id" not in params and selection.tool_name in ["unlock_account", "reset_password", "create_ticket", "grant_access_request"]:
            params["user_id"] = user_id

        return {
            "selected_tool": {
                "name": selection.tool_name,
                "params": params,
                "description": selection.explanation
            }
        }
    except Exception as e:
        print(f"[select_tool] Structured output notice: {e}. Using deterministic tool selector.")
        lower = latest_message.lower()

        # Deterministic extraction fallback
        if "unlock" in lower:
            tool_name = "unlock_account"
            params = {"user_id": user_id}
            desc = f"Unlock Active Directory account for {user_id}"
        elif "reset password" in lower or "change password" in lower:
            tool_name = "reset_password"
            params = {"user_id": user_id}
            desc = f"Reset corporate password for {user_id}"
        elif "escalate" in lower:
            match = re.search(r"jira-\d+", lower)
            ticket_id = match.group(0).upper() if match else "JIRA-1021"
            tool_name = "escalate_ticket"
            params = {"ticket_id": ticket_id, "priority": "Critical"}
            desc = f"Escalate {ticket_id} to Critical priority"
        elif "close" in lower and "ticket" in lower:
            match = re.search(r"jira-\d+", lower)
            ticket_id = match.group(0).upper() if match else "JIRA-1021"
            tool_name = "close_ticket"
            params = {"ticket_id": ticket_id, "resolution_notes": "Closed via ResolveIQ assistant"}
            desc = f"Close ticket {ticket_id}"
        elif "status" in lower or "check ticket" in lower:
            match = re.search(r"jira-\d+", lower)
            ticket_id = match.group(0).upper() if match else "JIRA-1021"
            tool_name = "check_ticket_status"
            params = {"ticket_id": ticket_id}
            desc = f"Check status of ticket {ticket_id}"
        elif "access" in lower or "permission" in lower:
            tool_name = "grant_access_request"
            params = {"user_id": user_id, "resource": "Production AWS / Kubernetes", "approver_id": "secops-lead@company.io"}
            desc = f"Request elevated access for {user_id}"
        else:
            tool_name = "create_ticket"
            params = {"user_id": user_id, "issue_type": "IT Support", "description": latest_message}
            desc = f"Create IT Service Desk ticket for: {latest_message[:50]}"

        return {
            "selected_tool": {
                "name": tool_name,
                "params": params,
                "description": desc
            }
        }
