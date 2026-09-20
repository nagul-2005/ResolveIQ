import React, { useState } from 'react';
import { KeyRound, ShieldCheck, ArrowRight, Sparkles, AlertCircle } from 'lucide-react';

export default function VerificationModal({ payload, onVerify, isSubmitting }) {
  const [otp, setOtp] = useState('');
  const [error, setError] = useState(null);

  if (!payload) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!otp.trim()) {
      setError('Please enter the 6-digit OTP code');
      return;
    }
    setError(null);
    try {
      await onVerify(otp.trim());
    } catch (err) {
      setError(err.message || 'Invalid verification code');
    }
  };

  const handleQuickFill = () => {
    const match = payload.hint?.match(/\b\d{6}\b/);
    const code = match ? match[0] : '123456';
    setOtp(code);
  };

  return (
    <div className="my-4 p-5 rounded-3xl glass-card border border-indigo-200/80 shadow-dashboard relative bg-white/95">
      {/* Header */}
      <div className="flex items-center gap-3 mb-3">
        <div className="p-2.5 rounded-2xl bg-[#1e293b] text-white shadow-sm">
          <KeyRound className="w-5 h-5" />
        </div>
        <div>
          <h3 className="font-serif text-base font-normal text-slate-900 tracking-tight">Active Directory MFA Verification</h3>
          <p className="text-xs text-slate-600 mt-0.5">{payload.message}</p>
        </div>
      </div>

      {/* Demo Hint Banner */}
      {payload.hint && (
        <div className="bg-indigo-50/80 border border-indigo-200/80 rounded-2xl p-3 mb-4 flex items-center justify-between text-xs text-indigo-900">
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-indigo-600" />
            <span>{payload.hint}</span>
          </div>
          <button
            type="button"
            onClick={handleQuickFill}
            className="px-3 py-1 rounded-full bg-white hover:bg-indigo-100 text-indigo-700 font-semibold text-[11px] border border-indigo-200 shadow-sm transition-all"
          >
            Auto-Fill OTP
          </button>
        </div>
      )}

      {/* Form */}
      <form onSubmit={handleSubmit} className="space-y-3.5">
        <div>
          <label className="text-xs font-semibold text-slate-700 block mb-1.5">
            Enter 6-Digit One-Time Passcode
          </label>
          <div className="relative">
            <input
              type="text"
              maxLength={6}
              value={otp}
              onChange={(e) => setOtp(e.target.value)}
              placeholder="e.g. 123456"
              className="w-full bg-slate-50 border border-slate-200 focus:border-indigo-500 rounded-2xl px-4 py-2.5 text-center font-mono text-lg font-bold tracking-widest text-slate-900 placeholder:text-slate-400 outline-none transition-all shadow-inner"
            />
          </div>
          {error && (
            <div className="flex items-center gap-1.5 text-xs text-red-600 mt-1.5 font-medium">
              <AlertCircle className="w-3.5 h-3.5" />
              {error}
            </div>
          )}
        </div>

        <button
          type="submit"
          disabled={isSubmitting}
          className="w-full flex items-center justify-center gap-2 bg-[#1e293b] hover:bg-slate-800 text-white text-xs font-bold py-2.5 px-4 rounded-full shadow-md shadow-slate-900/10 transition-all hover:-translate-y-0.5 disabled:opacity-50"
        >
          <ShieldCheck className="w-4 h-4" />
          {isSubmitting ? 'Validating against Active Directory...' : 'Verify Identity & Resume Flow'}
        </button>
      </form>
    </div>
  );
}
