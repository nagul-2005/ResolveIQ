"""
ResolveIQ Model Context Protocol (MCP) Server.
Exposes enterprise IT Service Desk capabilities to external AI clients (Claude Desktop, Cursor, etc.)
over standard Stdio / SSE transport using Anthropic's official MCP 2.x SDK (MCPServer).
"""

import sys
import asyncio
from pathlib import Path

# Ensure backend root is on sys.path
backend_dir = Path(__file__).resolve().parent.parent
if str(backend_dir) not in sys.path:
    sys.path.insert(0, str(backend_dir))

from mcp.server.mcpserver import MCPServer
from app.services.jira_service import jira_service
from app.services.ad_ldap_service import ad_ldap_service
from app.rag.store import knowledge_store
from app.db.audit import log_tool_execution, get_audit_logs

# Initialize MCP Server for ResolveIQ
mcp = MCPServer(name="ResolveIQ-IT-Service-Desk")

# -------------------------------------------------------------
# 1. Knowledge Base (RAG) Tools
# -------------------------------------------------------------
@mcp.tool()
async def search_it_knowledge_base(query: str, top_k: int = 3) -> str:
    """
    Search enterprise IT policies, guidelines, and troubleshooting articles using hybrid vector search.
    
    Args:
        query: The search question or keywords (e.g., 'MacBook refresh cycle', 'VPN setup', 'Okta lockout policy')
        top_k: Number of relevant policy snippets to retrieve (default: 3)
    """
    if not knowledge_store.is_initialized or not knowledge_store.chunks:
        knowledge_store.ingest_articles()

    results = knowledge_store.hybrid_search(query=query, top_k=top_k)
    if not results:
        return "No relevant IT knowledge base articles found."

    formatted = []
    for r in results:
        formatted.append(
            f"📄 **[{r['doc_id']}] {r['title']}** (Relevance: {int(r['score']*100)}%)\n"
            f"Category: {r['category']} | Product Area: {r['product_area']}\n"
            f"Content:\n{r['content']}\n"
        )
    return "\n---\n".join(formatted)


# -------------------------------------------------------------
# 2. Jira Cloud Service Desk Tools
# -------------------------------------------------------------
@mcp.tool()
async def create_jira_ticket(user_id: str, issue_type: str, description: str, priority: str = "Medium") -> dict:
    """
    Create a new IT support ticket in Atlassian Jira Cloud (ITSD Service Desk queue).
    
    Args:
        user_id: Username or email of requester (e.g., 'alex.chen')
        issue_type: Category (Hardware, Software, Access Request, Network)
        description: Detailed explanation of the technical problem
        priority: Low, Medium, High, or Critical
    """
    result = await jira_service.create_ticket(
        user_id=user_id,
        issue_type=issue_type,
        description=description,
        priority=priority
    )

    # Immutable SOC2 audit logging
    await log_tool_execution(
        user_id=user_id,
        tool_name="mcp_create_jira_ticket",
        params={"user_id": user_id, "issue_type": issue_type, "priority": priority},
        confirmed_by="mcp_authenticated_client",
        execution_status="success" if result.get("success") else "failed",
        result=result
    )
    return result


@mcp.tool()
async def check_jira_ticket_status(ticket_id: str) -> dict:
    """
    Check the live status, assignee, priority, and notes for an existing Jira support ticket.
    
    Args:
        ticket_id: The Jira ticket key (e.g. 'ITSD-1021', 'ITSD-4282')
    """
    return await jira_service.check_ticket_status(ticket_id)


@mcp.tool()
async def escalate_jira_ticket(ticket_id: str, priority: str = "Critical") -> dict:
    """
    Escalate a high-impact Jira ticket to Critical and alert the on-call IT Incident Manager.
    
    Args:
        ticket_id: The Jira ticket key (e.g. 'ITSD-1021')
        priority: Target escalated priority (default: Critical)
    """
    result = await jira_service.escalate_ticket(ticket_id=ticket_id, priority=priority)
    await log_tool_execution(
        user_id="mcp_admin",
        tool_name="mcp_escalate_jira_ticket",
        params={"ticket_id": ticket_id, "priority": priority},
        confirmed_by="mcp_authenticated_client",
        execution_status="success" if result.get("success") else "failed",
        result=result
    )
    return result


# -------------------------------------------------------------
# 3. Active Directory / LDAP Identity Tools
# -------------------------------------------------------------
@mcp.tool()
async def reset_ad_password(user_id: str) -> dict:
    """
    Reset corporate employee password in Active Directory and generate a secure temporary credential.
    
    Args:
        user_id: Corporate username (e.g., 'alex.chen', 'sarah.connor')
    """
    result = await ad_ldap_service.reset_password(user_id=user_id)
    await log_tool_execution(
        user_id=user_id,
        tool_name="mcp_reset_ad_password",
        params={"user_id": user_id},
        confirmed_by="mcp_authenticated_client",
        execution_status="success" if result.get("success") else "failed",
        result={"status": "temporary_password_generated", "user_id": user_id}
    )
    return result


@mcp.tool()
async def unlock_ad_account(user_id: str) -> dict:
    """
    Clear account lockout state in Active Directory for an employee locked out by repeated failed logins.
    
    Args:
        user_id: Corporate username (e.g., 'alex.chen')
    """
    result = await ad_ldap_service.unlock_account(user_id=user_id)
    await log_tool_execution(
        user_id=user_id,
        tool_name="mcp_unlock_ad_account",
        params={"user_id": user_id},
        confirmed_by="mcp_authenticated_client",
        execution_status="success" if result.get("success") else "failed",
        result=result
    )
    return result


# -------------------------------------------------------------
# 4. Security & Compliance Audit Trail Tool
# -------------------------------------------------------------
@mcp.tool()
async def get_security_audit_logs(limit: int = 10) -> list:
    """
    Retrieve the immutable SOC2/ISO27001 cryptographic security audit trail of all automated IT actions.
    
    Args:
        limit: Number of recent audit records to retrieve (default: 10)
    """
    logs = await get_audit_logs(limit=limit)
    return [
        {
            "id": l.id,
            "timestamp": l.timestamp.isoformat() if l.timestamp else None,
            "user_id": l.user_id,
            "tool_name": l.tool_name,
            "params": l.params_json,
            "confirmed_by": l.confirmed_by,
            "status": l.execution_status
        }
        for l in logs
    ]


if __name__ == "__main__":
    # Start MCP server over standard input/output (Stdio)
    mcp.run()
