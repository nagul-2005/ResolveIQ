import React, { useState } from 'react';
import { ShieldCheck, Terminal, CheckCircle, XCircle, AlertTriangle, RefreshCw, Lock } from 'lucide-react';

export default function AuditLogViewer({ auditLogs, onRefresh, isLoading }) {
  const [filterTool, setFilterTool] = useState('All');

  const filtered = auditLogs.filter(l => {
    if (filterTool === 'All') return true;
    return l.tool_name === filterTool;
  });

  const getStatusBadge = (status) => {
    switch (status) {
      case 'success':
        return (
          <span className="flex items-center gap-1.5 text-[11px] font-semibold px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200/80 font-mono shadow-sm">
            <CheckCircle className="w-3.5 h-3.5 text-emerald-600" /> Executed
          </span>
        );
      case 'blocked':
        return (
          <span className="flex items-center gap-1.5 text-[11px] font-semibold px-2.5 py-1 rounded-full bg-rose-50 text-rose-700 border border-rose-200/80 font-mono shadow-sm">
            <Lock className="w-3.5 h-3.5 text-rose-600" /> Policy Blocked
          </span>
        );
      default:
        return (
          <span className="flex items-center gap-1.5 text-[11px] font-semibold px-2.5 py-1 rounded-full bg-amber-50 text-amber-700 border border-amber-200/80 font-mono shadow-sm">
            <AlertTriangle className="w-3.5 h-3.5 text-amber-600" /> Failed
          </span>
        );
    }
  };

  return (
    <div className="flex-1 min-h-0 w-full h-full p-6 sm:p-8 overflow-y-auto bg-transparent">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
        <div>
          <div className="flex items-center gap-3">
            <h2 className="font-serif text-2xl sm:text-3xl text-slate-800 tracking-tight">Security Audit Trail</h2>
            <span className="text-xs px-3 py-1 rounded-full bg-emerald-50 text-emerald-700 font-mono font-medium border border-emerald-200/80 flex items-center gap-1.5 shadow-sm">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" /> SOC2 / ISO27001
            </span>
          </div>
          <p className="text-xs sm:text-sm text-slate-500 mt-1 font-sans">
            Replayable log verifying that no side-effect tools can execute without prior approval
          </p>
        </div>

        <button
          onClick={onRefresh}
          disabled={isLoading}
          className="flex items-center gap-2 px-4 py-2 rounded-full glass-card hover:bg-white text-xs font-semibold text-slate-700 hover:text-slate-900 border border-slate-200/80 transition-all shadow-sm hover:shadow active:scale-95 self-start sm:self-auto"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
          Refresh Trail
        </button>
      </div>

      {/* Audit Log Entries */}
      <div className="space-y-4">
        {filtered.length === 0 ? (
          <div className="text-center py-16 glass-card rounded-2xl border border-slate-200/80 text-slate-400 text-xs">
            No audit records logged yet.
          </div>
        ) : (
          filtered.map((log) => (
            <div
              key={log.id}
              className="p-5 rounded-2xl glass-card border border-slate-200/80 font-mono text-xs transition-all hover:border-slate-300"
            >
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-3 pb-3 border-b border-slate-100">
                <div className="flex flex-wrap items-center gap-2.5">
                  <span className="font-bold text-indigo-600 text-xs">#{log.id}</span>
                  <span className="bg-indigo-50 px-3 py-0.5 rounded-full font-bold text-indigo-700 border border-indigo-200/80 text-[11px]">
                    {log.tool_name}
                  </span>
                  <span className="text-slate-500 text-[11px] font-sans">User: <strong className="text-slate-700 font-mono">{log.user_id}</strong></span>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-[11px] text-slate-400 font-sans">
                    {log.timestamp ? new Date(log.timestamp).toLocaleString() : 'N/A'}
                  </span>
                  {getStatusBadge(log.execution_status)}
                </div>
              </div>

              {/* Params & Results */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-3">
                <div className="bg-slate-50/80 p-3.5 rounded-xl border border-slate-200/70 shadow-sm">
                  <div className="text-[10px] uppercase font-bold text-slate-400 mb-1.5 font-sans tracking-wider">Execution Parameters</div>
                  <pre className="text-[11px] text-slate-700 font-mono overflow-x-auto whitespace-pre-wrap leading-relaxed">
                    {JSON.stringify(log.params, null, 2)}
                  </pre>
                </div>

                <div className="bg-slate-50/80 p-3.5 rounded-xl border border-slate-200/70 shadow-sm">
                  <div className="text-[10px] uppercase font-bold text-slate-400 mb-1.5 font-sans tracking-wider">
                    Confirmed By: <span className="text-emerald-700 font-mono font-semibold">{log.confirmed_by}</span>
                  </div>
                  <pre className="text-[11px] text-slate-700 font-mono overflow-x-auto whitespace-pre-wrap leading-relaxed">
                    {JSON.stringify(log.result, null, 2)}
                  </pre>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
