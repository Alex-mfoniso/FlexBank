import React, { useEffect, useState } from "react";
import { api } from "../lib/api";
import { useApp } from "../context/AppContext";
import { formatDate } from "../utils/format";
import { StatusBadge } from "../components/StatusBadge";
import { SkeletonLoader } from "../components/SkeletonLoader";
import {
  Webhook,
  Plus,
  X,
  AlertCircle,
  Copy,
  Check,
  Send,
  Eye,
  RefreshCw,
  Clock,
  Terminal,
  ChevronDown,
  ChevronUp,
} from "lucide-react";

export const Webhooks: React.FC = () => {
  const { selectedProjectId } = useApp();

  const [endpoints, setEndpoints] = useState<any[]>([]);
  const [selectedEndpointId, setSelectedAccountId] = useState("");
  const [deliveries, setDeliveries] = useState<any[]>([]);
  
  const [isLoadingEndpoints, setIsLoadingAccounts] = useState(true);
  const [isLoadingDeliveries, setIsLoadingLedger] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Form Creation States
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [targetUrl, setTargetUrl] = useState("");
  const [createdSecret, setCreatedSecret] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  // Copy secrets state
  const [copiedSecret, setCopiedSecret] = useState(false);
  const [copiedDeliveryId, setCopiedDeliveryId] = useState<string | null>(null);

  // Expandable Delivery Log JSON Payload State
  const [expandedDeliveryId, setExpandedDeliveryId] = useState<string | null>(null);

  // Test Event Form States
  const [isTestModalOpen, setIsTestModalOpen] = useState(false);
  const [testEventType, setTestEventType] = useState("transfer.successful");
  const [isSendingTest, setIsSendingTest] = useState(false);
  const [testSuccessMsg, setTestSuccessMsg] = useState<string | null>(null);

  const fetchEndpoints = async () => {
    setIsLoadingAccounts(true);
    setError(null);
    try {
      const response = await api.get("/api/v1/webhooks/endpoints");
      const list = response.data.data || [];
      setEndpoints(list);
      if (list.length > 0) {
        setSelectedAccountId(list[0].id);
      }
    } catch (err: any) {
      console.error("Failed to load webhook endpoints", err);
      setError("Could not load webhook endpoints. Please check database connectivity.");
    } finally {
      setIsLoadingAccounts(false);
    }
  };

  const fetchDeliveries = async (id: string) => {
    if (!id) return;
    setIsLoadingLedger(true);
    try {
      const response = await api.get(`/api/v1/webhooks/endpoints/${id}/deliveries`);
      setDeliveries(response.data.data || []);
    } catch (err) {
      console.error("Failed to fetch webhook deliveries", err);
    } finally {
      setIsLoadingLedger(false);
    }
  };

  useEffect(() => {
    if (selectedProjectId) {
      fetchEndpoints();
    }
  }, [selectedProjectId]);

  useEffect(() => {
    if (selectedEndpointId) {
      fetchDeliveries(selectedEndpointId);
    } else {
      setDeliveries([]);
    }
  }, [selectedEndpointId]);

  const handleCreateEndpoint = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    setIsSubmitting(true);
    setCreatedSecret(null);

    try {
      const response = await api.post("/api/v1/webhooks/endpoints", { url: targetUrl });
      const data = response.data;
      
      // Save secret to show exactly ONCE in a secure warning modal
      setCreatedSecret(data.secret);
      setTargetUrl("");
      
      await fetchEndpoints();
      if (data.id) {
        setSelectedAccountId(data.id);
      }
    } catch (err: any) {
      console.error("Failed to register webhook endpoint", err);
      setFormError(err.message || "Failed to create webhook configuration.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSendTestEvent = async (e: React.FormEvent) => {
    e.preventDefault();
    setTestSuccessMsg(null);
    setIsSendingTest(true);

    try {
      await api.post(`/api/v1/webhooks/endpoints/${selectedEndpointId}/test-event`, {
        eventType: testEventType,
      });

      setTestSuccessMsg(`Simulated test event '${testEventType}' successfully dispatched onto queue!`);
      setTimeout(() => {
        setIsTestModalOpen(false);
        setTestSuccessMsg(null);
      }, 2500);

      // Refresh deliveries
      await fetchDeliveries(selectedEndpointId);
    } catch (err: any) {
      console.error("Test webhook delivery failed", err);
      alert(err.message || "Could not execute mock test webhook post.");
    } finally {
      setIsSendingTest(false);
    }
  };

  const handleCopySecret = () => {
    if (!createdSecret) return;
    navigator.clipboard.writeText(createdSecret);
    setCopiedSecret(true);
    setTimeout(() => setCopiedSecret(false), 2000);
  };

  const handleCopyPayload = (payloadStr: string, deliveryId: string) => {
    navigator.clipboard.writeText(payloadStr);
    setCopiedDeliveryId(deliveryId);
    setTimeout(() => setCopiedDeliveryId(null), 2000);
  };

  const activeEndpoint = endpoints.find((e) => e.id === selectedEndpointId);

  return (
    <div className="space-y-6">
      {/* Upper toolbar */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center pb-5 border-b border-slate-200">
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight text-slate-900">Webhook Web Console</h1>
          <p className="text-xs text-slate-500 font-semibold mt-1">
            Register receiver URLs and audit live transaction postback event streams.
          </p>
        </div>
        <button
          onClick={() => {
            setFormError(null);
            setCreatedSecret(null);
            setIsDrawerOpen(true);
          }}
          className="mt-4 sm:mt-0 flex items-center space-x-1.5 rounded-lg bg-indigo-600 px-4 py-2 text-xs font-bold text-white hover:bg-indigo-500 shadow-xs transition-all"
        >
          <Plus className="h-4 w-4" />
          <span>Add Receiver URL</span>
        </button>
      </div>

      {isLoadingEndpoints ? (
        <SkeletonLoader rows={4} columns={4} />
      ) : error ? (
        <div className="rounded-xl border border-red-200 bg-red-50 p-6 text-center shadow-xs">
          <AlertCircle className="mx-auto h-12 w-12 text-red-500" />
          <h3 className="mt-4 text-sm font-bold text-slate-900">Failed to load webhooks</h3>
          <p className="mt-2 text-xs text-slate-500 max-w-sm mx-auto leading-relaxed">{error}</p>
          <button
            onClick={fetchEndpoints}
            className="mt-4 rounded bg-slate-900 px-3 py-1.5 text-xs font-semibold text-white hover:bg-slate-800"
          >
            Retry
          </button>
        </div>
      ) : endpoints.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-12 text-center shadow-xs">
          <Webhook className="mx-auto h-12 w-12 text-slate-300" />
          <h3 className="mt-4 text-sm font-bold text-slate-900">No Webhook endpoints registered</h3>
          <p className="mt-2 text-xs text-slate-500 max-w-md mx-auto leading-relaxed">
            Configure system-level callbacks to push real-time transaction updates (such as transfer state settlement clearances) instantly to your services.
          </p>
          <button
            onClick={() => setIsDrawerOpen(true)}
            className="mt-6 rounded-lg bg-indigo-600 px-4 py-2 text-xs font-bold text-white hover:bg-indigo-500 shadow-sm"
          >
            Add Webhook Callback Endpoint
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Left panel: Registered Webhooks list */}
          <div className="space-y-4">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">Endpoints List</h3>
            <div className="space-y-3">
              {endpoints.map((ep) => {
                const isActive = ep.id === selectedEndpointId;
                return (
                  <div
                    key={ep.id}
                    onClick={() => setSelectedAccountId(ep.id)}
                    className={`rounded-xl border p-4 shadow-2xs cursor-pointer transition-all ${
                      isActive
                        ? "bg-indigo-50/50 border-indigo-300 ring-1 ring-indigo-300/40"
                        : "bg-white border-slate-200 hover:bg-slate-50"
                    }`}
                  >
                    <div className="flex justify-between items-start mb-2">
                      <span className="font-mono text-[9px] font-bold text-slate-400 select-all shrink-0">
                        {ep.id}
                      </span>
                      <StatusBadge status={ep.status} />
                    </div>
                    <p className="font-bold text-slate-900 text-xs truncate select-all">{ep.url}</p>
                    <div className="flex justify-between items-center mt-3 pt-2.5 border-t border-slate-100">
                      <p className="text-[10px] text-slate-400 font-medium">
                        Registered: {formatDate(ep.createdAt)}
                      </p>
                      {ep.status === "active" && (
                        <button
                          onClick={async (e) => {
                            e.stopPropagation();
                            if (window.confirm("Are you sure you want to disable this webhook callback endpoint?")) {
                              try {
                                await api.delete(`/api/v1/webhooks/endpoints/${ep.id}`);
                                await fetchEndpoints();
                              } catch (err: any) {
                                alert(err.response?.data?.message || err.message || "Failed to disable webhook endpoint");
                              }
                            }
                          }}
                          className="text-[10px] font-bold text-rose-500 hover:text-rose-700 hover:underline cursor-pointer"
                        >
                          Disable
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Right panel: Active endpoint logs details */}
          <div className="lg:col-span-2 space-y-6">
            <div className="flex items-center justify-between border-b border-slate-200 pb-3">
              <div className="space-y-1">
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">
                  Event Delivery Stream History
                </h3>
                {activeEndpoint && (
                  <p className="text-xs font-bold text-indigo-700 truncate max-w-[280px] sm:max-w-[440px] select-all">
                    Receiver URL: {activeEndpoint.url}
                  </p>
                )}
              </div>
              
              {activeEndpoint?.status === "active" && (
                <button
                  onClick={() => setIsTestModalOpen(true)}
                  className="flex items-center space-x-1 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 px-3 py-1.5 text-xs font-bold border border-slate-200 shadow-3xs transition-all"
                >
                  <Send className="h-3.5 w-3.5 mr-0.5 text-slate-500" />
                  <span>Send Test Hook</span>
                </button>
              )}
            </div>

            {isLoadingDeliveries ? (
              <SkeletonLoader rows={4} columns={4} />
            ) : deliveries.length === 0 ? (
              <div className="rounded-xl border border-dashed border-slate-300 bg-white p-12 text-center shadow-xs">
                <Clock className="mx-auto h-12 w-12 text-slate-300 animate-pulse" />
                <h3 className="mt-4 text-sm font-bold text-slate-900">No events dispatched</h3>
                <p className="mt-2 text-xs text-slate-500 max-w-sm mx-auto leading-relaxed">
                  No postback attempts have occurred yet. You can trigger a mock transaction event using the Send Test Hook tool!
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {deliveries.map((del) => {
                  const isExpanded = expandedDeliveryId === del.id;
                  
                  return (
                    <div
                      key={del.id}
                      className="border border-slate-200 rounded-xl bg-white overflow-hidden shadow-3xs hover:border-slate-300/80 transition-all"
                    >
                      {/* Collapsed view header */}
                      <div
                        onClick={() => setExpandedDeliveryId(isExpanded ? null : del.id)}
                        className="p-4 flex items-center justify-between text-xs cursor-pointer select-none font-semibold text-slate-700"
                      >
                        <div className="flex items-center space-x-3 truncate">
                          <span className="font-mono text-[10px] text-slate-400 select-all shrink-0">
                            {del.id?.slice(0, 14)}...
                          </span>
                          <span className="font-bold text-slate-900 font-mono text-[11px] truncate bg-slate-50 border border-slate-200/60 px-2 py-0.5 rounded">
                            {del.eventType}
                          </span>
                        </div>
                        <div className="flex items-center space-x-4 shrink-0 font-medium">
                          <span className="text-[10px] text-slate-400">{formatDate(del.createdAt)}</span>
                          <span className="text-[10px] text-slate-500">Tries: {del.attempts}</span>
                          <StatusBadge status={del.status} />
                          {isExpanded ? (
                            <ChevronUp className="h-4 w-4 text-slate-400" />
                          ) : (
                            <ChevronDown className="h-4 w-4 text-slate-400" />
                          )}
                        </div>
                      </div>

                      {/* Expanded Raw JSON Payload */}
                      {isExpanded && (
                        <div className="bg-slate-950 border-t border-slate-200/10 p-4 space-y-4">
                          <div className="flex items-center justify-between">
                            <span className="text-[10px] font-bold text-indigo-400 uppercase tracking-wider flex items-center space-x-1.5">
                              <Terminal className="h-4 w-4" />
                              <span>Webhook POST Request JSON</span>
                            </span>
                            
                            <button
                              onClick={() => handleCopyPayload(del.payload, del.id)}
                              className="flex items-center space-x-1 text-[10px] font-bold text-slate-400 hover:text-white bg-slate-800 border border-slate-700/60 px-2.5 py-1 rounded transition-colors"
                            >
                              {copiedDeliveryId === del.id ? (
                                <>
                                  <Check className="h-3.5 w-3.5 text-emerald-400" />
                                  <span>Copied JSON!</span>
                                </>
                              ) : (
                                <>
                                  <Copy className="h-3.5 w-3.5" />
                                  <span>Copy Payload</span>
                                </>
                              )}
                            </button>
                          </div>

                          <pre className="text-slate-300 font-mono text-[11px] leading-relaxed overflow-x-auto p-3 bg-black/40 rounded-lg select-all max-h-[220px]">
                            {JSON.stringify(JSON.parse(del.payload), null, 2)}
                          </pre>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
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
                <Webhook className="h-5 w-5 text-indigo-600" />
                <span>Register Webhook Endpoints</span>
              </h2>
              <button onClick={() => setIsDrawerOpen(false)} className="text-slate-400 hover:text-slate-600">
                <X className="h-5 w-5" />
              </button>
            </div>

            {formError && (
              <div className="mt-4 flex items-start space-x-2 rounded-lg bg-red-50 p-3 border border-red-200 text-red-800 text-xs font-semibold">
                <AlertCircle className="h-4.5 w-4.5 text-red-500 shrink-0 mt-0.5" />
                <span>{formError}</span>
              </div>
            )}

            {/* Warning exactly ONCE signing secret display (Stripe design!) */}
            {createdSecret ? (
              <div className="mt-6 space-y-6 flex-1 flex flex-col justify-between">
                <div className="space-y-4">
                  <div className="rounded-xl border border-amber-200 bg-amber-50/50 p-4 border-dashed text-amber-800 text-xs leading-relaxed space-y-3">
                    <span className="block text-[10px] font-bold text-amber-600 uppercase tracking-wider">
                      ⚠️ Secure Webhook HMAC Signing Secret
                    </span>
                    <p>
                      Please save this signature key immediately. For strict security bounds, this HMAC secret is stored hashed on our backend and <b>cannot be viewed ever again</b>.
                    </p>
                  </div>

                  <div className="rounded-lg bg-slate-950 p-4 flex items-center justify-between text-xs border border-slate-800">
                    <span className="font-mono text-emerald-400 font-bold select-all truncate pr-4">
                      {createdSecret}
                    </span>
                    <button
                      onClick={handleCopySecret}
                      className="shrink-0 flex items-center justify-center h-8 w-8 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors border border-slate-700/60"
                    >
                      {copiedSecret ? (
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
                      setCreatedSecret(null);
                      setIsDrawerOpen(false);
                    }}
                    className="w-full rounded-lg bg-slate-900 py-2.5 text-center text-xs font-bold text-white shadow-sm hover:bg-slate-800 transition-all"
                  >
                    I Have Safely Saved This Key
                  </button>
                </div>
              </div>
            ) : (
              <form onSubmit={handleCreateEndpoint} className="mt-6 space-y-4 flex-1">
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider">
                    Callback Receiver HTTPS Url *
                  </label>
                  <input
                    type="url"
                    required
                    value={targetUrl}
                    onChange={(e) => setTargetUrl(e.target.value)}
                    placeholder="https://api.yourdomain.com/v1/flexbank-webhook"
                    className="mt-1.5 block w-full rounded-lg border border-slate-300 bg-white px-3.5 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 transition-all"
                  />
                  <p className="mt-1.5 text-[10px] text-slate-400 leading-normal">
                    This URL will receive HTTPS POST requests containing event notifications signed with an HMAC header (FlexBank-Signature).
                  </p>
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
                    {isSubmitting ? "Linking..." : "Add Endpoint"}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}

      {/* Send Test Event Modal Popup */}
      {isTestModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div onClick={() => setIsTestModalOpen(false)} className="fixed inset-0 bg-black/45 backdrop-blur-xs" />

          <form
            onSubmit={handleSendTestEvent}
            className="relative flex w-full max-w-sm flex-col bg-white p-6 shadow-xl rounded-xl border border-slate-200 z-50"
          >
            <div className="flex items-center justify-between pb-3.5 border-b border-slate-100">
              <h3 className="text-sm font-bold text-slate-900 flex items-center space-x-1.5">
                <Send className="h-5 w-5 text-indigo-600 animate-bounce" />
                <span>Simulate Test Webhook Callback</span>
              </h3>
              <button
                type="button"
                onClick={() => setIsTestModalOpen(false)}
                className="text-slate-400 hover:text-slate-600"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {testSuccessMsg && (
              <div className="mt-4 flex items-start space-x-1.5 rounded-lg bg-emerald-50 p-2.5 border border-emerald-200 text-emerald-800 text-xs font-bold leading-normal">
                <Check className="h-4.5 w-4.5 text-emerald-500 shrink-0" />
                <span>{testSuccessMsg}</span>
              </div>
            )}

            <div className="mt-5 space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider">
                  Postback Callback Event Class
                </label>
                <select
                  value={testEventType}
                  onChange={(e) => setTestEventType(e.target.value)}
                  className="mt-1.5 block w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 font-semibold"
                >
                  <option value="transfer.successful">transfer.successful (Transfer Succeeded)</option>
                  <option value="transfer.failed">transfer.failed (Transfer Rejected)</option>
                  <option value="account.status_updated">account.status_updated (Account status modified)</option>
                  <option value="customer.created">customer.created (Customer profile registered)</option>
                </select>
              </div>
            </div>

            <div className="pt-4 border-t border-slate-100 flex space-x-3 mt-6">
              <button
                type="button"
                onClick={() => setIsTestModalOpen(false)}
                className="flex-1 rounded-lg border border-slate-200 py-2 text-center text-xs font-bold text-slate-700 hover:bg-slate-50 transition-all"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSendingTest}
                className="flex-1 flex justify-center items-center rounded-lg bg-indigo-600 py-2 text-center text-xs font-bold text-white shadow-xs hover:bg-indigo-500 focus:outline-none disabled:opacity-50 transition-all"
              >
                {isSendingTest ? (
                  <>
                    <RefreshCw className="h-3.5 w-3.5 animate-spin mr-1" />
                    <span>Sending...</span>
                  </>
                ) : (
                  <span>Send Test Event</span>
                )}
              </button>
            </div>
          </form>
        </div>
      )}

    </div>
  );
};
export default Webhooks;
