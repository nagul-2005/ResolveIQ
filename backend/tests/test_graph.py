import pytest
import uuid
from langgraph.types import Command
from app.db.database import init_db
from app.rag.store import knowledge_store
from app.graph.workflow import service_desk_app

@pytest.mark.asyncio
async def test_informational_graph_flow():
    await init_db()
    knowledge_store.ingest_articles()

    thread_id = f"test_info_{uuid.uuid4().hex[:8]}"
    config = {"configurable": {"thread_id": thread_id}}

    input_data = {
        "messages": [{"role": "user", "content": "How do I setup corporate GlobalProtect VPN on macOS?"}],
        "user_id": "alex.chen",
        "session_id": thread_id,
        "verification_status": "unverified",
        "confirmation_status": "not_required"
    }

    result = await service_desk_app.ainvoke(input_data, config=config)
    assert result is not None
    assert result.get("classified_intent") in ["informational", "mixed"]
    assert result.get("generated_answer") is not None
    assert len(result.get("citations", [])) > 0
    assert any("DOC-VPN-001" == c["doc_id"] for c in result.get("citations", []))

@pytest.mark.asyncio
async def test_actionable_graph_interrupt_and_resume_flow():
    await init_db()
    knowledge_store.ingest_articles()

    thread_id = f"test_act_{uuid.uuid4().hex[:8]}"
    config = {"configurable": {"thread_id": thread_id}}

    input_data = {
        "messages": [{"role": "user", "content": "Please unlock my account for user alex.chen"}],
        "user_id": "alex.chen",
        "session_id": thread_id,
        "verification_status": "unverified",
        "confirmation_status": "not_required"
    }

    # Step 1: Initial invocation triggers verify_identity interrupt
    await service_desk_app.ainvoke(input_data, config=config)
    state = await service_desk_app.aget_state(config)
    assert state.next != () # Interrupted
    assert state.tasks[0].interrupts[0].value["type"] == "verification_required"

    # Step 2: Resume with OTP
    resume_otp = Command(resume={"verified": True, "otp": "123456"})
    await service_desk_app.ainvoke(resume_otp, config=config)
    state = await service_desk_app.aget_state(config)
    assert state.next != () # Now interrupted at confirmation!
    assert state.tasks[0].interrupts[0].value["type"] == "confirmation_required"

    # Step 3: Resume with Approve
    resume_confirm = Command(resume={"action": "approve", "confirmed": True})
    final_res = await service_desk_app.ainvoke(resume_confirm, config=config)
    state = await service_desk_app.aget_state(config)
    assert state.next == () # Completed
    assert final_res.get("action_result", {}).get("success") is True
