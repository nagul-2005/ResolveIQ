import datetime
from sqlalchemy import Column, String, Boolean, DateTime, Integer, Text, JSON
from sqlalchemy.orm import declarative_base

Base = declarative_base()

class User(Base):
    __tablename__ = "users"

    user_id = Column(String(64), primary_key=True, index=True)
    email = Column(String(128), unique=True, index=True, nullable=False)
    name = Column(String(128), nullable=False)
    role = Column(String(64), default="Software Engineer")
    department = Column(String(64), default="Engineering")
    is_locked = Column(Boolean, default=False)
    auth_status = Column(String(32), default="unverified") # unverified, verified
    mfa_otp = Column(String(8), nullable=True)
    otp_expiry = Column(DateTime, nullable=True)

class Ticket(Base):
    __tablename__ = "tickets"

    ticket_id = Column(String(32), primary_key=True, index=True) # e.g. JIRA-1042
    user_id = Column(String(64), index=True, nullable=False)
    issue_type = Column(String(64), nullable=False)
    description = Column(Text, nullable=False)
    status = Column(String(32), default="Open") # Open, In Progress, Escalated, Closed, Pending Approval
    priority = Column(String(32), default="Medium") # Low, Medium, High, Critical
    assignee = Column(String(64), default="IT Service Desk")
    resolution_notes = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.datetime.utcnow, onupdate=datetime.datetime.utcnow)

class AuditLog(Base):
    __tablename__ = "audit_logs"

    id = Column(Integer, primary_key=True, autoincrement=True)
    timestamp = Column(DateTime, default=datetime.datetime.utcnow, index=True)
    user_id = Column(String(64), index=True, nullable=False)
    tool_name = Column(String(64), nullable=False)
    params_json = Column(JSON, nullable=False)
    confirmed_by = Column(String(64), nullable=False) # e.g., 'user_approved', 'auto_bypass_attempt'
    execution_status = Column(String(32), nullable=False) # 'success', 'failed', 'blocked'
    result_json = Column(JSON, nullable=True)

class AccessRequest(Base):
    __tablename__ = "access_requests"

    request_id = Column(String(32), primary_key=True, index=True)
    user_id = Column(String(64), index=True, nullable=False)
    resource = Column(String(128), nullable=False)
    approver_id = Column(String(64), nullable=False)
    status = Column(String(32), default="pending approval") # pending approval, approved, rejected
    created_at = Column(DateTime, default=datetime.datetime.utcnow)
