import random
import datetime
import httpx
from typing import Dict, Any, Optional, List
from sqlalchemy import select, update
from app.config import settings
from app.db.database import AsyncSessionLocal
from app.db.models import Ticket

class JiraService:
    @staticmethod
    def is_live_jira_configured() -> bool:
        return bool(settings.JIRA_BASE_URL and settings.JIRA_API_TOKEN and settings.JIRA_EMAIL)

    @staticmethod
    async def transition_live_jira(ticket_id: str, target_status: str, notes: Optional[str] = None) -> bool:
        """Transitions ticket status and logs triage comments on real Atlassian Jira Cloud instance."""
        if not JiraService.is_live_jira_configured():
            return False
        
        try:
            auth = (settings.JIRA_EMAIL, settings.JIRA_API_TOKEN)
            transitions_url = f"{settings.JIRA_BASE_URL.rstrip('/')}/rest/api/3/issue/{ticket_id}/transitions"
            comment_url = f"{settings.JIRA_BASE_URL.rstrip('/')}/rest/api/3/issue/{ticket_id}/comment"
            
            async with httpx.AsyncClient(timeout=10.0) as client:
                # 1. Fetch available transitions for this issue
                resp = await client.get(transitions_url, auth=auth)
                transitions = []
                if resp.status_code == 200:
                    transitions = resp.json().get("transitions", [])
                
                target_clean = target_status.lower().strip()
                chosen_id = None

                # 2. Match target status with available Jira transitions
                for t in transitions:
                    t_name = t.get("name", "").lower()
                    to_name = t.get("to", {}).get("name", "").lower()
                    
                    if target_clean in ["in progress", "progress"] and ("progress" in t_name or "progress" in to_name):
                        chosen_id = t["id"]
                        break
                    elif target_clean in ["pending", "wait", "customer"] and ("pending" in t_name or "customer" in t_name or "respond" in t_name or "pending" in to_name):
                        chosen_id = t["id"]
                        break
                    elif target_clean in ["escalated", "escalate"] and ("escalat" in t_name or "escalat" in to_name):
                        chosen_id = t["id"]
                        break
                    elif target_clean in ["resolved", "resolve"] and ("resolve" in t_name or "resolve" in to_name):
                        chosen_id = t["id"]
                        break
                    elif target_clean in ["closed", "close"] and ("close" in t_name or "close" in to_name or "resolve" in t_name):
                        chosen_id = t["id"]
                        break
                    elif target_clean in ["open", "reopen"] and ("reopen" in t_name or "open" in t_name or "back" in t_name or "support" in to_name):
                        chosen_id = t["id"]
                        break

                # 3. Execute transition if matching route found
                transition_success = False
                if chosen_id:
                    post_resp = await client.post(transitions_url, json={"transition": {"id": chosen_id}}, auth=auth)
                    if post_resp.status_code in [200, 204]:
                        print(f"[JiraService] Successfully transitioned live Jira ticket {ticket_id} to '{target_status}' (transition ID {chosen_id})")
                        transition_success = True
                    else:
                        print(f"[JiraService] Transition notice ({post_resp.status_code}): {post_resp.text}")

                # 4. Also post a comment to the Jira ticket recording the Admin Triage action
                comment_text = f"🔄 **[ResolveIQ Admin Triage]** Status updated to **{target_status}**."
                if notes:
                    comment_text += f"\n\n**Technician Notes:** {notes}"
                
                await client.post(comment_url, json={
                    "body": {
                        "type": "doc",
                        "version": 1,
                        "content": [
                            {
                                "type": "paragraph",
                                "content": [{"type": "text", "text": comment_text}]
                            }
                        ]
                    }
                }, auth=auth)

                return transition_success
        except Exception as e:
            print(f"[JiraService] Error syncing transition to live Jira: {e}")
        
        return False

    @staticmethod
    async def sync_tickets_from_live_jira() -> Dict[str, Any]:
        """Pulls tickets directly from live Jira Cloud via JQL and synchronizes into local database."""
        if not JiraService.is_live_jira_configured():
            return {"success": False, "synced_count": 0, "message": "Live Jira not configured"}

        synced_count = 0
        try:
            auth = (settings.JIRA_EMAIL, settings.JIRA_API_TOKEN)
            search_url = f"{settings.JIRA_BASE_URL.rstrip('/')}/rest/api/3/search/jql"
            
            project_keys = f"({settings.JIRA_PROJECT_KEY}, KAN)" if settings.JIRA_PROJECT_KEY != "KAN" else "(KAN)"
            payload = {
                "jql": f"project in {project_keys} ORDER BY created DESC",
                "fields": ["summary", "status", "priority", "issuetype", "assignee", "created", "updated", "description"],
                "maxResults": 50
            }

            async with httpx.AsyncClient(timeout=12.0) as client:
                resp = await client.post(search_url, json=payload, auth=auth)
                if resp.status_code != 200:
                    print(f"[JiraService] Jira JQL sync notice: {resp.status_code} - {resp.text}")
                    return {"success": False, "synced_count": 0, "error": resp.text}

                issues = resp.json().get("issues", [])
                async with AsyncSessionLocal() as session:
                    for item in issues:
                        t_id = item.get("key")
                        if not t_id:
                            continue
                        
                        fields = item.get("fields") or {}
                        raw_summary = fields.get("summary") or "Jira Support Issue"
                        status_obj = fields.get("status") or {}
                        status_name = status_obj.get("name") or "Open"
                        
                        # Map Jira status to standard service desk statuses
                        mapped_status = "Open"
                        s_lower = status_name.lower()
                        if "progress" in s_lower:
                            mapped_status = "In Progress"
                        elif "pending" in s_lower or "customer" in s_lower or "wait" in s_lower:
                            mapped_status = "Pending"
                        elif "escalat" in s_lower:
                            mapped_status = "Escalated"
                        elif "resolved" in s_lower:
                            mapped_status = "Resolved"
                        elif "done" in s_lower or "close" in s_lower:
                            mapped_status = "Closed"
                        
                        priority_obj = fields.get("priority") or {}
                        priority_name = priority_obj.get("name") or "Medium"
                        assignee_obj = fields.get("assignee") or {}
                        assignee_name = assignee_obj.get("displayName") or "IT Service Desk - Tier 1"
                        
                        # Extract issue type from summary prefix [Type] if available
                        issue_type = "General IT"
                        if "[" in raw_summary and "]" in raw_summary:
                            issue_type = raw_summary[raw_summary.find("[")+1 : raw_summary.find("]")].strip().capitalize()
                        
                        # Check existing
                        res = await session.execute(select(Ticket).where(Ticket.ticket_id == t_id))
                        existing_ticket = res.scalars().first()

                        if existing_ticket:
                            existing_ticket.status = mapped_status
                            existing_ticket.priority = priority_name
                            existing_ticket.assignee = assignee_name
                            existing_ticket.updated_at = datetime.datetime.utcnow()
                        else:
                            new_t = Ticket(
                                ticket_id=t_id,
                                user_id="jira.cloud.sync",
                                issue_type=issue_type,
                                description=raw_summary,
                                status=mapped_status,
                                priority=priority_name,
                                assignee=assignee_name,
                                created_at=datetime.datetime.utcnow(),
                                updated_at=datetime.datetime.utcnow()
                            )
                            session.add(new_t)
                        synced_count += 1
                    
                    await session.commit()
            
            print(f"[JiraService] Successfully synced {synced_count} tickets from live Jira Cloud.")
            return {"success": True, "synced_count": synced_count, "message": f"Successfully pulled {synced_count} tickets from Jira Cloud"}
        except Exception as e:
            print(f"[JiraService] Error syncing from live Jira: {e}")
            return {"success": False, "synced_count": 0, "error": str(e)}

    @staticmethod
    async def create_ticket(user_id: str, issue_type: str, description: str, priority: str = "Medium") -> Dict[str, Any]:
        """Creates a ticket in the JIRA system (Live Atlassian Cloud ITSD Service Desk or Local Mock DB)."""
        ticket_id = None
        
        # 1. If real Atlassian Jira Cloud is configured, call Jira REST API v3
        if JiraService.is_live_jira_configured():
            try:
                jira_url = f"{settings.JIRA_BASE_URL.rstrip('/')}/rest/api/3/issue"
                auth = (settings.JIRA_EMAIL, settings.JIRA_API_TOKEN)
                
                # Intelligent ITIL issue type selection for Jira Service Management
                issue_type_clean = issue_type.lower()
                if "incident" in issue_type_clean or priority == "Critical" or "outage" in issue_type_clean:
                    selected_issuetype = {"name": "[System] Incident"}
                elif "access" in issue_type_clean or "approval" in issue_type_clean:
                    selected_issuetype = {"name": "[System] Service request with approvals"}
                elif "service" in issue_type_clean or "hardware" in issue_type_clean or "software" in issue_type_clean or "network" in issue_type_clean:
                    selected_issuetype = {"name": "[System] Service request"}
                else:
                    selected_issuetype = {"name": "Task"}
                
                payload = {
                    "fields": {
                        "project": {"key": settings.JIRA_PROJECT_KEY},
                        "summary": f"[{issue_type}] {description[:80]}",
                        "description": {
                            "type": "doc",
                            "version": 1,
                            "content": [
                                {
                                    "type": "paragraph",
                                    "content": [
                                        {"type": "text", "text": f"Requester: {user_id}\n\nIssue Details:\n{description}"}
                                    ]
                                }
                            ]
                        },
                        "issuetype": selected_issuetype
                    }
                }
                
                async with httpx.AsyncClient(timeout=10.0) as client:
                    resp = await client.post(jira_url, json=payload, auth=auth)
                    
                    # Fallback to Task if custom issuetype name rejected
                    if resp.status_code not in [200, 201]:
                        payload["fields"]["issuetype"] = {"name": "Task"}
                        resp = await client.post(jira_url, json=payload, auth=auth)

                    if resp.status_code in [200, 201]:
                        data = resp.json()
                        ticket_id = data.get("key")
                        print(f"[JiraService] Successfully created live Jira Service Desk ticket {ticket_id}")
                    else:
                        print(f"[JiraService] Live Jira API warning (status {resp.status_code}): {resp.text}")
            except Exception as e:
                print(f"[JiraService] Live Jira connection error: {e}. Falling back to internal store.")

        # Fallback local ticket ID generator
        if not ticket_id:
            ticket_num = random.randint(1050, 9999)
            ticket_id = f"{settings.JIRA_PROJECT_KEY}-{ticket_num}"
        
        # Persist ticket locally for dashboard view
        async with AsyncSessionLocal() as session:
            ticket = Ticket(
                ticket_id=ticket_id,
                user_id=user_id,
                issue_type=issue_type,
                description=description,
                status="Open",
                priority=priority,
                assignee="IT Service Desk - Tier 1",
                created_at=datetime.datetime.utcnow(),
                updated_at=datetime.datetime.utcnow()
            )
            session.add(ticket)
            await session.commit()
            
            return {
                "success": True,
                "ticket_id": ticket_id,
                "jira_url": f"{settings.JIRA_BASE_URL.rstrip('/')}/browse/{ticket_id}",
                "user_id": user_id,
                "issue_type": issue_type,
                "description": description,
                "status": "Open",
                "priority": priority,
                "assignee": "IT Service Desk - Tier 1",
                "created_at": ticket.created_at.isoformat(),
                "message": f"Ticket {ticket_id} has been created successfully in IT Service Desk (ITSD) queue."
            }

    @staticmethod
    async def check_ticket_status(ticket_id: str) -> Dict[str, Any]:
        """Retrieves ticket details and status from the JIRA store."""
        ticket_id = ticket_id.upper().strip()
        
        async with AsyncSessionLocal() as session:
            res = await session.execute(select(Ticket).where(Ticket.ticket_id == ticket_id))
            ticket = res.scalars().first()
            if not ticket:
                return {
                    "success": False,
                    "ticket_id": ticket_id,
                    "error": f"Ticket {ticket_id} not found in JIRA system."
                }
            
            return {
                "success": True,
                "ticket_id": ticket.ticket_id,
                "user_id": ticket.user_id,
                "issue_type": ticket.issue_type,
                "description": ticket.description,
                "status": ticket.status,
                "priority": ticket.priority,
                "assignee": ticket.assignee,
                "resolution_notes": ticket.resolution_notes,
                "created_at": ticket.created_at.isoformat(),
                "updated_at": ticket.updated_at.isoformat()
            }

    @staticmethod
    async def escalate_ticket(ticket_id: str, priority: str = "Critical") -> Dict[str, Any]:
        """Escalates an existing ticket's priority and routes to On-Call IT Manager in DB and live Jira."""
        ticket_id = ticket_id.upper().strip()
        
        # 1. Sync live transition to Jira Cloud
        await JiraService.transition_live_jira(ticket_id, "Escalated")

        async with AsyncSessionLocal() as session:
            res = await session.execute(select(Ticket).where(Ticket.ticket_id == ticket_id))
            ticket = res.scalars().first()
            if not ticket:
                return {
                    "success": False,
                    "ticket_id": ticket_id,
                    "error": f"Ticket {ticket_id} not found in JIRA system."
                }
            
            ticket.status = "Escalated"
            ticket.priority = priority
            ticket.assignee = "IT Incident Manager (On-Call)"
            ticket.updated_at = datetime.datetime.utcnow()
            await session.commit()
            
            return {
                "success": True,
                "ticket_id": ticket.ticket_id,
                "status": "Escalated",
                "priority": priority,
                "assignee": "IT Incident Manager (On-Call)",
                "message": f"Ticket {ticket_id} has been escalated to {priority} priority and dispatched to on-call."
            }

    @staticmethod
    async def close_ticket(ticket_id: str, resolution_notes: str = "Resolved by IT Service Desk") -> Dict[str, Any]:
        """Closes a ticket with resolution notes in DB and live Jira Cloud."""
        ticket_id = ticket_id.upper().strip()
        
        # 1. Sync live transition to Jira Cloud
        await JiraService.transition_live_jira(ticket_id, "Resolved", resolution_notes)

        async with AsyncSessionLocal() as session:
            res = await session.execute(select(Ticket).where(Ticket.ticket_id == ticket_id))
            ticket = res.scalars().first()
            if not ticket:
                return {
                    "success": False,
                    "ticket_id": ticket_id,
                    "error": f"Ticket {ticket_id} not found in JIRA system."
                }
            
            ticket.status = "Closed"
            ticket.resolution_notes = resolution_notes
            ticket.updated_at = datetime.datetime.utcnow()
            await session.commit()
            
            return {
                "success": True,
                "ticket_id": ticket.ticket_id,
                "status": "Closed",
                "resolution_notes": resolution_notes,
                "message": f"Ticket {ticket_id} marked as Closed. Resolution notes: {resolution_notes}"
            }

    @staticmethod
    async def list_all_tickets() -> List[Dict[str, Any]]:
        """Returns all tickets for dashboard view."""
        async with AsyncSessionLocal() as session:
            res = await session.execute(select(Ticket).order_by(Ticket.created_at.desc()))
            tickets = res.scalars().all()
            return [
                {
                    "ticket_id": t.ticket_id,
                    "user_id": t.user_id,
                    "issue_type": t.issue_type,
                    "description": t.description,
                    "status": t.status,
                    "priority": t.priority,
                    "assignee": t.assignee,
                    "resolution_notes": t.resolution_notes,
                    "created_at": t.created_at.isoformat() if t.created_at else None,
                    "updated_at": t.updated_at.isoformat() if t.updated_at else None,
                }
                for t in tickets
            ]

jira_service = JiraService()
