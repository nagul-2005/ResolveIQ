import unicodedata
from typing import List, Dict, Any

RAW_SEED_KB_ARTICLES: List[Dict[str, Any]] = [
    {
        "doc_id": "DOC-VPN-001",
        "title": "Corporate GlobalProtect and WireGuard VPN Setup and Troubleshooting",
        "category": "Network & Connectivity",
        "product_area": "GlobalProtect VPN",
        "severity": "Medium",
        "content": """# Corporate GlobalProtect & WireGuard VPN Guide

## Prerequisites
- Corporate laptop with JAMF (macOS) or InTune (Windows) installed.
- Valid Active Directory credentials and active Okta Verify MFA.

## Connection Instructions
1. Open the GlobalProtect client from your system tray or application menu.
2. Enter the portal address: `vpn-gateway.company.internal`.
3. Click Connect. When prompted, log in with your corporate email and approve the Okta push notification.
4. Verify the status changes to Connected (Internal Network).

## Troubleshooting Common Errors
- Gateway Not Reachable / DNS Error: Ensure you are not on public Wi-Fi with a captive portal. Open a browser and accept the Wi-Fi terms first. Flush DNS cache via `sudo dscacheutil -flushcache` (macOS) or `ipconfig /flushdns` (Windows).
- Authentication Timeout: Re-authenticate your Okta session. If your AD account has been locked due to 3 failed attempts, request an account unlock through ResolveIQ or IT Tier 1.
- Split Tunneling Routes: Production databases (10.50.0.0/16) and internal staging domains (*.corp.internal) require an active VPN tunnel. Public internet traffic bypasses the VPN tunnel."""
    },
    {
        "doc_id": "DOC-AUTH-002",
        "title": "Okta SSO, FastPass, and MFA Token Reset Policy",
        "category": "Identity & Access",
        "product_area": "Okta SSO",
        "severity": "High",
        "content": """# Okta SSO and MFA Management Policy

## Overview
All corporate resources (Google Workspace, Slack, Jira, GitHub, AWS Console) are protected by Okta Single Sign-On (SSO) with FIDO2 / WebAuthn and Okta Verify MFA.

## Adding a New Device or Resetting MFA
If you received a new mobile phone or lost access to Okta Verify:
1. Contact IT Service Desk via ResolveIQ with your corporate username.
2. Identity must be verified via OTP sent to your registered secondary contact.
3. An IT administrator will issue a temporary MFA bypass code (valid for 15 minutes) allowing you to enroll your new authenticator app.

## Account Lockout Policy
- After 5 consecutive invalid password attempts, Active Directory automatically locks the account for 30 minutes.
- ResolveIQ can automatically unlock the account after verifying identity with a one-time passcode (OTP).
- Passwords must be at least 14 characters, containing uppercase, lowercase, numbers, and special symbols, and cannot match the previous 5 passwords."""
    },
    {
        "doc_id": "DOC-WIFI-003",
        "title": "Office 802.1X Wi-Fi Certificates and Device Enrollment",
        "category": "Network & Connectivity",
        "product_area": "Corporate Wi-Fi",
        "severity": "Low",
        "content": """# Enterprise 802.1X Wi-Fi Access Guide

## Connecting to 'Corp-Secure' Wi-Fi
Corporate offices broadcast the 'Corp-Secure' SSID using WPA3-Enterprise (EAP-TLS).
- Managed devices automatically receive the device root certificate through MDM (JAMF / Intune).
- Select 'Corp-Secure', choose EAP Method: TLS, and select your personal user certificate ('user-identity-cert').

## Guest Network Access
- Visitors and unmanaged personal devices must connect to 'Guest-Public'.
- A sponsor email (must end in @company.io) is required on the captive portal to receive a 24-hour guest access token.
- Guest networks do not have access to internal RFC-1918 IP ranges or staging environments."""
    },
    {
        "doc_id": "DOC-HARDWARE-004",
        "title": "Hardware Refresh Policy, Monitor Requests, and Peripherals",
        "category": "Hardware & Workstation",
        "product_area": "Workstation Assets",
        "severity": "Low",
        "content": """# Hardware Procurement & Refresh Guidelines

## Refresh Cycles
- Laptops (MacBook Pro M3 Max / Dell XPS 15) are eligible for refresh every 36 months.
- Battery degradation below 80% health qualifies for immediate battery replacement or device swap.

## Peripheral & Monitor Requests
1. Engineers and Designers are entitled to one dual-monitor setup (up to 2x 27-inch 4K or 1x 34-inch Ultrawide) and an ergonomic keyboard/mouse kit.
2. Submit a JIRA hardware request ticket through ResolveIQ specifying your desk location or remote home address.
3. Standard peripheral requests under $500 do not require VP approval and ship within 2 business days."""
    },
    {
        "doc_id": "DOC-ACCESS-005",
        "title": "Production Infrastructure Access Controls and Privileged IAM Roles",
        "category": "Security & Compliance",
        "product_area": "AWS & Kubernetes IAM",
        "severity": "Critical",
        "content": """# Privileged Access Management (PAM) & IAM Roles

## Principle of Least Privilege
Direct access to Production AWS Accounts, Production Kubernetes clusters, and Customer Databases is restricted. All elevated access must be request-gated and time-bound (maximum 4 hours).

## Access Request Procedure
1. Request access via ResolveIQ by specifying the target resource (e.g., 'AWS Production RDS ReadOnly', 'K8s Prod Admin') and business justification.
2. ResolveIQ will create a formal access request in 'pending approval' state.
3. In accordance with SOC2 and ISO27001 compliance, elevated access is NEVER automatically granted. A designated SecOps or Engineering Manager approver must sign off.
4. Once approved, temporary STS credentials or Teleport certificates are provisioned for the requested duration."""
    },
    {
        "doc_id": "DOC-EMAIL-006",
        "title": "Google Workspace, Email Aliases, and Shared Mailbox Setup",
        "category": "Collaboration Tools",
        "product_area": "Google Workspace & Slack",
        "severity": "Low",
        "content": """# Email & Collaboration Tools Guide

## Requesting Google Groups & Shared Mailboxes
- Shared inboxes (e.g., billing@company.io, support-ops@company.io) can be created by opening a service desk ticket with the desired email alias and list of initial members.
- Google Groups can be configured as Collaborative Inboxes with custom permission roles.

## Slack Channel Management & Integrations
- Public Slack channels (#proj-*, #team-*) can be created freely.
- Enterprise Slack app installations (e.g., GitHub, Jira, Datadog) require IT approval to ensure OAuth permissions do not request excessive workspace data."""
    }
]

def sanitize_text(text: str) -> str:
    """Replaces non-standard unicode characters (non-breaking hyphens, smart quotes) with standard ASCII equivalents."""
    if not text:
        return ""
    # Replace common troublesome unicode characters
    replacements = {
        '\u2011': '-', # non-breaking hyphen
        '\u2013': '-', # en-dash
        '\u2014': '-', # em-dash
        '\u2018': "'", # left single quote
        '\u2019': "'", # right single quote
        '\u201c': '"', # left double quote
        '\u201d': '"', # right double quote
        '\u00a0': ' ', # non-breaking space
        '\u2026': '...', # ellipsis
    }
    for k, v in replacements.items():
        text = text.replace(k, v)
    return unicodedata.normalize('NFKD', text)

SEED_KB_ARTICLES = [
    {
        "doc_id": art["doc_id"],
        "title": sanitize_text(art["title"]),
        "category": sanitize_text(art["category"]),
        "product_area": sanitize_text(art["product_area"]),
        "severity": art["severity"],
        "content": sanitize_text(art["content"])
    }
    for art in RAW_SEED_KB_ARTICLES
]
