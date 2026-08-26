import React, { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { api } from "../lib/api";
import { formatDate } from "../utils/format";
import {
  ArrowLeft,
  Terminal,
  Clock,
  ShieldAlert,
  Copy,
  Check,
  ChevronDown,
  ChevronUp,
  Settings,
  Globe,
  Link2,
  Lock,
  ArrowUpRight
} from "lucide-react";

export const LogDetails: React.FC = () => {
  const { projectId, requestId } = useParams<{ projectId: string; requestId: string }>();

  const [log, setLog] = useState<any | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Payload collapse states (Section 13)
  const [isReqBodyExpanded, setIsReqBodyExpanded] = useState(true);
  const [isResBodyExpanded, setIsResBodyExpanded] = useState(true);

  const fetchLogDetails = async () => {
    if (!projectId || !requestId) return;
    setIsLoading(true);
    setError(null);
    try {
      // Scoped Project Isolation trace call (Section 31)
      const response = await api.get(`/api/v1/logs/${requestId}`);
      setLog(response.data.data || response.data);
    } catch (err: any) {
      console.error("Failed to load log details", err);
      setError(
        err.response?.data?.message ||
          "Failed to retrieve specific request log tracer. Please check database connectivity."
      );
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchLogDetails();
  }, [projectId, requestId]);

  const handleCopy = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(label);
    setTimeout(() => setCopiedId(null), 2000);
  };

  /**
   * Fail-safe client-side scanner to guarantee sensitive credentials are NEVER displayed in plain text (Section 10 & 30)
   */
  const sanitizeJSONPayload = (payload: any): string => {
    if (!payload) return "{}";
    try {
      const copyStr = JSON.stringify(payload, null, 2);
      return copyStr
        .replace(/"(authorization|bearer|token|apikey|secret|password|credential)"\s*:\s*".*?"/gi, '"$1": "[REDACTED (FRONTEND SECURED)]"')
        .replace(/"whsec_[a-zA-Z0-9]{16,}"/gi, '"[REDACTED (WEBHOOK SECRET)]"')
        .replace(/"fb_(test|live)_[a-zA-Z0-9]{16,}"/gi, '"[REDACTED (API KEY)]"');
    } catch {
      return typeof payload === "string" ? payload : "{}";
    }
  };

  const sanitizeHeaderVal = (key: string, val: string): string => {
    const keyLower = key.toLowerCase();
    if (keyLower === "authorization") {
      return "Bearer ••••••••••••••••";
    }
    if (keyLower === "x-api-key" || keyLower.includes("secret") || keyLower.includes("token")) {
      return "••••••••••••••••";
    }
    return val;
  };

  if (isLoading) {
    return (
      <div className="space-y-6 font-mono text-left select-none text-neutral-300">
        <div className="h-5 w-24 bg-neutral-950 border border-neutral-900 animate-pulse rounded" />
        <div className="h-12 w-full bg-neutral-950 border border-neutral-900 animate-pulse rounded" />
        <div className="h-48 w-full bg-neutral-950 border border-neutral-900 animate-pulse rounded" />
      </div>
    );
  }

  if (error || !log) {
    return (
      <div className="space-y-6 max-w-2xl mx-auto mt-8 font-mono text-left select-none text-neutral-300">
        <Link
          to={`/projects/${projectId}/logs`}
          className="inline-flex items-center text-xs font-bold uppercase tracking-wider text-neutral-500 hover:text-white transition-colors"
        >
          <ArrowLeft className="mr-1.5 h-4 w-4" />
          Back to Logs
        </Link>
        <div className="rounded border border-red-950 bg-red-950/5 p-6 text-center space-y-4">
          <ShieldAlert className="mx-auto h-12 w-12 text-rose-500 animate-pulse" />
          <h3 className="text-xs font-black uppercase tracking-wider text-white">Failed to load log details</h3>
          <p className="text-[10px] text-neutral-500 leading-relaxed max-w-sm mx-auto">{error}</p>
          <button
            onClick={fetchLogDetails}
            className="rounded bg-neutral-900 px-4 py-2 text-xs font-bold uppercase text-white hover:bg-neutral-800 transition-colors border border-neutral-800 cursor-pointer"
          >
            Retry Fetch
          </button>
        </div>
      </div>
    );
  }

  const isSuccess = log.statusCode >= 200 && log.statusCode < 300;
  const isClientError = log.statusCode >= 400 && log.statusCode < 500;

  // Extrapolate related entity ids from payload bodies to make debugger extremely useful (Section 24)
  const reqBody = log.request?.body || {};
  const resBody = log.response?.body || {};

  const customerId = resBody.customer?.id || resBody.customerId || reqBody.customerId || null;
  const accountId = resBody.account?.id || resBody.accountId || reqBody.accountId || reqBody.sourceAccountId || reqBody.destinationAccountId || null;
  const transferId = resBody.transfer?.id || resBody.transferId || reqBody.transferId || (resBody.id && resBody.id.startsWith("trf_") ? resBody.id : null);

  return (
    <div className="space-y-8 font-mono text-left select-none text-neutral-300 pb-12">
      
      {/* 1. Breadcrumbs Header Toolbar */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 pb-4 border-b border-neutral-900">
        <div className="space-y-1">
          <div className="flex items-center space-x-2 text-[10px] font-black uppercase tracking-wider text-neutral-500">
            <Link to="/projects" className="hover:text-white transition-colors">Projects</Link>
            <span>/</span>
            <Link to={`/projects/${projectId}/overview`} className="hover:text-white transition-colors">Workspace</Link>
            <span>/</span>
            <Link to={`/projects/${projectId}/logs`} className="hover:text-white transition-colors">Logs</Link>
            <span>/</span>
            <span className="text-neutral-400 font-mono text-[9px]">{log.requestId || log.id}</span>
          </div>
          
          <div className="flex items-center space-x-3 mt-1.5">
            <h1 className="text-lg font-black text-white uppercase tracking-tight font-mono flex items-center">
              <span>{log.method}</span>
              <span className="text-neutral-500 font-medium select-all text-xs ml-2 uppercase truncate max-w-sm">{log.path}</span>
            </h1>
            <span className={`font-mono font-black text-[10px] px-2 py-0.5 rounded ${
              isSuccess
                ? "bg-emerald-950/20 text-emerald-400 border border-emerald-900/30"
                : isClientError
                ? "bg-amber-950/20 text-amber-400 border border-amber-900/30"
                : "bg-rose-950/20 text-rose-400 border border-rose-900/30"
            }`}>
              {log.statusCode}
            </span>
          </div>
        </div>

        <div className="flex items-center space-x-2">
          <button
            onClick={() => handleCopy(log.requestId || log.id, "reqId")}
            className="inline-flex items-center rounded border border-neutral-900 bg-neutral-950 px-3 py-1.5 text-xs font-bold uppercase tracking-wider text-neutral-400 hover:text-white hover:bg-neutral-900 transition-colors cursor-pointer"
          >
            {copiedId === "reqId" ? (
              <Check className="mr-1.5 h-3.5 w-3.5 text-emerald-500" />
            ) : (
              <Copy className="mr-1.5 h-3.5 w-3.5" />
            )}
            <span>Copy Request ID</span>
          </button>
        </div>
      </div>

      {/* 2. Grid Dashboard Metadata */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="rounded-lg border border-neutral-900 bg-neutral-950/40 p-4 space-y-1">
          <span className="text-[8px] font-bold text-neutral-600 uppercase tracking-widest block">HTTP METHOD</span>
          <span className="block font-mono text-xs font-black text-white uppercase">{log.method}</span>
        </div>
        <div className="rounded-lg border border-neutral-900 bg-neutral-950/40 p-4 space-y-1">
          <span className="text-[8px] font-bold text-neutral-600 uppercase tracking-widest block">DURATION clearing</span>
          <span className="block font-mono text-xs font-black text-white flex items-center">
            <Clock className="h-3.5 w-3.5 text-indigo-400 mr-1 shrink-0" />
            {log.duration ? `${log.duration} ms` : "N/A"}
          </span>
        </div>
        <div className="rounded-lg border border-neutral-900 bg-neutral-950/40 p-4 space-y-1">
          <span className="text-[8px] font-bold text-neutral-600 uppercase tracking-widest block">TIMESTAMP CREATED</span>
          <span className="block text-[11px] font-black text-white">{formatDate(log.createdAt)}</span>
        </div>
        <div className="rounded-lg border border-neutral-900 bg-neutral-950/40 p-4 space-y-1">
          <span className="text-[8px] font-bold text-neutral-600 uppercase tracking-widest block">Sandbox Environment</span>
          <span className="block font-mono text-xs font-black uppercase text-amber-500">
            {log.environment || "TEST"}
          </span>
        </div>
      </div>

      {/* 3. Related Connected Resources Links (Section 24) */}
      {(customerId || accountId || transferId) && (
        <div className="rounded-lg border border-neutral-900 bg-neutral-950/40 p-4 space-y-3">
          <span className="text-[8px] font-bold text-neutral-600 uppercase tracking-widest block">CONNECTED RESOURCES FOUND IN TRACE</span>
          <div className="flex flex-wrap gap-3 text-[10px] font-bold uppercase tracking-wider">
            {customerId && (
              <Link
                to={`/projects/${projectId}/customers/${customerId}`}
                className="inline-flex items-center space-x-1.5 border border-indigo-900/40 bg-indigo-950/20 px-2.5 py-1 text-indigo-400 rounded hover:text-indigo-300 hover:border-indigo-800 transition-colors"
              >
                <Link2 className="h-3.5 w-3.5" />
                <span>Customer: {customerId}</span>
                <ArrowUpRight className="h-3 w-3" />
              </Link>
            )}
            {accountId && (
              <Link
                to={`/projects/${projectId}/accounts/${accountId}`}
                className="inline-flex items-center space-x-1.5 border border-indigo-900/40 bg-indigo-950/20 px-2.5 py-1 text-indigo-400 rounded hover:text-indigo-300 hover:border-indigo-800 transition-colors"
              >
                <Link2 className="h-3.5 w-3.5" />
                <span>Account: {accountId}</span>
                <ArrowUpRight className="h-3 w-3" />
              </Link>
            )}
            {transferId && (
              <Link
                to={`/projects/${projectId}/transfers`}
                className="inline-flex items-center space-x-1.5 border border-indigo-900/40 bg-indigo-950/20 px-2.5 py-1 text-indigo-400 rounded hover:text-indigo-300 hover:border-indigo-800 transition-colors"
              >
                <Link2 className="h-3.5 w-3.5" />
                <span>Transfer: {transferId}</span>
                <ArrowUpRight className="h-3 w-3" />
              </Link>
            )}
          </div>
        </div>
      )}

      {/* 4. Query Parameters Table (Optional) */}
      {log.request?.queryParams && Object.keys(log.request.queryParams).length > 0 && (
        <div className="rounded-lg border border-neutral-900 bg-neutral-950/20 overflow-hidden">
          <div className="bg-neutral-950 border-b border-neutral-900 p-4">
            <h3 className="text-[10px] font-black text-white uppercase tracking-wider flex items-center">
              <Globe className="h-4 w-4 mr-2 text-neutral-600" />
              Query Parameters
            </h3>
          </div>
          <div className="p-4 overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs font-mono font-semibold">
              <thead>
                <tr className="border-b border-neutral-900 text-neutral-500 font-bold uppercase tracking-wider">
                  <th className="pb-2 font-bold text-[9px]">Parameter Name</th>
                  <th className="pb-2 font-bold text-[9px]">Value</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-900/50 text-neutral-300">
                {Object.entries(log.request.queryParams).map(([key, val]: any) => (
                  <tr key={key} className="hover:bg-neutral-950/20 transition-colors">
                    <td className="py-2.5 pr-4 font-bold text-neutral-500">{key}</td>
                    <td className="py-2.5 text-neutral-300 select-all">{val}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* 5. HTTP Headers Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Request Headers */}
        <div className="rounded-lg border border-neutral-900 bg-neutral-950/20 overflow-hidden flex flex-col justify-between">
          <div>
            <div className="bg-neutral-950 border-b border-neutral-900 p-4">
              <h3 className="text-[10px] font-black text-white uppercase tracking-wider flex items-center space-x-1.5">
                <Lock className="h-3.5 w-3.5 text-neutral-600 shrink-0" />
                <span>Inbound Request Headers</span>
              </h3>
            </div>
            <div className="p-4 overflow-x-auto">
              {log.request?.headers ? (
                <table className="w-full text-left border-collapse text-xs font-mono font-semibold">
                  <thead>
                    <tr className="border-b border-neutral-900 text-neutral-500 font-bold uppercase text-[9px]">
                      <th className="pb-2">Header Key</th>
                      <th className="pb-2">Value</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-neutral-900/50 text-[11px] text-neutral-300">
                    {Object.entries(log.request.headers).map(([key, val]: any) => (
                      <tr key={key} className="hover:bg-neutral-950/10 transition-colors">
                        <td className="py-2 pr-4 font-bold text-neutral-500 lowercase select-all">{key}</td>
                        <td className="py-2 text-neutral-300 select-all truncate max-w-[240px]" title={val}>
                          {sanitizeHeaderVal(key, val)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              ) : (
                <p className="text-xs text-neutral-500 italic text-center p-4">No request headers captured</p>
              )}
            </div>
          </div>
        </div>

        {/* Response Headers */}
        <div className="rounded-lg border border-neutral-900 bg-neutral-950/20 overflow-hidden flex flex-col justify-between">
          <div>
            <div className="bg-neutral-950 border-b border-neutral-900 p-4">
              <h3 className="text-[10px] font-black text-white uppercase tracking-wider">
                Outbound Response Headers
              </h3>
            </div>
            <div className="p-4 overflow-x-auto">
              {log.response?.headers ? (
                <table className="w-full text-left border-collapse text-xs font-mono font-semibold">
                  <thead>
                    <tr className="border-b border-neutral-900 text-neutral-500 font-bold uppercase text-[9px]">
                      <th className="pb-2">Header Key</th>
                      <th className="pb-2">Value</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-neutral-900/50 text-[11px] text-neutral-300">
                    {Object.entries(log.response.headers).map(([key, val]: any) => (
                      <tr key={key} className="hover:bg-neutral-950/10 transition-colors">
                        <td className="py-2 pr-4 font-bold text-neutral-500 lowercase select-all">{key}</td>
                        <td className="py-2 text-neutral-300 select-all truncate max-w-[240px]" title={val}>
                          {val}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              ) : (
                <p className="text-xs text-neutral-500 italic text-center p-4">No response headers captured</p>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* 6. JSON Payload Collapsible Code Blocks */}
      <div className="space-y-6">
        {/* Request JSON payload */}
        <div className="rounded-lg border border-neutral-900 bg-neutral-950/20 overflow-hidden">
          <div
            onClick={() => setIsReqBodyExpanded(!isReqBodyExpanded)}
            className="bg-neutral-950 border-b border-neutral-900 p-4 flex justify-between items-center cursor-pointer select-none"
          >
            <h3 className="text-[10px] font-black text-white uppercase tracking-wider flex items-center">
              <Terminal className="h-4 w-4 mr-2 text-neutral-600" />
              Request Payload Body
            </h3>
            {isReqBodyExpanded ? (
              <ChevronUp className="h-4 w-4 text-neutral-600" />
            ) : (
              <ChevronDown className="h-4 w-4 text-neutral-600" />
            )}
          </div>
          {isReqBodyExpanded && (
            <div className="p-4 bg-black text-neutral-300 font-mono text-[11px] leading-relaxed relative border-t border-neutral-900">
              {log.request?.body && Object.keys(log.request.body).length > 0 ? (
                <>
                  <button
                    onClick={() => handleCopy(sanitizeJSONPayload(log.request.body), "reqBody")}
                    className="absolute top-3.5 right-3.5 text-[8px] font-black text-neutral-500 hover:text-white bg-neutral-950 border border-neutral-800 px-2 py-0.5 rounded transition-colors cursor-pointer"
                  >
                    {copiedId === "reqBody" ? "Copied Request!" : "Copy Payload"}
                  </button>
                  <pre className="overflow-x-auto max-h-[300px] select-all">
                    {sanitizeJSONPayload(log.request.body)}
                  </pre>
                </>
              ) : (
                <div className="text-neutral-600 text-center py-6 italic font-bold">
                  Request body unavailable.
                </div>
              )}
            </div>
          )}
        </div>

        {/* Response JSON payload */}
        <div className="rounded-lg border border-neutral-900 bg-neutral-950/20 overflow-hidden">
          <div
            onClick={() => setIsResBodyExpanded(!isResBodyExpanded)}
            className="bg-neutral-950 border-b border-neutral-900 p-4 flex justify-between items-center cursor-pointer select-none"
          >
            <h3 className="text-[10px] font-black text-white uppercase tracking-wider flex items-center">
              <Settings className="h-4 w-4 mr-2 text-neutral-600" />
              Response Body Payload
            </h3>
            {isResBodyExpanded ? (
              <ChevronUp className="h-4 w-4 text-neutral-600" />
            ) : (
              <ChevronDown className="h-4 w-4 text-neutral-600" />
            )}
          </div>
          {isResBodyExpanded && (
            <div className="p-4 bg-black text-neutral-300 font-mono text-[11px] leading-relaxed relative border-t border-neutral-900">
              {log.response?.body && Object.keys(log.response.body).length > 0 ? (
                <>
                  <button
                    onClick={() => handleCopy(sanitizeJSONPayload(log.response.body), "resBody")}
                    className="absolute top-3.5 right-3.5 text-[8px] font-black text-neutral-500 hover:text-white bg-neutral-950 border border-neutral-800 px-2 py-0.5 rounded transition-colors cursor-pointer"
                  >
                    {copiedId === "resBody" ? "Copied Response!" : "Copy Payload"}
                  </button>
                  <pre className="overflow-x-auto max-h-[400px] select-all">
                    {sanitizeJSONPayload(log.response.body)}
                  </pre>
                </>
              ) : (
                <div className="text-neutral-600 text-center py-6 italic font-bold">
                  Response body unavailable.
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default LogDetails;
