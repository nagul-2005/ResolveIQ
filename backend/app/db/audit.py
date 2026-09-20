import datetime
import json
from typing import Dict, Any, Optional
from sqlalchemy import select, desc
from app.db.database import AsyncSessionLocal
from app.db.models import AuditLog

async def log_tool_execution(
    user_id: str,
    tool_name: str,
    params: Dict[str, Any],
    confirmed_by: str,
    execution_status: str,
    result: Optional[Dict[str, Any]] = None
) -> AuditLog:
    """
    Persistently logs an immutable audit event for every tool execution.
    """
    async with AsyncSessionLocal() as session:
        audit_entry = AuditLog(
            timestamp=datetime.datetime.utcnow(),
            user_id=user_id,
            tool_name=tool_name,
            params_json=params,
            confirmed_by=confirmed_by,
            execution_status=execution_status,
            result_json=result or {}
        )
        session.add(audit_entry)
        await session.commit()
        await session.refresh(audit_entry)
        return audit_entry

async def get_audit_logs(limit: int = 50):
    async with AsyncSessionLocal() as session:
        result = await session.execute(
            select(AuditLog).order_by(desc(AuditLog.timestamp)).limit(limit)
        )
        return result.scalars().all()
