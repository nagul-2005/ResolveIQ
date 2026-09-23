// Local Vite development uses the /api proxy. Deployed static frontends must
// call the Render API directly; VITE_API_BASE_URL remains available for custom
// backend domains and preview environments.
const DEFAULT_PRODUCTION_API_URL = 'https://resolveiq-backend.onrender.com';
const BASE_URL = (
  import.meta.env.VITE_API_BASE_URL ||
  (import.meta.env.DEV ? '' : DEFAULT_PRODUCTION_API_URL)
).replace(/\/$/, '');
const API_BASE = `${BASE_URL}/api`;

export const api = {
  // Chat & HITL Orchestration
  async sendChat(message, threadId = null, userId = 'alex.chen') {
    const res = await fetch(`${API_BASE}/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message, thread_id: threadId, user_id: userId })
    });
    if (!res.ok) throw new Error(`Chat error: ${res.statusText}`);
    return await res.json();
  },

  async verifyAuth(threadId, userId, otp) {
    const res = await fetch(`${API_BASE}/auth/verify`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ thread_id: threadId, user_id: userId, otp })
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.detail || 'Verification failed');
    }
    return await res.json();
  },

  async confirmAction(threadId, action) {
    const res = await fetch(`${API_BASE}/chat/confirm`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ thread_id: threadId, action })
    });
    if (!res.ok) throw new Error(`Confirmation error: ${res.statusText}`);
    return await res.json();
  },

  // Direct Ticket Operations
  async getTickets() {
    const res = await fetch(`${API_BASE}/tickets`);
    if (!res.ok) throw new Error('Failed to fetch tickets');
    return await res.json();
  },

  async createTicket(ticketData) {
    const res = await fetch(`${API_BASE}/tickets`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(ticketData)
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.detail || 'Failed to create ticket');
    }
    return await res.json();
  },

  async escalateTicket(ticketId, priority = 'Critical') {
    const res = await fetch(`${API_BASE}/tickets/escalate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ticket_id: ticketId, priority })
    });
    if (!res.ok) throw new Error('Failed to escalate ticket');
    return await res.json();
  },

  // Admin Portal & Command Center Operations
  async adminLogin(email, password) {
    const res = await fetch(`${API_BASE}/admin/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password })
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.detail || 'Admin authentication failed');
    }
    return await res.json();
  },

  async getAdminStats() {
    const res = await fetch(`${API_BASE}/admin/stats`);
    if (!res.ok) throw new Error('Failed to fetch admin stats');
    return await res.json();
  },

  async getAccessRequests() {
    const res = await fetch(`${API_BASE}/admin/access-requests`);
    if (!res.ok) throw new Error('Failed to fetch access requests');
    return await res.json();
  },

  async reviewAccessRequest(requestId, action, notes = 'Reviewed by IT Admin') {
    const res = await fetch(`${API_BASE}/admin/access-requests/${requestId}/review`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action, notes })
    });
    if (!res.ok) throw new Error('Failed to review access request');
    return await res.json();
  },

  async toggleUserLock(userId) {
    const res = await fetch(`${API_BASE}/admin/users/${userId}/toggle-lock`, {
      method: 'POST'
    });
    if (!res.ok) throw new Error('Failed to toggle user lockout');
    return await res.json();
  },

  async updateTicketAdmin(ticketId, updates) {
    const res = await fetch(`${API_BASE}/admin/tickets/${ticketId}/update`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updates)
    });
    if (!res.ok) throw new Error('Failed to update ticket');
    return await res.json();
  },

  // Audit Logs & Common Data
  async getAuditLogs() {
    const res = await fetch(`${API_BASE}/audit-logs`);
    if (!res.ok) throw new Error('Failed to fetch audit logs');
    return await res.json();
  },

  async getUsers() {
    const res = await fetch(`${API_BASE}/users`);
    if (!res.ok) throw new Error('Failed to fetch users');
    return await res.json();
  },

  async getKnowledgeBase() {
    const res = await fetch(`${API_BASE}/kb`);
    if (!res.ok) throw new Error('Failed to fetch KB articles');
    return await res.json();
  },

  async uploadKbArticle(articleData) {
    const res = await fetch(`${API_BASE}/kb/upload`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(articleData)
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.detail || 'Failed to upload KB article');
    }
    return await res.json();
  },

  async syncTickets() {
    const res = await fetch(`${API_BASE}/tickets/sync`, { method: 'POST' });
    if (!res.ok) throw new Error('Failed to sync tickets with Jira');
    return await res.json();
  },

  async deleteKbArticle(docId) {
    const res = await fetch(`${API_BASE}/kb/${docId}`, { method: 'DELETE' });
    if (!res.ok) throw new Error('Failed to delete KB article');
    return await res.json();
  },

  async updateKbArticle(docId, articleData) {
    const res = await fetch(`${API_BASE}/kb/${docId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(articleData)
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.detail || 'Failed to update KB article');
    }
    return await res.json();
  },

  async runEvaluations() {
    const res = await fetch(`${API_BASE}/eval/run`, { method: 'POST' });
    if (!res.ok) throw new Error('Failed to run evaluations');
    return await res.json();
  },


  async getHealth() {
    const res = await fetch(`${BASE_URL}/health`);
    return await res.json();
  }
};
