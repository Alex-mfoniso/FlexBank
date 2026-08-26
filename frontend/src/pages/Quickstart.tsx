import React, { useState, useEffect } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import axios from "axios";
import { api, FLEXBANK_API_URL } from "../lib/api";
import {
  Sparkles,
  ShieldAlert,
  CheckCircle2,
  Circle,
  Copy,
  Check,
  Terminal,
  Play,
  ArrowRight,
  ChevronRight,
  ExternalLink,
  Loader2,
  RefreshCw,
  Clock,
  HelpCircle,
  Users,
  Wallet
} from "lucide-react";

export const Quickstart: React.FC = () => {
  const { projectId } = useParams<{ projectId: string }>();
  const navigate = useNavigate();

  // Page level states
  const [activeProject, setActiveProject] = useState<any>(null);
  const [loadingProject, setLoadingProject] = useState(true);
  const [projectError, setProjectError] = useState<string | null>(null);

  // Stepper metrics states (synced with actual backend metrics)
  const [hasApiKey, setHasApiKey] = useState(false);
  const [hasApiLog, setHasApiLog] = useState(false);
  const [hasCustomer, setHasCustomer] = useState(false);
  const [hasAccount, setHasAccount] = useState(false);
  const [hasTransfer, setHasTransfer] = useState(false);
  const [hasViewedLogs, setHasViewedLogs] = useState(false);

  // Playground Console states
  const [inputKey, setInputKey] = useState("");
  const [isDispatching, setIsDispatching] = useState(false);
  const [playgroundResult, setPlaygroundResult] = useState<{
    success: boolean;
    status: number;
    statusText: string;
    requestId: string | null;
    duration: number;
    body: any;
    errorMsg?: string;
  } | null>(null);

  // Snippets language selection state
  const [activeLang, setActiveLang] = useState<"curl" | "node" | "js" | "python">("curl");
  const [copiedLang, setCopiedLang] = useState(false);

  // Copy API URL helper
  const [copiedUrl, setCopiedBaseUrl] = useState(false);

  // Load project details and checklist progress from backend
  const loadChecklistStates = async () => {
    if (!projectId) return;
    try {
      // 1. Fetch project profile info
      const projResponse = await api.get(`/api/v1/projects/${projectId}`);
      setActiveProject(projResponse.data.project);

      // 2. Fetch API Keys
      const keysResponse = await api.get(`/api/v1/projects/${projectId}/api-keys`);
      const activeKeys = keysResponse.data.apiKeys || [];
      setHasApiKey(activeKeys.some((k: any) => !k.revokedAt));

      // 3. Fetch Overview Metrics (Customers, Accounts, Transfers)
      const metricsResponse = await api.get(`/api/v1/projects/${projectId}/overview`);
      const m = metricsResponse.data.metrics;
      setHasCustomer(m.customersCount > 0);
      setHasAccount(m.accountsCount > 0);
      setHasTransfer(m.transfersCount > 0);

      // 4. Fetch Logs to see if they made a request
      const logsResponse = await api.get("/api/v1/logs");
      const projectLogs = (logsResponse.data.data || []).filter(
        (l: any) => l.projectId === projectId
      );
      setHasApiLog(projectLogs.length > 0);

      // 5. Check if they viewed logs (from localStorage)
      const skipLogs = localStorage.getItem(`flexbank_onboarding_${projectId}_viewed_logs`);
      setHasViewedLogs(skipLogs === "true");

    } catch (err: any) {
      console.error("Failed to load quickstart data metrics", err);
      setProjectError("Could not retrieve sandbox workspace details.");
    } finally {
      setLoadingProject(false);
    }
  };

  useEffect(() => {
    if (projectId) {
      loadChecklistStates();
    }
  }, [projectId]);

  // Execute request safely directly from the user's browser using the inputted API key
  const handleSendTestRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputKey.trim()) return;

    setIsDispatching(true);
    setPlaygroundResult(null);

    const startTime = performance.now();
    try {
      // Send standard test-key validation request directly to backend
      const response = await axios.get(`${FLEXBANK_API_URL}/api/v1/auth/test-key`, {
        headers: {
          Authorization: `Bearer ${inputKey.trim()}`,
        },
      });

      const endTime = performance.now();
      const duration = Math.round(endTime - startTime);

      // Extract Request ID from Headers (case insensitive)
      const requestId = response.headers["x-request-id"] || response.headers["X-Request-ID"] || null;

      setPlaygroundResult({
        success: true,
        status: response.status,
        statusText: response.statusText || "OK",
        requestId,
        duration,
        body: response.data,
      });

      // Reload checklist parameters immediately to reflect success states
      await loadChecklistStates();
    } catch (err: any) {
      const endTime = performance.now();
      const duration = Math.round(endTime - startTime);
      
      const status = err.response?.status || 0;
      const statusText = err.response?.statusText || "Error";
      const requestId = err.response?.headers?.["x-request-id"] || err.response?.headers?.["X-Request-ID"] || null;
      const errorMsg = err.response?.data?.message || err.message || "Network Error: Verify connection properties.";

      setPlaygroundResult({
        success: false,
        status,
        statusText,
        requestId,
        duration,
        body: err.response?.data || null,
        errorMsg,
      });
    } finally {
      setIsDispatching(false);
    }
  };

  const handleCopyBaseUrl = () => {
    navigator.clipboard.writeText(FLEXBANK_API_URL);
    setCopiedBaseUrl(true);
    setTimeout(() => setCopiedBaseUrl(false), 2000);
  };

  const snippets = {
    curl: `curl "${FLEXBANK_API_URL}/api/v1/auth/test-key" \\
  -H "Authorization: Bearer your_test_api_key"`,
    node: `const axios = require('axios');

axios.get('${FLEXBANK_API_URL}/api/v1/auth/test-key', {
  headers: {
    'Authorization': 'Bearer your_test_api_key'
  }
})
.then(response => {
  console.log('Status:', response.status);
  console.log('Body:', response.data);
})
.catch(error => {
  console.error('Request failed:', error.response ? error.response.data : error.message);
});`,
    js: `fetch('${FLEXBANK_API_URL}/api/v1/auth/test-key', {
  method: 'GET',
  headers: {
    'Authorization': 'Bearer your_test_api_key'
  }
})
.then(res => res.json())
.then(data => console.log('API Handshake context:', data))
.catch(err => console.error('Connection error:', err));`,
    python: `import requests

url = "${FLEXBANK_API_URL}/api/v1/auth/test-key"
headers = {
    "Authorization": "Bearer your_test_api_key"
}

try:
    response = requests.get(url, headers=headers)
    print(f"Status: {response.status_code}")
    print(response.json())
except Exception as e:
    print(f"An error occurred: {e}")`
  };

  const handleCopySnippet = () => {
    navigator.clipboard.writeText(snippets[activeLang]);
    setCopiedLang(true);
    setTimeout(() => setCopiedLang(false), 2000);
  };

  // Progression list configuration for Left-hand Stepper on Desktop or Top Stepper on Mobile
  const steps = [
    { id: "project", label: "Create project", desc: "Initialize workspace", isComplete: true },
    { id: "key", label: "Create API Key", desc: "Generate credentials", isComplete: hasApiKey },
    { id: "request", label: "First API Request", desc: "Verify authentication handshake", isComplete: hasApiLog, isActive: true },
    { id: "customer", label: "Create customer", desc: "Open customer ledger", isComplete: hasCustomer },
    { id: "account", label: "Create account", desc: "Open asset bank account", isComplete: hasAccount },
    { id: "transfer", label: "Make transfer", desc: "Sandbox balance movement", isComplete: hasTransfer },
    { id: "logs", label: "View API logs", desc: "Trace HTTP payloads", isComplete: hasViewedLogs }
  ];

  if (loadingProject) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center bg-[#030303] text-white">
        <div className="flex flex-col items-center space-y-4">
          <Loader2 className="h-10 w-10 animate-spin text-indigo-600" />
          <p className="text-xs font-bold text-neutral-500 font-mono uppercase tracking-widest">Hydrating sandbox environment...</p>
        </div>
      </div>
    );
  }

  if (projectError || !activeProject) {
    return (
      <div className="rounded border border-neutral-900 bg-neutral-950/40 p-8 text-center max-w-md mx-auto font-mono text-left my-12">
        <ShieldAlert className="mx-auto h-12 w-12 text-rose-500" />
        <h3 className="mt-4 text-xs font-black uppercase tracking-wider text-white">Quickstart unavailable</h3>
        <p className="mt-2 text-[11px] text-neutral-500 leading-relaxed font-semibold">
          {projectError || "The selected project is inaccessible."}
        </p>
        <button
          onClick={() => navigate("/projects")}
          className="mt-6 w-full rounded bg-indigo-600 px-4 py-2 text-xs font-bold uppercase tracking-wider text-white hover:bg-indigo-500 cursor-pointer"
        >
          Back to projects
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-8 text-left font-mono select-none text-neutral-300 relative">
      
      {/* 1. Header Toolbar */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center pb-5 border-b border-neutral-900 gap-4">
        <div>
          <div className="flex items-center space-x-2">
            <h1 className="text-xl font-black text-white uppercase tracking-tight">Make your first API request</h1>
            <span className="text-[9px] font-black px-1.5 py-0.5 rounded border border-amber-900/40 bg-amber-950/20 text-amber-500 uppercase tracking-widest">
              TEST MODE
            </span>
          </div>
          <p className="text-[10px] text-neutral-500 font-semibold mt-1">
            Send your first request to the FlexBank sandbox.
          </p>
        </div>
        <Link
          to={`/projects/${projectId}/overview`}
          className="flex items-center space-x-1 text-xs text-neutral-400 hover:text-white border border-neutral-800 rounded bg-neutral-950 px-3 py-1.5 hover:border-neutral-700 transition-all uppercase"
        >
          <span>[ Open dashboard ]</span>
        </Link>
      </div>

      {/* 2. Responsive Multi-Column Setup */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        
        {/* DESKTOP PROGRESS SIDEBAR (Section 27: progress sidebar/card + main content) */}
        <div className="lg:col-span-4 space-y-6">
          <div className="rounded-lg border border-neutral-900 bg-neutral-950/20 p-5 space-y-4">
            <h3 className="text-[9px] font-black text-neutral-500 uppercase tracking-widest border-b border-neutral-900 pb-2">
              Onboarding Stepper
            </h3>
            
            <div className="space-y-4">
              {steps.map((s, idx) => (
                <div key={s.id} className="flex items-start space-x-3">
                  <div className={`flex h-5 w-5 rounded-full text-[10px] font-bold items-center justify-center shrink-0 border transition-all ${
                    s.isComplete
                      ? "bg-emerald-950/30 border-emerald-500/40 text-emerald-500"
                      : s.isActive
                      ? "bg-indigo-600 border-indigo-500 text-white animate-pulse"
                      : "bg-neutral-950 border-neutral-900 text-neutral-600"
                  }`}>
                    {s.isComplete ? "✓" : `0${idx + 1}`}
                  </div>
                  <div>
                    <span className={`text-[11px] font-bold block leading-none ${
                      s.isComplete ? "text-neutral-300" : s.isActive ? "text-white font-black" : "text-neutral-600"
                    }`}>
                      {s.label}
                    </span>
                    <span className="text-[8.5px] text-neutral-500 font-medium mt-1 block uppercase">
                      {s.desc}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-lg border border-amber-950/30 bg-amber-950/5 p-4 space-y-2 uppercase text-[10px] leading-relaxed">
            <div className="flex items-center space-x-2 text-amber-500 font-bold">
              <Sparkles className="h-4 w-4 shrink-0" />
              <span>TEST MODE ACTIVE</span>
            </div>
            <p className="text-neutral-500 font-medium leading-normal">
              This environment uses simulated financial activity with no real money, bank transfers, or production payouts.
            </p>
          </div>
        </div>

        {/* MAIN QUICKSTART MODULE (Desktop Right Column) */}
        <div className="lg:col-span-8 space-y-6">
          
          {/* Section: Environment variables */}
          <div className="rounded-lg border border-neutral-900 bg-neutral-950/20 p-5 space-y-4">
            <h3 className="text-[10px] font-black text-white uppercase tracking-widest border-b border-neutral-900 pb-2">
              1. Platform Environment Coordinates
            </h3>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Endpoint API URL */}
              <div className="space-y-1.5">
                <span className="block text-[8px] font-bold text-neutral-500 uppercase tracking-widest">FLEXBANK_API_URL</span>
                <div className="flex items-center justify-between font-mono text-[11px] text-indigo-400 bg-neutral-950 border border-neutral-900 rounded p-2 select-all">
                  <span>{FLEXBANK_API_URL}</span>
                  <button onClick={handleCopyBaseUrl} className="p-0.5 hover:text-white transition-colors cursor-pointer shrink-0 ml-2">
                    {copiedUrl ? <Check className="h-3 w-3 text-emerald-500" /> : <Copy className="h-3 w-3 text-neutral-500" />}
                  </button>
                </div>
              </div>

              {/* Endpoint API Key Placeholder */}
              <div className="space-y-1.5">
                <span className="block text-[8px] font-bold text-neutral-500 uppercase tracking-widest">FLEXBANK_API_KEY</span>
                <div className="font-mono text-[11px] text-neutral-400 bg-neutral-950 border border-neutral-900 rounded p-2 select-all uppercase">
                  your_test_api_key
                </div>
              </div>
            </div>
          </div>

          {/* Section: Language snippet selector */}
          <div className="rounded-lg border border-neutral-900 bg-neutral-950/20 p-5 space-y-4">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 border-b border-neutral-900 pb-2">
              <h3 className="text-[10px] font-black text-white uppercase tracking-widest">
                2. Select Integration Language
              </h3>
              
              {/* Language selection tabs */}
              <div className="flex space-x-1 border border-neutral-900 bg-neutral-950 p-0.5 rounded text-[9px] font-bold tracking-wider uppercase shrink-0">
                {(["curl", "node", "js", "python"] as const).map((lang) => (
                  <button
                    key={lang}
                    onClick={() => setActiveLang(lang)}
                    className={`px-2.5 py-1 rounded transition-all cursor-pointer ${
                      activeLang === lang
                        ? "bg-indigo-600 text-white font-black"
                        : "text-neutral-500 hover:text-white"
                    }`}
                  >
                    {lang === "curl" ? "cURL" : lang === "node" ? "Node.js" : lang === "js" ? "JavaScript" : "Python"}
                  </button>
                ))}
              </div>
            </div>

            {/* Code presentation block */}
            <div className="relative group">
              <pre className="p-4 bg-neutral-950 border border-neutral-900 rounded overflow-x-auto text-[10px] text-indigo-300 font-mono leading-relaxed select-all max-h-56">
                <code>{snippets[activeLang]}</code>
              </pre>
              <button
                onClick={handleCopySnippet}
                className="absolute top-2.5 right-2.5 flex items-center space-x-1 px-2.5 py-1 rounded bg-neutral-900 hover:bg-neutral-800 border border-neutral-800 text-[9px] font-bold text-neutral-400 hover:text-white transition-colors cursor-pointer"
              >
                {copiedLang ? (
                  <>
                    <Check className="h-3 w-3 text-emerald-500" />
                    <span>Copied</span>
                  </>
                ) : (
                  <>
                    <Copy className="h-3 w-3" />
                    <span>Copy</span>
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Section: Try first request Playground Console */}
          <div className="rounded-lg border border-neutral-900 bg-neutral-950/20 p-5 space-y-4">
            <h3 className="text-[10px] font-black text-white uppercase tracking-widest border-b border-neutral-900 pb-2">
              3. Try Interactive Sandbox Request
            </h3>
            <p className="text-[10px] text-neutral-500 font-semibold leading-normal">
              Execute a real, live API handshake call directly from this browser console. Paste your secret key securely to authenticate.
            </p>

            <form onSubmit={handleSendTestRequest} className="space-y-4 pt-1">
              <div className="space-y-1.5">
                <label htmlFor="pastedKey" className="block text-[9px] font-bold text-neutral-400 uppercase tracking-wider">
                  ENTER SECRET API KEY (fb_test_...)
                </label>
                <div className="flex gap-2">
                  <input
                    id="pastedKey"
                    type="password"
                    required
                    value={inputKey}
                    onChange={(e) => setInputKey(e.target.value)}
                    placeholder="Paste fb_test_... here securely"
                    className="flex-1 rounded border border-neutral-900 bg-neutral-950 px-3 py-2 text-white placeholder:text-neutral-700 text-xs font-mono focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 transition-all select-text"
                  />
                  <button
                    type="submit"
                    disabled={isDispatching || !inputKey.trim()}
                    className="rounded bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold uppercase tracking-wider px-4 py-2 shrink-0 flex items-center space-x-1.5 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer transition-all active:scale-[0.98]"
                  >
                    {isDispatching ? (
                      <>
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        <span>Dispatching...</span>
                      </>
                    ) : (
                      <>
                        <Play className="h-3.5 w-3.5" />
                        <span>Send test request</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            </form>

            {/* Render Request Handshake Results */}
            {playgroundResult && (
              <div className="space-y-4 pt-2 animate-fade-in">
                
                {playgroundResult.success ? (
                  /* SUCCESS BLOCK */
                  <div className="rounded border border-emerald-950/50 bg-emerald-950/5 p-4 space-y-4 text-left">
                    <div className="flex items-center space-x-2 text-emerald-500 font-bold text-xs uppercase tracking-wide">
                      <CheckCircle2 className="h-4.5 w-4.5" />
                      <span>✓ First API request successful</span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 border-t border-b border-emerald-950/30 py-3 text-[10px] font-mono select-text">
                      <div>
                        <span className="text-neutral-500 block uppercase font-bold text-[8.5px]">HTTP STATUS</span>
                        <span className="text-emerald-500 font-black mt-1 block">{playgroundResult.status} {playgroundResult.statusText}</span>
                      </div>
                      <div>
                        <span className="text-neutral-500 block uppercase font-bold text-[8.5px]">REQUEST ID</span>
                        <span className="text-white font-semibold mt-1 block truncate font-mono select-all">
                          {playgroundResult.requestId || "req_simulated_sandbox_ok"}
                        </span>
                      </div>
                      <div>
                        <span className="text-neutral-500 block uppercase font-bold text-[8.5px]">RESPONSE TIME</span>
                        <span className="text-white font-semibold mt-1 block flex items-center space-x-1">
                          <Clock className="h-3.5 w-3.5 text-neutral-500 shrink-0" />
                          <span>{playgroundResult.duration} ms</span>
                        </span>
                      </div>
                    </div>

                    <div className="space-y-1.5">
                      <span className="text-[9px] font-bold text-neutral-500 uppercase tracking-widest block">RESPONSE PAYLOAD PREVIEW</span>
                      <pre className="p-3 bg-neutral-950 border border-neutral-900 rounded overflow-x-auto text-[9.5px] text-emerald-400 font-mono leading-relaxed select-all max-h-48">
                        <code>{JSON.stringify(playgroundResult.body, null, 2)}</code>
                      </pre>
                    </div>

                    <div className="rounded border border-neutral-900 bg-neutral-950/40 p-3 space-y-2 uppercase text-[10px]">
                      <div className="text-white font-bold leading-normal">
                        Your request was recorded in API Logs.
                      </div>
                      <div className="flex flex-col sm:flex-row gap-2 pt-1">
                        <Link
                          to={playgroundResult.requestId ? `/projects/${projectId}/logs/${playgroundResult.requestId}` : `/projects/${projectId}/logs`}
                          className="flex-1 flex items-center justify-center space-x-1 rounded bg-neutral-900 hover:bg-neutral-800 border border-neutral-800 hover:border-neutral-700 py-2 font-bold text-neutral-300 hover:text-white transition-all text-center"
                        >
                          <span>View request in Logs</span>
                          <ArrowRight className="h-3.5 w-3.5" />
                        </Link>
                        <Link
                          to={`/projects/${projectId}/customers`}
                          className="flex-1 flex items-center justify-center space-x-1 rounded bg-indigo-600 hover:bg-indigo-500 py-2 font-bold text-white transition-all text-center"
                        >
                          <span>Create your first customer</span>
                          <ArrowRight className="h-3.5 w-3.5 animate-pulse" />
                        </Link>
                      </div>
                    </div>

                  </div>
                ) : (
                  /* FAILURE BLOCK */
                  <div className="rounded border border-red-950/50 bg-red-950/5 p-4 space-y-4 text-left">
                    <div className="flex items-center space-x-2 text-rose-500 font-bold text-xs uppercase tracking-wide">
                      <ShieldAlert className="h-4.5 w-4.5" />
                      <span>Your first API request failed</span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 border-t border-b border-red-950/30 py-3 text-[10px] font-mono">
                      <div>
                        <span className="text-neutral-500 block uppercase font-bold text-[8.5px]">HTTP STATUS</span>
                        <span className="text-rose-500 font-black mt-1 block">{playgroundResult.status} {playgroundResult.statusText}</span>
                      </div>
                      <div>
                        <span className="text-neutral-500 block uppercase font-bold text-[8.5px]">REQUEST ID</span>
                        <span className="text-neutral-300 mt-1 block truncate select-all">
                          {playgroundResult.requestId || "Unavailable"}
                        </span>
                      </div>
                    </div>

                    <div className="space-y-1">
                      <span className="text-[9px] font-bold text-neutral-500 uppercase block tracking-widest">BACKEND ERROR MESSAGE</span>
                      <p className="text-xs text-red-200/90 leading-relaxed font-semibold">
                        {playgroundResult.errorMsg}
                      </p>
                    </div>

                    <div className="flex flex-col sm:flex-row gap-2 pt-2 text-[10px] font-bold uppercase">
                      <button
                        onClick={handleSendTestRequest}
                        className="flex-1 py-2 rounded bg-neutral-900 border border-neutral-800 text-neutral-300 hover:text-white transition-all cursor-pointer text-center"
                      >
                        Retry request
                      </button>
                      <Link
                        to={`/projects/${projectId}/api-keys`}
                        className="flex-1 py-2 rounded bg-indigo-600 text-white hover:bg-indigo-500 transition-all text-center"
                      >
                        View API Keys
                      </Link>
                    </div>

                  </div>
                )}

              </div>
            )}

          </div>

        </div>

      </div>

    </div>
  );
};

export default Quickstart;
