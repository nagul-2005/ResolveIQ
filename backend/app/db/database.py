import datetime
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession, async_sessionmaker
from app.config import settings
from app.db.models import Base, User, Ticket, AuditLog

engine = create_async_engine(
    settings.DATABASE_URL,
    echo=False,
    future=True
)

AsyncSessionLocal = async_sessionmaker(
    bind=engine,
    class_=AsyncSession,
    expire_on_commit=False
)

async def get_db():
    async with AsyncSessionLocal() as session:
        try:
            yield session
        finally:
            await session.close()

async def init_db():
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    
    # Seed initial users and sample tickets
    async with AsyncSessionLocal() as session:
        # Check if users already exist
        from sqlalchemy import select
        res = await session.execute(select(User))
        existing_users = res.scalars().all()
        if not existing_users:
            users = [
                User(
                    user_id="alex.chen",
                    email="alex.chen@company.io",
                    name="Alex Chen",
                    role="Senior Backend Engineer",
                    department="Platform Engineering",
                    is_locked=True,
                    auth_status="unverified",
                    mfa_otp="123456",
                    otp_expiry=datetime.datetime.utcnow() + datetime.timedelta(hours=24)
                ),
                User(
                    user_id="sarah.connor",
                    email="sarah.connor@company.io",
                    name="Sarah Connor",
                    role="DevOps Lead",
                    department="Infrastructure",
                    is_locked=False,
                    auth_status="verified",
                    mfa_otp="654321",
                    otp_expiry=datetime.datetime.utcnow() + datetime.timedelta(hours=24)
                ),
                User(
                    user_id="jordan.lee",
                    email="jordan.lee@company.io",
                    name="Jordan Lee",
                    role="Product Designer",
                    department="Design",
                    is_locked=False,
                    auth_status="unverified",
                    mfa_otp="999888",
                    otp_expiry=datetime.datetime.utcnow() + datetime.timedelta(hours=24)
                )
            ]
            session.add_all(users)
            
            # Initial seed tickets
            tickets = [
                Ticket(
                    ticket_id="JIRA-1021",
                    user_id="alex.chen",
                    issue_type="Hardware",
                    description="Request for secondary 4K Dell UltraSharp monitor for workstation",
                    status="In Progress",
                    priority="Medium",
                    assignee="Hardware Ops",
                    resolution_notes=None
                ),
                Ticket(
                    ticket_id="JIRA-1022",
                    user_id="sarah.connor",
                    issue_type="Access Request",
                    description="Production Kubernetes cluster readonly audit access",
                    status="Open",
                    priority="High",
                    assignee="SecOps",
                    resolution_notes=None
                ),
                Ticket(
                    ticket_id="JIRA-1019",
                    user_id="jordan.lee",
                    issue_type="Software",
                    description="Figma Enterprise Organization seat provisioning",
                    status="Closed",
                    priority="Low",
                    assignee="IT Helpdesk",
                    resolution_notes="Seat provisioned and license assigned via Okta SSO."
                )
            ]
            session.add_all(tickets)
            await session.commit()
