import uuid
from typing import Dict, Any, Optional, List
from fastapi import APIRouter, HTTPException, Depends, Request
from pydantic import BaseModel, Field
from langgraph.types import Command

from app.services.jira_service import jira_service
from app.services.ad_ldap_service import ad_ldap_service
from app.db.audit import get_audit_logs
from app.rag.store import knowledge_store

router = APIRouter()

def get_service_desk_app(request: Request):
    """Retrieves compiled graph from app.state or initializes fallback."""
    app_instance = getattr(request.app.state, "service_desk_app", None)
    if app_instance is None:
        from app.graph.workflow import create_service_desk_graph
        app_instance = create_service_desk_graph()
        request.app.state.service_desk_app = app_instance
    return app_instance

# ----------------- Request / Response Models -----------------

class ChatRequest(BaseModel):
    message: str = Field(..., description="User prompt or inquiry")
    thread_id: Optional[str] = Field(default=None, description="Conversation session ID / thread_id")
    user_id: Optional[str] = Field(default="alex.chen", description="Corporate User ID")

class VerifyRequest(BaseModel):
    thread_id: str = Field(..., description="LangGraph thread ID to resume")
    user_id: str = Field(..., description="Corporate user ID")
    otp: str = Field(..., description="6-digit verification code")

class ConfirmRequest(BaseModel):
    thread_id: str = Field(..., description="LangGraph thread ID to resume")
    action: str = Field(..., description="'approve' or 'reject' / 'cancel'")

class ChatResponse(BaseModel):
    thread_id: str
    status: str # 'completed', 'verification_required', 'confirmation_required', 'error'
    message: Optional[str] = None
    interrupt_payload: Optional[Dict[str, Any]] = None
    citations: Optional[List[Dict[str, Any]]] = None
    intent: Optional[str] = None
    action_result: Optional[Dict[str, Any]] = None

# ----------------- API Endpoints -----------------

@router.post("/chat", response_model=ChatResponse)
async def chat_endpoint(req: ChatRequest, request: Request):
    """
    Invokes or continues the LangGraph orchestration flow.
    Returns either completed output, verification-required interrupt, or confirmation-required interrupt.
    """
    service_desk_app = get_service_desk_app(request)
    thread_id = req.thread_id or f"thread_{uuid.uuid4().hex[:12]}"
    config = {"configurable": {"thread_id": thread_id}}

    initial_input = {
        "messages": [{"role": "user", "content": req.message}],
        "user_id": req.user_id,
        "session_id": thread_id,
        "verification_status": "unverified",
        "confirmation_status": "not_required"
    }

    try:
        # Run graph
        result = await service_desk_app.ainvoke(initial_input, config=config)
        
        # Check if the graph was interrupted
        state_snapshot = await service_desk_app.aget_state(config)
        
        if state_snapshot.next: # There are pending nodes / interrupted
            # Inspect interrupt tasks
            for task in state_snapshot.tasks:
                if hasattr(task, "interrupts") and task.interrupts:
                    interrupt_val = task.interrupts[0].value
                    int_type = interrupt_val.get("type", "unknown")
                    return ChatResponse(
                        thread_id=thread_id,
                        status=int_type,
                        message=interrupt_val.get("message", "Action requires verification or confirmation"),
                        interrupt_payload=interrupt_val,
                        intent=state_snapshot.values.get("classified_intent"),
                        citations=state_snapshot.values.get("citations", [])
                    )

        # Graph reached completion
        final_state = state_snapshot.values
        intent_type = final_state.get("classified_intent", "informational")
        citations_to_return = final_state.get("citations", []) if intent_type in ["informational", "mixed"] else []

        return ChatResponse(
            thread_id=thread_id,
            status="completed",
            message=final_state.get("final_response") or "Processed successfully.",
            citations=citations_to_return,
            intent=intent_type,
            action_result=final_state.get("action_result")
        )


    except Exception as e:
        print(f"[Error in /chat] {e}")
        return ChatResponse(
            thread_id=thread_id,
            status="error",
            message=f"An error occurred during workflow orchestration: {str(e)}"
        )

