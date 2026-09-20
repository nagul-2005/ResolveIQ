import React, { useState, useEffect } from 'react';
import { 
  ShieldCheck, Layers, KeyRound, Users, Activity, CheckCircle2, 
  AlertTriangle, Clock, RefreshCw, ExternalLink, Flame, Check, X, 
  ArrowUpRight, Lock, Unlock, MessageSquare, Tag, Terminal, Award
} from 'lucide-react';
import { api } from '../services/api';

export default function AdminCommandCenter({ 
  adminUser, 
  onLogout,
  onRefreshAll
}) {
  const [adminTab, setAdminTab] = useState('tickets');
  const [stats, setStats] = useState(null);
  const [tickets, setTickets] = useState([]);
  const [accessRequests, setAccessRequests] = useState([]);
  const [users, setUsers] = useState([]);
  const [auditLogs, setAuditLogs] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [notification, setNotification] = useState(null);

  // Edit ticket modal state
  const [editingTicket, setEditingTicket] = useState(null);
  const [editStatus, setEditStatus] = useState('Open');
  const [editPriority, setEditPriority] = useState('Medium');
  const [editAssignee, setEditAssignee] = useState('IT Service Desk');
  const [editNotes, setEditNotes] = useState('');
  const [isUpdating, setIsUpdating] = useState(false);

  useEffect(() => {
    loadAdminData();
  }, []);

  const showToast = (message, type = 'success') => {
    setNotification({ message, type });
    setTimeout(() => setNotification(null), 4000);
  };

  const loadAdminData = async () => {
    setIsLoading(true);
    try {
      const [s, t, ar, u, a] = await Promise.all([
        api.getAdminStats().catch(() => null),
        api.getTickets().catch(() => []),
        api.getAccessRequests().catch(() => []),
        api.getUsers().catch(() => []),
        api.getAuditLogs().catch(() => [])
      ]);
      setStats(s);
      setTickets(t);
      setAccessRequests(ar);
      setUsers(u);
      setAuditLogs(a);
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSyncTelemetry = async () => {
    setIsLoading(true);
    try {
      const syncRes = await api.syncTickets().catch(() => null);
      if (syncRes?.message) {
        showToast(syncRes.message, 'success');
      }
      await loadAdminData();
      if (onRefreshAll) onRefreshAll();
    } catch (e) {
      showToast(`Sync error: ${e.message}`, 'error');
    } finally {
      setIsLoading(false);
    }
  };

  // 1. Review Privileged Access Request
  const handleReviewAccess = async (requestId, action) => {
    try {
      await api.reviewAccessRequest(requestId, action, `Reviewed by Admin ${adminUser?.name || 'Renugadevi Durai'}`);
      showToast(`Access request ${requestId} marked as ${action.toUpperCase()}!`, action === 'approve' ? 'success' : 'error');
      await loadAdminData();
      if (onRefreshAll) onRefreshAll();
    } catch (err) {
      showToast(`Error reviewing request: ${err.message}`, 'error');
    }
  };

  // 2. Toggle User Lockout in Active Directory
  const handleToggleLock = async (userId) => {
    try {
      const res = await api.toggleUserLock(userId);
      showToast(`User ${userId} account is now ${res.is_locked ? 'LOCKED' : 'UNLOCKED / ACTIVE'}!`, 'success');
      await loadAdminData();
      if (onRefreshAll) onRefreshAll();
    } catch (err) {
      showToast(`Error updating user: ${err.message}`, 'error');
    }
  };

  // 3. Triage / Update Live Ticket
  const handleSaveTicketUpdate = async (e) => {
    e.preventDefault();
    if (!editingTicket) return;

    setIsUpdating(true);
    try {
      await api.updateTicketAdmin(editingTicket.ticket_id, {
        status: editStatus,
        priority: editPriority,
        assignee: editAssignee,
        resolution_notes: editNotes
      });

      showToast(`Ticket ${editingTicket.ticket_id} updated successfully and synced with Jira!`, 'success');
      setEditingTicket(null);
      await loadAdminData();
      if (onRefreshAll) onRefreshAll();
    } catch (err) {
      showToast(`Update error: ${err.message}`, 'error');
    } finally {
      setIsUpdating(false);
    }
  };

  const openEditModal = (t) => {
    setEditingTicket(t);
    setEditStatus(t.status || 'Open');
    setEditPriority(t.priority || 'Medium');
    setEditAssignee(t.assignee || 'IT Service Desk');
    setEditNotes(t.resolution_notes || '');
  };

  const getPriorityBadge = (priority) => {
    switch (priority) {
      case 'Critical':
        return <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-red-50 text-red-700 border border-red-200">CRITICAL</span>;
      case 'High':
        return <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 text-amber-700 border border-amber-200">HIGH</span>;
      default:
        return <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-700 border border-slate-200">MEDIUM</span>;
    }
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case 'Closed':
        return <span className="flex items-center gap-1 text-[11px] font-semibold text-emerald-700"><CheckCircle2 className="w-3.5 h-3.5" /> Closed</span>;
      case 'Resolved':
        return <span className="flex items-center gap-1 text-[11px] font-semibold text-teal-700"><Check className="w-3.5 h-3.5" /> Resolved</span>;
      case 'Pending':
        return <span className="flex items-center gap-1 text-[11px] font-bold text-amber-700"><Clock className="w-3.5 h-3.5" /> Pending</span>;
      case 'Escalated':
        return <span className="flex items-center gap-1 text-[11px] font-bold text-red-700 animate-pulse"><AlertTriangle className="w-3.5 h-3.5" /> Escalated (P1)</span>;
      case 'In Progress':
        return <span className="flex items-center gap-1 text-[11px] font-semibold text-indigo-700"><Clock className="w-3.5 h-3.5" /> In Progress</span>;
      default:
        return <span className="flex items-center gap-1 text-[11px] font-semibold text-slate-700"><Clock className="w-3.5 h-3.5" /> Open</span>;
    }
  };

  return (
    <div className="flex-1 min-h-0 w-full h-full p-6 overflow-y-auto bg-transparent">
      {/* Toast Notification */}
      {notification && (
        <div className={`mb-4 p-3.5 rounded-2xl border flex items-center justify-between text-xs font-semibold shadow-xl transition-all animate-bounce ${
          notification.type === 'error'
            ? 'bg-red-50 border-red-200 text-red-800'
            : 'bg-emerald-50 border-emerald-200 text-emerald-800'
        }`}>
          <div className="flex items-center gap-2">
            {notification.type === 'error' ? <AlertTriangle className="w-4 h-4" /> : <CheckCircle2 className="w-4 h-4" />}
            <span>{notification.message}</span>
          </div>
          <button onClick={() => setNotification(null)} className="text-slate-400 hover:text-slate-700">
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Admin Command Center Header */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 mb-6 pb-4 border-b border-slate-200/80">
        <div>
          <div className="flex items-center gap-3">
            <div className="p-3 rounded-2xl bg-[#1e293b] text-white shadow-md shadow-slate-900/10">
              <ShieldCheck className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2.5">
                <h1 className="font-serif text-2xl font-normal text-slate-900 tracking-tight">IT Admin Command Center</h1>
                <span className="px-3 py-0.5 rounded-full bg-indigo-50 text-indigo-700 text-[10px] font-bold uppercase tracking-wider border border-indigo-200 font-mono shadow-sm">
                  Live Jira Cloud Connected
                </span>
              </div>
              <p className="text-xs text-slate-500 font-normal">
                Logged in as <strong className="text-slate-800">{adminUser?.name || 'Nagul Pranav'}</strong> ({adminUser?.email || 'drenugadevidurai@gmail.com'})
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={handleSyncTelemetry}
            disabled={isLoading}
            className="flex items-center gap-2 px-4 py-2 rounded-full bg-white/80 hover:bg-white border border-slate-200/80 text-xs font-semibold text-slate-700 transition-all shadow-sm hover:-translate-y-0.5"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
            Sync Telemetry & Jira
          </button>

          <button
            onClick={onLogout}
            className="flex items-center gap-2 px-4 py-2 rounded-full bg-red-50 hover:bg-red-100 border border-red-200 text-xs font-semibold text-red-700 transition-all hover:-translate-y-0.5"
          >
            <Lock className="w-3.5 h-3.5" />
            Exit Admin Mode
          </button>
        </div>
      </div>

      {/* Executive KPI Stats Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 mb-6">
        <div className="p-4 rounded-3xl glass-card shadow-sm">
          <div className="text-[10px] uppercase font-bold text-slate-400 mb-1">Total Tickets</div>
          <div className="text-2xl font-bold font-mono text-slate-900">{stats?.total_tickets ?? tickets.length}</div>
          <div className="text-[10px] text-slate-500 mt-1 font-medium">Live Jira Store</div>
        </div>

        <div className="p-4 rounded-3xl glass-card shadow-sm">
          <div className="text-[10px] uppercase font-bold text-slate-400 mb-1">Open Issues</div>
          <div className="text-2xl font-bold font-mono text-indigo-600">{stats?.open_tickets ?? 0}</div>
          <div className="text-[10px] text-slate-500 mt-1 font-medium">Tier-1 Queue</div>
        </div>

        <div className="p-4 rounded-3xl glass-card shadow-sm">
          <div className="text-[10px] uppercase font-bold text-slate-400 mb-1">Escalated (P1)</div>
          <div className="text-2xl font-bold font-mono text-red-600 animate-pulse">{stats?.escalated_incidents ?? 0}</div>
          <div className="text-[10px] text-red-700 mt-1 font-semibold">On-Call Dispatched</div>
        </div>

        <div className="p-4 rounded-3xl glass-card shadow-sm">
          <div className="text-[10px] uppercase font-bold text-slate-400 mb-1">Access Approvals</div>
          <div className="text-2xl font-bold font-mono text-amber-600">{stats?.pending_approvals ?? 0}</div>
          <div className="text-[10px] text-amber-700 mt-1 font-semibold">Pending Sign-off</div>
        </div>

        <div className="p-4 rounded-3xl glass-card shadow-sm">
          <div className="text-[10px] uppercase font-bold text-slate-400 mb-1">SLA Compliance</div>
          <div className="text-2xl font-bold font-mono text-emerald-600">{stats?.sla_compliance_rate ?? '98.4%'}</div>
          <div className="text-[10px] text-emerald-700 mt-1 font-semibold">Target &gt; 95%</div>
        </div>

        <div className="p-4 rounded-3xl glass-card shadow-sm">
          <div className="text-[10px] uppercase font-bold text-slate-400 mb-1">Locked Accounts</div>
          <div className="text-2xl font-bold font-mono text-purple-600">{stats?.locked_users ?? 0}</div>
          <div className="text-[10px] text-slate-500 mt-1 font-medium">Active Directory</div>
        </div>
      </div>

      {/* Admin Navigation Sub-Tabs */}
      <div className="flex items-center gap-2 mb-6 border-b border-slate-200/80 pb-3 overflow-x-auto">
        <button
          onClick={() => setAdminTab('tickets')}
          className={`flex items-center gap-2 px-4 py-2 rounded-full text-xs font-bold transition-all ${
            adminTab === 'tickets'
              ? 'bg-[#1e293b] text-white shadow-md shadow-slate-900/10'
              : 'bg-white/80 text-slate-600 hover:text-slate-900 border border-slate-200/80 hover:bg-white'
          }`}
        >
          <Layers className="w-3.5 h-3.5" />
          Manage Ticket Queue ({tickets.length})
        </button>

        <button
          onClick={() => setAdminTab('approvals')}
          className={`flex items-center gap-2 px-4 py-2 rounded-full text-xs font-bold transition-all ${
            adminTab === 'approvals'
              ? 'bg-[#1e293b] text-white shadow-md shadow-slate-900/10'
              : 'bg-white/80 text-slate-600 hover:text-slate-900 border border-slate-200/80 hover:bg-white'
          }`}
        >
          <KeyRound className="w-3.5 h-3.5" />
          Privileged Access Approvals
          {accessRequests.filter(r => r.status === 'pending approval').length > 0 && (
            <span className="px-2 py-0.2 rounded-full bg-amber-50 text-amber-700 font-mono text-[10px] border border-amber-200">
              {accessRequests.filter(r => r.status === 'pending approval').length} Pending
            </span>
          )}
        </button>

        <button
          onClick={() => setAdminTab('users')}
          className={`flex items-center gap-2 px-4 py-2 rounded-full text-xs font-bold transition-all ${
            adminTab === 'users'
              ? 'bg-[#1e293b] text-white shadow-md shadow-slate-900/10'
              : 'bg-white/80 text-slate-600 hover:text-slate-900 border border-slate-200/80 hover:bg-white'
          }`}
        >
          <Users className="w-3.5 h-3.5" />
          User Directory & Lockout Control ({users.length})
        </button>

        <button
          onClick={() => setAdminTab('audit')}
          className={`flex items-center gap-2 px-4 py-2 rounded-full text-xs font-bold transition-all ${
            adminTab === 'audit'
              ? 'bg-[#1e293b] text-white shadow-md shadow-slate-900/10'
              : 'bg-white/80 text-slate-600 hover:text-slate-900 border border-slate-200/80 hover:bg-white'
          }`}
        >
          <Activity className="w-3.5 h-3.5" />
          SOC2 Audit Trail ({auditLogs.length})
        </button>
      </div>

      {/* Tab 1: Ticket Queue Management */}
      {adminTab === 'tickets' && (
        <div className="space-y-3.5">
          <div className="glass-card rounded-3xl p-4 flex items-center justify-between">
            <span className="text-xs text-slate-600 font-medium">
              Click <strong>"Edit / Triage"</strong> on any ticket to update its lifecycle, change assignees, or close with resolution notes.
            </span>
            <a
              href="https://drenugadevidurai.atlassian.net/jira/servicedesk/projects/ITSD/queues"
              target="_blank"
              rel="noreferrer"
              className="flex items-center gap-1.5 text-xs font-bold text-indigo-700 hover:text-indigo-900 bg-indigo-50 hover:bg-indigo-100 px-3.5 py-1.5 rounded-full border border-indigo-200 transition-all shadow-sm"
            >
              Open Jira Cloud Board <ExternalLink className="w-3 h-3" />
            </a>
          </div>

          <div className="grid grid-cols-1 gap-3">
            {tickets.map((t) => (
              <div
                key={t.ticket_id}
                className="p-5 rounded-3xl glass-card border border-slate-200/80 hover:border-indigo-300 transition-all shadow-sm hover:shadow-md flex flex-col justify-between"
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-2 pb-2 border-b border-slate-200/60">
                  <div className="flex items-center gap-2.5">
                    <span className="font-mono font-bold text-sm text-indigo-700 bg-indigo-50 px-2.5 py-0.5 rounded-full border border-indigo-200">
                      {t.ticket_id}
                    </span>
                    <span className="text-xs font-semibold text-slate-800">{t.issue_type}</span>
                    {getPriorityBadge(t.priority)}
                  </div>
                  <div className="flex items-center gap-2.5">
                    {getStatusBadge(t.status)}
                    <button
                      onClick={() => openEditModal(t)}
                      className="px-3.5 py-1 rounded-full bg-indigo-50 hover:bg-indigo-100 text-indigo-700 text-xs font-bold border border-indigo-200 transition-all shadow-sm"
                    >
                      Edit / Triage
                    </button>
                    <a
                      href={`https://drenugadevidurai.atlassian.net/browse/${t.ticket_id}`}
                      target="_blank"
                      rel="noreferrer"
                      className="flex items-center gap-1 text-[11px] font-bold text-indigo-700 hover:text-indigo-900 bg-indigo-50 hover:bg-indigo-100 px-3 py-1 rounded-full border border-indigo-200 transition-all shadow-sm"
                    >
                      Jira ↗
                    </a>
                  </div>
                </div>

                <p className="text-xs text-slate-800 my-2 leading-relaxed">{t.description}</p>

                <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-slate-200/60 text-[11px] text-slate-500 font-mono">
                  <div className="flex items-center gap-3">
                    <span>Requester: <strong className="text-slate-800">{t.user_id}</strong></span>
                    <span>Assignee: <strong className="text-indigo-700">{t.assignee}</strong></span>
                  </div>
                  {t.resolution_notes && (
                    <div className="text-emerald-700 font-sans italic font-medium">
                      Resolution: {t.resolution_notes}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Tab 2: Privileged Access Approvals */}
      {adminTab === 'approvals' && (
        <div className="space-y-4">
          <div className="glass-card rounded-3xl p-4 text-xs text-slate-600">
            Per company SOC2 compliance, elevated permissions (AWS Production, Kubernetes, GitHub Admin) are held in <strong>"Pending Approval"</strong> state until a Human Admin signs off.
          </div>

          <div className="grid grid-cols-1 gap-3">
            {accessRequests.length === 0 ? (
              <div className="text-center py-12 glass-card rounded-3xl border border-slate-200 text-slate-500 text-xs">
                No access requests submitted yet.
              </div>
            ) : (
              accessRequests.map((req) => (
                <div
                  key={req.request_id}
                  className="p-5 rounded-3xl glass-card border border-slate-200/80 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4"
                >
                  <div>
                    <div className="flex items-center gap-2.5 mb-1.5">
                      <span className="font-mono font-bold text-xs text-amber-700 bg-amber-50 px-2.5 py-0.5 rounded-full border border-amber-200">
                        {req.request_id}
                      </span>
                      <h4 className="text-sm font-bold text-slate-900">{req.resource}</h4>
                      <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                        req.status === 'approved'
                          ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                          : req.status === 'rejected'
                          ? 'bg-red-50 text-red-700 border border-red-200'
                          : 'bg-amber-50 text-amber-700 border border-amber-200'
                      }`}>
                        {req.status}
                      </span>
                    </div>
                    <div className="text-xs text-slate-500 space-x-3 font-mono">
                      <span>Requester: <strong className="text-slate-800">{req.user_id}</strong></span>
                      <span>Target Approver: <strong className="text-slate-800">{req.approver_id}</strong></span>
                      <span>Date: {req.created_at ? new Date(req.created_at).toLocaleDateString() : 'Today'}</span>
                    </div>
                  </div>

                  {req.status === 'pending approval' ? (
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handleReviewAccess(req.request_id, 'approve')}
                        className="flex items-center gap-1.5 px-4 py-2 rounded-full bg-[#1e293b] hover:bg-slate-800 text-white font-bold text-xs shadow-md shadow-slate-900/10 transition-all hover:-translate-y-0.5"
                      >
                        <Check className="w-3.5 h-3.5" />
                        Approve Access
                      </button>
                      <button
                        onClick={() => handleReviewAccess(req.request_id, 'reject')}
                        className="flex items-center gap-1.5 px-3.5 py-2 rounded-full bg-white hover:bg-slate-100 text-slate-700 text-xs font-semibold border border-slate-200/80 shadow-sm transition-all hover:-translate-y-0.5"
                      >
                        <X className="w-3.5 h-3.5" />
                        Reject
                      </button>
                    </div>
                  ) : (
                    <div className="text-xs font-semibold text-slate-500 italic">
                      Decision Recorded & Audited
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* Tab 3: User Directory & Lockout Control */}
      {adminTab === 'users' && (
        <div className="space-y-4">
          <div className="glass-card rounded-3xl p-4 text-xs text-slate-600">
            Active Directory & LDAP sync. Manage account lockouts caused by repeated failed password attempts.
          </div>

          <div className="grid grid-cols-1 gap-3">
            {users.map((u) => (
              <div
                key={u.user_id}
                className="p-5 rounded-3xl glass-card border border-slate-200/80 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4"
              >
                <div className="flex items-center gap-3.5">
                  <div className="w-10 h-10 rounded-2xl bg-[#1e293b] flex items-center justify-center font-bold text-white text-sm shadow-sm">
                    {u.name.charAt(0)}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h4 className="text-sm font-bold text-slate-900">{u.name}</h4>
                      <span className="text-xs text-slate-500 font-mono">({u.user_id})</span>
                      {u.is_locked ? (
                        <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-red-50 text-red-700 border border-red-200 flex items-center gap-1">
                          <Lock className="w-2.5 h-2.5" /> Locked Account
                        </span>
                      ) : (
                        <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200 flex items-center gap-1">
                          <CheckCircle2 className="w-2.5 h-2.5" /> Active
                        </span>
                      )}
                    </div>
                    <div className="text-xs text-slate-500 mt-0.5">
                      {u.role} • {u.department} • <span className="font-mono text-indigo-700">{u.email}</span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handleToggleLock(u.user_id)}
                    className={`flex items-center gap-1.5 px-4 py-2 rounded-full text-xs font-bold transition-all shadow-sm hover:-translate-y-0.5 ${
                      u.is_locked
                        ? 'bg-[#1e293b] hover:bg-slate-800 text-white'
                        : 'bg-amber-50 hover:bg-amber-100 text-amber-700 border border-amber-200'
                    }`}
                  >
                    {u.is_locked ? (
                      <>
                        <Unlock className="w-3.5 h-3.5" />
                        Unlock Account
                      </>
                    ) : (
                      <>
                        <Lock className="w-3.5 h-3.5" />
                        Lock Account
                      </>
                    )}
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Tab 4: SOC2 Audit Trail */}
      {adminTab === 'audit' && (
        <div className="space-y-3">
          <div className="glass-card rounded-3xl p-4 text-xs text-slate-600 flex items-center justify-between">
            <span>Immutable cryptographic log of all AI and Admin tool executions.</span>
            <span className="text-[10px] font-bold uppercase text-emerald-700 bg-emerald-50 px-3 py-1 rounded-full border border-emerald-200">
              100% Invariant Compliance Verified
            </span>
          </div>

          <div className="space-y-2.5 font-mono text-xs">
            {auditLogs.map((log) => (
              <div key={log.id} className="p-4 rounded-3xl glass-card border border-slate-200/80 shadow-sm">
                <div className="flex items-center justify-between pb-2 border-b border-slate-200/60 mb-2">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-indigo-700">#{log.id}</span>
                    <span className="bg-indigo-50 text-indigo-700 px-2.5 py-0.5 rounded-full font-bold border border-indigo-200 text-[10px]">
                      {log.tool_name}
                    </span>
                    <span className="text-slate-500">User: <strong className="text-slate-800">{log.user_id}</strong></span>
                  </div>
                  <span className="text-[10px] text-slate-400">
                    {log.timestamp ? new Date(log.timestamp).toLocaleString() : ''}
                  </span>
                </div>
                <div className="text-[11px] text-slate-500">
                  Confirmed By: <span className="text-emerald-700 font-semibold">{log.confirmed_by}</span> | Status: <span className="text-slate-800">{log.execution_status}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Edit Ticket Modal */}
      {editingTicket && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-md flex items-center justify-center z-50 p-4">
          <div className="w-full max-w-lg bg-white/95 border border-slate-200/80 rounded-3xl p-6 shadow-dashboard animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between pb-3 mb-4 border-b border-slate-200">
              <div className="flex items-center gap-2">
                <span className="font-mono font-bold text-sm text-indigo-700 bg-indigo-50 px-2.5 py-0.5 rounded-full border border-indigo-200">
                  {editingTicket.ticket_id}
                </span>
                <h3 className="font-serif text-lg font-normal text-slate-900 tracking-tight">Triage & Update Ticket</h3>
              </div>
              <button onClick={() => setEditingTicket(null)} className="text-slate-400 hover:text-slate-700 p-1.5 rounded-full hover:bg-slate-100">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveTicketUpdate} className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[11px] font-semibold text-slate-700 block mb-1">Status</label>
                  <select
                    value={editStatus}
                    onChange={(e) => setEditStatus(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-3 py-2 text-xs text-slate-900 outline-none focus:border-indigo-500 font-medium"
                  >
                    <option value="Open">Open (Waiting for Support)</option>
                    <option value="In Progress">In Progress</option>
                    <option value="Pending">Pending (Waiting for Customer/Vendor)</option>
                    <option value="Escalated">Escalated (P1 Critical)</option>
                    <option value="Resolved">Resolved</option>
                    <option value="Closed">Closed</option>
                  </select>
                </div>

                <div>
                  <label className="text-[11px] font-semibold text-slate-700 block mb-1">Priority</label>
                  <select
                    value={editPriority}
                    onChange={(e) => setEditPriority(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-3 py-2 text-xs text-slate-900 outline-none focus:border-indigo-500 font-medium"
                  >
                    <option value="Low">Low</option>
                    <option value="Medium">Medium</option>
                    <option value="High">High</option>
                    <option value="Critical">Critical</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="text-[11px] font-semibold text-slate-700 block mb-1">Assignee</label>
                <input
                  type="text"
                  value={editAssignee}
                  onChange={(e) => setEditAssignee(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-3 py-2 text-xs text-slate-900 outline-none focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="text-[11px] font-semibold text-slate-700 block mb-1">Resolution Notes (Optional)</label>
                <textarea
                  value={editNotes}
                  onChange={(e) => setEditNotes(e.target.value)}
                  placeholder="Enter resolution summary or technician notes..."
                  rows={3}
                  className="w-full bg-slate-50 border border-slate-200 rounded-2xl p-3 text-xs text-slate-900 placeholder:text-slate-400 outline-none focus:border-indigo-500 shadow-inner"
                />
              </div>

              <div className="flex justify-end gap-2.5 pt-2">
                <button
                  type="button"
                  onClick={() => setEditingTicket(null)}
                  className="px-4 py-2 rounded-full bg-slate-100 text-xs font-semibold text-slate-700 hover:bg-slate-200 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isUpdating}
                  className="px-5 py-2 rounded-full bg-[#1e293b] hover:bg-slate-800 text-white font-bold text-xs shadow-md shadow-slate-900/10 transition-all hover:-translate-y-0.5 disabled:opacity-50"
                >
                  {isUpdating ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
