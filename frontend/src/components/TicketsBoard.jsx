import React, { useState } from 'react';
import { 
  Layers, Search, Filter, Clock, CheckCircle2, AlertCircle, 
  ArrowUpRight, Plus, RefreshCw, Flame, Check, X, ShieldAlert, Sparkles
} from 'lucide-react';
import { api } from '../services/api';

export default function TicketsBoard({ tickets, onRefresh, isLoading }) {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');
  const [isCreating, setIsCreating] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [actionInProgress, setActionInProgress] = useState(null);
  const [notification, setNotification] = useState(null);

  // New Ticket Form State
  const [issueType, setIssueType] = useState('Hardware');
  const [description, setDescription] = useState('');
  const [userId, setUserId] = useState('alex.chen');
  const [priority, setPriority] = useState('Medium');

  const filtered = tickets.filter(t => {
    const matchesSearch = 
      t.ticket_id.toLowerCase().includes(searchTerm.toLowerCase()) ||
      t.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
      t.user_id.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesStatus = statusFilter === 'All' || t.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const showToast = (message, type = 'success') => {
    setNotification({ message, type });
    setTimeout(() => setNotification(null), 4000);
  };

  const handleSyncJira = async () => {
    setIsSubmitting(true);
    try {
      const res = await api.syncTickets();
      showToast(res.message || 'Synced tickets from Jira Cloud!', 'success');
      await onRefresh();
    } catch (e) {
      showToast(`Jira sync notice: ${e.message}`, 'error');
      await onRefresh();
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEscalate = async (ticketId) => {
    setActionInProgress(ticketId);
    try {
      const res = await api.escalateTicket(ticketId, 'Critical');
      showToast(`Ticket ${ticketId} escalated to Critical priority!`, 'success');
      await onRefresh();
    } catch (e) {
      showToast(`Escalation failed: ${e.message}`, 'error');
    } finally {
      setActionInProgress(null);
    }
  };

  const handleCreateTicket = async (e) => {
    e.preventDefault();
    if (!description.trim()) return;

    setIsSubmitting(true);
    try {
      const res = await api.createTicket({
        user_id: userId,
        issue_type: issueType,
        description: description.trim(),
        priority: priority
      });

      const newId = res.ticket_id || 'Ticket';
      showToast(`Created ${newId} (${issueType}) successfully!`, 'success');
      setDescription('');
      setIsCreating(false);
      await onRefresh();
    } catch (e) {
      showToast(`Failed to create ticket: ${e.message}`, 'error');
    } finally {
      setIsSubmitting(false);
    }
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
        return <span className="flex items-center gap-1 text-[11px] font-bold text-red-700 animate-pulse"><AlertCircle className="w-3.5 h-3.5" /> Escalated</span>;
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
        <div className={`mb-4 p-3.5 rounded-2xl border flex items-center justify-between text-xs font-semibold shadow-lg transition-all animate-bounce ${
          notification.type === 'error'
            ? 'bg-red-50 border-red-200 text-red-800'
            : 'bg-emerald-50 border-emerald-200 text-emerald-800'
        }`}>
          <div className="flex items-center gap-2">
            {notification.type === 'error' ? <AlertCircle className="w-4 h-4" /> : <CheckCircle2 className="w-4 h-4" />}
            <span>{notification.message}</span>
          </div>
          <button onClick={() => setNotification(null)} className="text-slate-400 hover:text-slate-700">
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <div className="flex items-center gap-2.5">
            <h2 className="font-serif text-2xl font-normal text-slate-900 tracking-tight">Live JIRA Ticket Store</h2>
            <span className="text-xs px-3 py-0.5 rounded-full bg-indigo-50 text-indigo-700 font-mono font-bold border border-indigo-200 shadow-sm">
              {tickets.length} Active Tickets
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-1 font-normal">Direct state view of tickets managed and updated by ResolveIQ</p>
        </div>

        <div className="flex items-center gap-2.5 self-start sm:self-auto">
          <button
            onClick={() => setIsCreating(true)}
            className="flex items-center gap-2 px-4 py-2 rounded-full bg-[#1e293b] hover:bg-slate-800 text-xs font-bold text-white shadow-md shadow-slate-900/10 transition-all hover:-translate-y-0.5"
          >
            <Plus className="w-3.5 h-3.5" />
            New Ticket
          </button>

          <button
            onClick={handleSyncJira}
            disabled={isLoading || isSubmitting}
            className="flex items-center gap-2 px-4 py-2 rounded-full bg-white/80 hover:bg-white border border-slate-200/80 text-xs font-semibold text-slate-700 transition-all shadow-sm hover:-translate-y-0.5"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isLoading || isSubmitting ? 'animate-spin' : ''}`} />
            Sync from Jira
          </button>
        </div>
      </div>

      {/* New Ticket Modal */}
      {isCreating && (
        <div className="mb-6 p-6 rounded-3xl glass-card border border-indigo-200 shadow-dashboard bg-white/95 animate-in fade-in duration-200">
          <div className="flex items-center justify-between mb-4 pb-2 border-b border-slate-200">
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-indigo-600" />
              <h3 className="font-serif text-lg font-normal text-slate-900 tracking-tight">Create New IT Support Ticket</h3>
            </div>
            <button onClick={() => setIsCreating(false)} className="text-slate-400 hover:text-slate-700 p-1.5 rounded-full hover:bg-slate-100">
              <X className="w-4 h-4" />
            </button>
          </div>

          <form onSubmit={handleCreateTicket} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="text-[11px] font-semibold text-slate-700 block mb-1">Category</label>
                <select
                  value={issueType}
                  onChange={(e) => setIssueType(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-3 py-2 text-xs text-slate-900 outline-none focus:border-indigo-500 font-medium"
                >
                  <option value="Hardware">Hardware & Assets</option>
                  <option value="Software">Software & Licensing</option>
                  <option value="Network">Network & VPN</option>
                  <option value="Access Request">Access & IAM</option>
                  <option value="General IT">General IT Support</option>
                </select>
              </div>

              <div>
                <label className="text-[11px] font-semibold text-slate-700 block mb-1">Priority</label>
                <select
                  value={priority}
                  onChange={(e) => setPriority(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-3 py-2 text-xs text-slate-900 outline-none focus:border-indigo-500 font-medium"
                >
                  <option value="Low">Low</option>
                  <option value="Medium">Medium</option>
                  <option value="High">High</option>
                  <option value="Critical">Critical</option>
                </select>
              </div>

              <div>
                <label className="text-[11px] font-semibold text-slate-700 block mb-1">Requester Username</label>
                <input
                  type="text"
                  value={userId}
                  onChange={(e) => setUserId(e.target.value)}
                  placeholder="alex.chen"
                  className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-3 py-2 text-xs text-slate-900 outline-none focus:border-indigo-500 font-mono"
                />
              </div>
            </div>

            <div>
              <label className="text-[11px] font-semibold text-slate-700 block mb-1">Issue Description</label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Describe the problem, hardware requested, or error details..."
                rows={3}
                required
                className="w-full bg-slate-50 border border-slate-200 rounded-2xl p-3 text-xs text-slate-900 placeholder:text-slate-400 outline-none focus:border-indigo-500 shadow-inner"
              />
            </div>

            <div className="flex justify-end items-center gap-2.5 pt-2">
              <button
                type="button"
                onClick={() => setIsCreating(false)}
                className="px-4 py-2 rounded-full bg-slate-100 hover:bg-slate-200 text-xs font-semibold text-slate-700 transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSubmitting || !description.trim()}
                className="flex items-center gap-2 px-5 py-2 rounded-full bg-[#1e293b] hover:bg-slate-800 text-xs font-bold text-white shadow-md shadow-slate-900/10 transition-all hover:-translate-y-0.5 disabled:opacity-50"
              >
                <Plus className="w-3.5 h-3.5" />
                {isSubmitting ? 'Creating Ticket...' : 'Submit Ticket'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Filter Controls */}
      <div className="flex flex-col sm:flex-row gap-3 mb-6">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-slate-400 absolute left-4 top-3" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search tickets by ID, user, or keywords..."
            className="w-full frosted-input pl-11 pr-4 py-2.5 text-xs text-slate-900 placeholder:text-slate-400 outline-none"
          />
        </div>

        <div className="flex items-center gap-2">
          <Filter className="w-4 h-4 text-slate-400" />
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="bg-white/90 border border-slate-200 text-xs text-slate-700 rounded-full px-4 py-2.5 outline-none focus:border-indigo-500 shadow-sm font-medium"
          >
            <option value="All">All Statuses</option>
            <option value="Open">Open</option>
            <option value="In Progress">In Progress</option>
            <option value="Pending">Pending</option>
            <option value="Escalated">Escalated</option>
            <option value="Resolved">Resolved</option>
            <option value="Closed">Closed</option>
          </select>
        </div>
      </div>

      {/* Tickets List */}
      <div className="grid grid-cols-1 gap-3.5">
        {filtered.length === 0 ? (
          <div className="text-center py-16 glass-card rounded-3xl border border-slate-200 text-slate-500 text-xs">
            No tickets match your search.
          </div>
        ) : (
          filtered.map((t) => (
            <div
              key={t.ticket_id}
              className="p-5 rounded-3xl glass-card border border-slate-200/80 hover:border-indigo-300 transition-all shadow-sm hover:shadow-md"
            >
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-3">
                <div className="flex items-center gap-2.5">
                  <span className="font-mono font-bold text-sm text-indigo-700 bg-indigo-50 px-2.5 py-0.5 rounded-full border border-indigo-200">
                    {t.ticket_id}
                  </span>
                  <span className="text-xs font-semibold text-slate-800">{t.issue_type}</span>
                  {getPriorityBadge(t.priority)}
                </div>
                <div className="flex items-center gap-2.5">
                  {getStatusBadge(t.status)}
                  {t.status !== 'Escalated' && t.status !== 'Closed' && (
                    <button
                      onClick={() => handleEscalate(t.ticket_id)}
                      disabled={actionInProgress === t.ticket_id}
                      className="flex items-center gap-1 text-[11px] font-bold text-amber-700 hover:text-amber-800 bg-amber-50 hover:bg-amber-100 px-3 py-1 rounded-full border border-amber-200 transition-all shadow-sm hover:-translate-y-0.5"
                    >
                      <Flame className="w-3 h-3" />
                      {actionInProgress === t.ticket_id ? 'Escalating...' : 'Escalate'}
                    </button>
                  )}
                  <a
                    href={`https://drenugadevidurai.atlassian.net/browse/${t.ticket_id}`}
                    target="_blank"
                    rel="noreferrer"
                    className="flex items-center gap-1 text-[11px] font-bold text-indigo-700 hover:text-indigo-900 bg-indigo-50 hover:bg-indigo-100 px-3 py-1 rounded-full border border-indigo-200 transition-all shadow-sm hover:-translate-y-0.5"
                  >
                    Jira ↗
                  </a>
                </div>
              </div>

              <p className="text-xs text-slate-800 mb-3 leading-relaxed font-sans">{t.description}</p>

              <div className="flex flex-wrap items-center justify-between gap-2 pt-3 border-t border-slate-200/70 text-[11px] text-slate-500 font-mono">
                <div className="flex items-center gap-4">
                  <span>Requester: <strong className="text-slate-800">{t.user_id}</strong></span>
                  <span>Assignee: <strong className="text-slate-800">{t.assignee}</strong></span>
                </div>
                {t.resolution_notes && (
                  <div className="text-emerald-700 font-sans italic font-medium">
                    Resolution: {t.resolution_notes}
                  </div>
                )}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
