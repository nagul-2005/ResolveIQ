import React, { useState } from 'react';
import { 
  Bot, User, BookOpen, CheckCircle, Tag, Clock, ArrowUpRight, 
  Copy, Check, ShieldCheck, Ticket, Key, AlertTriangle, ExternalLink, Sparkles 
} from 'lucide-react';

export default function MessageItem({ message, onSelectCitation }) {
  const isAssistant = message.role === 'assistant';
  const [copied, setCopied] = useState(false);

  const handleCopy = (text) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // Helper to format markdown text
  const renderFormattedContent = (content) => {
    if (!content) return null;

    const paragraphs = content.split('\n\n');

    return paragraphs.map((para, pIdx) => {
      // Headings
      if (para.startsWith('### ')) {
        return <h4 key={pIdx} className="text-sm font-bold text-slate-900 mt-2 mb-1">{para.replace('### ', '')}</h4>;
      }
      if (para.startsWith('## ')) {
        return <h3 key={pIdx} className="font-serif text-lg font-normal text-slate-900 mt-3 mb-1.5">{para.replace('## ', '')}</h3>;
      }
      if (para.startsWith('# ')) {
        return <h2 key={pIdx} className="font-serif text-xl font-normal text-slate-900 mt-3 mb-2">{para.replace('# ', '')}</h2>;
      }

      // Bullet lists
      if (para.startsWith('- ') || para.startsWith('* ')) {
        const items = para.split('\n');
        return (
          <ul key={pIdx} className="list-disc list-inside space-y-1.5 my-2 text-slate-700">
            {items.map((it, iIdx) => (
              <li key={iIdx} className="leading-relaxed">
                {formatInlineTokens(it.replace(/^[-*]\s+/, ''))}
              </li>
            ))}
          </ul>
        );
      }

      return (
        <p key={pIdx} className={`leading-relaxed my-1 ${isAssistant ? 'text-slate-800' : 'text-white'}`}>
          {formatInlineTokens(para)}
        </p>
      );
    });
  };

  // Helper for bold, code tags, and inline doc citations [DOC-xxx]
  const formatInlineTokens = (text) => {
    const parts = text.split(/(\*\*.*?\*\*|`.*?`|\[DOC-[A-Z0-9-]+\])/g);

    return parts.map((part, idx) => {
      if (part.startsWith('**') && part.endsWith('**')) {
        return <strong key={idx} className={`font-semibold ${isAssistant ? 'text-slate-950' : 'text-white'}`}>{part.slice(2, -2)}</strong>;
      }
      if (part.startsWith('`') && part.endsWith('`')) {
        const codeText = part.slice(1, -1);
        return (
          <code key={idx} className={`px-1.5 py-0.5 rounded font-mono text-[11px] mx-0.5 ${
            isAssistant 
              ? 'bg-slate-100 text-indigo-700 border border-slate-200' 
              : 'bg-white/20 text-white border border-white/20'
          }`}>
            {codeText}
          </code>
        );
      }
      if (part.startsWith('[DOC-') && part.endsWith(']')) {
        const docId = part.slice(1, -1);
        return (
          <button
            key={idx}
            onClick={() => onSelectCitation({ doc_id: docId, title: `Reference Document ${docId}` })}
            className="inline-flex items-center gap-1 mx-1 px-2.5 py-0.5 rounded-full bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-mono text-[10px] font-bold border border-indigo-200 transition-all shadow-sm"
          >
            <BookOpen className="w-2.5 h-2.5" />
            {docId}
            <ArrowUpRight className="w-2.5 h-2.5 opacity-60" />
          </button>
        );
      }
      return part;
    });
  };

  return (
    <div className={`flex gap-3.5 my-4 ${isAssistant ? '' : 'flex-row-reverse'}`}>
      {/* Avatar */}
      <div className={`w-9 h-9 rounded-2xl flex items-center justify-center flex-shrink-0 text-xs shadow-md ${
        isAssistant 
          ? 'bg-[#1e293b] text-white border border-slate-700/20' 
          : 'bg-slate-700 text-white border border-slate-600'
      }`}>
        {isAssistant ? <Bot className="w-5 h-5" /> : <User className="w-5 h-5" />}
      </div>

      {/* Bubble Container */}
      <div className={`max-w-2xl ${isAssistant ? 'w-full' : ''}`}>
        {/* Assistant Header Badge */}
        {isAssistant && (
          <div className="flex items-center gap-2 mb-1.5 text-[11px] text-slate-500 font-mono">
            <span className="font-bold text-slate-800">ResolveIQ Assistant</span>
            <span className="text-slate-300">•</span>
            <span>Groq LPU (GPT-OSS-120B)</span>
          </div>
        )}

        {/* Message Bubble */}
        <div className={`p-4 rounded-3xl text-xs sm:text-sm shadow-card ${
          isAssistant 
            ? 'glass-card text-slate-800' 
            : 'bg-[#1e293b] text-white rounded-tr-sm shadow-slate-900/10'
        }`}>
          {renderFormattedContent(message.content)}

          {/* Special Visual Treatment for Action Result Payloads */}
          {message.actionResult && (
            <div className="mt-3 p-3.5 rounded-2xl bg-slate-50 border border-slate-200/80 font-mono text-xs">
              <div className="flex items-center justify-between gap-2 mb-2 pb-2 border-b border-slate-200">
                <div className="flex items-center gap-2 text-emerald-700 font-bold">
                  <ShieldCheck className="w-4 h-4 text-emerald-600" />
                  <span>Action Execution Result</span>
                </div>
                {message.actionResult.ticket_id && (
                  <a
                    href={message.actionResult.jira_url || `https://drenugadevidurai.atlassian.net/browse/${message.actionResult.ticket_id}`}
                    target="_blank"
                    rel="noreferrer"
                    title={`Open ${message.actionResult.ticket_id} in Jira Cloud`}
                    className="bg-indigo-50 hover:bg-indigo-100 text-indigo-700 px-2.5 py-0.5 rounded-full text-[10px] font-bold border border-indigo-200 flex items-center gap-1 transition-all shadow-sm hover:scale-105"
                  >
                    <span>{message.actionResult.ticket_id}</span>
                    <ExternalLink className="w-3 h-3 text-indigo-600" />
                  </a>
                )}
              </div>

              {message.actionResult.temporary_password && (
                <div className="flex items-center justify-between bg-indigo-50/60 p-2.5 rounded-xl border border-indigo-200/60 my-2">
                  <div>
                    <span className="text-[10px] text-indigo-700 block uppercase font-bold">Temporary Password:</span>
                    <span className="font-bold text-sm text-slate-900">{message.actionResult.temporary_password}</span>
                  </div>
                  <button
                    onClick={() => handleCopy(message.actionResult.temporary_password)}
                    className="flex items-center gap-1 bg-[#1e293b] hover:bg-slate-800 text-white px-3 py-1 rounded-full text-[10px] font-bold transition-all shadow-sm"
                  >
                    {copied ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                    {copied ? 'Copied' : 'Copy'}
                  </button>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Citations Footer */}
        {isAssistant && message.citations && message.citations.length > 0 && (
          <div className="mt-2.5 flex items-center gap-2 flex-wrap">
            <span className="text-[11px] font-semibold text-slate-500 flex items-center gap-1">
              <BookOpen className="w-3 h-3 text-indigo-600" /> Verified Knowledge Sources:
            </span>
            {message.citations.map((c, idx) => (
              <button
                key={idx}
                onClick={() => onSelectCitation(c)}
                className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/90 hover:bg-white border border-slate-200/90 hover:border-indigo-400 text-slate-700 text-[11px] transition-all group shadow-sm hover:-translate-y-0.5"
              >
                <span className="font-mono font-bold text-indigo-600 text-[10px]">{c.doc_id}</span>
                <span className="truncate max-w-[130px] text-slate-600 group-hover:text-slate-900">{c.title}</span>
                {c.score !== undefined && (
                  <span className="text-[9px] font-mono text-emerald-700 bg-emerald-50 px-1.5 py-0.2 rounded-full font-bold border border-emerald-100">
                    {(c.score * 100).toFixed(0)}% Match
                  </span>
                )}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
