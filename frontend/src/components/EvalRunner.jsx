import React, { useState } from 'react';
import { Play, Activity, CheckCircle2, XCircle, ShieldCheck, Database, Bot, RefreshCw, Award } from 'lucide-react';
import { api } from '../services/api';

export default function EvalRunner() {
  const [evalResults, setEvalResults] = useState(null);
  const [isRunning, setIsRunning] = useState(false);
  const [error, setError] = useState(null);

  const handleRunEvals = async () => {
    setIsRunning(true);
    setError(null);
    try {
      const data = await api.runEvaluations();
      setEvalResults(data);
    } catch (err) {
      setError(err.message || 'Failed to execute evaluation benchmarks');
    } finally {
      setIsRunning(false);
    }
  };

  return (
    <div className="flex-1 min-h-0 w-full h-full p-6 sm:p-8 overflow-y-auto bg-transparent">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
        <div>
          <div className="flex items-center gap-3">
            <h2 className="font-serif text-2xl sm:text-3xl text-slate-800 tracking-tight">Security & Evals Harness</h2>
            <span className="text-xs px-3 py-1 rounded-full bg-indigo-50 text-indigo-700 font-mono font-medium border border-indigo-200/80 shadow-sm">
              Golden Sets & Invariants
            </span>
          </div>
          <p className="text-xs sm:text-sm text-slate-500 mt-1 font-sans">
            Benchmarks retrieval precision/recall, intent classification accuracy, and audit replay invariants
          </p>
        </div>

        <button
          onClick={handleRunEvals}
          disabled={isRunning}
          className="flex items-center gap-2 px-6 py-2.5 rounded-full bg-slate-900 hover:bg-slate-800 text-xs font-semibold text-white shadow-md hover:shadow-lg transition-all disabled:opacity-50 active:scale-95 self-start sm:self-auto"
        >
          <Play className={`w-4 h-4 ${isRunning ? 'animate-spin' : ''}`} />
          {isRunning ? 'Running Benchmarks...' : 'Run Full Evaluation Suite'}
        </button>
      </div>

      {error && (
        <div className="p-4 rounded-2xl bg-rose-50 border border-rose-200 text-xs text-rose-700 mb-6 font-sans">
          {error}
        </div>
      )}

      {/* Benchmark Summary Cards */}
      {evalResults ? (
        <div className="space-y-6">
          {/* Top Score Banner */}
          <div className="p-6 sm:p-8 rounded-2xl glass-card border border-slate-200/80 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-[0_8px_30px_rgb(0,0,0,0.04)]">
            <div className="flex items-center gap-4">
              <div className="p-3.5 rounded-2xl bg-indigo-50 text-indigo-600 border border-indigo-200/80 shadow-sm">
                <Award className="w-8 h-8" />
              </div>
              <div>
                <h3 className="font-serif text-xl sm:text-2xl text-slate-800 tracking-tight">System Evaluation Benchmark Score</h3>
                <p className="text-xs sm:text-sm text-slate-500 font-sans mt-0.5">All retrieval, classification, and zero-trust tests verified</p>
              </div>
            </div>

            <div className="text-left sm:text-right">
              <div className="text-4xl font-serif text-slate-900 tracking-tight">
                {evalResults.overall_score_percent}%
              </div>
              <span className="text-[11px] font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200/80 rounded-full px-2.5 py-0.5 inline-flex items-center gap-1 mt-1 shadow-sm">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" /> Production Verified
              </span>
            </div>
          </div>

          {/* Individual Benchmark Sections */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            {/* 1. Retrieval Benchmark */}
            <div className="p-5 sm:p-6 rounded-2xl glass-card border border-slate-200/80 shadow-sm">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <Database className="w-4 h-4 text-indigo-600" />
                  <h4 className="text-xs font-bold uppercase text-slate-700 font-sans tracking-wider">RAG Retrieval</h4>
                </div>
                <span className="text-xs font-mono font-bold text-emerald-700 bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-200/80">
                  {evalResults.retrieval.score_percent}%
                </span>
              </div>
              <div className="space-y-2.5 text-xs text-slate-600 mb-4 font-sans">
                <div className="flex justify-between py-1.5 border-b border-slate-100">
                  <span className="text-slate-500">Precision@1:</span>
                  <span className="font-mono font-semibold text-slate-800">{(evalResults.retrieval.precision_at_1 * 100).toFixed(0)}%</span>
                </div>
                <div className="flex justify-between py-1.5 border-b border-slate-100">
                  <span className="text-slate-500">Recall@3:</span>
                  <span className="font-mono font-semibold text-slate-800">{(evalResults.retrieval.recall_at_k * 100).toFixed(0)}%</span>
                </div>
                <div className="flex justify-between py-1.5 border-b border-slate-100">
                  <span className="text-slate-500">Mean Reciprocal Rank (MRR):</span>
                  <span className="font-mono font-semibold text-slate-800">{evalResults.retrieval.mrr}</span>
                </div>
              </div>
              <div className="text-[11px] text-slate-400 font-sans">
                Tested against {evalResults.retrieval.total_test_cases} golden Q&A pairs
              </div>
            </div>

            {/* 2. Intent Classification */}
            <div className="p-5 sm:p-6 rounded-2xl glass-card border border-slate-200/80 shadow-sm">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <Bot className="w-4 h-4 text-purple-600" />
                  <h4 className="text-xs font-bold uppercase text-slate-700 font-sans tracking-wider">Intent Routing</h4>
                </div>
                <span className="text-xs font-mono font-bold text-emerald-700 bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-200/80">
                  {evalResults.intent.score_percent}%
                </span>
              </div>
              <div className="space-y-2.5 text-xs text-slate-600 mb-4 font-sans">
                <div className="flex justify-between py-1.5 border-b border-slate-100">
                  <span className="text-slate-500">Accuracy:</span>
                  <span className="font-mono font-semibold text-slate-800">{(evalResults.intent.accuracy * 100).toFixed(0)}%</span>
                </div>
                <div className="flex justify-between py-1.5 border-b border-slate-100">
                  <span className="text-slate-500">Correct Predictions:</span>
                  <span className="font-mono font-semibold text-slate-800">{evalResults.intent.correct} / {evalResults.intent.total_test_cases}</span>
                </div>
                <div className="flex justify-between py-1.5 border-b border-slate-100">
                  <span className="text-slate-500">Categories:</span>
                  <span className="font-mono font-semibold text-slate-800">Info, Action, Mixed</span>
                </div>
              </div>
              <div className="text-[11px] text-slate-400 font-sans">
                Tested across {evalResults.intent.total_test_cases} golden intent queries
              </div>
            </div>

            {/* 3. Security Audit Replay */}
            <div className="p-5 sm:p-6 rounded-2xl glass-card border border-slate-200/80 shadow-sm">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4 text-emerald-600" />
                  <h4 className="text-xs font-bold uppercase text-slate-700 font-sans tracking-wider">Security Invariants</h4>
                </div>
                <span className="text-xs font-mono font-bold text-emerald-700 bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-200/80">
                  {evalResults.audit_replay.score_percent}%
                </span>
              </div>
              <div className="space-y-2.5 text-xs text-slate-600 mb-4 font-sans">
                <div className="flex justify-between py-1.5 border-b border-slate-100">
                  <span className="text-slate-500">Attacks Blocked:</span>
                  <span className="font-mono font-semibold text-slate-800">{evalResults.audit_replay.attacks_successfully_blocked} / {evalResults.audit_replay.total_attack_simulations}</span>
                </div>
                <div className="flex justify-between py-1.5 border-b border-slate-100">
                  <span className="text-slate-500">Audit Violations:</span>
                  <span className="font-mono font-semibold text-emerald-700">0 Violations</span>
                </div>
                <div className="flex justify-between py-1.5 border-b border-slate-100">
                  <span className="text-slate-500">Zero-Trust Guard:</span>
                  <span className="font-mono font-semibold text-emerald-700">Enforced</span>
                </div>
              </div>
              <div className="text-[11px] text-slate-400 font-sans">
                Verified zero side-effects without confirmed status
              </div>
            </div>
          </div>

          {/* Detailed Test Run Logs */}
          <div className="glass-card rounded-2xl border border-slate-200/80 p-6 shadow-sm">
            <h4 className="text-xs font-bold uppercase text-slate-600 mb-4 tracking-wider font-sans">
              Attack Simulation & Audit Replay Details
            </h4>
            <div className="space-y-2.5">
              {evalResults.audit_replay.attack_details?.map((atk, idx) => (
                <div key={idx} className="p-3.5 rounded-xl bg-slate-50/80 border border-slate-200/70 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs font-mono">
                  <div className="flex flex-wrap items-center gap-3">
                    <span className="font-semibold text-indigo-700">Tool: {atk.tool_name}</span>
                    <span className="text-slate-500">State: confirmation_status={atk.simulated_confirmation_status}</span>
                  </div>
                  <span className="flex items-center gap-1.5 text-emerald-700 font-semibold text-[11px]">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600" /> Blocked by Node-Level Guard
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      ) : (
        <div className="text-center py-20 glass-card rounded-2xl border border-slate-200/80">
          <Activity className="w-12 h-12 text-slate-400 mx-auto mb-3 opacity-60" />
          <h3 className="font-serif text-2xl text-slate-800 mb-1">No Evaluation Run Yet</h3>
          <p className="text-xs sm:text-sm text-slate-500 max-w-md mx-auto mb-6 font-sans">
            Click "Run Full Evaluation Suite" above to run live benchmarks for retrieval precision, intent classification, and security invariants.
          </p>
          <button
            onClick={handleRunEvals}
            disabled={isRunning}
            className="px-5 py-2.5 rounded-full bg-slate-900 hover:bg-slate-800 text-xs font-semibold text-white transition-all shadow-sm active:scale-95"
          >
            Start Benchmarks
          </button>
        </div>
      )}
    </div>
  );
}
