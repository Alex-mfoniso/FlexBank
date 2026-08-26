import React, { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { api } from "../lib/api";
import { formatDate } from "../utils/format";
import {
  Webhook,
  Plus,
  X,
  AlertTriangle,
  Copy,
  Check,
  Send,
  Eye,
  RefreshCw,
  Clock,
  Terminal,
  ChevronDown,
  ChevronUp,
  Info,
  Sliders,
  Play,
  ShieldCheck,
  Activity,
  Trash2,
  Lock
} from "lucide-react";

export const Webhooks: React.FC = () => {
  const { projectId } = useParams<{ projectId: string }>();

  const [endpoints, setEndpoints] = useState<any[]>([]);
  const [selectedEndpointId, setSelectedEndpointId] = useState("");
  const [deliveries, setDeliveries] = useState<any[]>([]);
  
  const [isLoadingEndpoints, setIsLoadingEndpoints] = useState(true);
  const [isLoadingDeliveries, setIsLoadingDeliveries] = useState(false);
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
  const [copiedEndpointId, setCopiedEndpointId] = useState<string | null>(null);

  // Expandable Delivery Log JSON Payload State
  const [expandedDeliveryId, setExpandedDeliveryId] = useState<string | null>(null);

  // Test Event Form States
  const [isTestModalOpen, setIsTestModalOpen] = useState(false);
  const [testEventType, setTestEventType] = useState("transfer.success");
  const [isSendingTest, setIsSendingTest] = useState(false);
  const [testSuccessMsg, setTestSuccessMsg] = useState<string | null>(null);

  // Supported Event Classes configuration on FlexBank backend (Section 3 & 14)
  const supportedEvents = [
    { name: "transfer.created", desc: "Triggered instantly when a bank transfer is registered in sandbox ledger storage." },
    { name: "transfer.processing", desc: "Dispatched during outbound hold reservation clearance phases." },
    { name: "transfer.success", desc: "Settled and cleared with corresponding debits balancing credits." },
    { name: "transfer.failed", desc: "Rejected due to insufficient balance or processing timeouts." },
    { name: "account.created", desc: "Fires once a client-linked financial wallet is successfully registered." },
    { name: "account.frozen", desc: "Triggered upon freeze admin overrides." },
    { name: "account.closed", desc: "Triggered when a financial wallet is permanently terminated." },
    { name: "customer.created", desc: "Fires when a new customer profile gets mounted." },
    { name: "customer.updated", desc: "Triggered when customer metadata or profile records are edited." },
    { name: "ledger.transaction.created", desc: "Fires when balanced double-entry ledger journal entries are posted." }
  ];

  const fetchEndpoints = async () => {
    if (!projectId) return;
    setIsLoadingEndpoints(true);
    setError(null);
    try {
      // Direct Project Isolation query (Section 24)
      const response = await api.get("/api/v1/webhooks/endpoints", {
        headers: { "x-project-id": projectId }
      });
      const list = response.data.data || [];
      setEndpoints(list);
      if (list.length > 0) {
        setSelectedEndpointId(list[0].id);
      } else {
        setSelectedEndpointId("");
      }
    } catch (err: any) {
      console.error("Failed to load webhook endpoints", err);
      setError("Could not load webhook endpoints. Please check database connectivity.");
    } finally {
      setIsLoadingEndpoints(false);
    }
  };

  const fetchDeliveries = async (id: string) => {
    if (!id || !projectId) return;
    setIsLoadingDeliveries(true);
    try {
      const response = await api.get(`/api/v1/webhooks/endpoints/${id}/deliveries`, {
        headers: { "x-project-id": projectId }
      });
      setDeliveries(response.data.data || []);
    } catch (err) {
      console.error("Failed to fetch webhook deliveries", err);
    } finally {
      setIsLoadingDeliveries(false);
    }
  };

  useEffect(() => {
    fetchEndpoints();
  }, [projectId]);

  useEffect(() => {
    if (selectedEndpointId) {
      fetchDeliveries(selectedEndpointId);
    } else {
      setDeliveries([]);
    }
  }, [selectedEndpointId]);

  const handleCreateEndpoint = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!projectId) return;
    setFormError(null);
    setIsSubmitting(true);
    setCreatedSecret(null);

    // URL validation check (Section 5)
    try {
      const parsedUrl = new URL(targetUrl);
      if (parsedUrl.protocol !== "https:" && parsedUrl.protocol !== "http:") {
        setFormError("Only HTTPS protocol receiver endpoints are recommended for production environments.");
        setIsSubmitting(false);
        return;
      }
      if (parsedUrl.protocol === "http:" && !parsedUrl.hostname.includes("localhost") && !parsedUrl.hostname.includes("127.0.0.1")) {
        setFormError("Standard insecure HTTP webhooks are only supported for local development loops (localhost).");
        setIsSubmitting(false);
        return;
      }
    } catch {
      setFormError("Please output a fully valid URL syntax (e.g., https://api.domain.com/webhook).");
      setIsSubmitting(false);
      return;
    }

    try {
      const response = await api.post(
        "/api/v1/webhooks/endpoints",
        { url: targetUrl },
        { headers: { "x-project-id": projectId } }
      );
      const data = response.data;
      
      // Save secret to show exactly ONCE in a secure warning modal (Section 7)
      setCreatedSecret(data.secret);
      setTargetUrl("");
      
      await fetchEndpoints();
      if (data.id) {
        setSelectedEndpointId(data.id);
      }
    } catch (err: any) {
      console.error("Failed to register webhook endpoint", err);
      setFormError(err.response?.data?.message || err.message || "Failed to create webhook configuration.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleToggleStatus = async (endpoint: any) => {
    if (!projectId) return;
    const nextStatus = endpoint.status === "active" ? "disabled" : "active";
    const confirmMsg = nextStatus === "disabled"
      ? "Disable webhook? Your application will stop receiving events from this endpoint."
      : "Enable webhook? Restores event delivery streams to this receiver URL.";

    if (!window.confirm(confirmMsg)) return;

    try {
      await api.patch(
        `/api/v1/webhooks/endpoints/${endpoint.id}`,
        { status: nextStatus },
        { headers: { "x-project-id": projectId } }
      );
      await fetchEndpoints();
    } catch (err: any) {
      console.error("Failed to update status on endpoint", err);
      alert(err.response?.data?.message || "Failed to modify endpoint status.");
    }
  };

  const handleSendTestEvent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!projectId || !selectedEndpointId) return;
    setTestSuccessMsg(null);
    setIsSendingTest(true);

    try {
      await api.post(
        `/api/v1/webhooks/endpoints/${selectedEndpointId}/test-event`,
        { eventType: testEventType },
        { headers: { "x-project-id": projectId } }
      );

      setTestSuccessMsg(`Simulated test event '${testEventType}' successfully dispatched onto queue!`);
      setTimeout(() => {
        setIsTestModalOpen(false);
        setTestSuccessMsg(null);
      }, 2500);

      // Refresh deliveries
      await fetchDeliveries(selectedEndpointId);
    } catch (err: any) {
      console.error("Test webhook delivery failed", err);
      alert(err.response?.data?.message || err.message || "Could not execute mock test webhook post.");
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

  const handleCopyPayload = (payloadStr: string, deliveryId: string, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    navigator.clipboard.writeText(payloadStr);
    setCopiedDeliveryId(deliveryId);
    setTimeout(() => setCopiedDeliveryId(null), 2000);
  };

  const handleCopyEndpointId = (id: string, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    navigator.clipboard.writeText(id);
    setCopiedEndpointId(id);
    setTimeout(() => setCopiedEndpointId(null), 2000);
  };

  const activeEndpoint = endpoints.find((e) => e.id === selectedEndpointId);

  return (
    <div className="space-y-8 font-mono select-none text-left relative">
      
      {/* 1. Upper Toolbar */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center pb-5 border-b border-neutral-900 gap-4">
        <div>
          <h1 className="text-xl font-black text-white uppercase tracking-tight">Webhooks Web Console</h1>
          <p className="text-[10px] text-neutral-500 font-semibold mt-1">
            Register receiver URLs and audit live transaction postback event streams.
          </p>
        </div>
        <button
          onClick={() => {
            setFormError(null);
            setCreatedSecret(null);
            setIsDrawerOpen(true);
          }}
          className="rounded bg-indigo-600 px-4 py-2 text-xs font-bold uppercase tracking-wider text-white hover:bg-indigo-500 transition-all active:scale-[0.98] flex items-center space-x-1.5 shadow-md shadow-indigo-600/10 cursor-pointer"
        >
          <Plus className="h-4 w-4 shrink-0" />
          <span>Add endpoint</span>
        </button>
      </div>

      {/* Sandbox Test Mode disclaimer banner (Section 23) */}
      <div className="rounded border border-amber-950/40 bg-amber-950/5 px-4 py-3 text-[10px] text-amber-500 font-bold uppercase tracking-wider flex items-start space-x-2">
        <Info className="h-4.5 w-4.5 shrink-0 text-amber-500" />
        <div>
          <span>TEST MODE: Webhook events generated from the sandbox will not represent real financial activity.</span>
        </div>
      </div>

      {/* 2. Webhooks Concept Explanation (Section 3) */}
      <div className="rounded-lg border border-neutral-900 bg-neutral-950/40 p-5 space-y-3">
        <span className="text-[10px] font-black text-indigo-400 uppercase tracking-widest flex items-center space-x-1.5">
          <Sliders className="h-4 w-4 text-indigo-400 shrink-0" />
          <span>Webhook Architecture</span>
        </span>
        <p className="text-xs font-semibold text-neutral-400 max-w-2xl leading-relaxed">
          FlexBank can notify your application when events happen in your project. Each endpoint listens to all project-level events in real-time, utilizing cryptographic HMAC-SHA256 headers to verify payload signatures.
        </p>
        <div className="pt-2">
          <span className="text-[8px] font-bold text-neutral-600 uppercase tracking-widest block mb-2">Supported Project Events:</span>
          <div className="flex flex-wrap gap-1.5">
            {supportedEvents.map((evt) => (
              <span key={evt.name} className="inline-flex items-center rounded border border-neutral-900 bg-neutral-950 px-2 py-0.5 text-[8.5px] font-bold text-neutral-500 uppercase tracking-tight">
                {evt.name}
              </span>
            ))}
          </div>
        </div>
      </div>

      {/* 3. Main View Layout split */}
      {isLoadingEndpoints ? (
        <div className="space-y-4">
          <div className="h-10 bg-neutral-950 border border-neutral-900 rounded animate-pulse" />
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="h-40 bg-neutral-950 border border-neutral-900 rounded animate-pulse" />
            <div className="lg:col-span-2 h-40 bg-neutral-950 border border-neutral-900 rounded animate-pulse" />
          </div>
        </div>
      ) : error ? (
        <div className="rounded border border-red-950 bg-red-950/5 p-6 text-center max-w-md mx-auto">
          <AlertTriangle className="mx-auto h-10 w-10 text-rose-500" />
          <h3 className="mt-4 text-xs font-black uppercase tracking-wider text-white">Failed to load webhooks</h3>
          <p className="mt-2 text-[10px] text-neutral-500 font-semibold">{error}</p>
          <button
            onClick={fetchEndpoints}
            className="mt-5 inline-flex items-center space-x-1.5 rounded bg-neutral-900 px-4 py-2 text-xs font-bold uppercase tracking-wider text-white hover:bg-neutral-800 border border-neutral-800 cursor-pointer"
          >
            <RefreshCw className="h-3.5 w-3.5" />
            <span>Retry Query</span>
          </button>
        </div>
      ) : endpoints.length === 0 ? (
        <div className="rounded-lg border border-neutral-900 bg-neutral-950/10 p-12 text-center max-w-lg mx-auto">
          <Webhook className="mx-auto h-12 w-12 text-neutral-700 animate-pulse" />
          <h3 className="mt-4 text-xs font-black uppercase tracking-widest text-neutral-400">NO WEBHOOKS YET</h3>
          <p className="mt-2 text-[10px] text-neutral-500 font-medium leading-relaxed">
            Add an endpoint to receive real-time FlexBank events. Hook up automated postbacks to clear transactions and verify merchant settlements.
          </p>
          <div className="mt-6">
            <button
              onClick={() => setIsDrawerOpen(true)}
              className="rounded bg-indigo-600 px-4 py-2 text-xs font-bold uppercase text-white hover:bg-indigo-500 transition-all cursor-pointer"
            >
              Add endpoint
            </button>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          
          {/* Left panel: Webhook Endpoints List (Section 2 & 27) */}
          <div className="lg:col-span-4 space-y-4">
            <h3 className="text-[10px] font-bold uppercase tracking-wider text-neutral-600">Registered Endpoints ({endpoints.length})</h3>
            <div className="space-y-3">
              {endpoints.map((ep) => {
                const isActive = ep.id === selectedEndpointId;
                const isEnabled = ep.status === "active";

                return (
                  <div
                    key={ep.id}
                    onClick={() => setSelectedEndpointId(ep.id)}
                    className={`rounded-lg border p-4 cursor-pointer transition-all ${
                      isActive
                        ? "bg-neutral-950 border-indigo-900/60 ring-1 ring-indigo-950"
                        : "bg-neutral-950/30 border-neutral-900 hover:bg-neutral-950/60"
                    }`}
                  >
                    <div className="flex justify-between items-start mb-2.5">
                      <div className="flex items-center space-x-1.5">
                        <span className="font-mono text-[9px] font-bold text-neutral-500 select-all shrink-0">
                          {ep.id}
                        </span>
                        <button
                          onClick={(e) => handleCopyEndpointId(ep.id, e)}
                          className="text-neutral-700 hover:text-white transition-colors cursor-pointer"
                        >
                          {copiedEndpointId === ep.id ? (
                            <Check className="h-3 w-3 text-emerald-500" />
                          ) : (
                            <Copy className="h-3 w-3" />
                          )}
                        </button>
                      </div>
                      <span className={`inline-flex items-center rounded border px-1.5 py-0.5 text-[7px] font-black uppercase tracking-wider leading-none ${
                        isEnabled
                          ? "border-emerald-900/40 bg-emerald-950/20 text-emerald-500"
                          : "border-neutral-800 bg-neutral-900 text-neutral-500"
                      }`}>
                        {ep.status}
                      </span>
                    </div>

                    <p className="font-bold text-white text-xs select-all break-all leading-normal">{ep.url}</p>

                    <div className="flex justify-between items-center mt-3 pt-2.5 border-t border-neutral-900/50">
                      <span className="text-[8px] text-neutral-600 font-bold uppercase tracking-wider">
                        Registered: {formatDate(ep.createdAt)}
                      </span>
                      
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleToggleStatus(ep);
                        }}
                        className={`text-[9px] font-black uppercase tracking-wider hover:underline cursor-pointer ${
                          isEnabled ? "text-rose-500 hover:text-rose-400" : "text-emerald-500 hover:text-emerald-400"
                        }`}
                      >
                        {isEnabled ? "Disable" : "Enable"}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Right panel: Active endpoint logs / Deliveries details (Section 15 & 16) */}
          <div className="lg:col-span-8 space-y-4">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center pb-2.5 border-b border-neutral-900 gap-3">
              <div className="space-y-1">
                <h3 className="text-[10px] font-bold uppercase tracking-wider text-neutral-600">
                  Event Delivery Stream History
                </h3>
                {activeEndpoint && (
                  <p className="text-[11px] font-black text-indigo-400 break-all select-all">
                    Receiver URL: {activeEndpoint.url}
                  </p>
                )}
              </div>
              
              {activeEndpoint?.status === "active" && (
                <button
                  onClick={() => setIsTestModalOpen(true)}
                  className="rounded bg-neutral-900 border border-neutral-800 hover:bg-neutral-800 text-white px-3 py-1.5 text-[10px] font-black uppercase tracking-wider transition-all flex items-center space-x-1 cursor-pointer whitespace-nowrap active:scale-[0.98]"
                >
                  <Send className="h-3.5 w-3.5 text-neutral-500 shrink-0" />
                  <span>Send Test Hook</span>
                </button>
              )}
            </div>

            {isLoadingDeliveries ? (
              <div className="space-y-3 pt-2">
                <div className="h-12 bg-neutral-950 border border-neutral-900 rounded animate-pulse" />
                <div className="h-12 bg-neutral-950 border border-neutral-900 rounded animate-pulse" />
              </div>
            ) : deliveries.length === 0 ? (
              <div className="rounded-lg border border-neutral-900 bg-neutral-950/10 p-12 text-center">
                <Clock className="mx-auto h-10 w-10 text-neutral-700 animate-pulse" />
                <h3 className="mt-4 text-xs font-black uppercase tracking-widest text-neutral-400">No events dispatched</h3>
                <p className="mt-2 text-[10px] text-neutral-500 font-medium">
                  No postback attempts have occurred yet. You can trigger a mock transaction event using the Send Test Hook tool!
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {deliveries.map((del) => {
                  const isExpanded = expandedDeliveryId === del.id;
                  const isSuccess = del.status === "delivered";
                  
                  return (
                    <div
                      key={del.id}
                      className="border border-neutral-900 rounded-lg bg-neutral-950/20 overflow-hidden"
                    >
                      {/* Collapsed view header */}
                      <div
                        onClick={() => setExpandedDeliveryId(isExpanded ? null : del.id)}
                        className="p-4 flex items-center justify-between text-xs cursor-pointer select-none font-semibold text-neutral-300"
                      >
                        <div className="flex items-center space-x-3 truncate">
                          <span className="font-mono text-[9.5px] text-neutral-500 select-all shrink-0">
                            {del.id?.slice(0, 14)}...
                          </span>
                          <span className="font-bold text-white font-mono text-[10px] truncate bg-neutral-950 border border-neutral-900 px-2 py-0.5 rounded tracking-tight">
                            {del.eventType}
                          </span>
                        </div>
                        <div className="flex items-center space-x-4 shrink-0 font-medium text-[10px]">
                          <span className="text-neutral-500 hidden sm:inline">{formatDate(del.createdAt)}</span>
                          <span className="text-neutral-400 font-bold">Attempts: {del.attempts}</span>
                          <span className={`inline-flex items-center rounded border px-1.5 py-0.5 text-[7.5px] font-black uppercase tracking-wider leading-none ${
                            isSuccess
                              ? "border-emerald-900/40 bg-emerald-950/20 text-emerald-500"
                              : "border-red-900/40 bg-red-950/20 text-red-500"
                          }`}>
                            {del.status}
                          </span>
                          {isExpanded ? (
                            <ChevronUp className="h-4 w-4 text-neutral-500" />
                          ) : (
                            <ChevronDown className="h-4 w-4 text-neutral-500" />
                          )}
                        </div>
                      </div>

                      {/* Expanded Raw JSON Payload Viewer (Section 18) */}
                      {isExpanded && (
                        <div className="bg-neutral-950 border-t border-neutral-900/60 p-4 space-y-4">
                          <div className="flex items-center justify-between">
                            <span className="text-[9px] font-bold text-indigo-400 uppercase tracking-wider flex items-center space-x-1.5">
                              <Terminal className="h-4 w-4" />
                              <span>Webhook POST Request JSON Payload</span>
                            </span>
                            
                            <button
                              onClick={(e) => handleCopyPayload(del.payload, del.id, e)}
                              className="flex items-center space-x-1 text-[9px] font-bold text-neutral-400 hover:text-white bg-neutral-900 border border-neutral-800 px-2.5 py-1 rounded transition-colors cursor-pointer"
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

                          <pre className="text-neutral-300 font-mono text-[10.5px] leading-relaxed overflow-x-auto p-3.5 bg-black/50 border border-neutral-900 rounded-lg select-all max-h-[220px]">
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

      {/* 4. Creation Modal drawer (Section 4 & 21) */}
      {isDrawerOpen && (
        <div className="fixed inset-0 z-50 flex justify-end">
          <div onClick={() => setIsDrawerOpen(false)} className="fixed inset-0 bg-black/60 backdrop-blur-xs" />

          <div className="relative flex w-full max-w-md flex-col bg-neutral-950 border-l border-neutral-900 p-6 shadow-2xl h-full overflow-y-auto">
            <div className="flex items-center justify-between pb-4 border-b border-neutral-900">
              <h2 className="text-sm font-black text-white uppercase tracking-wider flex items-center space-x-2">
                <Webhook className="h-5 w-5 text-indigo-500" />
                <span>Add Webhook Endpoint</span>
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

            {/* Warning exactly ONCE signing secret display (Section 7) */}
            {createdSecret ? (
              <div className="mt-6 space-y-6 flex-1 flex flex-col justify-between">
                <div className="space-y-4">
                  <div className="rounded border border-amber-950/40 bg-amber-950/5 p-4 text-amber-500 text-[10px] leading-relaxed space-y-3 font-bold">
                    <span className="block text-[10px] font-black text-amber-500 uppercase tracking-wider">
                      ⚠️ Secure Webhook HMAC Signing Secret
                    </span>
                    <p>
                      Copy this secret now. You may not be able to view it again. For strict security bounds, this HMAC secret is stored hashed on our backend.
                    </p>
                  </div>

                  <div className="rounded bg-black p-4 flex items-center justify-between text-xs border border-neutral-900">
                    <span className="font-mono text-emerald-400 font-bold select-all truncate pr-4">
                      {createdSecret}
                    </span>
                    <button
                      onClick={handleCopySecret}
                      className="shrink-0 flex items-center justify-center h-8 w-8 rounded bg-neutral-900 hover:bg-neutral-800 text-neutral-300 hover:text-white transition-colors border border-neutral-800 cursor-pointer"
                    >
                      {copiedSecret ? (
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
                      setCreatedSecret(null);
                      setIsDrawerOpen(false);
                    }}
                    className="w-full rounded bg-indigo-600 py-2.5 text-center text-xs font-bold uppercase tracking-wider text-white hover:bg-indigo-500 transition-all cursor-pointer"
                  >
                    Saved Secret
                  </button>
                </div>
              </div>
            ) : (
              <form onSubmit={handleCreateEndpoint} className="mt-6 space-y-6 flex-1 flex flex-col justify-between">
                <div className="space-y-5">
                  <div>
                    <label className="block text-[9px] font-bold text-neutral-500 uppercase tracking-wider">
                      Endpoint URL
                    </label>
                    <input
                      type="url"
                      required
                      value={targetUrl}
                      onChange={(e) => setTargetUrl(e.target.value)}
                      placeholder="https://api.yourdomain.com/webhooks/flexbank"
                      className="mt-1.5 block w-full rounded border border-neutral-900 bg-neutral-950 px-3.5 py-2.5 text-xs text-white placeholder:text-neutral-700 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 transition-all"
                    />
                    <p className="mt-1.5 text-[9px] text-neutral-600 leading-normal font-medium">
                      This endpoint URL will receive secure signed POST requests triggered under financial flows.
                    </p>
                  </div>

                  <div>
                    <span className="block text-[9px] font-bold text-neutral-500 uppercase tracking-wider mb-2">Events Subscribed</span>
                    <div className="rounded border border-neutral-900 bg-neutral-950/60 p-4 space-y-3 font-semibold text-[10px] text-neutral-400">
                      <div className="flex items-start space-x-2">
                        <input type="checkbox" defaultChecked disabled className="mt-0.5 cursor-not-allowed" />
                        <div>
                          <span className="font-bold text-white uppercase text-[9px]">All events enabled</span>
                          <p className="text-[9px] text-neutral-600 mt-0.5">By default, all live financial events in this project are dispatched to your receiver.</p>
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
                    {isSubmitting ? "Linking..." : "Create webhook"}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}

      {/* 5. Send Test Event Modal Popup (Section 20) */}
      {isTestModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div onClick={() => setIsTestModalOpen(false)} className="fixed inset-0 bg-black/60 backdrop-blur-xs" />

          <form
            onSubmit={handleSendTestEvent}
            className="relative flex w-full max-w-sm flex-col bg-neutral-950 border border-neutral-900 p-6 shadow-2xl rounded-lg z-50 text-left font-mono"
          >
            <div className="flex items-center justify-between pb-3.5 border-b border-neutral-900">
              <h3 className="text-xs font-black text-white uppercase tracking-wider flex items-center space-x-1.5">
                <Send className="h-4 w-4 text-indigo-500 shrink-0" />
                <span>Simulate webhook event</span>
              </h3>
              <button
                type="button"
                onClick={() => setIsTestModalOpen(false)}
                className="text-neutral-500 hover:text-white cursor-pointer"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {testSuccessMsg && (
              <div className="mt-4 flex items-start space-x-1.5 rounded border border-emerald-950 bg-emerald-950/5 p-2.5 text-emerald-500 text-[10px] font-bold leading-normal">
                <Check className="h-4 w-4 text-emerald-500 shrink-0" />
                <span>{testSuccessMsg}</span>
              </div>
            )}

            <div className="mt-5 space-y-4">
              <div>
                <label className="block text-[9px] font-bold text-neutral-500 uppercase tracking-wider">
                  Postback Callback Event Class
                </label>
                <select
                  value={testEventType}
                  onChange={(e) => setTestEventType(e.target.value)}
                  className="mt-1.5 block w-full rounded border border-neutral-900 bg-neutral-950 px-3.5 py-2 text-xs text-white focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 font-bold cursor-pointer"
                >
                  <option value="transfer.success">transfer.success (Transfer Succeeded)</option>
                  <option value="transfer.failed">transfer.failed (Transfer Rejected)</option>
                  <option value="account.created">account.created (Wallet account created)</option>
                  <option value="customer.created">customer.created (Customer profile registered)</option>
                </select>
              </div>
            </div>

            <div className="pt-4 border-t border-neutral-900 flex space-x-3 mt-6">
              <button
                type="button"
                onClick={() => setIsTestModalOpen(false)}
                className="flex-1 rounded border border-neutral-900 py-2 text-center text-[10px] font-black uppercase tracking-wider text-neutral-500 hover:text-white transition-all cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSendingTest}
                className="flex-1 flex justify-center items-center rounded bg-indigo-600 py-2 text-center text-[10px] font-black uppercase tracking-wider text-white hover:bg-indigo-500 focus:outline-none disabled:opacity-50 transition-all cursor-pointer"
              >
                {isSendingTest ? "Sending..." : "Send test event"}
              </button>
            </div>
          </form>
        </div>
      )}

    </div>
  );
};

export default Webhooks;
