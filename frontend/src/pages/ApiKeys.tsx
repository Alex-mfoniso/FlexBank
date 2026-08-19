import React, { useEffect, useState } from "react";
import { api } from "../lib/api";
import { useApp } from "../context/AppContext";
import { formatDate } from "../utils/format";
import { SkeletonLoader } from "../components/SkeletonLoader";
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
} from "lucide-react";

export const ApiKeys: React.FC = () => {
  const { selectedProjectId, environment } = useApp();

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

  // Copy secrets state
  const [copiedKey, setCopiedKey] = useState(false);

  const fetchKeys = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await api.get(`/api/v1/projects/${selectedProjectId}/api-keys`);
      setKeys(response.data.apiKeys || []);
    } catch (err: any) {
      console.error("Failed to fetch project api keys", err);
      setError(err.message || "Failed to retrieve API credentials.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (selectedProjectId) {
      fetchKeys();
    }
  }, [selectedProjectId]);

  const handleCreateKey = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    setIsSubmitting(true);
    setCreatedPlaintextKey(null);

    const payload: any = { name: keyName };
    if (expiresInDays !== "never") {
      payload.expiresInDays = parseInt(expiresInDays);
    }

    try {
      const response = await api.post(`/api/v1/projects/${selectedProjectId}/api-keys`, payload);
      setCreatedPlaintextKey(response.data.key);
      setKeyName("");
      setExpiresInDays("never");
      
      await fetchKeys();
    } catch (err: any) {
      console.error("Failed to generate API credential key", err);
      setFormError(err.message || "Could not generate key credential.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRevokeKey = async (keyId: string) => {
    if (!window.confirm("Are you absolutely sure you want to permanently REVOKE this API key? Any applications currently authenticating with this token will lose immediate server access.")) {
      return;
    }

    try {
      await api.delete(`/api/v1/projects/${selectedProjectId}/api-keys/${keyId}`);
      await fetchKeys();
    } catch (err: any) {
      console.error("Failed to revoke API key", err);
      alert(err.message || "Failed to revoke api credential.");
    }
  };

  const handleCopyKey = () => {
    if (!createdPlaintextKey) return;
    navigator.clipboard.writeText(createdPlaintextKey);
    setCopiedKey(true);
    setTimeout(() => setCopiedKey(false), 2000);
  };

  return (
    <div className="space-y-6">
      
      {/* Upper toolbar */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center pb-5 border-b border-slate-200">
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight text-slate-900">Developer API Keys</h1>
          <p className="text-xs text-slate-500 font-semibold mt-1">
            Authenticate inbound requests on your application backend. Keep signing secrets completely confidential.
          </p>
        </div>
        <button
          onClick={() => {
            setFormError(null);
            setCreatedPlaintextKey(null);
            setIsDrawerOpen(true);
          }}
          className="mt-4 sm:mt-0 flex items-center space-x-1.5 rounded-lg bg-indigo-600 px-4 py-2 text-xs font-bold text-white hover:bg-indigo-500 shadow-xs transition-all"
        >
          <Plus className="h-4 w-4" />
          <span>Generate API Key</span>
        </button>
      </div>

      {isLoading ? (
        <SkeletonLoader rows={4} columns={5} />
      ) : error ? (
        <div className="rounded-xl border border-red-200 bg-red-50 p-6 text-center shadow-xs">
          <AlertTriangle className="mx-auto h-12 w-12 text-red-500" />
          <h3 className="mt-4 text-sm font-bold text-slate-900">Failed to load credentials</h3>
          <p className="mt-2 text-xs text-slate-500 max-w-sm mx-auto leading-relaxed">{error}</p>
          <button
            onClick={fetchKeys}
            className="mt-4 rounded bg-slate-900 px-3 py-1.5 text-xs font-semibold text-white hover:bg-slate-800"
          >
            Retry
          </button>
        </div>
      ) : keys.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-12 text-center shadow-xs">
          <Key className="mx-auto h-12 w-12 text-slate-300" />
          <h3 className="mt-4 text-sm font-bold text-slate-900">No API Keys configured</h3>
          <p className="mt-2 text-xs text-slate-500 max-w-md mx-auto leading-relaxed">
            Generate test environment credentials to start performing transactional actions through your local command line console or curl shells.
          </p>
          <button
            onClick={() => setIsDrawerOpen(true)}
            className="mt-6 rounded-lg bg-indigo-600 px-4 py-2 text-xs font-bold text-white hover:bg-indigo-500 shadow-sm"
          >
            Generate First API Key
          </button>
        </div>
      ) : (
        <div className="border border-slate-200 rounded-xl bg-white overflow-hidden shadow-xs">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-sm">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-slate-400 font-semibold text-xs uppercase tracking-wider">
                  <th className="px-6 py-3.5">Key Description Name</th>
                  <th className="px-6 py-3.5">Token Prefix ID</th>
                  <th className="px-6 py-3.5">Environment Mode</th>
                  <th className="px-6 py-3.5">Created Date</th>
                  <th className="px-6 py-3.5">Token Status</th>
                  <th className="px-6 py-3.5 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium">
                {keys.map((key) => {
                  const isRevoked = !!key.revokedAt;
                  const isExpired = key.expiresAt && new Date(key.expiresAt) < new Date();
                  const isActive = !isRevoked && !isExpired;

                  return (
                    <tr key={key.id} className="hover:bg-slate-50/50 transition-colors">
                      <td className="px-6 py-4 font-bold text-slate-900">{key.name}</td>
                      <td className="px-6 py-4">
                        <span className="font-mono text-xs text-slate-500 bg-slate-50 border border-slate-200/55 px-2 py-0.5 rounded select-all font-bold">
                          {key.keyPrefix}....
                        </span>
                      </td>
                      <td className="px-6 py-4 shrink-0">
                        <span className={`inline-flex items-center text-[10px] font-extrabold uppercase px-2 py-0.5 rounded border ${
                          key.environment === "live"
                            ? "bg-emerald-50 text-emerald-700 border-emerald-100"
                            : "bg-amber-50 text-amber-700 border-amber-100"
                        }`}>
                          {key.environment}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-slate-400">{formatDate(key.createdAt)}</td>
                      <td className="px-6 py-4">
                        {isRevoked ? (
                          <span className="inline-flex items-center rounded-md bg-rose-50 text-rose-700 border border-rose-200 px-2.5 py-0.5 text-xs font-bold capitalize">
                            Revoked
                          </span>
                        ) : isExpired ? (
                          <span className="inline-flex items-center rounded-md bg-amber-50 text-amber-700 border border-amber-200 px-2.5 py-0.5 text-xs font-bold capitalize">
                            Expired
                          </span>
                        ) : (
                          <span className="inline-flex items-center rounded-md bg-emerald-50 text-emerald-700 border border-emerald-200 px-2.5 py-0.5 text-xs font-bold capitalize">
                            Active
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-4 text-right">
                        {isActive ? (
                          <button
                            onClick={() => handleRevokeKey(key.id)}
                            className="inline-flex items-center space-x-1 text-xs font-bold text-rose-600 hover:text-rose-800 transition-colors"
                          >
                            <Trash2 className="h-4 w-4" />
                            <span>Revoke</span>
                          </button>
                        ) : (
                          <span className="text-slate-300 text-xs font-bold">Inoperable</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Creation Modal drawer */}
      {isDrawerOpen && (
        <div className="fixed inset-0 z-50 flex justify-end">
          <div onClick={() => setIsDrawerOpen(false)} className="fixed inset-0 bg-black/45 backdrop-blur-xs" />

          <div className="relative flex w-full max-w-md flex-col bg-white p-6 shadow-xl h-full overflow-y-auto">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100">
              <h2 className="text-base font-bold text-slate-900 flex items-center space-x-2">
                <Key className="h-5 w-5 text-indigo-600" />
                <span>Generate Secure API Key</span>
              </h2>
              <button onClick={() => setIsDrawerOpen(false)} className="text-slate-400 hover:text-slate-600">
                <X className="h-5 w-5" />
              </button>
            </div>

            {formError && (
              <div className="mt-4 flex items-start space-x-2 rounded-lg bg-red-50 p-3 border border-red-200 text-red-800 text-xs font-semibold">
                <AlertTriangle className="h-4.5 w-4.5 text-red-500 shrink-0 mt-0.5" />
                <span>{formError}</span>
              </div>
            )}

            {/* Warning exactly ONCE token display (Stripe design!) */}
            {createdPlaintextKey ? (
              <div className="mt-6 space-y-6 flex-1 flex flex-col justify-between">
                <div className="space-y-4">
                  <div className="rounded-xl border border-rose-200 bg-rose-50/50 p-4 border-dashed text-rose-800 text-xs leading-relaxed space-y-3">
                    <span className="block text-[10px] font-bold text-rose-600 uppercase tracking-wider">
                      ⚠️ Secure API Token Key generated
                    </span>
                    <p>
                      Please save this token key immediately. For strict security constraints, this key is hashed with sha256 on our backend database and <b>cannot be viewed ever again</b>.
                    </p>
                  </div>

                  <div className="rounded-lg bg-slate-950 p-4 flex items-center justify-between text-xs border border-slate-800">
                    <span className="font-mono text-emerald-400 font-bold select-all truncate pr-4">
                      {createdPlaintextKey}
                    </span>
                    <button
                      onClick={handleCopyKey}
                      className="shrink-0 flex items-center justify-center h-8 w-8 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors border border-slate-700/60"
                    >
                      {copiedKey ? (
                        <Check className="h-4.5 w-4.5 text-emerald-400 animate-pulse" />
                      ) : (
                        <Copy className="h-4.5 w-4.5" />
                      )}
                    </button>
                  </div>
                </div>

                <div className="pt-6 border-t border-slate-100">
                  <button
                    onClick={() => {
                      setCreatedPlaintextKey(null);
                      setIsDrawerOpen(false);
                    }}
                    className="w-full rounded-lg bg-slate-900 py-2.5 text-center text-xs font-bold text-white shadow-sm hover:bg-slate-800 transition-all"
                  >
                    I Have Safely Saved This Secret Key
                  </button>
                </div>
              </div>
            ) : (
              <form onSubmit={handleCreateKey} className="mt-6 space-y-4 flex-1">
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider">
                    Key Description Name *
                  </label>
                  <input
                    type="text"
                    required
                    value={keyName}
                    onChange={(e) => setKeyName(e.target.value)}
                    placeholder="e.g. Backend Production Server"
                    className="mt-1.5 block w-full rounded-lg border border-slate-300 bg-white px-3.5 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 transition-all font-bold"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center space-x-1">
                    <Calendar className="h-3.5 w-3.5 text-slate-400" />
                    <span>Token Lifespan Expiration</span>
                  </label>
                  <select
                    value={expiresInDays}
                    onChange={(e) => setExpiresInDays(e.target.value)}
                    className="mt-1.5 block w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 transition-all font-semibold"
                  >
                    <option value="never">Never (Non-expiring secure credential)</option>
                    <option value="30">Expires in 30 days</option>
                    <option value="90">Expires in 90 days</option>
                    <option value="365">Expires in 365 days</option>
                  </select>
                </div>

                <div className="pt-6 border-t border-slate-100 flex space-x-3 mt-auto">
                  <button
                    type="button"
                    onClick={() => setIsDrawerOpen(false)}
                    className="flex-1 rounded-lg border border-slate-200 py-2 text-center text-xs font-bold text-slate-700 hover:bg-slate-50 transition-all"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="flex-1 flex justify-center items-center rounded-lg bg-indigo-600 py-2 text-center text-xs font-bold text-white shadow-sm hover:bg-indigo-500 transition-all disabled:opacity-50"
                  >
                    {isSubmitting ? (
                      <>
                        <RefreshCw className="h-4.5 w-4.5 animate-spin mr-1.5" />
                        <span>Generating...</span>
                      </>
                    ) : (
                      <span>Generate Key</span>
                    )}
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