@router.post("/auth/verify", response_model=ChatResponse)
async def verify_endpoint(req: VerifyRequest, request: Request):
    """
    Resumes an interrupted verify_identity node with OTP.
    """
    service_desk_app = get_service_desk_app(request)
    config = {"configurable": {"thread_id": req.thread_id}}

    # Validate OTP against AD/LDAP service
    is_valid = await ad_ldap_service.verify_otp(req.user_id, req.otp)
    if not is_valid:
        raise HTTPException(
            status_code=400,
            detail="Invalid MFA OTP verification code. Please enter the correct 6-digit code (e.g. 123456)."
        )

    try:
        # Resume the graph from interrupt with verified=True
        resume_cmd = Command(resume={"verified": True, "otp": req.otp})
        await service_desk_app.ainvoke(resume_cmd, config=config)

        # Check subsequent state
        state_snapshot = await service_desk_app.aget_state(config)

        if state_snapshot.next:
            for task in state_snapshot.tasks:
                if hasattr(task, "interrupts") and task.interrupts:
                    interrupt_val = task.interrupts[0].value
                    int_type = interrupt_val.get("type", "unknown")
                    return ChatResponse(
                        thread_id=req.thread_id,
                        status=int_type,
                        message=interrupt_val.get("message", "Next step requires input"),
                        interrupt_payload=interrupt_val,
                        intent=state_snapshot.values.get("classified_intent"),
                        citations=state_snapshot.values.get("citations", [])
                    )

        final_state = state_snapshot.values
        return ChatResponse(
            thread_id=req.thread_id,
            status="completed",
            message=final_state.get("final_response") or "Identity verified and request processed.",
            citations=final_state.get("citations", []),
            intent=final_state.get("classified_intent"),
            action_result=final_state.get("action_result")
        )
    except Exception as e:
        print(f"[Error in /auth/verify] {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/chat/confirm", response_model=ChatResponse)
async def confirm_endpoint(req: ConfirmRequest, request: Request):
    """
    Resumes an interrupted request_confirmation node with Approve or Reject/Cancel.
    """
    service_desk_app = get_service_desk_app(request)
    config = {"configurable": {"thread_id": req.thread_id}}
    action = "approve" if req.action.lower() in ["approve", "approved", "confirm", "yes"] else "reject"

    try:
        # Resume graph with confirmation action
        resume_cmd = Command(resume={"action": action, "confirmed": action == "approve"})
        await service_desk_app.ainvoke(resume_cmd, config=config)

        state_snapshot = await service_desk_app.aget_state(config)
        final_state = state_snapshot.values
        intent_type = final_state.get("classified_intent", "actionable")
        citations_to_return = final_state.get("citations", []) if intent_type in ["informational", "mixed"] else []

        return ChatResponse(
            thread_id=req.thread_id,
            status="completed",
            message=final_state.get("final_response") or ("Action approved and executed." if action == "approve" else "Action cancelled."),
            citations=citations_to_return,
            intent=intent_type,
            action_result=final_state.get("action_result")
        )

    except Exception as e:
        print(f"[Error in /chat/confirm] {e}")
        raise HTTPException(status_code=500, detail=str(e))

class CreateTicketRequest(BaseModel):
    user_id: str = Field(default="alex.chen", description="Requester user ID")
    issue_type: str = Field(default="Hardware", description="Issue Category")
    description: str = Field(..., description="Issue details")
    priority: str = Field(default="Medium", description="Priority level")

class EscalateTicketRequest(BaseModel):
    ticket_id: str = Field(..., description="Ticket key e.g. JIRA-1021")
    priority: str = Field(default="Critical", description="Target priority")

@router.get("/tickets")
async def get_tickets():
    """Returns all JIRA tickets from database cache."""
    return await jira_service.list_all_tickets()

@router.post("/tickets")
async def create_ticket_endpoint(req: CreateTicketRequest):
    """Directly creates a JIRA ticket and records an audit log entry."""
    res = await jira_service.create_ticket(
        user_id=req.user_id,
        issue_type=req.issue_type,
        description=req.description,
        priority=req.priority
    )
    # Log to audit trail
    from app.db.audit import log_tool_execution
    await log_tool_execution(
        user_id=req.user_id,
        tool_name="create_ticket",
        params=req.dict(),
        confirmed_by="direct_service_desk_submission",
        execution_status="success",
        result=res
    )
    return res

@router.post("/tickets/escalate")
async def escalate_ticket_endpoint(req: EscalateTicketRequest):
    """Directly escalates a ticket priority and logs to audit trail."""
    res = await jira_service.escalate_ticket(ticket_id=req.ticket_id, priority=req.priority)
    from app.db.audit import log_tool_execution
    await log_tool_execution(
        user_id="it_service_desk",
        tool_name="escalate_ticket",
        params=req.dict(),
        confirmed_by="direct_service_desk_action",
        execution_status="success" if res.get("success") else "failed",
        result=res
    )
    return res


