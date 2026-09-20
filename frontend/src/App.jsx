import React, { useState, useEffect } from 'react';
import Sidebar from './components/Sidebar';
import Header from './components/Header';
import ChatWindow from './components/ChatWindow';
import TicketsBoard from './components/TicketsBoard';
import AuditLogViewer from './components/AuditLogViewer';
import KnowledgeBaseView from './components/KnowledgeBaseView';
import EvalRunner from './components/EvalRunner';
import CitationDrawer from './components/CitationDrawer';
import AdminLoginModal from './components/AdminLoginModal';
import AdminCommandCenter from './components/AdminCommandCenter';
import { api } from './services/api';

export default function App() {
  const [activeTab, setActiveTab] = useState('chat');
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [users, setUsers] = useState([]);
  const [currentUser, setCurrentUser] = useState(null);
  
  // Admin State
  const [isAdmin, setIsAdmin] = useState(false);
  const [adminUser, setAdminUser] = useState(null);
  const [showAdminLoginModal, setShowAdminLoginModal] = useState(false);

  // Chat State
  const [threadId, setThreadId] = useState(null);
  const [messages, setMessages] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [interruptState, setInterruptState] = useState(null);
  const [selectedCitation, setSelectedCitation] = useState(null);

  // Data Store Cache
  const [tickets, setTickets] = useState([]);
  const [auditLogs, setAuditLogs] = useState([]);
  const [kbArticles, setKbArticles] = useState([]);
  const [sessionArticles, setSessionArticles] = useState([]);
  const [isDataLoading, setIsDataLoading] = useState(false);


  // Initial Load
  useEffect(() => {
    loadInitialData();
  }, []);

  const loadInitialData = async () => {
    try {
      setIsDataLoading(true);
      const [fetchedUsers, fetchedTickets, fetchedLogs, fetchedKb] = await Promise.all([
        api.getUsers().catch(() => []),
        api.getTickets().catch(() => []),
        api.getAuditLogs().catch(() => []),
        api.getKnowledgeBase().catch(() => [])
      ]);

      setUsers(fetchedUsers);
      if (fetchedUsers.length > 0) {
        setCurrentUser(fetchedUsers[0]);
      }
      setTickets(fetchedTickets);
      setAuditLogs(fetchedLogs);
      setKbArticles(fetchedKb);
    } catch (err) {
      console.error('Failed to load initial data:', err);
    } finally {
      setIsDataLoading(false);
    }
  };

  const handleAdminLoginSuccess = (adminData, token) => {
    setIsAdmin(true);
    setAdminUser(adminData);
    setActiveTab('admin_console');
    setShowAdminLoginModal(false);
  };

  const handleAdminLogout = () => {
    setIsAdmin(false);
    setAdminUser(null);
    setActiveTab('chat');
  };

  const handleSelectUser = (userId) => {
    const user = users.find(u => u.user_id === userId);
    if (user) {
      setCurrentUser(user);
    }
  };

  const handleResetChat = () => {
    setThreadId(null);
    setMessages([]);
    setInterruptState(null);
  };

  const handleSendMessage = async (userMessageText) => {
    const newMsg = { role: 'user', content: userMessageText };
    setMessages(prev => [...prev, newMsg]);
    setIsLoading(true);
    setInterruptState(null);

    try {
      const resp = await api.sendChat(userMessageText, threadId, currentUser?.user_id || 'alex.chen');
      
      if (resp.thread_id) {
        setThreadId(resp.thread_id);
      }

      // Check if response is interrupted
      if (resp.status === 'verification_required' || resp.status === 'confirmation_required') {
        setInterruptState(resp);
      } else {
        // Completed message
        setMessages(prev => [
          ...prev,
          {
            role: 'assistant',
            content: resp.message,
            citations: resp.citations || [],
            actionResult: resp.action_result
          }
        ]);
        loadTicketsAndAudit();
      }
    } catch (err) {
      setMessages(prev => [
        ...prev,
        {
          role: 'assistant',
          content: `❌ Error: ${err.message || 'Could not process request.'}`
        }
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleVerifyOtp = async (otpCode) => {
    if (!threadId || !currentUser) return;
    setIsLoading(true);

    try {
      const resp = await api.verifyAuth(threadId, currentUser.user_id, otpCode);
      
      setUsers(prev => prev.map(u => u.user_id === currentUser.user_id ? { ...u, auth_status: 'verified' } : u));
      if (currentUser) {
        setCurrentUser(prev => ({ ...prev, auth_status: 'verified' }));
      }

      if (resp.status === 'confirmation_required') {
        setInterruptState(resp);
      } else {
        setInterruptState(null);
        setMessages(prev => [
          ...prev,
          {
            role: 'assistant',
            content: resp.message,
            citations: resp.citations || [],
            actionResult: resp.action_result
          }
        ]);
        loadTicketsAndAudit();
      }
    } catch (err) {
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  const handleConfirmAction = async (action) => {
    if (!threadId) return;
    setIsLoading(true);

    try {
      const resp = await api.confirmAction(threadId, action);
      setInterruptState(null);
      setMessages(prev => [
        ...prev,
        {
          role: 'assistant',
          content: resp.message,
          citations: resp.citations || [],
          actionResult: resp.action_result
        }
      ]);
      loadTicketsAndAudit();
    } catch (err) {
      setMessages(prev => [
        ...prev,
        {
          role: 'assistant',
          content: `❌ Confirmation Error: ${err.message}`
        }
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  const loadTicketsAndAudit = async () => {
    try {
      const [t, a, u] = await Promise.all([
        api.getTickets(),
        api.getAuditLogs(),
        api.getUsers()
      ]);
      setTickets(t);
      setAuditLogs(a);
      setUsers(u);
      if (currentUser) {
        const refreshed = u.find(x => x.user_id === currentUser.user_id);
        if (refreshed) setCurrentUser(refreshed);
      }
    } catch (e) {
      console.error('Data refresh error:', e);
    }
  };

  return (
    <div className="h-full w-full flex ambient-bg overflow-hidden font-sans text-slate-800 p-2 sm:p-3 gap-2.5">
      {/* Collapsible Left Sidebar Navigation */}
      <Sidebar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        ticketCount={tickets.length}
        auditCount={auditLogs.length}
        isAdmin={isAdmin}
        adminUser={adminUser}
        onOpenAdminLogin={() => setShowAdminLoginModal(true)}
        onExitAdmin={handleAdminLogout}
        currentUser={currentUser}
        allUsers={users}
        onSelectUser={handleSelectUser}
        isCollapsed={isSidebarCollapsed}
        setIsCollapsed={setIsSidebarCollapsed}
      />

      {/* Main Workspace Area with Ambient Frosted Glass */}
      <div className="flex-1 min-w-0 h-full flex flex-col overflow-hidden relative glass-container rounded-[24px]">
        {/* Top Header Bar */}
        <Header

          activeTab={activeTab}
          isAdmin={isAdmin}
          adminUser={adminUser}
          currentUser={currentUser}
          isCollapsed={isSidebarCollapsed}
          setIsCollapsed={setIsSidebarCollapsed}
          ticketCount={tickets.length}
        />

        {/* View Content Container */}
        <main className="flex-1 min-h-0 w-full flex flex-col overflow-hidden relative">
          {/* Admin Command Center */}
          {activeTab === 'admin_console' && (
            <AdminCommandCenter
              adminUser={adminUser}
              onLogout={handleAdminLogout}
              onRefreshAll={loadTicketsAndAudit}
            />
          )}

          {activeTab === 'chat' && (
            <ChatWindow
              messages={messages}
              onSendMessage={handleSendMessage}
              onVerifyOtp={handleVerifyOtp}
              onConfirmAction={handleConfirmAction}
              isLoading={isLoading}
              interruptState={interruptState}
              onSelectCitation={setSelectedCitation}
              onResetChat={handleResetChat}
            />
          )}

          {activeTab === 'tickets' && (
            <TicketsBoard
              tickets={tickets}
              onRefresh={loadTicketsAndAudit}
              isLoading={isDataLoading}
            />
          )}

          {activeTab === 'audit' && (
            <AuditLogViewer
              auditLogs={auditLogs}
              onRefresh={loadTicketsAndAudit}
              isLoading={isDataLoading}
            />
          )}

          {activeTab === 'kb' && (
            <KnowledgeBaseView
              articles={[...kbArticles, ...sessionArticles]}
              onSelectCitation={setSelectedCitation}
              onRefreshKb={loadInitialData}
              isAdmin={isAdmin}
              adminUser={adminUser}
              currentUser={currentUser}
              onAddSessionArticle={(newDoc) => setSessionArticles(prev => [newDoc, ...prev])}
              onRemoveSessionArticle={(docId) => setSessionArticles(prev => prev.filter(d => d.doc_id !== docId))}
            />
          )}

          {activeTab === 'eval' && (
            <EvalRunner />
          )}
        </main>
      </div>

      {/* Slide-over Grounded Citation Drawer */}
      <CitationDrawer
        citation={selectedCitation}
        onClose={() => setSelectedCitation(null)}
      />

      {/* Admin Login Modal */}
      <AdminLoginModal
        isOpen={showAdminLoginModal}
        onClose={() => setShowAdminLoginModal(false)}
        onLoginSuccess={handleAdminLoginSuccess}
      />
    </div>
  );
}
