import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { CheckCircle2, Circle, ArrowRight, ChevronDown, ChevronUp, EyeOff, RefreshCw, Key, Copy, Check, Sparkles, AlertCircle } from "lucide-react";
import { api } from "../lib/api";

interface OnboardingChecklistProps {
  projectId: string;
}

export const OnboardingChecklist: React.FC<OnboardingChecklistProps> = ({ projectId }) => {
  const [loading, setLoading] = useState(true);
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isSkipped, setIsSkipped] = useState(false);

  // Checked state metrics
  const [hasApiKey, setHasApiKey] = useState(false);
  const [hasApiLog, setHasApiLog] = useState(false);
  const [hasCustomer, setHasCustomer] = useState(false);
  const [hasAccount, setHasAccount] = useState(false);
  const [hasTransfer, setHasTransfer] = useState(false);

  // Inline Key Generator state
  const [isGeneratingKey, setIsGeneratingKey] = useState(false);
  const [generatedKeyPlaintext, setGeneratedKeyPlaintext] = useState<string | null>(null);
  const [copiedInlineKey, setCopiedInlineKey] = useState(false);

  const fetchOnboardingState = async () => {
    setLoading(true);
    try {
      // 1. Fetch API Keys
      const keysResponse = await api.get(`/api/v1/projects/${projectId}/api-keys`);
      const activeKeys = keysResponse.data.apiKeys || [];
      const hasKeys = activeKeys.some((k: any) => !k.revokedAt);
      setHasApiKey(hasKeys);

      // 2. Fetch API Logs
      const logsResponse = await api.get(`/api/v1/projects/${projectId}/logs`);
      const logs = logsResponse.data.logs || [];
      setHasApiLog(logs.length > 0);

      // 3. Fetch Customers
      const customersResponse = await api.get(`/api/v1/customers`);
      const customers = customersResponse.data.customers || [];
      setHasCustomer(customers.length > 0);

      // 4. Fetch Accounts
      const accountsResponse = await api.get(`/api/v1/accounts`);
      const accounts = accountsResponse.data.accounts || [];
      setHasAccount(accounts.length > 0);

      // 5. Fetch Transfers
      const transfersResponse = await api.get(`/api/v1/transfers`);
      const transfers = transfersResponse.data.transfers || [];
      setHasTransfer(transfers.length > 0);
    } catch (err) {
      console.error("Failed to dynamically resolve onboarding progress checklist metrics", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const skipFlag = localStorage.getItem(`flexbank_skip_onboarding_${projectId}`);
    if (skipFlag === "true") {
      setIsSkipped(true);
    }

    if (projectId) {
      fetchOnboardingState();
    }
  }, [projectId]);

  const handleGenerateInlineKey = async () => {
    setIsGeneratingKey(true);
    setGeneratedKeyPlaintext(null);
    try {
      const response = await api.post(`/api/v1/projects/${projectId}/api-keys`, {
        name: "Default Sandbox Key",
      });
      setGeneratedKeyPlaintext(response.data.key);
      setHasApiKey(true);
      await fetchOnboardingState();
    } catch (err) {
      console.error("Failed to generate inline onboarding key", err);
      alert("Failed to generate API Key. Please visit the API Keys credentials tab to create one manually.");
    } finally {
      setIsGeneratingKey(false);
    }
  };

  const handleCopyInlineKey = () => {
    if (!generatedKeyPlaintext) return;
    navigator.clipboard.writeText(generatedKeyPlaintext);
    setCopiedInlineKey(true);
    setTimeout(() => setCopiedInlineKey(false), 2000);
  };

  if (isSkipped) {
    return (
      <div className="flex justify-end mb-6">
        <button
          type="button"
          onClick={() => {
            localStorage.removeItem(`flexbank_skip_onboarding_${projectId}`);
            setIsSkipped(false);
            fetchOnboardingState();
          }}
          className="text-[10px] font-bold text-indigo-600 hover:text-indigo-500 hover:underline flex items-center space-x-1"
        >
          <SparklesIcon className="h-3.5 w-3.5 text-indigo-500 shrink-0" />
          <span>Restore Onboarding Checklist Progress</span>
        </button>
      </div>
    );
  }

  const steps = [
    { id: 1, label: "Register developer profile", desc: "Create your secure owner account credentials.", isComplete: true, link: null },
    { id: 2, label: "Initialize platform workspace", desc: "Create an isolated ledger testing context.", isComplete: true, link: null },
    { id: 3, label: "Generate secret API Keys", desc: "Obtain credentials to authenticate sandbox clients.", isComplete: hasApiKey, link: `/projects/${projectId}/api-keys` },
    { id: 4, label: "Execute first API Request", desc: "Hit an endpoint (or execute via Try It playground).", isComplete: hasApiLog, link: `/projects/${projectId}/docs` },
    { id: 5, label: "Register your first Customer", desc: "Create individual or corporate financial ledgers.", isComplete: hasCustomer, link: `/projects/${projectId}/customers` },
    { id: 6, label: "Provision a multi-currency Account", desc: "Open book-ledger accounts in USD, NGN, or EUR.", isComplete: hasAccount, link: `/projects/${projectId}/accounts` },
    { id: 7, label: "Dispatch double-entry Transfer", desc: "Process money settlements with instant balanced ledgers.", isComplete: hasTransfer, link: `/projects/${projectId}/transfers` },
  ];

  const completedCount = steps.filter((s) => s.isComplete).length;
  const progressPercent = Math.round((completedCount / steps.length) * 100);

  const handleSkip = () => {
    localStorage.setItem(`flexbank_skip_onboarding_${projectId}`, "true");
    setIsSkipped(true);
  };

  return (
    <div className="rounded-xl border border-slate-200 bg-white shadow-xs overflow-hidden mb-6 text-left">
      
      {/* 1. Checklist Header */}
      <div className="flex items-center justify-between px-5 py-4 bg-slate-50 border-b border-slate-200">
        <div className="space-y-1">
          <div className="flex items-center space-x-2">
            <span className="text-xs font-black text-slate-800 uppercase tracking-tight">Onboarding Integration Progress</span>
            <span className="text-[10px] bg-indigo-50 border border-indigo-100 text-indigo-700 font-bold px-2 py-0.5 rounded-full">
              {progressPercent}% Complete ({completedCount}/{steps.length})
            </span>
          </div>
          <p className="text-[10px] text-slate-500 font-semibold">
            Complete the interactive checklist parameters to verify your application's connection lifecycle.
          </p>
        </div>

        <div className="flex items-center space-x-2">
          <button
            type="button"
            onClick={fetchOnboardingState}
            className="p-1 text-slate-400 hover:text-slate-600 rounded-md hover:bg-slate-100 transition-colors"
            title="Refresh database metrics"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin text-indigo-600" : ""}`} />
          </button>
          <button
            type="button"
            onClick={() => setIsCollapsed(!isCollapsed)}
            className="p-1 text-slate-400 hover:text-slate-600 rounded-md hover:bg-slate-100 transition-colors"
          >
            {isCollapsed ? <ChevronDown className="h-4 w-4" /> : <ChevronUp className="h-4 w-4" />}
          </button>
        </div>
      </div>

      {/* Progress Line Bar */}
      <div className="w-full h-1 bg-slate-100">
        <div 
          className="h-full bg-indigo-600 transition-all duration-500 ease-out" 
          style={{ width: `${progressPercent}%` }}
        />
      </div>

      {/* 2. Checklist Items Content */}
      {!isCollapsed && (
        <div className="p-5 space-y-5">
          
          {/* A. GUIDED INLINE KEY GENERATOR PROMPT BANNER */}
          {!hasApiKey && !generatedKeyPlaintext && (
            <div className="rounded-xl border border-indigo-100 bg-indigo-50/50 p-4 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
              <div className="flex items-start space-x-3 text-left">
                <AlertCircle className="h-5 w-5 text-indigo-600 shrink-0 mt-0.5" />
                <div className="space-y-1">
                  <h4 className="text-xs font-bold text-slate-900">Secret credentials missing!</h4>
                  <p className="text-[10px] text-slate-500 leading-normal font-semibold max-w-lg">
                    You haven't generated any active API Keys yet! You need a secure secret key to make your first API request or test endpoints inside the playground guide.
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={handleGenerateInlineKey}
                disabled={isGeneratingKey}
                className="rounded-lg bg-indigo-600 hover:bg-indigo-500 px-4 py-2 text-xs font-bold text-white shadow-md shadow-indigo-600/10 transition-all disabled:opacity-50 shrink-0 flex items-center space-x-1.5 focus:outline-none"
              >
                <Key className="h-3.5 w-3.5" />
                <span>{isGeneratingKey ? "Generating..." : "Generate Test Key"}</span>
              </button>
            </div>
          )}

          {/* B. SECURE KEY ONCE-ONLY VIEWER BANNER */}
          {generatedKeyPlaintext && (
            <div className="rounded-xl border border-emerald-200 bg-emerald-50/30 p-4 space-y-3">
              <div className="flex items-start space-x-3 text-left">
                <CheckCircle2 className="h-5 w-5 text-emerald-600 shrink-0 mt-0.5" />
                <div className="space-y-1">
                  <h4 className="text-xs font-bold text-slate-900">API Key generated successfully!</h4>
                  <p className="text-[10px] text-slate-500 leading-normal font-semibold">
                    Copy and save your secret API Key below. For safety compliance, this plaintext token will **not** be displayed again.
                  </p>
                </div>
              </div>

              <div className="flex items-center space-x-2 bg-slate-900 text-slate-100 p-3 rounded-lg border border-slate-800 text-xs font-mono select-all">
                <Key className="h-4 w-4 text-emerald-400 shrink-0" />
                <span className="flex-1 truncate">{generatedKeyPlaintext}</span>
                <button
                  type="button"
                  onClick={handleCopyInlineKey}
                  className="p-1 bg-slate-800 hover:bg-slate-700 rounded text-slate-300 transition-colors"
                  title="Copy secret token"
                >
                  {copiedInlineKey ? (
                    <Check className="h-3.5 w-3.5 text-emerald-400" />
                  ) : (
                    <Copy className="h-3.5 w-3.5" />
                  )}
                </button>
              </div>

              <div className="flex justify-end pt-1">
                <Link
                  to={`/projects/${projectId}/docs`}
                  className="rounded-lg bg-emerald-600 hover:bg-emerald-500 px-3.5 py-1.5 text-[10px] font-bold text-white shadow-sm transition-all flex items-center space-x-1"
                >
                  <span>Open Interactive Docs Playground</span>
                  <ArrowRight className="h-3 w-3" />
                </Link>
              </div>
            </div>
          )}

          {/* C. Primary checklist grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {steps.map((step) => (
              <div 
                key={step.id} 
                className={`flex items-start space-x-3 p-3 rounded-lg border transition-all ${
                  step.isComplete 
                    ? "bg-emerald-50/20 border-emerald-100 text-slate-800" 
                    : "bg-white border-slate-200 text-slate-500"
                }`}
              >
                {step.isComplete ? (
                  <CheckCircle2 className="h-5 w-5 text-emerald-500 shrink-0 mt-0.5" />
                ) : (
                  <Circle className="h-5 w-5 text-slate-300 shrink-0 mt-0.5" />
                )}
                
                <div className="flex-1 space-y-1 min-w-0">
                  <h5 className={`text-xs font-bold leading-tight ${step.isComplete ? "text-slate-900" : "text-slate-700"}`}>
                    {step.label}
                  </h5>
                  <p className="text-[10px] text-slate-400 leading-snug">
                    {step.desc}
                  </p>
                  
                  {!step.isComplete && step.link && (
                    <Link
                      to={step.link}
                      className="inline-flex items-center space-x-1 text-[10px] font-black text-indigo-600 hover:text-indigo-500 hover:underline pt-1.5"
                    >
                      <span>Complete Task</span>
                      <ArrowRight className="h-2.5 w-2.5" />
                    </Link>
                  )}
                </div>
              </div>
            ))}
          </div>

          <div className="flex justify-end items-center space-x-4 border-t border-slate-100 pt-4">
            <button
              type="button"
              onClick={handleSkip}
              className="flex items-center space-x-1 text-[10px] font-bold text-slate-400 hover:text-slate-600 transition-colors"
            >
              <EyeOff className="h-3.5 w-3.5" />
              <span>Skip Checklist & Hide Permanently</span>
            </button>
          </div>
        </div>
      )}

    </div>
  );
};

// SVG Sparkles placeholder icon
const SparklesIcon: React.FC<{ className?: string }> = ({ className }) => (
  <svg 
    xmlns="http://www.w3.org/2000/svg" 
    fill="none" 
    viewBox="0 0 24 24" 
    strokeWidth={2} 
    stroke="currentColor" 
    className={className}
  >
    <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 21l-.813-5.096L3 15l5.096-.813L9 9l.813 5.096L15 15l-5.187.904zM18 10.5l-.375 2.625L15 13.5l2.625.375L18 16.5l.375-2.625L21 13.5l-2.625-.375L18 10.5z" />
  </svg>
);