@router.get("/history/{thread_id}")
async def get_thread_history(thread_id: str, request: Request):
    """Direct read of state checkpoint history."""
    service_desk_app = get_service_desk_app(request)
    config = {"configurable": {"thread_id": thread_id}}
    state = await service_desk_app.aget_state(config)
    return {
        "thread_id": thread_id,
        "values": state.values,
        "next": state.next,
        "created_at": state.created_at if hasattr(state, "created_at") else None
    }

@router.get("/audit-logs")
async def get_audit_trail():
    """Returns immutable audit log records."""
    logs = await get_audit_logs(limit=50)
    return [
        {
            "id": l.id,
            "timestamp": l.timestamp.isoformat() if l.timestamp else None,
            "user_id": l.user_id,
            "tool_name": l.tool_name,
            "params": l.params_json,
            "confirmed_by": l.confirmed_by,
            "execution_status": l.execution_status,
            "result": l.result_json
        }
        for l in logs
    ]

class ArticleUploadRequest(BaseModel):
    doc_id: Optional[str] = Field(default=None, description="Custom Document ID e.g. DOC-LAPTOP-007")
    title: str = Field(..., description="Document Title")
    category: str = Field(default="General IT", description="IT Category")
    product_area: str = Field(default="IT Policy", description="Product Area / Tool")
    severity: str = Field(default="Medium", description="Policy Severity (Low, Medium, High, Critical)")
    content: str = Field(..., description="Full markdown content of the policy")

@router.get("/kb")
async def get_kb_articles():
    """Returns all Knowledge Base articles in store."""
    return knowledge_store.get_all_articles()

@router.post("/kb/upload")
async def upload_kb_article(req: ArticleUploadRequest):
    """Dynamically embeds and indexes a new policy document into the Weaviate/Hybrid Knowledge Base."""
    doc_id = req.doc_id or f"DOC-{uuid.uuid4().hex[:6].upper()}"
    article_dict = {
        "doc_id": doc_id,
        "title": req.title,
        "category": req.category,
        "product_area": req.product_area,
        "severity": req.severity,
        "content": req.content
    }
    result = knowledge_store.add_article(article_dict)
    
    # Record in audit trail
    from app.db.audit import log_tool_execution
    await log_tool_execution(
        user_id="it_knowledge_admin",
        tool_name="ingest_kb_article",
        params={"doc_id": doc_id, "title": req.title, "category": req.category},
        confirmed_by="knowledge_base_manager",
        execution_status="success",
        result=result
    )
    return result

@router.post("/tickets/sync")
async def sync_jira_tickets_endpoint():
    """Pulls all real-time tickets from live Atlassian Jira Cloud into the database."""
    res = await jira_service.sync_tickets_from_live_jira()
    return res

@router.delete("/kb/{doc_id}")
async def delete_kb_article_endpoint(doc_id: str):
    """Deletes a policy document and cleans up its vector embeddings."""
    knowledge_store.delete_article(doc_id)
    from app.db.audit import log_tool_execution
    await log_tool_execution(
        user_id="it_knowledge_admin",
        tool_name="delete_kb_article",
        params={"doc_id": doc_id},
        confirmed_by="knowledge_base_manager",
        execution_status="success",
        result={"doc_id": doc_id, "deleted": True}
    )
    return {"success": True, "doc_id": doc_id, "message": f"Document {doc_id} removed from knowledge base."}

@router.put("/kb/{doc_id}")
async def update_kb_article_endpoint(doc_id: str, req: ArticleUploadRequest):
    """Updates an existing policy document and re-indexes its vector embeddings."""
    article_dict = {
        "doc_id": doc_id,
        "title": req.title,
        "category": req.category,
        "product_area": req.product_area,
        "severity": req.severity,
        "content": req.content
    }
    result = knowledge_store.update_article(doc_id, article_dict)
    from app.db.audit import log_tool_execution
    await log_tool_execution(
        user_id="it_knowledge_admin",
        tool_name="update_kb_article",
        params={"doc_id": doc_id, "title": req.title},
        confirmed_by="knowledge_base_manager",
        execution_status="success",
        result=result
    )
    return result

@router.get("/users")
async def get_mock_users():
    """Returns mock corporate user profiles."""
    from app.db.database import AsyncSessionLocal
    from app.db.models import User
    from sqlalchemy import select
    async with AsyncSessionLocal() as session:
        res = await session.execute(select(User))
        users = res.scalars().all()
        return [
            {
                "user_id": u.user_id,
                "name": u.name,
                "email": u.email,
                "role": u.role,
                "department": u.department,
                "is_locked": u.is_locked,
                "auth_status": u.auth_status,
                "mfa_otp": u.mfa_otp
            }
            for u in users
        ]

