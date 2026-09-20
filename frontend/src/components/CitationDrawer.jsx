import React from 'react';
import { X, BookOpen, ExternalLink, ShieldAlert, Tag, CheckCircle } from 'lucide-react';

export default function CitationDrawer({ citation, onClose }) {
  if (!citation) return null;

  return (
    <div className="fixed inset-y-0 right-0 w-full max-w-md bg-white/95 border-l border-slate-200/80 shadow-dashboard z-50 flex flex-col transform transition-transform duration-300 ease-in-out backdrop-blur-2xl">
      {/* Drawer Header */}
      <div className="p-4 border-b border-slate-200/70 flex items-center justify-between bg-slate-50/80">
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded-2xl bg-[#1e293b] text-white shadow-sm">
            <BookOpen className="w-4 h-4" />
          </div>
          <div>
            <h3 className="font-mono text-sm font-bold text-slate-900">{citation.doc_id}</h3>
            <p className="text-[11px] text-slate-500">Knowledge Base Source Document</p>
          </div>
        </div>
        <button
          onClick={onClose}
          className="p-1.5 rounded-full text-slate-400 hover:text-slate-800 hover:bg-slate-200/60 transition-colors"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Drawer Content */}
      <div className="flex-1 overflow-y-auto p-5 space-y-4">
        {/* Title */}
        <div>
          <label className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Document Title</label>
          <h4 className="font-serif text-xl font-normal text-slate-900 mt-0.5 tracking-tight">{citation.title}</h4>
        </div>

        {/* Metadata Badges */}
        <div className="grid grid-cols-2 gap-2.5 pt-2">
          <div className="bg-slate-50/90 p-3 rounded-2xl border border-slate-200/80">
            <div className="flex items-center gap-1.5 text-xs text-slate-500 mb-1 font-medium">
              <Tag className="w-3.5 h-3.5 text-indigo-600" /> Category
            </div>
            <div className="text-xs font-semibold text-slate-800">{citation.category}</div>
          </div>

          <div className="bg-slate-50/90 p-3 rounded-2xl border border-slate-200/80">
            <div className="flex items-center gap-1.5 text-xs text-slate-500 mb-1 font-medium">
              <ExternalLink className="w-3.5 h-3.5 text-indigo-600" /> Product Area
            </div>
            <div className="text-xs font-semibold text-slate-800">{citation.product_area}</div>
          </div>
        </div>

        {/* Hybrid Relevance Score */}
        {citation.score !== undefined && (
          <div className="bg-indigo-50/80 p-3 rounded-2xl border border-indigo-200/80 flex items-center justify-between">
            <span className="text-xs text-indigo-900 font-medium">Hybrid Search Confidence</span>
            <span className="text-xs font-mono font-bold text-indigo-700 bg-white px-2.5 py-0.5 rounded-full border border-indigo-200 shadow-sm">
              {(citation.score * 100).toFixed(1)}% Match
            </span>
          </div>
        )}

        {/* Severity */}
        {citation.severity && (
          <div className="flex items-center gap-2 text-xs">
            <span className="text-slate-500 font-medium">Security Tier:</span>
            <span className={`px-2.5 py-0.5 rounded-full text-[11px] font-semibold ${
              citation.severity === 'Critical'
                ? 'bg-red-50 text-red-700 border border-red-200'
                : citation.severity === 'High'
                ? 'bg-amber-50 text-amber-700 border border-amber-200'
                : 'bg-emerald-50 text-emerald-700 border border-emerald-200'
            }`}>
              {citation.severity}
            </span>
          </div>
        )}

        {/* Document Excerpt */}
        <div className="border-t border-slate-200 pt-4">
          <label className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Retrieved Excerpt</label>
          <div className="mt-2 bg-slate-50 p-3.5 rounded-2xl border border-slate-200 text-xs text-slate-800 leading-relaxed font-mono whitespace-pre-wrap">
            {citation.content || 'Full document content indexed in FastEmbed vector store.'}
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="p-4 border-t border-slate-200 bg-slate-50/60 text-center">
        <span className="text-[11px] text-slate-500 flex items-center justify-center gap-1.5 font-medium">
          <CheckCircle className="w-3.5 h-3.5 text-emerald-600" /> Grounded RAG Citation Verified
        </span>
      </div>
    </div>
  );
}
