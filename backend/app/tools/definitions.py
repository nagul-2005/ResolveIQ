import asyncio
from typing import Optional, Dict, Any
from langchain_core.tools import tool
from app.services.jira_service import jira_service
from app.services.ad_ldap_service import ad_ldap_service

@tool
def create_ticket(user_id: str, issue_type: str, description: str) -> Dict[str, Any]:
    """Create a new IT support ticket in JIRA for hardware, software, or network issues.
    
    Args:
        user_id: The corporate username or email of the requester (e.g. 'alex.chen')
        issue_type: Category of issue such as 'Hardware', 'Software', 'Network', 'Access Request', 'Email'
        description: Detailed explanation of the problem or request
    """
    # Tool execution helper called synchronously by LangChain or asynchronously by execute_tool node
    return asyncio.run(jira_service.create_ticket(user_id, issue_type, description))

@tool
def check_ticket_status(ticket_id: str) -> Dict[str, Any]:
    """Check the real-time status, priority, assignee, and notes for an existing JIRA ticket.
    
    Args:
        ticket_id: The ticket key (e.g. 'JIRA-1021', 'JIRA-1042')
    """
    return asyncio.run(jira_service.check_ticket_status(ticket_id))

@tool
def unlock_account(user_id: str) -> Dict[str, Any]:
    """Unlock a locked employee user account in corporate Active Directory / LDAP.
    
    Args:
        user_id: The username of the locked account (e.g. 'alex.chen')
    """
    return asyncio.run(ad_ldap_service.unlock_account(user_id))

@tool
def reset_password(user_id: str) -> Dict[str, Any]:
    """Reset the corporate password for a verified employee in Active Directory and issue a temporary login token.
    
    Args:
        user_id: The username of the employee requesting password reset (e.g. 'alex.chen')
    """
    return asyncio.run(ad_ldap_service.reset_password(user_id))

@tool
def grant_access_request(user_id: str, resource: str, approver_id: str = "secops-lead@company.io") -> Dict[str, Any]:
    """Submit a formal privileged access request for sensitive resources (e.g. AWS, Production DB, GitHub Admin).
    Note: Access is never granted automatically; it is routed to the designated approver in 'pending approval' state.
    
    Args:
        user_id: The username requesting access (e.g. 'alex.chen')
        resource: The system or resource requested (e.g. 'AWS Production RDS', 'GitHub Admin')
        approver_id: The manager or SecOps lead email who must approve the request
    """
    return asyncio.run(ad_ldap_service.grant_access_request(user_id, resource, approver_id))

@tool
def escalate_ticket(ticket_id: str, priority: str = "Critical") -> Dict[str, Any]:
    """Escalate an existing JIRA ticket to higher priority (e.g., High, Critical) and alert the On-Call IT Manager.
    
    Args:
        ticket_id: The ticket identifier to escalate (e.g. 'JIRA-1021')
        priority: The target priority, default is 'Critical'
    """
    return asyncio.run(jira_service.escalate_ticket(ticket_id, priority))

@tool
def close_ticket(ticket_id: str, resolution_notes: str = "Resolved by IT Service Desk") -> Dict[str, Any]:
    """Mark a resolved JIRA ticket as Closed with final resolution notes.
    
    Args:
        ticket_id: The ticket identifier (e.g. 'JIRA-1021')
        resolution_notes: Brief description of how the issue was fixed
    """
    return asyncio.run(jira_service.close_ticket(ticket_id, resolution_notes))

ALL_TOOLS = [
    create_ticket,
    check_ticket_status,
    unlock_account,
    reset_password,
    grant_access_request,
    escalate_ticket,
    close_ticket
]

TOOL_BY_NAME = {t.name: t for t in ALL_TOOLS}