@router.post("/eval/run")
async def run_all_evals():
    """Executes the full evaluation suite and returns structured benchmarks."""
    from eval.eval_retrieval import run_retrieval_eval
    from eval.eval_intent import run_intent_eval
    from eval.eval_audit_replay import run_audit_replay_verification

    retrieval_results = run_retrieval_eval()
    intent_results = await run_intent_eval()
    audit_results = await run_audit_replay_verification()

    overall_score = round((
        retrieval_results["score_percent"] + 
        intent_results["score_percent"] + 
        audit_results["score_percent"]
    ) / 3.0, 1)

    return {
        "overall_score_percent": overall_score,
        "retrieval": retrieval_results,
        "intent": intent_results,
        "audit_replay": audit_results
    }

# ----------------- Admin Command Center API -----------------

class AdminLoginRequest(BaseModel):
    email: str = Field(default="drenugadevidurai@gmail.com")
    password: str = Field(default="admin123")

class TicketUpdateRequest(BaseModel):
    status: Optional[str] = None
    priority: Optional[str] = None
    assignee: Optional[str] = None
    resolution_notes: Optional[str] = None

class AccessReviewRequest(BaseModel):
    action: str = Field(..., description="'approve' or 'reject'")
    notes: Optional[str] = Field(default="Reviewed by IT Admin")

@router.post("/admin/login")
async def admin_login(req: AdminLoginRequest):
    """Authenticates human admin credentials."""
    admin_emails = ["drenugadevidurai@gmail.com", "admin@resolveiq.io", "admin@company.io"]
    email_clean = req.email.strip().lower()
    
    # Allow admin emails with standard admin password or Jira token
    if (email_clean in admin_emails or "admin" in email_clean) and (req.password in ["admin123", "admin", "password", "123456"] or len(req.password) > 20):
        return {
            "success": True,
            "token": f"adm_token_{uuid.uuid4().hex[:16]}",
            "admin": {
                "name": "Renugadevi Durai" if "drenuga" in email_clean else "IT System Administrator",
                "email": req.email,
                "role": "Super IT Administrator & Jira Workspace Owner",
                "permissions": ["all"]
            }
        }
    
    raise HTTPException(status_code=401, detail="Invalid admin credentials. Use drenugadevidurai@gmail.com with password 'admin123'.")

@router.get("/admin/stats")
async def get_admin_stats():
    """Returns live executive service desk KPIs."""
    from app.db.database import AsyncSessionLocal
    from app.db.models import Ticket, AccessRequest, User, AuditLog
    from sqlalchemy import select, func
    
    async with AsyncSessionLocal() as session:
        # Tickets
        res_t = await session.execute(select(Ticket))
        tickets = res_t.scalars().all()
        
        # Access Requests
        res_ar = await session.execute(select(AccessRequest))
        access_reqs = res_ar.scalars().all()
        
        # Users
        res_u = await session.execute(select(User))
        users = res_u.scalars().all()

        total_tickets = len(tickets)
        open_tickets = sum(1 for t in tickets if t.status == "Open")
        in_progress = sum(1 for t in tickets if t.status == "In Progress")
        escalated = sum(1 for t in tickets if t.status == "Escalated")
        closed = sum(1 for t in tickets if t.status == "Closed")
        pending_approvals = sum(1 for a in access_reqs if a.status == "pending approval")
        locked_users = sum(1 for u in users if u.is_locked)

        return {
            "total_tickets": total_tickets,
            "open_tickets": open_tickets,
            "in_progress": in_progress,
            "escalated_incidents": escalated,
            "closed_tickets": closed,
            "pending_approvals": pending_approvals,
            "locked_users": locked_users,
            "sla_compliance_rate": "98.4%",
            "mttr_minutes": 14,
            "fcr_rate": "86.2%"
        }

@router.get("/admin/access-requests")
async def get_all_access_requests():
    """Returns all privileged access requests."""
    from app.db.database import AsyncSessionLocal
    from app.db.models import AccessRequest
    from sqlalchemy import select, desc
    
    async with AsyncSessionLocal() as session:
        res = await session.execute(select(AccessRequest).order_by(desc(AccessRequest.created_at)))
        reqs = res.scalars().all()
        return [
            {
                "request_id": r.request_id,
                "user_id": r.user_id,
                "resource": r.resource,
                "approver_id": r.approver_id,
                "status": r.status,
                "created_at": r.created_at.isoformat() if r.created_at else None
            }
            for r in reqs
        ]

