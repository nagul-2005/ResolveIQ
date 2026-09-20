import random
import datetime
from typing import Dict, Any, Optional
from sqlalchemy import select, update
from app.db.database import AsyncSessionLocal
from app.db.models import User, AccessRequest

class AdLdapService:
    @staticmethod
    async def get_user(user_id: str) -> Optional[Dict[str, Any]]:
        """Finds user in simulated Active Directory / LDAP."""
        user_id = user_id.lower().strip()
        async with AsyncSessionLocal() as session:
            res = await session.execute(select(User).where(User.user_id == user_id))
            user = res.scalars().first()
            if not user:
                return None
            return {
                "user_id": user.user_id,
                "email": user.email,
                "name": user.name,
                "role": user.role,
                "department": user.department,
                "is_locked": user.is_locked,
                "auth_status": user.auth_status,
                "mfa_otp": user.mfa_otp
            }

    @staticmethod
    async def unlock_account(user_id: str) -> Dict[str, Any]:
        """Unlocks a locked account in Active Directory."""
        user_id = user_id.lower().strip()
        async with AsyncSessionLocal() as session:
            res = await session.execute(select(User).where(User.user_id == user_id))
            user = res.scalars().first()
            if not user:
                return {
                    "success": False,
                    "error": f"User '{user_id}' not found in corporate Active Directory."
                }
            
            user.is_locked = False
            await session.commit()
            
            return {
                "success": True,
                "user_id": user_id,
                "is_locked": False,
                "message": f"Active Directory account for {user.name} ({user_id}) has been successfully unlocked."
            }

    @staticmethod
    async def reset_password(user_id: str) -> Dict[str, Any]:
        """Resets password in Active Directory and issues a temporary secure token."""
        user_id = user_id.lower().strip()
        async with AsyncSessionLocal() as session:
            res = await session.execute(select(User).where(User.user_id == user_id))
            user = res.scalars().first()
            if not user:
                return {
                    "success": False,
                    "error": f"User '{user_id}' not found in corporate Active Directory."
                }
            
            # Generate temporary password
            temp_pass = f"Temp@{random.randint(100000, 999999)}!"
            user.is_locked = False
            await session.commit()
            
            return {
                "success": True,
                "user_id": user_id,
                "temporary_password": temp_pass,
                "requires_change_on_login": True,
                "message": f"Password for {user_id} has been reset. Temporary credentials sent to registered email {user.email}."
            }

    @staticmethod
    async def grant_access_request(user_id: str, resource: str, approver_id: str = "secops-lead@company.io") -> Dict[str, Any]:
        """
        Routes an elevated access request to an authorized manager/SecOps.
        Note: Per IT security policy, terminal state is 'pending approval' and NEVER auto-executes.
        """
        user_id = user_id.lower().strip()
        req_id = f"REQ-ACC-{random.randint(1000, 9999)}"
        
        async with AsyncSessionLocal() as session:
            req = AccessRequest(
                request_id=req_id,
                user_id=user_id,
                resource=resource,
                approver_id=approver_id,
                status="pending approval",
                created_at=datetime.datetime.utcnow()
            )
            session.add(req)
            await session.commit()
            
            return {
                "success": True,
                "request_id": req_id,
                "user_id": user_id,
                "resource": resource,
                "approver_id": approver_id,
                "status": "pending approval",
                "message": f"Access request for '{resource}' recorded as {req_id}. Routed to approver '{approver_id}'. Current state: 'pending approval'. Per security policy, access cannot be granted automatically."
            }

    @staticmethod
    async def generate_otp(user_id: str) -> str:
        """Generates a 6-digit MFA OTP for identity verification."""
        user_id = user_id.lower().strip()
        otp = str(random.randint(100000, 999999))
        async with AsyncSessionLocal() as session:
            res = await session.execute(select(User).where(User.user_id == user_id))
            user = res.scalars().first()
            if user:
                user.mfa_otp = otp
                user.otp_expiry = datetime.datetime.utcnow() + datetime.timedelta(minutes=15)
                await session.commit()
        return otp

    @staticmethod
    async def verify_otp(user_id: str, otp_code: str) -> bool:
        """Verifies the supplied OTP code."""
        user_id = user_id.lower().strip()
        otp_code = str(otp_code).strip()
        async with AsyncSessionLocal() as session:
            res = await session.execute(select(User).where(User.user_id == user_id))
            user = res.scalars().first()
            if not user:
                return False
            
            # Universal demo code '123456' or matching stored OTP
            if otp_code == "123456" or (user.mfa_otp and user.mfa_otp == otp_code):
                user.auth_status = "verified"
                await session.commit()
                return True
            return False

ad_ldap_service = AdLdapService()
