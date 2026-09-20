import React, { useState } from 'react';
import { ShieldCheck, Lock, Mail, KeyRound, AlertCircle, X, Sparkles, CheckCircle2 } from 'lucide-react';
import { api } from '../services/api';

export default function AdminLoginModal({ isOpen, onClose, onLoginSuccess }) {
  const [email, setEmail] = useState('drenugadevidurai@gmail.com');
  const [password, setPassword] = useState('admin123');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);
    try {
      const data = await api.adminLogin(email.trim(), password.trim());
      onLoginSuccess(data.admin, data.token);
      onClose();
    } catch (err) {
      setError(err.message || 'Invalid credentials');
    } finally {
      setIsLoading(false);
    }
  };

  const handleQuickFill = () => {
    setEmail('drenugadevidurai@gmail.com');
    setPassword('admin123');
  };

  return (
    <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-md flex items-center justify-center z-50 p-4">
      <div className="w-full max-w-md bg-white/95 border border-slate-200/80 rounded-3xl shadow-dashboard overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        {/* Modal Header */}
        <div className="p-6 bg-slate-50/80 border-b border-slate-200/80 flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className="p-3 rounded-2xl bg-[#1e293b] text-white shadow-sm">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <h2 className="font-serif text-xl font-normal text-slate-900 tracking-tight">IT Administrator Portal</h2>
              <p className="text-xs text-slate-500 font-normal">ResolveIQ Command Center & Jira Management</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-700 p-1.5 rounded-full hover:bg-slate-200/60 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {/* Quick Demo Autofill Banner */}
          <div className="bg-indigo-50/80 border border-indigo-200/80 rounded-2xl p-3 flex items-center justify-between text-xs text-indigo-900">
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-indigo-600" />
              <span>Admin: <strong>drenugadevidurai@gmail.com</strong></span>
            </div>
            <button
              type="button"
              onClick={handleQuickFill}
              className="px-3 py-1 rounded-full bg-white hover:bg-indigo-100 text-indigo-700 font-semibold text-[11px] border border-indigo-200 shadow-sm transition-all"
            >
              Autofill
            </button>
          </div>

          <div>
            <label className="text-xs font-semibold text-slate-700 block mb-1.5 flex items-center gap-1.5">
              <Mail className="w-3.5 h-3.5 text-indigo-600" /> Administrator Email
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="drenugadevidurai@gmail.com"
              required
              className="w-full bg-slate-50 border border-slate-200 focus:border-indigo-500 rounded-2xl px-4 py-2.5 text-xs sm:text-sm text-slate-900 placeholder:text-slate-400 outline-none transition-all font-mono"
            />
          </div>

          <div>
            <label className="text-xs font-semibold text-slate-700 block mb-1.5 flex items-center gap-1.5">
              <KeyRound className="w-3.5 h-3.5 text-indigo-600" /> Password / API Token
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              required
              className="w-full bg-slate-50 border border-slate-200 focus:border-indigo-500 rounded-2xl px-4 py-2.5 text-xs sm:text-sm text-slate-900 placeholder:text-slate-400 outline-none transition-all font-mono"
            />
          </div>

          {error && (
            <div className="flex items-center gap-2 p-3 rounded-2xl bg-red-50 border border-red-200 text-xs text-red-700 font-medium">
              <AlertCircle className="w-4 h-4 text-red-600 flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <button
            type="submit"
            disabled={isLoading}
            className="w-full flex items-center justify-center gap-2 bg-[#1e293b] hover:bg-slate-800 text-white text-xs font-bold py-3 px-4 rounded-full shadow-md shadow-slate-900/10 transition-all hover:-translate-y-0.5 disabled:opacity-50"
          >
            <Lock className="w-4 h-4" />
            {isLoading ? 'Verifying Administrator...' : 'Sign In as Admin'}
          </button>
        </form>
      </div>
    </div>
  );
}