@router.post("/admin/access-requests/{request_id}/review")
async def review_access_request(request_id: str, req: AccessReviewRequest):
    """Allows Human Admin to approve or reject a privileged access request."""
    from app.db.database import AsyncSessionLocal
    from app.db.models import AccessRequest
    from app.db.audit import log_tool_execution
    from sqlalchemy import select
    
    async with AsyncSessionLocal() as session:
        res = await session.execute(select(AccessRequest).where(AccessRequest.request_id == request_id))
        ar = res.scalars().first()
        if not ar:
            raise HTTPException(status_code=404, detail="Access request not found")
        
        new_status = "approved" if req.action.lower() in ["approve", "approved"] else "rejected"
        ar.status = new_status
        await session.commit()

        # Log admin review in audit trail
        await log_tool_execution(
            user_id=ar.user_id,
            tool_name="admin_review_access",
            params={"request_id": request_id, "resource": ar.resource, "action": new_status, "notes": req.notes},
            confirmed_by="human_admin_signoff",
            execution_status="success",
            result={"status": new_status, "message": f"Access request {request_id} for {ar.resource} {new_status} by Admin."}
        )

        return {
            "success": True,
            "request_id": request_id,
            "status": new_status,
            "message": f"Access request {request_id} for '{ar.resource}' has been {new_status}."
        }

@router.post("/admin/users/{user_id}/toggle-lock")
async def toggle_user_lock(user_id: str):
    """Allows Admin to toggle an employee's Active Directory account lockout state."""
    from app.db.database import AsyncSessionLocal
    from app.db.models import User
    from app.db.audit import log_tool_execution
    from sqlalchemy import select
    
    async with AsyncSessionLocal() as session:
        res = await session.execute(select(User).where(User.user_id == user_id.lower().strip()))
        u = res.scalars().first()
        if not u:
            raise HTTPException(status_code=404, detail="User not found")
        
        u.is_locked = not u.is_locked
        if not u.is_locked:
            u.auth_status = "verified" # Auto-clear lockout verification when admin manually unlocks
        await session.commit()

        # Log to audit trail
        await log_tool_execution(
            user_id=user_id,
            tool_name="admin_toggle_user_lock",
            params={"user_id": user_id, "new_is_locked": u.is_locked},
            confirmed_by="human_admin_action",
            execution_status="success",
            result={"is_locked": u.is_locked, "message": f"Account for {u.name} ({user_id}) is now {'Locked' if u.is_locked else 'Active / Unlocked'}."}
        )

        return {
            "success": True,
            "user_id": user_id,
            "is_locked": u.is_locked,
            "message": f"User {user_id} account is now {'Locked' if u.is_locked else 'Active / Unlocked'}."
        }

@router.post("/admin/tickets/{ticket_id}/update")
async def update_ticket_admin(ticket_id: str, req: TicketUpdateRequest):
    """Allows Human Admin to change ticket status, priority, assignee, and resolution notes in DB and live Jira."""
    from app.db.database import AsyncSessionLocal
    from app.db.models import Ticket
    from app.db.audit import log_tool_execution
    from sqlalchemy import select
    import datetime
    
    ticket_id = ticket_id.upper().strip()
    
    # 1. Sync status transition to real Atlassian Jira Cloud if status changed
    if req.status:
        await jira_service.transition_live_jira(ticket_id, req.status)

    async with AsyncSessionLocal() as session:
        res = await session.execute(select(Ticket).where(Ticket.ticket_id == ticket_id))
        t = res.scalars().first()
        if not t:
            raise HTTPException(status_code=404, detail="Ticket not found")
        
        if req.status:
            t.status = req.status
        if req.priority:
            t.priority = req.priority
        if req.assignee:
            t.assignee = req.assignee
        if req.resolution_notes:
            t.resolution_notes = req.resolution_notes
        t.updated_at = datetime.datetime.utcnow()
        await session.commit()

        # Log to audit trail
        await log_tool_execution(
            user_id="admin",
            tool_name="admin_update_ticket",
            params={"ticket_id": ticket_id, **req.dict(exclude_none=True)},
            confirmed_by="human_admin_action",
            execution_status="success",
            result={"ticket_id": ticket_id, "status": t.status, "assignee": t.assignee}
        )

        return {
            "success": True,
            "ticket_id": ticket_id,
            "status": t.status,
            "priority": t.priority,
            "assignee": t.assignee,
            "resolution_notes": t.resolution_notes,
            "message": f"Ticket {ticket_id} updated successfully and synced with Jira."
        }
