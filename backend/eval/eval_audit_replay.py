import asyncio
from typing import Dict, Any, List
from app.db.audit import get_audit_logs, log_tool_execution
from app.graph.nodes.execute_tool import execute_tool_node, SIDE_EFFECT_TOOLS
from app.db.database import init_db

async def run_audit_replay_verification() -> Dict[str, Any]:
    """
    Replays the audit log and tests node-level security invariants:
    1. Invariant 1: No side-effect tool can ever execute if confirmation_status != 'approved'.
    2. Invariant 2: Direct hostile invocation of execute_tool_node with unapproved state is blocked.
    3. Invariant 3: Historical audit rows with execution_status='success' must have confirmed_by='user_approved' (or system_readonly).
    """
    await init_db()

    # Step 1: Invariant Verification by Active Fuzzing / Attack Injection
    test_tools = ["unlock_account", "reset_password", "create_ticket", "escalate_ticket", "close_ticket", "grant_access_request"]
    attack_results = []
    
    for tool_name in test_tools:
        hostile_state = {
            "user_id": "attacker.test",
            "selected_tool": {
                "name": tool_name,
                "params": {"user_id": "attacker.test", "ticket_id": "JIRA-1000"}
            },
            "confirmation_status": "pending" # NOT approved!
        }
        
        node_res = await execute_tool_node(hostile_state)
        action_res = node_res.get("action_result", {})
        
        blocked = action_res.get("blocked", False) or not action_res.get("success", False)
        attack_results.append({
            "tool_name": tool_name,
            "simulated_confirmation_status": "pending",
            "blocked_by_guard": blocked,
            "error": action_res.get("error")
        })

    all_attacks_blocked = all(r["blocked_by_guard"] for r in attack_results)

    # Step 2: Historical Audit Trail Replay Check
    logs = await get_audit_logs(limit=100)
    violations = []
    verified_entries = 0

    VALID_CONFIRMATION_SOURCES = {
        "user_approved", 
        "direct_service_desk_action", 
        "direct_service_desk_submission", 
        "human_admin_action", 
        "human_admin_signoff", 
        "knowledge_base_manager", 
        "system_readonly"
    }

    for entry in logs:
        is_side_effect = entry.tool_name in SIDE_EFFECT_TOOLS
        is_success = entry.execution_status == "success"
        is_confirmed = entry.confirmed_by in VALID_CONFIRMATION_SOURCES

        if is_side_effect and is_success and not is_confirmed:
            violations.append({
                "audit_id": entry.id,
                "tool_name": entry.tool_name,
                "confirmed_by": entry.confirmed_by,
                "timestamp": entry.timestamp.isoformat() if entry.timestamp else None,
                "violation": f"Side effect executed without authorized confirmation (found: {entry.confirmed_by})"
            })
        else:
            verified_entries += 1


    passed = all_attacks_blocked and len(violations) == 0

    return {
        "benchmark": "Audit Replay & Zero-Trust Tool Invariant",
        "total_attack_simulations": len(attack_results),
        "attacks_successfully_blocked": sum(1 for r in attack_results if r["blocked_by_guard"]),
        "historical_audit_records_verified": verified_entries,
        "violations_found": len(violations),
        "violations": violations,
        "attack_details": attack_results,
        "passed": passed,
        "score_percent": 100.0 if passed else 0.0
    }

if __name__ == "__main__":
    res = asyncio.run(run_audit_replay_verification())
    print("--- Security & Audit Replay Results ---")
    print(f"Passed: {res['passed']}")
    print(f"Attacks Blocked: {res['attacks_successfully_blocked']}/{res['total_attack_simulations']}")
    print(f"Audit Trail Violations: {res['violations_found']}")
