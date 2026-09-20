import React from 'react';
import { 
  Bot, Sparkles, Layers, ShieldCheck, Database, Activity, 
  ChevronLeft, ChevronRight, Lock, Unlock, ShieldAlert, 
  LogOut, User, CheckCircle2, Flame, ExternalLink, SlidersHorizontal
} from 'lucide-react';

export default function Sidebar({ 
  activeTab, 
  setActiveTab, 
  ticketCount, 
  auditCount,
  isAdmin,
  adminUser,
  onOpenAdminLogin,
  onExitAdmin,
  currentUser,
  allUsers,
  onSelectUser,
  isCollapsed,
  setIsCollapsed
}) {
  const navItems = [
    {
      id: isAdmin ? 'admin_console' : 'chat',
      label: isAdmin ? 'Admin Console' : 'Service Desk Chat',
      icon: isAdmin ? ShieldCheck : Sparkles,
      badge: isAdmin ? 'ADMIN' : null,
      badgeColor: 'bg-purple-50 text-purple-700 border-purple-200'
    },
    {
      id: 'tickets',
      label: 'Live JIRA Tickets',
      icon: Layers,
      badge: ticketCount > 0 ? ticketCount : null,
      badgeColor: 'bg-indigo-50 text-indigo-700 border-indigo-200'
    },
    {
      id: 'audit',
      label: 'SOC2 Audit Trail',
      icon: ShieldCheck,
      badge: auditCount > 0 ? auditCount : null,
      badgeColor: 'bg-emerald-50 text-emerald-700 border-emerald-200'
    },
    {
      id: 'kb',
      label: 'Knowledge Base (RAG)',
      icon: Database,
      badge: '6 Docs',
      badgeColor: 'bg-slate-100 text-slate-600 border-slate-200'
    },
    {
      id: 'eval',
      label: 'Evaluation Suite',
      icon: Activity,
      badge: '100%',
      badgeColor: 'bg-emerald-50 text-emerald-700 border-emerald-200'
    }
  ];

  return (
    <aside 
      className={`h-full glass-container rounded-[24px] flex flex-col justify-between transition-all duration-300 z-40 relative select-none ${
        isCollapsed ? 'w-20' : 'w-64'
      }`}
    >
      {/* Top Branding Section */}
      <div>
        <div className={`p-4 flex items-center ${isCollapsed ? 'justify-center' : 'justify-between'} border-b border-slate-200/60`}>
          {!isCollapsed ? (
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-2xl bg-[#1e293b] flex items-center justify-center shadow-md shadow-slate-900/10 border border-slate-700/20">
                <Bot className="w-5 h-5 text-white" />
              </div>
              <div>
                <div className="flex items-center gap-1.5">
                  <h1 className="font-serif text-xl font-normal text-slate-900 tracking-tight">ResolveIQ</h1>
                  <span className="text-[9px] font-mono font-bold bg-indigo-50 text-indigo-600 px-1.5 py-0.2 rounded-full border border-indigo-100">
                    v1.0
                  </span>
                </div>
                <p className="text-[11px] text-slate-500 font-medium">IT Service Desk AI</p>
              </div>
            </div>
          ) : (
            <div className="w-9 h-9 rounded-2xl bg-[#1e293b] flex items-center justify-center shadow-md shadow-slate-900/10 border border-slate-700/20">
              <Bot className="w-5 h-5 text-white" />
            </div>
          )}

          {/* Collapse Toggle Button */}
          <button
            onClick={() => setIsCollapsed(!isCollapsed)}
            title={isCollapsed ? 'Expand Sidebar' : 'Collapse Sidebar'}
            className="p-1.5 rounded-full bg-white/80 hover:bg-white text-slate-500 hover:text-slate-800 border border-slate-200/80 shadow-sm transition-all"
          >
            {isCollapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
          </button>
        </div>

        {/* Jira Service Desk Live Status Bar */}
        {!isCollapsed && (
          <div className="mx-3 mt-3.5 p-2.5 rounded-2xl bg-white/80 border border-slate-200/80 shadow-sm flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              <span className="text-[11px] font-semibold text-slate-700">Service Desk: <strong className="text-indigo-600 font-mono">ITSD</strong></span>
            </div>
            <a
              href="https://drenugadevidurai.atlassian.net/jira/servicedesk/projects/ITSD/queues"
              target="_blank"
              rel="noreferrer"
              title="Open ITSD Service Desk Queues in Jira"
              className="text-slate-400 hover:text-indigo-600 transition-colors"
            >
              <ExternalLink className="w-3.5 h-3.5" />
            </a>
          </div>
        )}

        {/* Navigation Section */}
        <nav className="p-3 space-y-1 mt-2">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id)}
                title={isCollapsed ? item.label : ''}
                className={`w-full flex items-center ${
                  isCollapsed ? 'justify-center px-0' : 'justify-between px-3.5'
                } py-2.5 rounded-full text-xs font-semibold transition-all group relative ${
                  isActive
                    ? 'bg-[#1e293b] text-white shadow-md shadow-slate-900/10'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-white/80 hover:shadow-sm'
                }`}
              >
                <div className="flex items-center gap-3">
                  <Icon className={`w-4 h-4 flex-shrink-0 ${isActive ? 'text-white' : 'text-slate-500 group-hover:text-indigo-600'}`} />
                  {!isCollapsed && <span>{item.label}</span>}
                </div>

                {!isCollapsed && item.badge && (
                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-mono font-bold border ${item.badgeColor}`}>
                    {item.badge}
                  </span>
                )}

                {/* Collapsed Tooltip */}
                {isCollapsed && (
                  <div className="absolute left-full ml-3 px-2.5 py-1 bg-slate-900 text-white text-xs font-semibold rounded-lg shadow-xl border border-slate-700 opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity whitespace-nowrap z-50">
                    {item.label}
                  </div>
                )}
              </button>
            );
          })}
        </nav>
      </div>

      {/* Bottom Section: Admin Portal & User Profile */}
      <div className="p-3 border-t border-slate-200/60 space-y-2.5">
        {/* Admin Login / Logout Trigger */}
        {isAdmin ? (
          <div className={`p-2.5 rounded-2xl bg-purple-50/80 border border-purple-200/80 shadow-sm ${isCollapsed ? 'flex justify-center' : ''}`}>
            {!isCollapsed ? (
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 overflow-hidden">
                  <div className="w-6 h-6 rounded-full bg-purple-600 text-white text-[11px] font-bold flex items-center justify-center flex-shrink-0">
                    R
                  </div>
                  <div className="overflow-hidden text-left">
                    <div className="text-[11px] font-bold text-slate-900 truncate">Nagul Pranav</div>
                    <div className="text-[9px] text-purple-600 font-mono">Admin Mode</div>
                  </div>
                </div>
                <button
                  onClick={onExitAdmin}
                  title="Exit Admin Mode"
                  className="p-1 text-slate-400 hover:text-red-500 hover:bg-white rounded-full transition-colors"
                >
                  <LogOut className="w-3.5 h-3.5" />
                </button>
              </div>
            ) : (
              <button
                onClick={onExitAdmin}
                title="Exit Admin Mode"
                className="text-purple-600 hover:text-red-500"
              >
                <LogOut className="w-4 h-4" />
              </button>
            )}
          </div>
        ) : (
          <button
            onClick={onOpenAdminLogin}
            title={isCollapsed ? 'Admin Login' : ''}
            className={`w-full flex items-center ${
              isCollapsed ? 'justify-center p-2.5' : 'gap-2.5 px-3.5 py-2'
            } rounded-full bg-purple-50 hover:bg-purple-100/80 border border-purple-200/80 text-purple-700 text-xs font-bold transition-all shadow-sm`}
          >
            <ShieldAlert className="w-4 h-4 text-purple-600 flex-shrink-0" />
            {!isCollapsed && <span>Admin Login</span>}
          </button>
        )}

        {/* User Switcher (For Testing Personas) */}
        {!isAdmin && (
          <div className={`p-2 rounded-2xl bg-white/80 border border-slate-200/80 shadow-sm ${isCollapsed ? 'flex justify-center' : ''}`}>
            {!isCollapsed ? (
              <div className="space-y-1.5">
                <div className="flex items-center justify-between text-[11px] text-slate-500 px-1">
                  <span className="flex items-center gap-1 font-semibold text-slate-700">
                    <User className="w-3 h-3 text-indigo-500" /> Active Persona
                  </span>
                  {currentUser?.is_locked ? (
                    <span className="text-[9px] font-bold text-red-600">Locked</span>
                  ) : (
                    <span className="text-[9px] font-bold text-emerald-600">Active</span>
                  )}
                </div>
                <select
                  value={currentUser?.user_id || 'alex.chen'}
                  onChange={(e) => onSelectUser(e.target.value)}
                  className="w-full bg-slate-50 text-slate-800 border border-slate-200 text-[11px] rounded-xl px-2 py-1.5 outline-none focus:border-indigo-500 font-medium cursor-pointer"
                >
                  {allUsers.map((u) => (
                    <option key={u.user_id} value={u.user_id}>
                      {u.name} ({u.role}) {u.is_locked ? '⚠️' : ''}
                    </option>
                  ))}
                </select>
              </div>
            ) : (
              <div 
                title={`${currentUser?.name || 'User'} (${currentUser?.role || ''})`} 
                className="w-7 h-7 rounded-full bg-slate-100 text-indigo-600 text-xs font-bold flex items-center justify-center"
              >
                {currentUser?.name ? currentUser.name.charAt(0) : 'U'}
              </div>
            )}
          </div>
        )}
      </div>
    </aside>
  );
}
