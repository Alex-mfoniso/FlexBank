import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import {
  CheckCircle2,
  Circle,
  ArrowRight,
  ChevronDown,
  ChevronUp,
  EyeOff,
  RefreshCw,
  Key,
  Copy,
  Check,
  Sparkles,
  AlertCircle,
  BookOpen,
  Folder,
  Terminal,
  Clock
} from "lucide-react";
import { api } from "../lib/api";

interface OnboardingChecklistProps {
  projectId: string;
}

export const OnboardingChecklist: React.FC<OnboardingChecklistProps> = ({ projectId }) => {
  const [loading, setLoading] = useState(true);
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isSkipped, setIsSkipped] = useState(false);

  // Dynamic database states
  const [hasApiKey, setHasApiKey] = useState(false);
  const [hasApiLog, setHasApiLog] = useState(false);
  const [hasCustomer, setHasCustomer] = useState(false);
  const [hasAccount, setHasAccount] = useState(false);
  const [hasTransfer, setHasTransfer] = useState(false);
  const [hasViewedLogs, setHasViewedLogs] = useState(false);

  // Inline Key generator states
  const [isGeneratingKey, setIsGeneratingKey] = useState(false);
  const [generatedKeyPlaintext, setGeneratedKeyPlaintext] = useState<string | null>(null);
  const [copiedInlineKey, setCopiedInlineKey] = useState(false);

  const fetchOnboardingState = async () => {
    setLoading(true);
    try {
      // 1. Fetch API Keys
      const keysResponse = await api.get(`/api/v1/projects/${projectId}/api-keys`);
      const activeKeys = keysResponse.data.apiKeys || [];
      setHasApiKey(activeKeys.some((k: any) => !k.revokedAt));

      // 2. Fetch Overview Metrics (Customers, Accounts, Transfers)
      const metricsResponse = await api.get(`/api/v1/projects/${projectId}/overview`);
      const m = metricsResponse.data.metrics;
      setHasCustomer(m.customersCount > 0);
      setHasAccount(m.accountsCount > 0);
      setHasTransfer(m.transfersCount > 0);

      // 3. Fetch API Logs
      const logsResponse = await api.get("/api/v1/logs");
      const projectLogs = (logsResponse.data.data || []).filter(
        (log: any) => log.projectId === projectId
      );
      setHasApiLog(projectLogs.length > 0);

      // 4. Retrieve logs view status from local storage
      const logsViewed = localStorage.getItem(`ricarut_onboarding_${projectId}_viewed_logs`);
      setHasViewedLogs(logsViewed === "true");

    } catch (err) {
      console.error("Failed to dynamically resolve onboarding progress metrics", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const skipFlag = localStorage.getItem(`ricarut_skip_onboarding_${projectId}`);
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
        name: "Default Onboarding Key",
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

  const handleSkip = () => {
    localStorage.setItem(`ricarut_skip_onboarding_${projectId}`, "true");
    setIsSkipped(true);
  };

  const steps = [
    {
      id: "project",
      label: "Create project",
      desc: "Isolated ledger sandbox workspace established.",
      isComplete: true,
      link: null
    },
    {
      id: "key",
      label: "Create API key",
      desc: "Generate developer API credentials for sandbox clients.",
      isComplete: hasApiKey,
      link: `/projects/${projectId}/api-keys`
    },
    {
      id: "request",
      label: "Make first API request",
      desc: "Execute a test-key handshake handshake call.",
      isComplete: hasApiLog,
      link: `/projects/${projectId}/quickstart`
    },
    {
      id: "customer",
      label: "Create customer",
      desc: "Register your first end-user customer ledger.",
      isComplete: hasCustomer,
      link: `/projects/${projectId}/customers`
    },
    {
      id: "account",
      label: "Create account",
      desc: "Open balanced book-ledger accounts in USD, EUR, or NGN.",
      isComplete: hasAccount,
      link: `/projects/${projectId}/accounts`
    },
    {
      id: "transfer",
      label: "Make internal transfer",
      desc: "Perform double-entry ledger balance transfers.",
      isComplete: hasTransfer,
      link: `/projects/${projectId}/transfers`
    },
    {
      id: "logs",
      label: "View API logs",
      desc: "Inspect live REST execution trails and headers.",
      isComplete: hasViewedLogs,
      link: `/projects/${projectId}/logs`
    }
  ];

  const completedCount = steps.filter((s) => s.isComplete).length;
  const progressPercent = Math.round((completedCount / steps.length) * 100);
  const allStepsCompleted = completedCount === steps.length;

  if (isSkipped) {
    return (
      <div className="flex justify-end mb-6 font-mono text-[9px] uppercase">
        <button
          type="button"
          onClick={() => {
            localStorage.removeItem(`ricarut_skip_onboarding_${projectId}`);
            setIsSkipped(false);
            fetchOnboardingState();
          }}
          className="text-neutral-500 hover:text-white transition-all flex items-center space-x-1"
        >
          <Sparkles className="h-3 w-3 text-indigo-400" />
          <span>Restore Onboarding Checklist Progress</span>
        </button>
      </div>
    );
  }

  return (
    <div className="rounded-lg border border-neutral-900 bg-neutral-950/20 overflow-hidden mb-6 text-left text-neutral-300 font-mono select-none">
      
      {/* 1. Checklist Header */}
      <div className="flex items-center justify-between px-5 py-4 bg-neutral-950/40 border-b border-neutral-900">
        <div className="space-y-1">
          <div className="flex flex-col sm:flex-row sm:items-center gap-2">
            <span className="text-[10px] font-black text-white uppercase tracking-wider">Onboarding Checklist</span>
            <span className="text-[8px] border border-indigo-900/60 bg-indigo-950/30 text-indigo-400 font-black px-2 py-0.5 rounded-full uppercase tracking-widest shrink-0 w-fit">
              {progressPercent}% Complete ({completedCount}/{steps.length})
            </span>
          </div>
          <p className="text-[9px] text-neutral-500 font-semibold leading-normal uppercase">
            Complete sandbox integration parameters to finalize your developer workspace configurations.
          </p>
        </div>

        <div className="flex items-center space-x-2">
          <button
            type="button"
            onClick={fetchOnboardingState}
            className="p-1.5 border border-neutral-900 bg-neutral-950 hover:bg-neutral-900 text-neutral-400 hover:text-white rounded transition-colors"
            title="Reload backend state"
          >
            <RefreshCw className={`h-3 w-3 ${loading ? "animate-spin text-indigo-400" : ""}`} />
          </button>
          <button
            type="button"
            onClick={() => setIsCollapsed(!isCollapsed)}
            className="p-1.5 border border-neutral-900 bg-neutral-950 hover:bg-neutral-900 text-neutral-400 hover:text-white rounded transition-colors"
          >
            {isCollapsed ? <ChevronDown className="h-3 w-3" /> : <ChevronUp className="h-3 w-3" />}
          </button>
        </div>
      </div>

      {/* Progress line indicator */}
      <div className="w-full h-[2px] bg-neutral-950">
        <div 
          className="h-full bg-indigo-600 transition-all duration-500 ease-out shadow-[0_0_8px_rgba(79,70,229,0.4)]" 
          style={{ width: `${progressPercent}%` }}
        />
      </div>

      {/* 2. Interactive contents */}
      {!isCollapsed && (
        <div className="p-5 space-y-6">
          
          {/* A. SECURE INLINE KEY GENERATOR PROMPT BANNER */}
          {!hasApiKey && !generatedKeyPlaintext && (
            <div className="rounded border border-indigo-950 bg-indigo-950/10 p-4 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
              <div className="flex items-start space-x-3 text-left">
                <AlertCircle className="h-5 w-5 text-indigo-400 shrink-0 mt-0.5" />
                <div className="space-y-1">
                  <h4 className="text-xs font-bold text-white uppercase tracking-wider">Secret credentials missing!</h4>
                  <p className="text-[10px] text-neutral-400 leading-normal font-semibold max-w-lg">
                    You haven't generated any active API Keys yet. Open credentials or generate a test key to execute sandbox endpoints.
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={handleGenerateInlineKey}
                disabled={isGeneratingKey}
                className="rounded bg-indigo-600 hover:bg-indigo-500 px-4 py-2 text-xs font-bold text-white shadow-sm transition-all disabled:opacity-50 shrink-0 flex items-center space-x-1.5 focus:outline-none cursor-pointer"
              >
                <Key className="h-3.5 w-3.5 shrink-0" />
                <span>{isGeneratingKey ? "Generating..." : "Generate Test Key"}</span>
              </button>
            </div>
          )}

          {/* B. SECURE KEY ONCE-ONLY DISPLAY PANEL */}
          {generatedKeyPlaintext && (
            <div className="rounded border border-emerald-950/60 bg-emerald-950/5 p-4 space-y-3">
              <div className="flex items-start space-x-3 text-left">
                <CheckCircle2 className="h-5 w-5 text-emerald-400 shrink-0 mt-0.5" />
                <div className="space-y-1">
                  <h4 className="text-xs font-bold text-white uppercase tracking-wider">API Key generated successfully!</h4>
                  <p className="text-[10px] text-neutral-400 leading-normal font-semibold">
                    Copy and save your secret API Key below. For safety compliance, this plaintext token will **not** be displayed again.
                  </p>
                </div>
              </div>

              <div className="flex items-center space-x-2 bg-neutral-950 text-emerald-400 p-2.5 rounded border border-neutral-900 text-xs font-mono select-all">
                <Key className="h-3.5 w-3.5 text-emerald-400 shrink-0" />
                <span className="flex-1 truncate">{generatedKeyPlaintext}</span>
                <button
                  type="button"
                  onClick={handleCopyInlineKey}
                  className="p-1 border border-neutral-800 hover:border-neutral-700 bg-neutral-900 hover:bg-neutral-850 rounded text-neutral-300 transition-all cursor-pointer"
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
                  to={`/projects/${projectId}/quickstart`}
                  className="rounded bg-emerald-600 hover:bg-emerald-500 px-3.5 py-1.5 text-[10px] font-bold text-white shadow-sm transition-all flex items-center space-x-1 uppercase"
                >
                  <span>Open Quickstart Playground</span>
                  <ArrowRight className="h-3 w-3" />
                </Link>
              </div>
            </div>
          )}

          {/* C. YOU'RE READY - CONGRATULATORY FINAL PANEL */}
          {allStepsCompleted && (
            <div className="rounded border border-indigo-950 bg-gradient-to-r from-indigo-950/10 via-neutral-950/30 to-indigo-950/10 p-5 space-y-4 text-left relative overflow-hidden">
              <div className="absolute top-0 left-0 w-full h-[1px] bg-indigo-500/20" />
              <div className="flex items-center space-x-2 text-indigo-400">
                <Sparkles className="h-5 w-5 animate-pulse" />
                <h4 className="text-xs font-black uppercase tracking-wider text-white">YOU'RE READY</h4>
              </div>
              <p className="text-[10px] text-neutral-400 leading-relaxed font-semibold max-w-xl">
                Your Ricarut sandbox is fully initialized and operational. Your API credentials, ledger accounts, and customer balances have successfully cleared the double-entry simulation framework. You're ready to integrate your production backend!
              </p>

              <div className="flex flex-col sm:flex-row gap-2.5 pt-2 text-[10px] font-bold uppercase tracking-wider">
                <Link
                  to={`/projects/${projectId}/overview`}
                  onClick={() => setIsCollapsed(true)}
                  className="flex-1 rounded border border-neutral-800 bg-neutral-950 hover:bg-neutral-900 hover:border-neutral-700 py-2.5 px-3 text-center text-neutral-300 hover:text-white transition-all"
                >
                  [ Open Project Console ]
                </Link>
                <Link
                  to={`/projects/${projectId}/logs`}
                  className="flex-1 rounded border border-neutral-800 bg-neutral-950 hover:bg-neutral-900 hover:border-neutral-700 py-2.5 px-3 text-center text-neutral-300 hover:text-white transition-all"
                >
                  [ View API Logs ]
                </Link>
                <Link
                  to="/docs"
                  className="flex-1 rounded bg-indigo-600 hover:bg-indigo-500 py-2.5 px-3 text-center text-white transition-all"
                >
                  [ Read Documentation ]
                </Link>
              </div>
            </div>
          )}

          {/* D. Primary checklist grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {steps.map((step) => (
              <div 
                key={step.id} 
                className={`flex items-start space-x-3 p-3 rounded border transition-all ${
                  step.isComplete 
                    ? "bg-emerald-950/5 border-emerald-950/40 text-emerald-500" 
                    : "bg-neutral-950 border-neutral-900 text-neutral-500"
                }`}
              >
                {step.isComplete ? (
                  <CheckCircle2 className="h-4.5 w-4.5 text-emerald-500 shrink-0 mt-0.5" />
                ) : (
                  <Circle className="h-4.5 w-4.5 text-neutral-800 shrink-0 mt-0.5" />
                )}
                
                <div className="flex-1 space-y-1 min-w-0">
                  <h5 className={`text-[11px] font-bold leading-tight uppercase tracking-wide ${step.isComplete ? "text-neutral-300" : "text-neutral-500"}`}>
                    {step.label}
                  </h5>
                  <p className="text-[9px] text-neutral-500 font-semibold leading-snug">
                    {step.desc}
                  </p>
                  
                  {!step.isComplete && step.link && (
                    <Link
                      to={step.link}
                      className="inline-flex items-center space-x-1 text-[8.5px] font-black text-indigo-400 hover:text-indigo-300 pt-1.5 uppercase tracking-wider"
                    >
                      <span>Complete Task</span>
                      <ArrowRight className="h-2.5 w-2.5" />
                    </Link>
                  )}
                </div>
              </div>
            ))}
          </div>

          {/* E. Action Toolbar (Skip) */}
          <div className="flex justify-end items-center border-t border-neutral-900 pt-4">
            <button
              type="button"
              onClick={handleSkip}
              className="flex items-center space-x-1 text-[9px] font-bold text-neutral-600 hover:text-neutral-400 transition-colors uppercase tracking-wider cursor-pointer"
            >
              <EyeOff className="h-3.5 w-3.5 shrink-0" />
              <span>Skip Checklist & Hide</span>
            </button>
          </div>
        </div>
      )}

    </div>
  );
};
