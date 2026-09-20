import React from 'react';
import { 
  Menu, ShieldCheck, Sparkles, Layers, Database, 
  Activity, ExternalLink, CheckCircle2, Lock, Flame 
} from 'lucide-react';

export default function Header({ 
  activeTab, 
  isAdmin, 
  adminUser, 
  currentUser,
  isCollapsed,
  setIsCollapsed,
  ticketCount
}) {
  const getTabTitle = () => {
    switch (activeTab) {
      case 'chat':
        return { title: 'Autonomous IT Service Desk', subtitle: 'FastAPI + LangGraph Conversational Core', icon: Sparkles };
      case 'admin_console':
        return { title: 'IT Admin Command Center', subtitle: 'Live Jira Triage, Approvals & Directory Control', icon: ShieldCheck };
      case 'tickets':
        return { title: 'Live JIRA Tickets Board', subtitle: '2-Way Synced Atlassian Cloud Store (Project: ITSD)', icon: Layers };
      case 'audit':
        return { title: 'SOC2 Immutable Audit Trail', subtitle: 'Cryptographic Tool Execution & Human Sign-off Logs', icon: ShieldCheck };
      case 'kb':
        return { title: 'Knowledge Base Vector Store', subtitle: 'FastEmbed Hybrid RAG Search (Dense + BM25)', icon: Database };
      case 'eval':
        return { title: 'AI Benchmark & Evaluation Suite', subtitle: 'Precision@1, Recall@3, Intent Accuracy & Replay Harness', icon: Activity };
      default:
        return { title: 'Service Desk', subtitle: 'ResolveIQ IT Assistant', icon: Sparkles };
    }
  };

  const current = getTabTitle();
  const Icon = current.icon;

  return (
    <header className="h-16 border-b border-slate-200/70 bg-white/60 backdrop-blur-xl px-6 flex items-center justify-between z-20 flex-shrink-0">
      {/* Left: Breadcrumb & Title */}
      <div className="flex items-center gap-3">
        <button
          onClick={() => setIsCollapsed(!isCollapsed)}
          title="Toggle Navigation Sidebar"
          className="p-2 rounded-full bg-white/80 hover:bg-white text-slate-500 hover:text-slate-900 border border-slate-200/80 shadow-sm transition-all"
        >
          <Menu className="w-4 h-4" />
        </button>

        <div className="flex items-center gap-3">
          <div className="p-2 rounded-2xl bg-[#1e293b] text-white shadow-sm">
            <Icon className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center gap-2.5">
              <h2 className="font-serif text-xl sm:text-2xl font-normal text-slate-900 tracking-tight">{current.title}</h2>
              {activeTab === 'tickets' && ticketCount > 0 && (
                <span className="px-2.5 py-0.5 rounded-full bg-indigo-50 text-indigo-700 font-mono text-[10px] font-bold border border-indigo-200 shadow-sm">
                  {ticketCount} Active
                </span>
              )}
            </div>
            <p className="text-xs text-slate-500 font-normal hidden sm:block">{current.subtitle}</p>
          </div>
        </div>
      </div>

      {/* Right: Live Connection Badges */}
      <div className="flex items-center gap-2.5">
        <a
          href="https://drenugadevidurai.atlassian.net/jira/servicedesk/projects/ITSD/queues"
          target="_blank"
          rel="noreferrer"
          className="hidden sm:flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-white/80 hover:bg-white border border-slate-200/80 text-xs font-semibold text-slate-700 shadow-sm transition-all hover:-translate-y-0.5"
        >
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
          <span>Jira: <strong className="text-indigo-600 font-mono">ITSD</strong></span>
          <ExternalLink className="w-3 h-3 text-slate-400" />
        </a>

        {isAdmin ? (
          <span className="px-3.5 py-1.5 rounded-full bg-purple-50 border border-purple-200 text-purple-700 text-xs font-bold flex items-center gap-1.5 shadow-sm">
            <ShieldCheck className="w-3.5 h-3.5 text-purple-600" />
            <span className="hidden md:inline">Admin Mode:</span> {'Nagul Pranav'}
          </span>
        ) : (
          <div className="flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-white/80 border border-slate-200/80 text-xs text-slate-700 shadow-sm">
            <span className="w-2 h-2 rounded-full bg-indigo-500" />
            <span className="text-slate-500">User:</span>
            <strong className="text-slate-900 font-semibold">{currentUser?.name || 'Alex Chen'}</strong>
          </div>
        )}
      </div>
    </header>
  );
}
