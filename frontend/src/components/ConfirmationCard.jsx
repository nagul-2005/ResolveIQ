import React from 'react';
import { ShieldAlert, AlertTriangle, Check, X, Terminal, Cpu } from 'lucide-react';

export default function ConfirmationCard({ payload, onConfirm, isSubmitting }) {
  if (!payload) return null;

  const { tool_name, parameters, impact_level, risk_description, summary } = payload;

  const isCritical = impact_level === 'Critical' || impact_level === 'High';

  return (
    <div className="my-4 p-5 rounded-3xl glass-card border border-amber-300/80 shadow-dashboard relative overflow-hidden bg-white/95">
      {/* Background Decorative Pattern */}
      <div className="absolute top-0 right-0 -mr-10 -mt-10 w-36 h-36 bg-amber-500/10 rounded-full blur-2xl pointer-events-none" />

      {/* Header */}
      <div className="flex items-start justify-between gap-3 mb-3">
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded-2xl bg-amber-50 text-amber-600 border border-amber-200 shadow-sm">
            <ShieldAlert className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="font-serif text-base font-normal text-slate-900 tracking-tight">Human-in-the-Loop Confirmation</h3>
              <span className={`text-[10px] font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full ${
                isCritical 
                  ? 'bg-red-50 text-red-700 border border-red-200' 
                  : 'bg-amber-50 text-amber-700 border border-amber-200'
              }`}>
                {impact_level} Impact
              </span>
            </div>
            <p className="text-xs text-slate-600 mt-0.5">{summary}</p>
          </div>
        </div>
      </div>

      {/* Risk Notice */}
      <div className="bg-amber-50/80 border border-amber-200/80 rounded-2xl p-3 mb-3.5 flex items-start gap-2.5 text-xs text-amber-900">
        <AlertTriangle className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
        <div>
          <span className="font-semibold text-amber-950">Security & Operational Notice: </span>
          {risk_description}
        </div>
      </div>

      {/* Parameter Table */}
      <div className="bg-slate-50/90 rounded-2xl border border-slate-200 p-3 mb-4">
        <div className="flex items-center gap-1.5 text-[11px] font-semibold text-slate-500 mb-2 uppercase tracking-wider font-mono">
          <Terminal className="w-3.5 h-3.5 text-indigo-600" /> Proposed Action Parameters
        </div>
        <div className="space-y-1.5">
          <div className="flex items-center justify-between text-xs py-1 border-b border-slate-200/60">
            <span className="text-slate-500 font-mono">Tool Call:</span>
            <span className="font-mono font-semibold text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded-full border border-indigo-200">
              {tool_name}
            </span>
          </div>
          {parameters && Object.entries(parameters).map(([k, v]) => (
            <div key={k} className="flex items-center justify-between text-xs py-1 border-b border-slate-200/40 last:border-0">
              <span className="text-slate-500 font-mono">{k}:</span>
              <span className="text-slate-800 font-medium font-mono truncate max-w-xs">{String(v)}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Actions: Approve / Cancel */}
      <div className="flex items-center gap-3 pt-1">
        <button
          onClick={() => onConfirm('approve')}
          disabled={isSubmitting}
          className="flex-1 flex items-center justify-center gap-2 bg-[#1e293b] hover:bg-slate-800 text-white text-xs font-bold py-2.5 px-4 rounded-full shadow-md shadow-slate-900/10 transition-all hover:-translate-y-0.5 disabled:opacity-50"
        >
          <Check className="w-4 h-4" />
          Approve & Execute Action
        </button>

        <button
          onClick={() => onConfirm('reject')}
          disabled={isSubmitting}
          className="flex-1 flex items-center justify-center gap-2 bg-white hover:bg-slate-100 text-slate-700 hover:text-slate-900 text-xs font-semibold py-2.5 px-4 rounded-full border border-slate-200/80 shadow-sm transition-all hover:-translate-y-0.5 disabled:opacity-50"
        >
          <X className="w-4 h-4" />
          Cancel & Reject
        </button>
      </div>
    </div>
  );
}
