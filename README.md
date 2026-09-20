# ResolveIQ — Production-Architected IT Service Desk Assistant

> Autonomous, human-in-the-loop IT Service Desk Orchestrator powered by **LangGraph**, **Groq LPU (Llama-3.3-70b / GPT-OSS-120b)**, **Weaviate + FastEmbed Hybrid RAG**, **FastAPI**, and **React + Tailwind CSS**.

---

## Architecture Overview

ResolveIQ executes tier-1 and tier-2 IT support requests through a stateful **LangGraph StateGraph** state machine. It seamlessly balances informational how-to inquiries (via grounded RAG search with doc citations) and high-stakes administrative actions (account unlocks, password resets, ticket lifecycle management, and privileged access requests) protected by human-in-the-loop (HITL) verification and confirmation gates.

```
                  ┌────────────────────────────────────────────────────────┐
                  │                 User / Chat Interface                  │
                  └───────────────────────────┬────────────────────────────┘
                                              │ POST /api/chat
                                              ▼
                             ┌─────────────────────────────────┐
                             │      LangGraph Orchestrator     │
                             └────────────────┬────────────────┘
                                              │
                      ┌───────────────────────┴───────────────────────┐
                      ▼                                               ▼
             [classify_intent]                               [select_tool]
             (LLM Structured)                               (LangChain Tools)
                      │                                               │
             ┌────────┴────────┐                                      ▼
             ▼                 ▼                              [verify_identity]
     [retrieve_context]  [mixed_path]                        (AD/LDAP MFA Gate)
     (Weaviate Hybrid)         │                                      │
             │                 │                        ┌─────────────┴─────────────┐
             ▼                 │                        ▼                           ▼
     [generate_answer] ────────┘                 [INTERRUPT: OTP]              [verified]
     (Grounded + Cites)                                 │                           │
             │                                   POST /api/auth/verify              ▼
             │                                          │                 [request_confirmation]
             │                                          └───────────────────────────┤
             │                                                                      │
             │                                                        ┌─────────────┴─────────────┐
             │                                                        ▼                           ▼
             │                                              [INTERRUPT: Approve/Cancel]      [approved]
             │                                                        │                           │
             │                                               POST /api/chat/confirm               ▼
             │                                                        │                     [execute_tool]
             │                                                        └───────────────────── (JIRA/AD/Audit)
             │                                                                                    │
             └─────────────────────────────────┬──────────────────────────────────────────────────┘
                                               ▼
                                           [respond]
                                    (Markdown + Citations)
```

---

## Key Capabilities & Features

1. **Stateful LangGraph Orchestration & Interrupts**:
   - `verify_identity`: Checks user session state against Active Directory / LDAP and interrupts graph execution if unverified, resuming only upon valid MFA OTP submission.
   - `request_confirmation`: Surfaces structured action parameters and security impact to the user, pausing until explicit `Approve` or `Cancel` confirmation.
2. **Node-Level Security & Zero-Trust Enforcement**:
   - Every tool with external side effects is strictly barred from execution unless `confirmation_status == 'approved'`. Enforced directly in Python node logic.
3. **Hybrid RAG Knowledge Base**:
   - Dense semantic vector search via **FastEmbed (`BAAI/bge-small-en-v1.5`)** blended with **BM25 keyword search** and metadata filtering over corporate Confluence documentation.
   - Grounded generation citing exact bracketed doc IDs (e.g. `[DOC-VPN-001]`).
4. **Service Desk Tooling (LangChain `@tool`)**:
   - `create_ticket(user_id, issue_type, description)` -> Mocked JIRA REST API
   - `check_ticket_status(ticket_id)` -> JIRA status & assignee lookups
   - `unlock_account(user_id)` -> Mocked Active Directory / LDAP
   - `reset_password(user_id)` -> Active Directory temporary token generation
   - `grant_access_request(user_id, resource, approver_id)` -> Routes to SecOps (always terminal `pending approval`)
   - `escalate_ticket(ticket_id, priority)` -> Dispatches to On-Call IT Manager
   - `close_ticket(ticket_id, resolution_notes)` -> Resolves ticket
5. **Evaluation & Security Harness**:
   - Retrieval Precision@1, Recall@3, and MRR against golden Q&A dataset.
   - Intent classification accuracy benchmark.
   - Security audit replay verification guaranteeing zero unapproved side-effect executions.

---

## Quickstart Guide

### Prerequisites
- Python 3.11+ / 3.13+
- Node.js 18+ & npm

### 1. Backend Setup
```bash
cd backend
python -m venv venv

# Windows
.\venv\Scripts\activate
# Linux/macOS
source venv/bin/activate

pip install -r requirements.txt
uvicorn app.api.main:app --host 0.0.0.0 --port 8000 --reload
```

### 2. Frontend Setup
```bash
cd frontend
npm install
npm run dev
```

Visit **`http://localhost:5173`** in your browser.

---

## Automated Tests & Benchmarks

Run the full pytest suite:
```bash
pytest backend/tests/ -v
```

Run standalone evaluation benchmarks:
```bash
python backend/eval/eval_retrieval.py
python backend/eval/eval_intent.py
python backend/eval/eval_audit_replay.py
```

---

## Production Deployment Guide

### Backend: Deploy to Render
1. Push this repository to GitHub.
2. In [Render Dashboard](https://dashboard.render.com/), create a new **Web Service**.
3. Connect your GitHub repository and set:
   - **Root Directory**: `backend`
   - **Runtime**: `Python 3` (or Docker using `backend/Dockerfile`)
   - **Build Command**: `pip install -r requirements.txt`
   - **Start Command**: `uvicorn app.api.main:app --host 0.0.0.0 --port 8000`
4. Add Environment Variables:
   - `GROQ_API_KEY`: `<Your Groq API Key>`
   - `GROQ_MODEL`: `openai/gpt-oss-120b` (or `llama-3.3-70b-versatile`)
   - `DATABASE_URL`: `sqlite+aiosqlite:///./resolveiq.db` (or Render PostgreSQL URL)

### Frontend: Deploy to Vercel
1. In [Vercel Dashboard](https://vercel.com/), import the repository.
2. Set:
   - **Framework Preset**: `Vite`
   - **Root Directory**: `frontend`
   - **Build Command**: `npm run build`
   - **Output Directory**: `dist`
3. Add Environment Variable:
   - `VITE_API_URL`: `https://<your-render-backend-url>.onrender.com`
