import React, { useState, useRef, useEffect } from 'react';
import { 
  Send, Sparkles, RefreshCw, Key, ShieldCheck, HelpCircle, 
  Laptop, ArrowRight, CheckCircle2, CircleDashed, Terminal, Lock, Flame
} from 'lucide-react';
import MessageItem from './MessageItem';
import ConfirmationCard from './ConfirmationCard';
import VerificationModal from './VerificationModal';

const DEMO_CATEGORIES = [
  {
    title: "🔒 Active Directory & MFA Actions",
    prompts: [
      {
        label: "Unlock Account (Full HITL Flow)",
        prompt: "Please unlock my Active Directory account for user alex.chen",
        icon: Key
      },
      {
        label: "Reset Corporate Password",
        prompt: "Reset my corporate password and send a temporary login token",
        icon: Lock
      }
    ]
  },
  {
    title: "🎫 JIRA Ticket Operations",
    prompts: [
      {
        label: "Create Hardware Request Ticket",
        prompt: "Create a ticket: Request secondary 4K Dell UltraSharp monitor for engineering desk",
        icon: Laptop
      },
      {
        label: "Check Ticket Status (Read-only)",
        prompt: "What is the status of ticket ITSD-2?",
        icon: CheckCircle2
      },
      {
        label: "Escalate Ticket Priority",
        prompt: "Escalate ticket ITSD-2 to Critical priority",
        icon: Flame
      }
    ]
  },
  {
    title: "📖 Knowledge Base / RAG Guidance",
    prompts: [
      {
        label: "GlobalProtect VPN Setup",
        prompt: "How do I configure and connect to corporate GlobalProtect VPN on macOS?",
        icon: HelpCircle
      },
      {
        label: "Office Wi-Fi 802.1X Policy",
        prompt: "How do I connect to Corp-Secure Wi-Fi using enterprise certificates?",
        icon: HelpCircle
      },
      {
        label: "Request Privileged Access",
        prompt: "Request access to AWS Production RDS cluster for production debug",
        icon: ShieldCheck
      }
    ]
  }
];

