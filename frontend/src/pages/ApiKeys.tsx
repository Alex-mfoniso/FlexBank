import React, { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { api, FLEXBANK_API_URL } from "../lib/api";
import { formatDate } from "../utils/format";
import {
  Key,
  Plus,
  X,
  AlertTriangle,
  Copy,
  Check,
  Trash2,
  Calendar,
  Lock,
  Eye,
  RefreshCw,
  Info,
  Terminal,
  ShieldAlert,
  BookOpen,
  ArrowRight,
  ExternalLink
} from "lucide-react";

export const ApiKeys: React.FC = () => {
  const { projectId } = useParams<{ projectId: string }>();

  const [keys, setKeys] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Form Creation States
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [keyName, setKeyName] = useState("");
  const [expiresInDays, setExpiresInDays] = useState<string>("never");
  const [createdPlaintextKey, setCreatedPlaintextKey] = useState<string | null>(null);
  
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  // Copy states
  const [copiedKey, setCopiedKey] = useState(false);
  const [copiedBaseUrl, setCopiedBaseUrl] = useState(false);
  const [copiedCurl, setCopiedCurl] = useState(false);

  const fetchKeys = async () => {
    if (!projectId) return;
    setIsLoading(true);
    setError(null);
    try {
      // Direct Project Isolation query (Section 24)
      const response = await api.get(`/api/v1/projects/${projectId}/api-keys`);
      setKeys(response.data.apiKeys || []);
    } catch (err: any) {
      console.error("Failed to fetch project api keys", err);
      setError(err.response?.data?.message || "Failed to retrieve API credentials.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchKeys();
  }, [projectId]);

  const handleCreateKey = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!projectId) return;
    setFormError(null);
    setIsSubmitting(true);
    setCreatedPlaintextKey(null);

    const payload: any = { name: keyName };
    if (expiresInDays !== "never") {
      payload.expiresInDays = parseInt(expiresInDays);
    }

    try {
      const response = await api.post(`/api/v1/projects/${projectId}/api-keys`, payload);
      setCreatedPlaintextKey(response.data.key);
      setKeyName("");
      setExpiresInDays("never");
      
      await fetchKeys();
    } catch (err: any) {
      console.error("Failed to generate API credential key", err);
      setFormError(err.response?.data?.message || "Could not generate key credential.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRevokeKey = async (keyId: string) => {
    if (!projectId) return;
    const confirmMsg = "Revoke this API key? Applications using this key will no longer be able to authenticate with Ricarut.";
    
    if (!window.confirm(confirmMsg)) {
      return;
    }

    try {
      await api.delete(`/api/v1/projects/${projectId}/api-keys/${keyId}`);
      await fetchKeys();
    } catch (err: any) {
      console.error("Failed to revoke API key", err);
      alert(err.response?.data?.message || "Failed to revoke api credential.");
    }
  };

  const handleCopyKey = () => {
    if (!createdPlaintextKey) return;
    navigator.clipboard.writeText(createdPlaintextKey);
    setCopiedKey(true);
    setTimeout(() => setCopiedKey(false), 2000);
  };

  const handleCopyBaseUrl = () => {
    navigator.clipboard.writeText(FLEXBANK_API_URL);
    setCopiedBaseUrl(true);
    setTimeout(() => setCopiedBaseUrl(false), 2000);
  };

  const handleCopyCurl = () => {
    const curlCmd = `curl ${FLEXBANK_API_URL}/api/v1/auth/test-key \\\n  -H "Authorization: Bearer YOUR_API_KEY"`;
    navigator.clipboard.writeText(curlCmd);
    setCopiedCurl(true);
    setTimeout(() => setCopiedCurl(false), 2000);
  };

  return (
    <div className="space-y-8 font-mono text-left select-none relative text-neutral-300">
      
      {/* 1. Toolbar */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center pb-5 border-b border-neutral-900 gap-4">
        <div>
          <h1 className="text-xl font-black text-white uppercase tracking-tight">API Keys</h1>
          <p className="text-[10px] text-neutral-500 font-semibold mt-1">
            Manage the credentials your applications use to access this Ricarut project.
          </p>
        </div>
        <button
          onClick={() => {
            setFormError(null);
            setCreatedPlaintextKey(null);
            setIsDrawerOpen(true);
          }}
          className="rounded bg-indigo-600 px-4 py-2 text-xs font-bold uppercase tracking-wider text-white hover:bg-indigo-500 transition-all active:scale-[0.98] flex items-center space-x-1.5 shadow-md shadow-indigo-600/10 cursor-pointer"
        >
          <Plus className="h-4 w-4 shrink-0" />
          <span>Create API key</span>
        </button>
      </div>

      {/* Security Warnings Alert Banner (Section 2) */}
      <div className="rounded border border-red-950/40 bg-red-950/5 px-4 py-3 text-[10px] text-red-500 font-bold uppercase tracking-wider flex items-start space-x-2">
        <ShieldAlert className="h-4.5 w-4.5 shrink-0 text-red-500" />
        <div>
          <span>Keep your API keys private. Never expose secret keys in frontend applications or public repositories.</span>
        </div>
      </div>

      {/* Quickstart Help Assistance Link (Section 23) */}
      <div className="rounded border border-indigo-950/30 bg-indigo-950/5 px-4 py-3 text-[10px] text-indigo-400 font-bold uppercase tracking-wider flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center space-x-2 text-left">
          <BookOpen className="h-4.5 w-4.5 shrink-0 text-indigo-400" />
          <span>Need help connecting? Get up and running in minutes by reading our interactive tutorial.</span>
        </div>
        <Link
          to={`/projects/${projectId}/docs/quickstart`}
          className="inline-flex items-center justify-center space-x-1 hover:text-indigo-300 transition-colors shrink-0 whitespace-nowrap text-xs text-indigo-400 font-black uppercase tracking-widest border border-indigo-800 bg-indigo-950/40 px-3 py-1.5 rounded cursor-pointer"
        >
          <span>View Quickstart</span>
          <ArrowRight className="h-3 w-3" />
        </Link>
      </div>

      {/* 2. Environment Info Card (Section 3 & 19) */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-stretch">
        
        <div className="md:col-span-4 rounded-lg border border-neutral-900 bg-neutral-950/40 p-5 flex flex-col justify-between space-y-4">
          <div className="space-y-2">
            <span className="text-[10px] font-black text-amber-500 uppercase tracking-widest block">
              ● TEST MODE
            </span>
            <p className="text-[10px] font-semibold text-neutral-500 leading-relaxed">
              API keys created here only access the Ricarut sandbox. All financial flows are fully simulated.
            </p>
          </div>
          
          <div className="space-y-1.5">
            <span className="block text-[8px] font-bold text-neutral-600 uppercase tracking-wider">
              API BASE URL
            </span>
            <div className="flex items-center justify-between rounded border border-neutral-900 bg-black px-2.5 py-1.5 text-[10px] font-bold text-white">
              <span className="truncate pr-4">{FLEXBANK_API_URL}</span>
              <button
                onClick={handleCopyBaseUrl}
                className="text-neutral-500 hover:text-white transition-colors cursor-pointer"
              >
                {copiedBaseUrl ? (
                  <Check className="h-3.5 w-3.5 text-emerald-500" />
                ) : (
                  <Copy className="h-3.5 w-3.5" />
                )}
              </button>
            </div>
          </div>
        </div>

        {/* 3. Server-side Warning explanation (Section 15) */}
        <div className="md:col-span-8 rounded-lg border border-neutral-900 bg-neutral-950/40 p-5 space-y-3">
          <span className="text-[10px] font-black text-indigo-400 uppercase tracking-widest flex items-center space-x-1.5">
            <Lock className="h-4 w-4 text-indigo-400 shrink-0" />
            <span>Server-side usage only</span>
          </span>
          <p className="text-xs font-semibold text-neutral-400 leading-relaxed">
            Secret API keys should be used from your backend/server. Do not put secret API keys directly in client browser builds, mobile application packages, public GitHub repositories, or Vite frontend source files.
          </p>
          <div className="pt-1.5 border-t border-neutral-900 flex flex-wrap gap-x-4 gap-y-2 text-[9px] font-bold text-neutral-600 uppercase">
            <span>FLEXBANK_API_URL={FLEXBANK_API_URL}</span>
            <span>FLEXBANK_API_KEY=fb_test_...</span>
          </div>
        </div>

      </div>

      {/* 4. Credentials List Container */}
      {isLoading ? (
        <div className="space-y-4">
          <div className="h-10 bg-neutral-950 border border-neutral-900 rounded animate-pulse" />
          <div className="h-28 bg-neutral-950 border border-neutral-900 rounded animate-pulse" />
        </div>
      ) : error ? (
        <div className="rounded border border-red-950 bg-red-950/5 p-6 text-center max-w-md mx-auto">
          <AlertTriangle className="mx-auto h-10 w-10 text-rose-500" />
          <h3 className="mt-4 text-xs font-black uppercase tracking-wider text-white">Failed to load credentials</h3>
          <p className="mt-2 text-[10px] text-neutral-500 font-semibold">{error}</p>
          <button
            onClick={fetchKeys}
            className="mt-5 inline-flex items-center space-x-1.5 rounded bg-neutral-900 px-4 py-2 text-xs font-bold uppercase tracking-wider text-white hover:bg-neutral-800 border border-neutral-800 cursor-pointer"
          >
            <RefreshCw className="h-3.5 w-3.5" />
            <span>Retry Query</span>
          </button>
        </div>
      ) : keys.length === 0 ? (
        <div className="rounded-lg border border-neutral-900 bg-neutral-950/10 p-12 text-center max-w-lg mx-auto">
          <Key className="mx-auto h-12 w-12 text-neutral-700 animate-pulse" />
          <h3 className="mt-4 text-xs font-black uppercase tracking-widest text-neutral-400">NO API KEYS YET</h3>
          <p className="mt-2 text-[10px] text-neutral-500 font-medium leading-relaxed">
            Create a test API key to connect your application to FlexBank. Make sandbox server dispatches and register ledger test wallets securely.
          </p>
          <div className="mt-6">
            <button
              onClick={() => setIsDrawerOpen(true)}
              className="rounded bg-indigo-600 px-4 py-2 text-xs font-bold uppercase text-white hover:bg-indigo-500 transition-all cursor-pointer"
            >
              Create API key
            </button>
          </div>
        </div>
      ) : (
        <div className="space-y-6">
          <h3 className="text-[10px] font-bold uppercase tracking-wider text-neutral-600">Active Project credentials</h3>
          
          {/* Desktop Table View (Section 25) */}
          <div className="hidden md:block rounded-lg border border-neutral-900 bg-neutral-950/20 overflow-hidden">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-neutral-950 border-b border-neutral-900 text-neutral-500 font-bold uppercase tracking-wider">
                  <th className="px-6 py-4">Key name</th>
                  <th className="px-6 py-4">Key</th>
                  <th className="px-6 py-4">Environment</th>
                  <th className="px-6 py-4">Status</th>
                  <th className="px-6 py-4">Created</th>
                  <th className="px-6 py-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-900/60 font-semibold text-neutral-300">
                {keys.map((k) => {
                  const isRevoked = !!k.revokedAt;
                  const isExpired = k.expiresAt && new Date(k.expiresAt) < new Date();
                  const isActive = !isRevoked && !isExpired;

                  return (
                    <tr key={k.id} className="hover:bg-neutral-950/30 transition-colors">
                      <td className="px-6 py-4 font-black text-white">{k.name}</td>
                      <td className="px-6 py-4">
                        <span className="font-mono text-[10px] text-neutral-400 bg-neutral-950 border border-neutral-900 px-2 py-0.5 rounded select-all font-bold">
                          {k.keyPrefix}••••••••
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <span className="inline-flex items-center rounded border border-amber-900/40 bg-amber-950/20 px-1.5 py-0.5 text-[8.5px] font-black uppercase text-amber-500">
                          {k.environment}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <span className={`inline-flex items-center rounded border px-1.5 py-0.5 text-[8px] font-black uppercase tracking-wider leading-none ${
                          isActive
                            ? "border-emerald-900/40 bg-emerald-950/20 text-emerald-500"
                            : "border-neutral-800 bg-neutral-900 text-neutral-500"
                        }`}>
                          {isRevoked ? "● Revoked" : isExpired ? "● Expired" : "● Active"}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-neutral-500">{formatDate(k.createdAt)}</td>
                      <td className="px-6 py-4 text-right">
                        {isActive ? (
                          <button
                            onClick={() => handleRevokeKey(k.id)}
                            className="inline-flex items-center space-x-1 text-[10px] font-black uppercase tracking-wider text-rose-500 hover:text-rose-400 transition-colors cursor-pointer"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                            <span>Revoke</span>
                          </button>
                        ) : (
                          <span className="text-neutral-600 text-[10px] font-black uppercase tracking-wider">Inoperable</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Mobile Stack Cards View (Section 25) */}
          <div className="md:hidden space-y-4">
            {keys.map((k) => {
              const isRevoked = !!k.revokedAt;
              const isExpired = k.expiresAt && new Date(k.expiresAt) < new Date();
              const isActive = !isRevoked && !isExpired;

              return (
                <div key={k.id} className="rounded-lg border border-neutral-900 bg-neutral-950/20 p-4 space-y-3.5">
                  <div className="flex justify-between items-start">
                    <span className="font-black text-white text-xs">{k.name}</span>
                    <span className={`inline-flex items-center rounded border px-1.5 py-0.5 text-[7px] font-black uppercase tracking-wider leading-none ${
                      isActive
                        ? "border-emerald-900/40 bg-emerald-950/20 text-emerald-500"
                        : "border-neutral-800 bg-neutral-900 text-neutral-500"
                    }`}>
                      {isRevoked ? "Revoked" : isExpired ? "Expired" : "Active"}
                    </span>
                  </div>

                  <div className="space-y-1">
                    <span className="block text-[8px] font-bold text-neutral-600 uppercase tracking-wider">Masked API Key</span>
                    <span className="font-mono text-[9px] text-neutral-400 bg-neutral-950 border border-neutral-900 px-2 py-0.5 rounded select-all font-bold block w-fit">
                      {k.keyPrefix}••••••••
                    </span>
                  </div>

                  <div className="flex justify-between items-center pt-2.5 border-t border-neutral-900/50 text-[9px] font-bold uppercase tracking-wider">
                    <span className="text-neutral-500">Created: {formatDate(k.createdAt)}</span>
                    {isActive ? (
                      <button
                        onClick={() => handleRevokeKey(k.id)}
                        className="text-rose-500 hover:text-rose-400 cursor-pointer"
                      >
                        Revoke
                      </button>
                    ) : (
                      <span className="text-neutral-600">Inoperable</span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* 5. Integration Sandbox Quickstart (Section 16, 17, 18) */}
      <div className="rounded-lg border border-neutral-900 bg-neutral-950/40 p-5 space-y-4">
        <div className="space-y-1.5">
          <span className="text-[10px] font-black text-indigo-400 uppercase tracking-widest flex items-center space-x-1.5">
            <BookOpen className="h-4 w-4 text-indigo-400 shrink-0" />
            <span>Developer Quickstart</span>
          </span>
          <p className="text-xs font-semibold text-neutral-500">
            Use your active secure API key to query the sandbox environments. Test routing, authentication authorization context, and account setups directly from terminal windows.
          </p>
        </div>

        <div className="space-y-2">
          <div className="flex items-center justify-between text-[8px] font-bold text-neutral-600 uppercase tracking-wider">
            <span>Example Authentication Test API Call</span>
            <button
              onClick={handleCopyCurl}
              className="text-neutral-500 hover:text-white flex items-center space-x-1 cursor-pointer transition-colors"
            >
              {copiedCurl ? (
                <>
                  <Check className="h-3 w-3 text-emerald-500" />
                  <span>Copied!</span>
                </>
              ) : (
                <>
                  <Copy className="h-3 w-3" />
                  <span>Copy curl</span>
                </>
              )}
            </button>
          </div>

          <pre className="text-neutral-300 font-mono text-[10px] leading-relaxed overflow-x-auto p-3.5 bg-black/60 border border-neutral-900 rounded-lg select-all">
            {`curl ${FLEXBANK_API_URL}/api/v1/auth/test-key \\
  -H "Authorization: Bearer YOUR_API_KEY" \\
  -H "x-project-id: ${projectId || "YOUR_PROJECT_ID"}"`}
          </pre>
        </div>

        <div className="pt-2 border-t border-neutral-900/60 flex items-center justify-between text-[10px] font-black uppercase tracking-wider">
          <span className="text-neutral-500">Check comprehensive references:</span>
          <a
            href="https://docs.flexbank.co"
            target="_blank"
            rel="noopener noreferrer"
            className="text-indigo-400 hover:text-indigo-300 flex items-center space-x-1"
          >
            <span>Read Docs</span>
            <ExternalLink className="h-3 w-3" />
          </a>
        </div>
      </div>

      {/* 6. Creation Modal Drawer (Section 5 & 7) */}
      {isDrawerOpen && (
        <div className="fixed inset-0 z-50 flex justify-end">
          <div onClick={() => setIsDrawerOpen(false)} className="fixed inset-0 bg-black/60 backdrop-blur-xs" />

          <div className="relative flex w-full max-w-md flex-col bg-neutral-950 border-l border-neutral-900 p-6 shadow-2xl h-full overflow-y-auto">
            <div className="flex items-center justify-between pb-4 border-b border-neutral-900">
              <h2 className="text-sm font-black text-white uppercase tracking-wider flex items-center space-x-2">
                <Key className="h-5 w-5 text-indigo-500" />
                <span>Create API key</span>
              </h2>
              <button onClick={() => setIsDrawerOpen(false)} className="text-neutral-500 hover:text-white cursor-pointer">
                <X className="h-5 w-5" />
              </button>
            </div>

            {formError && (
              <div className="mt-4 flex items-start space-x-2 rounded border border-red-950 bg-red-950/5 p-3 text-rose-500 text-[10px] font-bold leading-relaxed">
                <AlertTriangle className="h-4.5 w-4.5 text-rose-500 shrink-0 mt-0.5" />
                <span>{formError}</span>
              </div>
            )}

            {/* Warning exactly ONCE signing secret display (Section 7 & 9) */}
            {createdPlaintextKey ? (
              <div className="mt-6 space-y-6 flex-1 flex flex-col justify-between">
                <div className="space-y-4">
                  <div className="rounded border border-amber-950/40 bg-amber-950/5 p-4 text-amber-500 text-[10px] leading-relaxed space-y-3 font-bold">
                    <span className="block text-[10px] font-black text-amber-500 uppercase tracking-wider">
                      ⚠️ Store this key securely
                    </span>
                    <p>
                      Your secret key will only be shown once. Never commit it to GitHub. Never expose it in client-side browser code.
                    </p>
                  </div>

                  <div className="rounded bg-black p-4 flex items-center justify-between text-xs border border-neutral-900">
                    <span className="font-mono text-emerald-400 font-bold select-all truncate pr-4">
                      {createdPlaintextKey}
                    </span>
                    <button
                      onClick={handleCopyKey}
                      className="shrink-0 flex items-center justify-center h-8 w-8 rounded bg-neutral-900 hover:bg-neutral-800 text-neutral-300 hover:text-white transition-colors border border-neutral-800 cursor-pointer"
                    >
                      {copiedKey ? (
                        <Check className="h-4.5 w-4.5 text-emerald-400 animate-pulse" />
                      ) : (
                        <Copy className="h-4.5 w-4.5" />
                      )}
                    </button>
                  </div>
                </div>

                <div className="pt-6 border-t border-neutral-900">
                  <button
                    onClick={() => {
                      setCreatedPlaintextKey(null);
                      setIsDrawerOpen(false);
                    }}
                    className="w-full rounded bg-indigo-600 py-2.5 text-center text-xs font-bold uppercase tracking-wider text-white hover:bg-indigo-500 transition-all cursor-pointer"
                  >
                    Done
                  </button>
                </div>
              </div>
            ) : (
              <form onSubmit={handleCreateKey} className="mt-6 space-y-6 flex-1 flex flex-col justify-between font-mono">
                <div className="space-y-5">
                  <div>
                    <label className="block text-[9px] font-bold text-neutral-500 uppercase tracking-wider">
                      Key name
                    </label>
                    <input
                      type="text"
                      required
                      value={keyName}
                      onChange={(e) => setKeyName(e.target.value)}
                      placeholder="e.g. My Wallet Development"
                      className="mt-1.5 block w-full rounded border border-neutral-900 bg-neutral-950 px-3.5 py-2.5 text-xs text-white placeholder:text-neutral-700 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 transition-all font-bold"
                    />
                  </div>

                  <div>
                    <label className="block text-[9px] font-bold text-neutral-500 uppercase tracking-wider flex items-center space-x-1">
                      <Calendar className="h-3.5 w-3.5 text-neutral-500" />
                      <span>Environment lifespan expiration</span>
                    </label>
                    <select
                      value={expiresInDays}
                      onChange={(e) => setExpiresInDays(e.target.value)}
                      className="mt-1.5 block w-full rounded border border-neutral-900 bg-neutral-950 px-3 py-2.5 text-xs text-white focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 transition-all font-bold cursor-pointer"
                    >
                      <option value="never">Never (Non-expiring secure credential)</option>
                      <option value="30">Expires in 30 days</option>
                      <option value="90">Expires in 90 days</option>
                      <option value="365">Expires in 365 days</option>
                    </select>
                  </div>

                  {/* Scopes Section (Section 5) */}
                  <div>
                    <span className="block text-[9px] font-bold text-neutral-500 uppercase tracking-wider mb-2">Permissions Scopes</span>
                    <div className="rounded border border-neutral-900 bg-neutral-950/60 p-4 space-y-3.5 font-semibold text-[10px] text-neutral-400">
                      <div className="flex items-start space-x-2">
                        <input type="checkbox" defaultChecked disabled className="mt-0.5 cursor-not-allowed" />
                        <div>
                          <span className="font-bold text-white uppercase text-[9px]">Full Sandbox Permissions</span>
                          <p className="text-[9px] text-neutral-600 mt-0.5">Submits with read/write access to Customers, Accounts, Transfers, Transactions, and Webhooks.</p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="pt-6 border-t border-neutral-900 flex space-x-3 mt-auto">
                  <button
                    type="button"
                    onClick={() => setIsDrawerOpen(false)}
                    className="flex-1 rounded border border-neutral-900 py-2 text-center text-[10px] font-black uppercase tracking-wider text-neutral-500 hover:text-white transition-all cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="flex-1 flex justify-center items-center rounded bg-indigo-600 py-2 text-center text-[10px] font-black uppercase tracking-wider text-white shadow-sm hover:bg-indigo-500 transition-all disabled:opacity-50 cursor-pointer"
                  >
                    {isSubmitting ? "Creating API key..." : "Create API key"}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}

    </div>
  );
};

export default ApiKeys;
