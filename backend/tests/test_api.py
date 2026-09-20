import pytest
from httpx import AsyncClient, ASGITransport
from app.api.main import app
from app.db.database import init_db
from app.rag.store import knowledge_store

@pytest.mark.asyncio
async def test_api_endpoints():
    await init_db()
    knowledge_store.ingest_articles()

    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        # Health
        res = await client.get("/health")
        assert res.status_code == 200
        assert res.json()["status"] == "healthy"

        # Tickets list
        res = await client.get("/api/tickets")
        assert res.status_code == 200
        assert isinstance(res.json(), list)

        # Users list
        res = await client.get("/api/users")
        assert res.status_code == 200
        assert len(res.json()) >= 3

        # Chat endpoint - Informational
        chat_res = await client.post("/api/chat", json={
            "message": "What is the policy for requesting extra monitors?",
            "user_id": "alex.chen"
        })
        assert chat_res.status_code == 200
        data = chat_res.json()
        assert data["status"] in ["completed", "informational"]
        assert len(data.get("citations", [])) > 0

        # Chat endpoint - Actionable with full interrupt & resume lifecycle
        act_res = await client.post("/api/chat", json={
            "message": "Please unlock my locked account",
            "user_id": "alex.chen"
        })
        assert act_res.status_code == 200
        act_data = act_res.json()
        assert act_data["status"] == "verification_required"
        thread_id = act_data["thread_id"]

        # Auth verify endpoint
        verify_res = await client.post("/api/auth/verify", json={
            "thread_id": thread_id,
            "user_id": "alex.chen",
            "otp": "123456"
        })
        assert verify_res.status_code == 200
        v_data = verify_res.json()
        assert v_data["status"] == "confirmation_required"

        # Chat confirm endpoint
        confirm_res = await client.post("/api/chat/confirm", json={
            "thread_id": thread_id,
            "action": "approve"
        })
        assert confirm_res.status_code == 200
        c_data = confirm_res.json()
        assert c_data["status"] == "completed"
        assert c_data["action_result"]["success"] is True

        # Audit logs check
        audit_res = await client.get("/api/audit-logs")
        assert audit_res.status_code == 200
        logs = audit_res.json()
        assert len(logs) > 0
        assert any(l["tool_name"] == "unlock_account" for l in logs)
