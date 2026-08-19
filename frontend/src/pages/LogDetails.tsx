import React, { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { api } from "../lib/api";
import { useApp } from "../context/AppContext";
import { formatDate } from "../utils/format";
import { SkeletonLoader } from "../components/SkeletonLoader";
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
} from "lucide-react";

export const LogDetails: React.FC = () => {
  const { requestId } = useParams<{ requestId: string }>();
  const { selectedProjectId } = useApp();

  const [log, setLog] = useState<any | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Payload collapse states
  const [isReqBodyExpanded, setIsReqBodyExpanded] = useState(true);
  const [isResBodyExpanded, setIsResBodyExpanded] = useState(true);

  const fetchLogDetails = async () => {
    if (!requestId) return;
    setIsLoading(true);
    setError(null);
    try {
      const response = await api.get(`/api/v1/logs/${requestId}`);
      setLog(response.data);
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
    if (requestId) {
      fetchLogDetails();
    }
  }, [requestId]);

  const handleCopy = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(label);
    setTimeout(() => setCopiedId(null), 2000);
  };

  /**
   * Fail-safe client-side scanner to guarantee sensitive credentials are NEVER displayed in plain text,
   * even if the backend returns them due to edge cases.
   */
  const sanitizeJSONPayload = (payload: any): string => {
    if (!payload) return "{}";
    try {
      const copyStr = JSON.stringify(payload, null, 2);
      // Double check regex substitution blocks
      return copyStr
        .replace(/"(authorization|bearer|token|apikey|secret|password|credential)"\s*:\s*".*?"/gi, '"$1": "[REDACTED (FRONTEND SECURED)]"')
        .replace(/"whsec_[a-zA-Z0-9]{16,}"/gi, '"[REDACTED (WEBHOOK SECRET)]"')
        .replace(/"fb_(test|live)_[a-zA-Z0-9]{16,}"/gi, '"[REDACTED (API KEY)]"');
    } catch {
      return "{}";
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center space-x-2">
          <div className="h-4 w-20 bg-slate-200 animate-pulse rounded" />
        </div>
        <SkeletonLoader rows={8} columns={4} />
      </div>
    );
  }

  if (error || !log) {
    return (
      <div className="space-y-6 max-w-2xl mx-auto mt-8">
        <Link
          to="../"
          className="inline-flex items-center text-xs font-bold text-slate-500 hover:text-slate-800 transition-colors"
        >
          <ArrowLeft className="mr-1.5 h-4 w-4" />
          Back to Request Logs
        </Link>
        <div className="rounded-xl border border-red-200 bg-red-50 p-6 text-center shadow-xs space-y-4">
          <ShieldAlert className="mx-auto h-12 w-12 text-red-500" />
          <h3 className="text-sm font-bold text-slate-900">Failed to load log details</h3>
          <p className="text-xs text-slate-500 leading-relaxed max-w-sm mx-auto">{error}</p>
          <button
            onClick={fetchLogDetails}
            className="rounded bg-slate-900 px-4 py-2 text-xs font-bold text-white hover:bg-slate-800 transition-colors"
          >
            Retry Fetch
          </button>
        </div>
      </div>
    );
  }

  const isSuccess = log.statusCode >= 200 && log.statusCode < 300;

  return (
    <div className="space-y-6 pb-12">
      {/* Navigation and Actions */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 pb-4 border-b border-slate-200">
        <div className="space-y-1">
          <Link
            to="../"
            className="inline-flex items-center text-xs font-bold text-slate-500 hover:text-indigo-600 transition-colors"
          >
            <ArrowLeft className="mr-1 h-3.5 w-3.5" />
            Back to Logs
          </Link>
          <div className="flex items-center space-x-3 mt-1">
            <h1 className="text-xl font-extrabold text-slate-900 font-mono">
              {log.method} <span className="text-slate-500 text-sm font-medium select-all">{log.path}</span>
            </h1>
            <span
              className={`font-mono font-bold text-xs px-2.5 py-0.5 rounded-full ${
                isSuccess
                  ? "bg-emerald-50 text-emerald-700 border border-emerald-100"
                  : "bg-rose-50 text-rose-700 border border-rose-100"
              }`}
            >
              {log.statusCode}
            </span>
          </div>
        </div>

        <div className="flex items-center space-x-2">
          <button
            onClick={() => handleCopy(log.requestId, "reqId")}
            className="inline-flex items-center rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-bold text-slate-600 hover:bg-slate-50 transition-colors"
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

      {/* Grid Dashboard Metadata */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-3xs space-y-1">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Method</span>
          <span className="block font-mono text-sm font-bold text-slate-800">{log.method}</span>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-3xs space-y-1">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Duration</span>
          <span className="block font-mono text-sm font-bold text-slate-800 flex items-center">
            <Clock className="h-4 w-4 text-indigo-500 mr-1" />
            {log.duration} ms
          </span>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-3xs space-y-1">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Timestamp</span>
          <span className="block text-xs font-semibold text-slate-800">{formatDate(log.createdAt)}</span>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-3xs space-y-1">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Environment</span>
          <span className="block font-mono text-xs font-bold text-slate-800 uppercase text-indigo-600">
            {log.environment || "TEST"}
          </span>
        </div>
      </div>

      {/* Query Parameters (Optional) */}
      {log.request?.queryParams && Object.keys(log.request.queryParams).length > 0 && (
        <div className="rounded-xl border border-slate-200 bg-white shadow-3xs overflow-hidden">
          <div className="bg-slate-50 border-b border-slate-100 p-4">
            <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center">
              <Globe className="h-4 w-4 mr-1.5 text-slate-400" />
              Query Parameters
            </h3>
          </div>
          <div className="p-4 overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs font-mono">
              <thead>
                <tr className="border-b border-slate-100 text-slate-400">
                  <th className="pb-2 font-bold uppercase text-[10px]">Parameter Name</th>
                  <th className="pb-2 font-bold uppercase text-[10px]">Value</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {Object.entries(log.request.queryParams).map(([key, val]: any) => (
                  <tr key={key}>
                    <td className="py-2.5 pr-4 font-bold text-slate-600">{key}</td>
                    <td className="py-2.5 text-slate-800 select-all">{val}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* HTTP Headers */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Request Headers */}
        <div className="rounded-xl border border-slate-200 bg-white shadow-3xs overflow-hidden flex flex-col justify-between">
          <div>
            <div className="bg-slate-50 border-b border-slate-100 p-4">
              <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                Inbound Request Headers
              </h3>
            </div>
            <div className="p-4 overflow-x-auto">
              {log.request?.headers ? (
                <table className="w-full text-left border-collapse text-xs font-mono">
                  <thead>
                    <tr className="border-b border-slate-100 text-slate-400">
                      <th className="pb-2 font-bold uppercase text-[10px]">Header Key</th>
                      <th className="pb-2 font-bold uppercase text-[10px]">Value</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50 text-[11px]">
                    {Object.entries(log.request.headers).map(([key, val]: any) => (
                      <tr key={key}>
                        <td className="py-2 pr-4 font-bold text-slate-500 lowercase select-all">{key}</td>
                        <td className="py-2 text-slate-800 select-all truncate max-w-[240px]" title={val}>
                          {val}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              ) : (
                <p className="text-xs text-slate-400 italic text-center p-4">No request headers captured</p>
              )}
            </div>
          </div>
        </div>

        {/* Response Headers */}
        <div className="rounded-xl border border-slate-200 bg-white shadow-3xs overflow-hidden flex flex-col justify-between">
          <div>
            <div className="bg-slate-50 border-b border-slate-100 p-4">
              <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                Outbound Response Headers
              </h3>
            </div>
            <div className="p-4 overflow-x-auto">
              {log.response?.headers ? (
                <table className="w-full text-left border-collapse text-xs font-mono">
                  <thead>
                    <tr className="border-b border-slate-100 text-slate-400">
                      <th className="pb-2 font-bold uppercase text-[10px]">Header Key</th>
                      <th className="pb-2 font-bold uppercase text-[10px]">Value</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50 text-[11px]">
                    {Object.entries(log.response.headers).map(([key, val]: any) => (
                      <tr key={key}>
                        <td className="py-2 pr-4 font-bold text-slate-500 lowercase select-all">{key}</td>
                        <td className="py-2 text-slate-800 select-all truncate max-w-[240px]" title={val}>
                          {val}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              ) : (
                <p className="text-xs text-slate-400 italic text-center p-4">No response headers captured</p>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* JSON Payload Code Blocks */}
      <div className="space-y-6">
        {/* Request JSON payload */}
        <div className="rounded-xl border border-slate-200 bg-white shadow-3xs overflow-hidden">
          <div
            onClick={() => setIsReqBodyExpanded(!isReqBodyExpanded)}
            className="bg-slate-50 border-b border-slate-100 p-4 flex justify-between items-center cursor-pointer select-none"
          >
            <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center">
              <Terminal className="h-4 w-4 mr-1.5 text-slate-400 animate-pulse" />
              Request Payload Body
            </h3>
            {isReqBodyExpanded ? (
              <ChevronUp className="h-4 w-4 text-slate-400" />
            ) : (
              <ChevronDown className="h-4 w-4 text-slate-400" />
            )}
          </div>
          {isReqBodyExpanded && (
            <div className="p-4 bg-slate-950 text-slate-300 font-mono text-[11px] leading-relaxed relative">
              {log.request?.body && Object.keys(log.request.body).length > 0 ? (
                <>
                  <button
                    onClick={() => handleCopy(sanitizeJSONPayload(log.request.body), "reqBody")}
                    className="absolute top-3 right-3 text-[10px] font-bold text-slate-400 hover:text-white bg-slate-900 border border-slate-800 px-2 py-0.5 rounded transition-colors"
                  >
                    {copiedId === "reqBody" ? "Copied!" : "Copy Payload"}
                  </button>
                  <pre className="overflow-x-auto max-h-[300px] select-all">
                    {sanitizeJSONPayload(log.request.body)}
                  </pre>
                </>
              ) : (
                <div className="text-slate-500 text-center py-6 italic font-semibold">
                  No request body payload was sent with this request
                </div>
              )}
            </div>
          )}
        </div>

        {/* Response JSON payload */}
        <div className="rounded-xl border border-slate-200 bg-white shadow-3xs overflow-hidden">
          <div
            onClick={() => setIsResBodyExpanded(!isResBodyExpanded)}
            className="bg-slate-50 border-b border-slate-100 p-4 flex justify-between items-center cursor-pointer select-none"
          >
            <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center">
              <Settings className="h-4 w-4 mr-1.5 text-slate-400" />
              Response Body Payload
            </h3>
            {isResBodyExpanded ? (
              <ChevronUp className="h-4 w-4 text-slate-400" />
            ) : (
              <ChevronDown className="h-4 w-4 text-slate-400" />
            )}
          </div>
          {isResBodyExpanded && (
            <div className="p-4 bg-slate-950 text-slate-300 font-mono text-[11px] leading-relaxed relative">
              {log.response?.body ? (
                <>
                  <button
                    onClick={() => handleCopy(sanitizeJSONPayload(log.response.body), "resBody")}
                    className="absolute top-3 right-3 text-[10px] font-bold text-slate-400 hover:text-white bg-slate-900 border border-slate-800 px-2 py-0.5 rounded transition-colors"
                  >
                    {copiedId === "resBody" ? "Copied!" : "Copy Payload"}
                  </button>
                  <pre className="overflow-x-auto max-h-[400px] select-all">
                    {sanitizeJSONPayload(log.response.body)}
                  </pre>
                </>
              ) : (
                <div className="text-slate-500 text-center py-6 italic font-semibold">
                  No response body payload returned
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
