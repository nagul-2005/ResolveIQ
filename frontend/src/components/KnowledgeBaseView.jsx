import React, { useState } from 'react';
import { 
  Database, Search, Tag, ExternalLink, BookOpen, Layers, 
  Plus, Upload, FileText, X, CheckCircle2, AlertCircle, Sparkles,
  Edit3, Trash2, ShieldCheck, ShieldAlert, Lock, Clock, Check, AlertTriangle
} from 'lucide-react';
import { api } from '../services/api';

export default function KnowledgeBaseView({ 
  articles, 
  onSelectCitation, 
  onRefreshKb,
  isAdmin = false,
  adminUser = null,
  currentUser = null,
  onAddSessionArticle,
  onRemoveSessionArticle
}) {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');
  
  // Upload Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [notification, setNotification] = useState(null);

  // Admin Confirmation Modal State (Accept / Deny)
  const [pendingAdminDoc, setPendingAdminDoc] = useState(null);

  // Edit Modal State (Admin Only)
  const [editingArticle, setEditingArticle] = useState(null);
  const [editTitle, setEditTitle] = useState('');
  const [editCategory, setEditCategory] = useState('General IT');
  const [editProductArea, setEditProductArea] = useState('IT Policy');
  const [editSeverity, setEditSeverity] = useState('Medium');
  const [editContent, setEditContent] = useState('');
  const [isUpdating, setIsUpdating] = useState(false);

  // Delete Confirmation State (Admin Only)
  const [deletingDocId, setDeletingDocId] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Form State for new upload
  const [docId, setDocId] = useState('');
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState('Security & Compliance');
  const [productArea, setProductArea] = useState('Device Management');
  const [severity, setSeverity] = useState('Medium');
  const [content, setContent] = useState('');

  const categories = ['All', ...new Set(articles.map(a => a.category))];

  const showToast = (message, type = 'success') => {
    setNotification({ message, type });
    setTimeout(() => setNotification(null), 4000);
  };

  const handleFileUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    if (!title) {
      const cleanName = file.name.replace(/\.[^/.]+$/, '').replace(/[-_]/g, ' ');
      setTitle(cleanName.charAt(0).toUpperCase() + cleanName.slice(1));
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      setContent(event.target.result);
    };
    reader.readAsText(file);
  };

  // Triggered when clicking "Submit" in the form
  const handleInitiateUpload = (e) => {
    e.preventDefault();
    if (!title.trim() || !content.trim()) return;

    if (isAdmin) {
      // Admin Mode: Present Accept / Deny Confirmation Step
      setPendingAdminDoc({
        doc_id: docId.trim() || `DOC-SEC-${Math.floor(100 + Math.random() * 900)}`,
        title: title.trim(),
        category: category.trim(),
        product_area: productArea.trim(),
        severity: severity,
        content: content.trim()
      });
    } else {
      // Employee Mode: Ingest as Temporary Session-Only Document
      const tempDocId = docId.trim() || `TEMP-${Math.floor(1000 + Math.random() * 9000)}`;
      const tempDoc = {
        doc_id: tempDocId,
        title: title.trim(),
        category: category.trim(),
        product_area: productArea.trim(),
        severity: severity,
        content: content.trim(),
        is_temporary: true,
        uploaded_by: currentUser?.name || 'Employee'
      };

      if (onAddSessionArticle) {
        onAddSessionArticle(tempDoc);
      }
      showToast(`Temporary document ${tempDocId} added for this session! (Vanishes upon page refresh)`, 'success');
      resetForm();
      setIsModalOpen(false);
    }
  };

  // Admin clicks "Accept & Publish" in Confirmation Modal
  const handleAdminConfirmAccept = async () => {
    if (!pendingAdminDoc) return;
    setIsSubmitting(true);
    try {
      const res = await api.uploadKbArticle(pendingAdminDoc);
      showToast(res.message || `Policy ${pendingAdminDoc.doc_id} permanently indexed in Weaviate Cloud!`, 'success');
      setPendingAdminDoc(null);
      resetForm();
      setIsModalOpen(false);
      await onRefreshKb();
    } catch (err) {
      showToast(`Upload error: ${err.message}`, 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Admin clicks "Deny / Reject" in Confirmation Modal
  const handleAdminDeny = () => {
    setPendingAdminDoc(null);
    showToast('Publication cancelled by Administrator.', 'error');
  };

  // Admin opens Edit Modal
  const openEditModal = (article) => {
    setEditingArticle(article);
    setEditTitle(article.title);
    setEditCategory(article.category);
    setEditProductArea(article.product_area);
    setEditSeverity(article.severity || 'Medium');
    setEditContent(article.content);
  };

  // Admin saves edited article
  const handleUpdateArticle = async (e) => {
    e.preventDefault();
    if (!editingArticle) return;

    setIsUpdating(true);
    try {
      const res = await api.updateKbArticle(editingArticle.doc_id, {
        title: editTitle,
        category: editCategory,
        product_area: editProductArea,
        severity: editSeverity,
        content: editContent
      });
      showToast(res.message || `Policy ${editingArticle.doc_id} updated & re-indexed!`, 'success');
      setEditingArticle(null);
      await onRefreshKb();
    } catch (err) {
      showToast(`Update error: ${err.message}`, 'error');
    } finally {
      setIsUpdating(false);
    }
  };

  // Admin deletes article permanently
  const handleDeleteArticle = async (docIdToDelete) => {
    setIsDeleting(true);
    try {
      const res = await api.deleteKbArticle(docIdToDelete);
      showToast(res.message || `Policy ${docIdToDelete} purged from Weaviate!`, 'success');
      setDeletingDocId(null);
      await onRefreshKb();
    } catch (err) {
      showToast(`Delete error: ${err.message}`, 'error');
    } finally {
      setIsDeleting(false);
    }
  };

  const resetForm = () => {
    setDocId('');
    setTitle('');
    setContent('');
    setCategory('Security & Compliance');
    setProductArea('Device Management');
    setSeverity('Medium');
  };

  const filtered = articles.filter(a => {
    const matchesSearch = 
      a.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      a.doc_id.toLowerCase().includes(searchTerm.toLowerCase()) ||
      a.content.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesCat = selectedCategory === 'All' || a.category === selectedCategory;
    return matchesSearch && matchesCat;
  });

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

      {/* Header & Governance Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <div className="flex items-center gap-2.5">
            <h2 className="font-serif text-2xl font-normal text-slate-900 tracking-tight">Weaviate Knowledge Base & Vector Index</h2>
            {isAdmin ? (
              <span className="text-xs px-3 py-0.5 rounded-full bg-purple-50 text-purple-700 font-bold border border-purple-200 flex items-center gap-1 shadow-sm">
                <ShieldCheck className="w-3 h-3 text-purple-600" /> Admin Governance Mode
              </span>
            ) : (
              <span className="text-xs px-3 py-0.5 rounded-full bg-slate-100 text-slate-700 font-semibold border border-slate-200 flex items-center gap-1 shadow-sm">
                <Lock className="w-3 h-3 text-slate-500" /> Employee Read-Only
              </span>
            )}
          </div>
          <p className="text-xs text-slate-500 mt-1 font-normal">
            {isAdmin 
              ? 'Admin Privileges Active: Edit, delete, and permanently publish official policies with SOC2 audit trail.' 
              : 'Read-only corporate policy library. You can upload temporary session documents for real-time assistance.'}
          </p>
        </div>

        <button
          onClick={() => setIsModalOpen(true)}
          className={`flex items-center gap-2 px-4 py-2 rounded-full text-xs font-bold text-white shadow-md shadow-slate-900/10 transition-all hover:-translate-y-0.5 self-start sm:self-auto ${
            isAdmin
              ? 'bg-[#1e293b] hover:bg-slate-800'
              : 'bg-[#1e293b] hover:bg-slate-800'
          }`}
        >
          <Plus className="w-3.5 h-3.5" />
          {isAdmin ? 'Publish Corporate Policy' : 'Add Temporary Session Doc'}
        </button>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3 mb-6">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-slate-400 absolute left-4 top-3" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search knowledge base articles by keyword, title, or content..."
            className="w-full frosted-input pl-11 pr-4 py-2.5 text-xs text-slate-900 placeholder:text-slate-400 outline-none"
          />
        </div>

        <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
          {categories.map(cat => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={`px-3.5 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-all shadow-sm hover:-translate-y-0.5 ${
                selectedCategory === cat
                  ? 'bg-[#1e293b] text-white'
                  : 'bg-white/80 text-slate-600 hover:text-slate-900 border border-slate-200/80 hover:bg-white'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      {/* Articles Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {filtered.map((art) => (
          <div
            key={art.doc_id}
            className={`p-5 rounded-3xl border transition-all flex flex-col justify-between shadow-sm hover:shadow-md group ${
              art.is_temporary
                ? 'bg-amber-50/60 border-amber-300 hover:border-amber-400'
                : 'glass-card border-slate-200/80 hover:border-indigo-300'
            }`}
          >
            <div>
              <div className="flex items-center justify-between gap-2 mb-2">
                <div className="flex items-center gap-2">
                  <span className={`font-mono font-bold text-xs px-2.5 py-0.5 rounded-full border ${
                    art.is_temporary
                      ? 'text-amber-800 bg-amber-100 border-amber-300'
                      : 'text-indigo-700 bg-indigo-50 border-indigo-200'
                  }`}>
                    {art.doc_id}
                  </span>
                  {art.is_temporary && (
                    <span className="flex items-center gap-1 text-[10px] font-bold text-amber-800 bg-amber-100 px-2.5 py-0.5 rounded-full border border-amber-300 font-mono">
                      <Clock className="w-2.5 h-2.5" /> Session Only
                    </span>
                  )}
                </div>

                <div className="flex items-center gap-2">
                  <span className="text-[10px] uppercase font-bold text-slate-500 bg-slate-100 px-2.5 py-0.5 rounded-full border border-slate-200">
                    {art.category}
                  </span>

                  {/* Admin Only Controls for Permanent Articles */}
                  {isAdmin && !art.is_temporary && (
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => openEditModal(art)}
                        title="Admin: Edit Policy"
                        className="p-1.5 rounded-full bg-slate-100 hover:bg-indigo-50 text-slate-500 hover:text-indigo-700 transition-colors shadow-sm"
                      >
                        <Edit3 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => setDeletingDocId(art.doc_id)}
                        title="Admin: Permanently Delete Policy"
                        className="p-1.5 rounded-full bg-slate-100 hover:bg-red-50 text-slate-500 hover:text-red-700 transition-colors shadow-sm"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  )}

                  {/* Temporary Doc Remove for Employees */}
                  {art.is_temporary && (
                    <button
                      onClick={() => onRemoveSessionArticle && onRemoveSessionArticle(art.doc_id)}
                      title="Remove Temporary Session Doc"
                      className="p-1.5 rounded-full bg-amber-100 hover:bg-red-100 text-amber-800 hover:text-red-800 border border-amber-300 transition-colors shadow-sm"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              </div>

              <h3 className="text-sm font-bold text-slate-900 mb-2 leading-snug">{art.title}</h3>
              <p className="text-xs text-slate-600 line-clamp-3 mb-4 leading-relaxed font-sans">
                {art.content.replace(/#+\s/g, '').slice(0, 200)}...
              </p>
            </div>

            <div className="flex items-center justify-between pt-3 border-t border-slate-200/70 text-xs">
              <span className="text-[11px] text-slate-500">{art.product_area}</span>
              <button
                onClick={() => onSelectCitation(art)}
                className="flex items-center gap-1 text-xs font-semibold text-indigo-700 hover:text-indigo-900 transition-colors"
              >
                Inspect Article <ExternalLink className="w-3 h-3" />
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Upload Document Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-md flex items-center justify-center z-50 p-4">
          <div className="w-full max-w-2xl bg-white/95 border border-slate-200/80 rounded-3xl p-6 shadow-dashboard animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between pb-3 mb-4 border-b border-slate-200">
              <div className="flex items-center gap-2.5">
                <div className={`p-2.5 rounded-2xl ${
                  isAdmin ? 'bg-purple-50 text-purple-700 border border-purple-200' : 'bg-indigo-50 text-indigo-700 border border-indigo-200'
                }`}>
                  <Database className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-serif text-lg font-normal text-slate-900 tracking-tight">
                    {isAdmin ? 'Publish Corporate Policy (Permanent Indexing)' : 'Add Temporary Session Document'}
                  </h3>
                  <p className="text-[11px] text-slate-500">
                    {isAdmin 
                      ? 'Requires Admin Accept/Deny confirmation before permanent Weaviate ingestion.' 
                      : 'Active for this browser session only — auto-cleared when you refresh.'}
                  </p>
                </div>
              </div>
              <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-slate-700 p-1.5 rounded-full hover:bg-slate-100">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleInitiateUpload} className="space-y-3.5">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-[11px] font-semibold text-slate-700 block mb-1">Document ID (Optional)</label>
                  <input
                    type="text"
                    value={docId}
                    onChange={(e) => setDocId(e.target.value)}
                    placeholder={isAdmin ? 'e.g. DOC-SEC-009' : 'e.g. TEMP-LOG-01'}
                    className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-3 py-2 text-xs text-slate-900 placeholder:text-slate-400 outline-none focus:border-indigo-500 font-mono"
                  />
                </div>

                <div>
                  <label className="text-[11px] font-semibold text-slate-700 block mb-1">Category</label>
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-3 py-2 text-xs text-slate-900 outline-none focus:border-indigo-500 font-medium"
                  >
                    <option value="Security & Compliance">Security & Compliance</option>
                    <option value="Network & Connectivity">Network & Connectivity</option>
                    <option value="Hardware & Workstation">Hardware & Workstation</option>
                    <option value="Identity & Access">Identity & Access</option>
                    <option value="Collaboration Tools">Collaboration Tools</option>
                    <option value="General IT">General IT</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-[11px] font-semibold text-slate-700 block mb-1">Document Title</label>
                  <input
                    type="text"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="e.g. Corporate Laptop Encryption & BitLocker Policy"
                    required
                    className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-3 py-2 text-xs text-slate-900 placeholder:text-slate-400 outline-none focus:border-indigo-500"
                  />
                </div>

                <div>
                  <label className="text-[11px] font-semibold text-slate-700 block mb-1">Product Area / Tool</label>
                  <input
                    type="text"
                    value={productArea}
                    onChange={(e) => setProductArea(e.target.value)}
                    placeholder="e.g. BitLocker & FileVault"
                    className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-3 py-2 text-xs text-slate-900 placeholder:text-slate-400 outline-none focus:border-indigo-500"
                  />
                </div>
              </div>

              {/* Upload file helper */}
              <div className="flex items-center justify-between p-3 rounded-2xl bg-slate-50 border border-dashed border-slate-300">
                <div className="flex items-center gap-2 text-xs text-slate-600">
                  <Upload className="w-4 h-4 text-indigo-600" />
                  <span>Upload markdown or text file (.md, .txt)</span>
                </div>
                <label className="px-3.5 py-1 bg-white hover:bg-slate-100 text-indigo-700 border border-slate-200 rounded-full text-xs font-semibold cursor-pointer transition-colors shadow-sm">
                  Browse File
                  <input type="file" accept=".md,.txt" onChange={handleFileUpload} className="hidden" />
                </label>
              </div>

              <div>
                <label className="text-[11px] font-semibold text-slate-700 block mb-1">Document Content</label>
                <textarea
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  placeholder="# Policy Title&#10;&#10;Describe instructions, steps, and compliance requirements in markdown..."
                  rows={6}
                  required
                  className="w-full bg-slate-50 border border-slate-200 rounded-2xl p-3 text-xs text-slate-900 placeholder:text-slate-400 outline-none focus:border-indigo-500 font-mono shadow-inner"
                />
              </div>

              <div className="flex justify-end items-center gap-2.5 pt-2">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 rounded-full bg-slate-100 hover:bg-slate-200 text-xs font-semibold text-slate-700 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={!content.trim() || !title.trim()}
                  className="flex items-center gap-2 px-5 py-2 rounded-full bg-[#1e293b] hover:bg-slate-800 text-xs font-bold text-white shadow-md shadow-slate-900/10 transition-all hover:-translate-y-0.5 disabled:opacity-50"
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  {isAdmin ? 'Review & Publish' : 'Add to Session'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Admin Accept / Deny Permanent Ingestion Confirmation Modal */}
      {pendingAdminDoc && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-md flex items-center justify-center z-50 p-4">
          <div className="w-full max-w-lg bg-white/95 border border-purple-200 rounded-3xl p-6 shadow-dashboard animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center gap-3 mb-4 pb-3 border-b border-slate-200">
              <div className="w-10 h-10 rounded-2xl bg-purple-50 text-purple-700 border border-purple-200 flex items-center justify-center font-bold">
                <ShieldCheck className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-serif text-lg font-normal text-slate-900 tracking-tight">Confirm Permanent Policy Publication</h3>
                <p className="text-[11px] text-slate-500">Zero-Trust Knowledge Governance Gate</p>
              </div>
            </div>

            <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-2 mb-4 text-xs">
              <div className="flex justify-between">
                <span className="text-slate-500">Document ID:</span>
                <span className="font-mono text-purple-700 font-bold">{pendingAdminDoc.doc_id}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Title:</span>
                <span className="text-slate-900 font-semibold">{pendingAdminDoc.title}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Category:</span>
                <span className="text-slate-700">{pendingAdminDoc.category}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Target Vector Store:</span>
                <span className="font-mono text-emerald-700 font-semibold">Live Weaviate Cloud (AWS eu-central-1)</span>
              </div>
            </div>

            <p className="text-xs text-slate-700 mb-5 leading-relaxed bg-purple-50 border border-purple-200 p-3.5 rounded-2xl">
              ⚠️ Ingesting this document will permanently generate dense <strong>FastEmbed embeddings</strong>, update hybrid search indexes, and make this policy accessible to all corporate employees.
            </p>

            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={handleAdminDeny}
                className="flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition-colors"
              >
                <X className="w-4 h-4" />
                Deny / Reject
              </button>
              <button
                type="button"
                disabled={isSubmitting}
                onClick={handleAdminConfirmAccept}
                className="flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-full bg-[#1e293b] hover:bg-slate-800 text-white text-xs font-bold shadow-md shadow-slate-900/10 transition-all hover:-translate-y-0.5 disabled:opacity-50"
              >
                <Check className="w-4 h-4" />
                {isSubmitting ? 'Indexing Vectors...' : 'Accept & Publish'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Policy Modal (Admin Only) */}
      {editingArticle && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-md flex items-center justify-center z-50 p-4">
          <div className="w-full max-w-2xl bg-white/95 border border-purple-200 rounded-3xl p-6 shadow-dashboard animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between pb-3 mb-4 border-b border-slate-200">
              <div className="flex items-center gap-2.5">
                <span className="font-mono font-bold text-xs text-purple-700 bg-purple-50 px-2.5 py-0.5 rounded-full border border-purple-200">
                  {editingArticle.doc_id}
                </span>
                <h3 className="font-serif text-lg font-normal text-slate-900 tracking-tight">Admin: Edit Policy & Re-Index Vectors</h3>
              </div>
              <button onClick={() => setEditingArticle(null)} className="text-slate-400 hover:text-slate-700 p-1.5 rounded-full hover:bg-slate-100">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleUpdateArticle} className="space-y-3.5">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-[11px] font-semibold text-slate-700 block mb-1">Document Title</label>
                  <input
                    type="text"
                    value={editTitle}
                    onChange={(e) => setEditTitle(e.target.value)}
                    required
                    className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-3 py-2 text-xs text-slate-900 outline-none focus:border-purple-500 font-medium"
                  />
                </div>

                <div>
                  <label className="text-[11px] font-semibold text-slate-700 block mb-1">Category</label>
                  <select
                    value={editCategory}
                    onChange={(e) => setEditCategory(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-3 py-2 text-xs text-slate-900 outline-none focus:border-purple-500 font-medium"
                  >
                    <option value="Security & Compliance">Security & Compliance</option>
                    <option value="Network & Connectivity">Network & Connectivity</option>
                    <option value="Hardware & Workstation">Hardware & Workstation</option>
                    <option value="Identity & Access">Identity & Access</option>
                    <option value="Collaboration Tools">Collaboration Tools</option>
                    <option value="General IT">General IT</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="text-[11px] font-semibold text-slate-700 block mb-1">Product Area / Tool</label>
                <input
                  type="text"
                  value={editProductArea}
                  onChange={(e) => setEditProductArea(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-3 py-2 text-xs text-slate-900 outline-none focus:border-purple-500"
                />
              </div>

              <div>
                <label className="text-[11px] font-semibold text-slate-700 block mb-1">Policy Markdown Content</label>
                <textarea
                  value={editContent}
                  onChange={(e) => setEditContent(e.target.value)}
                  rows={7}
                  required
                  className="w-full bg-slate-50 border border-slate-200 rounded-2xl p-3 text-xs text-slate-900 placeholder:text-slate-400 outline-none focus:border-purple-500 font-mono shadow-inner"
                />
              </div>

              <div className="flex justify-end items-center gap-2.5 pt-2">
                <button
                  type="button"
                  onClick={() => setEditingArticle(null)}
                  className="px-4 py-2 rounded-full bg-slate-100 hover:bg-slate-200 text-xs font-semibold text-slate-700 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isUpdating}
                  className="flex items-center gap-2 px-5 py-2 rounded-full bg-[#1e293b] hover:bg-slate-800 text-xs font-bold text-white shadow-md shadow-slate-900/10 transition-all hover:-translate-y-0.5 disabled:opacity-50"
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  {isUpdating ? 'Re-Indexing Vectors...' : 'Save & Re-Index'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal (Admin Only) */}
      {deletingDocId && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-md flex items-center justify-center z-50 p-4">
          <div className="w-full max-w-sm bg-white/95 border border-red-200 rounded-3xl p-6 shadow-dashboard animate-in fade-in zoom-in-95 duration-150 text-center">
            <div className="w-12 h-12 rounded-2xl bg-red-50 text-red-600 border border-red-200 flex items-center justify-center mx-auto mb-3 shadow-sm">
              <Trash2 className="w-6 h-6" />
            </div>
            <h3 className="font-serif text-lg font-normal text-slate-900 mb-1 tracking-tight">Delete Corporate Policy?</h3>
            <p className="text-xs text-slate-600 mb-4">
              Are you sure you want to remove <strong className="text-slate-900">{deletingDocId}</strong>? Its vector embeddings will be permanently purged from Weaviate Cloud.
            </p>
            <div className="flex items-center gap-2.5">
              <button
                type="button"
                onClick={() => setDeletingDocId(null)}
                className="flex-1 py-2 rounded-full bg-slate-100 hover:bg-slate-200 text-xs font-semibold text-slate-700"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={isDeleting}
                onClick={() => handleDeleteArticle(deletingDocId)}
                className="flex-1 py-2 rounded-full bg-red-600 hover:bg-red-700 text-xs font-bold text-white shadow-md shadow-red-600/20 transition-all hover:-translate-y-0.5"
              >
                {isDeleting ? 'Deleting...' : 'Yes, Delete'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