export default function ChatWindow({
  messages,
  onSendMessage,
  onVerifyOtp,
  onConfirmAction,
  isLoading,
  interruptState,
  onSelectCitation,
  onResetChat
}) {
  const [input, setInput] = useState('');
  const messagesEndRef = useRef(null);

  // Auto scroll to latest message
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isLoading, interruptState]);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!input.trim() || isLoading || interruptState) return;

    onSendMessage(input.trim());
    setInput('');
  };

  const handlePromptClick = (promptText) => {
    if (isLoading || interruptState) return;
    onSendMessage(promptText);
  };

  // Determine active workflow step
  const getWorkflowStep = () => {
    if (interruptState?.status === 'verification_required') return 2;
    if (interruptState?.status === 'confirmation_required') return 3;
    if (isLoading) return 1;
    if (messages.length > 0) return 4;
    return 0;
  };

  const currentStep = getWorkflowStep();

  return (
    <div className="flex-1 min-h-0 w-full h-full flex flex-col bg-transparent relative overflow-hidden">
      {/* Workflow Progress Stepper (Fixed Header) */}
      <div className="flex-shrink-0 px-6 py-2.5 bg-white/60 border-b border-slate-200/70 flex items-center justify-between backdrop-blur-md z-10">
        <div className="flex items-center gap-2 sm:gap-4 overflow-x-auto text-[11px] font-mono py-0.5">
          <div className={`flex items-center gap-1.5 px-3 py-1 rounded-full whitespace-nowrap transition-all ${
            currentStep >= 1 ? 'bg-indigo-50 text-indigo-700 font-bold border border-indigo-200 shadow-sm' : 'text-slate-400'
          }`}>
            <span className="w-4 h-4 rounded-full bg-indigo-100 flex items-center justify-center text-[10px]">1</span>
            <span>Intent Routing</span>
          </div>

          <span className="text-slate-300">→</span>

          <div className={`flex items-center gap-1.5 px-3 py-1 rounded-full whitespace-nowrap transition-all ${
            currentStep === 2 ? 'bg-amber-50 text-amber-700 font-bold border border-amber-200 animate-pulse shadow-sm' :
            currentStep > 2 ? 'bg-indigo-50 text-indigo-700 font-bold border border-indigo-200 shadow-sm' : 'text-slate-400'
          }`}>
            <span className="w-4 h-4 rounded-full bg-slate-200 flex items-center justify-center text-[10px]">2</span>
            <span>MFA Identity Gate</span>
          </div>

          <span className="text-slate-300">→</span>

          <div className={`flex items-center gap-1.5 px-3 py-1 rounded-full whitespace-nowrap transition-all ${
            currentStep === 3 ? 'bg-amber-50 text-amber-700 font-bold border border-amber-200 animate-pulse shadow-sm' :
            currentStep > 3 ? 'bg-indigo-50 text-indigo-700 font-bold border border-indigo-200 shadow-sm' : 'text-slate-400'
          }`}>
            <span className="w-4 h-4 rounded-full bg-slate-200 flex items-center justify-center text-[10px]">3</span>
            <span>Action Confirmation</span>
          </div>

          <span className="text-slate-300">→</span>

          <div className={`flex items-center gap-1.5 px-3 py-1 rounded-full whitespace-nowrap transition-all ${
            currentStep >= 4 ? 'bg-emerald-50 text-emerald-700 font-bold border border-emerald-200 shadow-sm' : 'text-slate-400'
          }`}>
            <span className="w-4 h-4 rounded-full bg-slate-200 flex items-center justify-center text-[10px]">4</span>
            <span>Executed & Audited</span>
          </div>
        </div>

        <button
          onClick={onResetChat}
          className="flex-shrink-0 flex items-center gap-1.5 text-xs text-slate-600 hover:text-slate-900 bg-white/80 hover:bg-white px-3 py-1.5 rounded-full border border-slate-200/80 shadow-sm transition-all font-semibold ml-3"
        >
          <RefreshCw className="w-3 h-3 text-slate-500" />
          New Thread
        </button>
      </div>

      {/* Main Scrollable Messages & Welcome Feed */}
      <div className="flex-1 min-h-0 overflow-y-auto px-4 sm:px-6 py-4 space-y-3">
        {messages.length === 0 ? (
          <div className="max-w-4xl mx-auto py-6 pb-12">
            <div className="text-center mb-8">
              <div className="inline-flex p-3 rounded-2xl bg-[#1e293b] text-white shadow-md shadow-slate-900/10 mb-3.5">
                <Sparkles className="w-7 h-7" />
              </div>
              <h2 className="font-serif text-3xl font-normal text-slate-900 tracking-tight">
                ResolveIQ Service Desk Orchestrator
              </h2>
              <p className="text-xs text-slate-500 max-w-lg mx-auto mt-1.5 font-normal">
                Choose a scenario below or type a custom request to experience autonomous LangGraph orchestration with human-in-the-loop gates.
              </p>
            </div>

            {/* Categorized Scenario Triggers */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {DEMO_CATEGORIES.map((cat, cIdx) => (
                <div key={cIdx} className="glass-card rounded-2xl p-4 shadow-sm flex flex-col justify-between">
                  <div>
                    <h3 className="text-xs font-bold uppercase tracking-wider text-slate-800 mb-3 flex items-center gap-1.5">
                      {cat.title}
                    </h3>
                    <div className="space-y-2">
                      {cat.prompts.map((p, pIdx) => {
                        const Icon = p.icon;
                        return (
                          <button
                            key={pIdx}
                            onClick={() => handlePromptClick(p.prompt)}
                            className="w-full text-left p-3 rounded-2xl bg-white/90 hover:bg-indigo-50/60 border border-slate-200/80 hover:border-indigo-300 transition-all group shadow-sm hover:-translate-y-0.5"
                          >
                            <div className="flex items-center gap-2 text-xs font-semibold text-slate-800 group-hover:text-indigo-600 mb-1">
                              <Icon className="w-3.5 h-3.5 text-indigo-500 flex-shrink-0" />
                              <span className="truncate">{p.label}</span>
                            </div>
                            <p className="text-[11px] text-slate-500 line-clamp-2 leading-relaxed">
                              "{p.prompt}"
                            </p>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <>
            {messages.map((m, idx) => (
              <MessageItem
                key={idx}
                message={m}
                onSelectCitation={onSelectCitation}
              />
            ))}

            {/* Human-in-the-loop Interrupt Slot */}
            {interruptState?.status === 'verification_required' && (
              <VerificationModal
                payload={interruptState.interrupt_payload}
                onVerify={onVerifyOtp}
                isSubmitting={isLoading}
              />
            )}

            {interruptState?.status === 'confirmation_required' && (
              <ConfirmationCard
                payload={interruptState.interrupt_payload}
                onConfirm={onConfirmAction}
                isSubmitting={isLoading}
              />
            )}

            {/* Loading Indicator */}
            {isLoading && !interruptState && (
              <div className="flex items-center gap-3 py-3 px-4 bg-white/90 rounded-2xl border border-slate-200 max-w-sm text-xs text-slate-700 shadow-sm my-3 backdrop-blur-md">
                <RefreshCw className="w-4 h-4 text-indigo-600 animate-spin" />
                <span className="font-medium">LangGraph orchestrating workflow step...</span>
              </div>
            )}
          </>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input Box Bar (Fixed Bottom) */}
      <div className="flex-shrink-0 p-4 bg-white/60 border-t border-slate-200/70 backdrop-blur-md z-10">
        <form onSubmit={handleSubmit} className="flex items-center gap-2.5 max-w-4xl mx-auto">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            disabled={isLoading || Boolean(interruptState)}
            placeholder={
              interruptState 
                ? "Waiting for your verification / confirmation in the card above..."
                : "Type an IT request (e.g. 'Unlock account', 'Create ticket for charger', 'VPN setup')..."
            }
            className="flex-1 frosted-input px-4 py-3 text-xs sm:text-sm text-slate-900 placeholder:text-slate-400 outline-none transition-all disabled:opacity-50"
          />

          <button
            type="submit"
            disabled={!input.trim() || isLoading || Boolean(interruptState)}
            className="p-3 rounded-full bg-[#1e293b] hover:bg-slate-800 text-white shadow-md shadow-slate-900/10 transition-all hover:-translate-y-0.5 disabled:opacity-40"
          >
            <Send className="w-4 h-4" />
          </button>
        </form>
      </div>
    </div>
  );
}
