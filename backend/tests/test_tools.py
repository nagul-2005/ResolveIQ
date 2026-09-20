import pytest
from app.db.database import init_db
from app.services.jira_service import jira_service
from app.services.ad_ldap_service import ad_ldap_service

@pytest.mark.asyncio
async def test_jira_service():
    await init_db()
    
    # 1. Create ticket
    t = await jira_service.create_ticket("alex.chen", "Hardware", "MacBook Pro keyboard key sticky")
    assert t["success"] is True
    ticket_id = t["ticket_id"]
    assert any(ticket_id.startswith(prefix) for prefix in ["ITSD-", "KAN-", "JIRA-"]) or "-" in ticket_id


    # 2. Check ticket status
    status = await jira_service.check_ticket_status(ticket_id)
    assert status["success"] is True
    assert status["status"] == "Open"

    # 3. Escalate ticket
    esc = await jira_service.escalate_ticket(ticket_id, "Critical")
    assert esc["success"] is True
    assert esc["status"] == "Escalated"

    # 4. Close ticket
    closed = await jira_service.close_ticket(ticket_id, "Keyboard serviced by Apple Authorized repair center")
    assert closed["success"] is True
    assert closed["status"] == "Closed"

@pytest.mark.asyncio
async def test_ad_ldap_service():
    await init_db()

    # 1. OTP generation and verification
    otp = await ad_ldap_service.generate_otp("alex.chen")
    assert len(otp) == 6
    assert await ad_ldap_service.verify_otp("alex.chen", otp) is True
    assert await ad_ldap_service.verify_otp("alex.chen", "000000") is False

    # 2. Account unlock
    unlock = await ad_ldap_service.unlock_account("alex.chen")
    assert unlock["success"] is True
    assert unlock["is_locked"] is False

    # 3. Access request (always terminal 'pending approval')
    req = await ad_ldap_service.grant_access_request("alex.chen", "AWS Prod RDS")
    assert req["success"] is True
    assert req["status"] == "pending approval"
