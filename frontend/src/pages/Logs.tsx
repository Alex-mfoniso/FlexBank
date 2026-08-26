import React, { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { api } from "../lib/api";
import { formatDate } from "../utils/format";
import {
  Terminal,
  Search,
  ChevronDown,
  ChevronUp,
  AlertCircle,
  Copy,
  Check,
  Code,
  Network,
  Cpu,
  RefreshCw,
  ExternalLink,
  BookOpen,
  ArrowRight
} from "lucide-react";

export const Logs: React.FC = () => {
  const { projectId } = useParams<{ projectId: string }>();

  const [logs, setLogs] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [methodFilter, setMethodFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Pagination states (Section 17)
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [isCopyingId, setCopyingId] = useState<string | null>(null);

  // Payload collapse states (Section 13)
  const [expandedLogId, setExpandedLogId] = useState<string | null>(null);
  const [copiedSectionId, setCopiedSectionId] = useState<string | null>(null);

  const fetchLogs = async (cursorValue?: string, isAppend = false) => {
    if (!projectId) return;
    if (!isAppend) {
      setIsLoading(true);
    }
    setError(null);

    try {
      const params: any = { limit: 25 };
      if (cursorValue) {
        params.cursor = cursorValue;
      }
      if (methodFilter !== "all") {
        params.method = methodFilter;
      }
      if (statusFilter !== "all") {
        // If status filter is simple category, we handle it on client side, but we can pass status codes if backend supports it.
        // The backend `statusCode` filter supports exact status code (number). So we'll query all and filter or pagination on client.
      }

      // Project Isolation query (Section 31)
      const response = await api.get("/api/v1/logs", { params });
      const newLogs = response.data.data || [];
      const cursor = response.data.pagination?.nextCursor || null;

      if (isAppend) {
        setLogs((prev) => [...prev, ...newLogs]);
      } else {
        setLogs(newLogs);
      }
      setNextCursor(cursor);
    } catch (err: any) {
      console.error("Failed to load developer api request logs", err);
      setError(err.response?.data?.message || "Failed to retrieve inbound API activity records.");
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    fetchLogs();
  }, [projectId, methodFilter]);

  // Track logs viewing for the interactive onboarding checklist
  useEffect(() => {
    if (projectId) {
      localStorage.setItem(`flexbank_onboarding_${projectId}_viewed_logs`, "true");
    }
  }, [projectId]);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await fetchLogs();
  };

  const handleLoadMore = () => {
    if (nextCursor) {
      fetchLogs(nextCursor, true);
    }
  };

  const handleCopyText = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    setCopyingId(label);
    setTimeout(() => setCopyingId(null), 2000);
  };

  const handleCopyJSON = (jsonStr: string, sectionId: string) => {
    navigator.clipboard.writeText(jsonStr);
    setCopiedSectionId(sectionId);
    setTimeout(() => setCopiedSectionId(null), 2000);
  };

  /**
   * Safe payload string sanitization - strips tokens, secrets, and keys (Section 10 & 30)
   */
  const sanitizePayloadStr = (payloadStr: string): string => {
    if (!payloadStr) return "{}";
    try {
      const parsed = typeof payloadStr === "string" ? JSON.parse(payloadStr) : payloadStr;
      const copyStr = JSON.stringify(parsed, null, 2);
      return copyStr
        .replace(/"(authorization|bearer|token|apikey|secret|password|credential)"\s*:\s*".*?"/gi, '"$1": "[REDACTED (FRONTEND SECURED)]"')
        .replace(/"whsec_[a-zA-Z0-9]{16,}"/gi, '"[REDACTED (WEBHOOK SECRET)]"')
        .replace(/"fb_(test|live)_[a-zA-Z0-9]{16,}"/gi, '"[REDACTED (API KEY)]"');
    } catch {
      return payloadStr;
    }
  };

  // Filter logs by status and local query search (Section 14 & 15)
  const filteredLogs = logs.filter((log) => {
    // 1. Status bucket filtering
    if (statusFilter !== "all") {
      const code = log.statusCode;
      if (statusFilter === "2xx" && (code < 200 || code >= 300)) return false;
      if (statusFilter === "4xx" && (code < 400 || code >= 500)) return false;
      if (statusFilter === "5xx" && code < 500) return false;
    }

    // 2. Query text search
    const term = searchQuery.toLowerCase().trim();
    if (!term) return true;

    return (
      log.path?.toLowerCase().includes(term) ||
      log.requestId?.toLowerCase().includes(term) ||
      log.statusCode?.toString().includes(term) ||
      log.method?.toLowerCase().includes(term)
    );
  });

  return (
    <div className="space-y-8 font-mono text-left select-none relative text-neutral-300">
      
      {/* 1. Toolbar header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center pb-5 border-b border-neutral-900 gap-4">
        <div>
          <h1 className="text-xl font-black text-white uppercase tracking-tight">API Logs</h1>
          <p className="text-[10px] text-neutral-500 font-semibold mt-1">
            Monitor requests made to your FlexBank API.
          </p>
        </div>
        <button
          onClick={handleRefresh}
          disabled={isRefreshing || isLoading}
          className="rounded border border-neutral-800 bg-neutral-950 px-4 py-2 text-xs font-bold uppercase tracking-wider text-white hover:bg-neutral-900 transition-all active:scale-[0.98] flex items-center space-x-1.5 cursor-pointer disabled:opacity-40"
        >
          <RefreshCw className={`h-4 w-4 shrink-0 ${isRefreshing ? "animate-spin" : ""}`} />
          <span>{isRefreshing ? "Refreshing..." : "Refresh"}</span>
        </button>
      </div>

      {/* 2. Mode alert info banner */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-center">
        <div className="lg:col-span-12 rounded border border-neutral-900 bg-neutral-950/20 px-4 py-3.5 flex items-start space-x-2.5">
          <Terminal className="h-5 w-5 shrink-0 text-amber-500" />
          <div className="space-y-1">
            <span className="text-[10px] font-black text-amber-500 uppercase tracking-widest block">
              ● TEST MODE API AUDITING
            </span>
            <p className="text-[10px] font-semibold text-neutral-500 leading-relaxed uppercase">
              These logs represent sandbox API activity. Use these diagnostic tools to inspect request parameters, payload shapes, and response traces.
            </p>
          </div>
        </div>
      </div>

      {/* 3. Search and filtering panels */}
      {logs.length > 0 && (
        <div className="flex flex-col md:flex-row gap-4 items-stretch">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-2.5 h-4.5 w-4.5 text-neutral-600" />
            <input
              type="text"
              placeholder="SEARCH REQUEST ID, PATH, STATUS..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="block w-full rounded border border-neutral-900 bg-neutral-950 pl-10 pr-4 py-2.5 text-xs text-white placeholder:text-neutral-700 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 transition-all font-bold uppercase"
            />
          </div>

          <div className="flex space-x-3">
            <select
              value={methodFilter}
              onChange={(e) => setMethodFilter(e.target.value)}
              className="rounded border border-neutral-900 bg-neutral-950 px-3 py-2.5 text-xs font-bold text-neutral-400 focus:border-indigo-500 focus:outline-none cursor-pointer uppercase"
            >
              <option value="all">All Methods</option>
              <option value="GET">GET</option>
              <option value="POST">POST</option>
              <option value="PATCH">PATCH</option>
              <option value="DELETE">DELETE</option>
            </select>

            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="rounded border border-neutral-900 bg-neutral-950 px-3 py-2.5 text-xs font-bold text-neutral-400 focus:border-indigo-500 focus:outline-none cursor-pointer uppercase"
            >
              <option value="all">All Responses</option>
              <option value="2xx">2xx Success</option>
              <option value="4xx">4xx Client Errors</option>
              <option value="5xx">5xx Server Failures</option>
            </select>
          </div>
        </div>
      )}

      {/* 4. Logs rendering */}
      {isLoading && logs.length === 0 ? (
        <div className="space-y-4">
          <div className="h-10 bg-neutral-950 border border-neutral-900 rounded animate-pulse" />
          <div className="h-40 bg-neutral-950 border border-neutral-900 rounded animate-pulse" />
        </div>
      ) : error ? (
        <div className="rounded border border-red-950 bg-red-950/5 p-6 text-center max-w-md mx-auto">
          <AlertCircle className="mx-auto h-10 w-10 text-rose-500 animate-pulse" />
          <h3 className="mt-4 text-xs font-black uppercase tracking-wider text-white">Unable to load API logs</h3>
          <p className="mt-2 text-[10px] text-neutral-500 font-semibold">{error}</p>
          <button
            onClick={() => fetchLogs()}
            className="mt-5 inline-flex items-center space-x-1.5 rounded bg-neutral-900 px-4 py-2 text-xs font-bold uppercase tracking-wider text-white border border-neutral-800 hover:bg-neutral-800 transition-all cursor-pointer"
          >
            <RefreshCw className="h-3.5 w-3.5" />
            <span>Retry Query</span>
          </button>
        </div>
      ) : logs.length === 0 ? (
        <div className="rounded-lg border border-neutral-900 bg-neutral-950/10 p-12 text-center max-w-lg mx-auto">
          <Terminal className="mx-auto h-12 w-12 text-neutral-700" />
          <h3 className="mt-4 text-xs font-black uppercase tracking-widest text-neutral-400">NO API REQUESTS YET</h3>
          <p className="mt-2 text-[10.5px] text-neutral-500 font-medium leading-relaxed uppercase">
            Follow the Quickstart to make your first API request and inspect live developer transaction signals.
          </p>
          <div className="mt-6">
            <Link
              to={`/projects/${projectId}/docs/quickstart`}
              className="rounded bg-indigo-600 px-4 py-2 text-xs font-bold uppercase tracking-wider text-white hover:bg-indigo-500 transition-all inline-flex items-center space-x-1 cursor-pointer"
            >
              <span>Open Quickstart</span>
              <ArrowRight className="h-3 w-3" />
            </Link>
          </div>
        </div>
      ) : filteredLogs.length === 0 ? (
        <div className="rounded border border-neutral-900 bg-neutral-950/5 p-12 text-center">
          <Search className="mx-auto h-10 w-10 text-neutral-700" />
          <h3 className="mt-4 text-xs font-black uppercase tracking-wider text-neutral-400">No matching logs</h3>
          <p className="mt-2 text-[10px] text-neutral-600 font-semibold uppercase">
            Adjust your search querying filters to identify records.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="space-y-3">
            {filteredLogs.map((log) => {
              const isExpanded = expandedLogId === log.id;
              const isSuccess = log.statusCode >= 200 && log.statusCode < 300;
              const isClientError = log.statusCode >= 400 && log.statusCode < 500;
              const isServerError = log.statusCode >= 500;

              return (
                <div
                  key={log.id}
                  className={`rounded-lg border bg-neutral-950/20 overflow-hidden transition-all duration-150 ${
                    isExpanded ? "border-neutral-700 bg-neutral-950/45" : "border-neutral-900 hover:border-neutral-800/80"
                  }`}
                >
                  {/* Collapsed Header list row */}
                  <div
                    onClick={() => setExpandedLogId(isExpanded ? null : log.id)}
                    className="p-4 flex items-center justify-between text-xs cursor-pointer select-none font-bold text-neutral-400 hover:bg-neutral-950/35"
                  >
                    <div className="flex items-center space-x-3.5 min-w-0 flex-1 mr-4">
                      <span className={`font-mono text-[8.5px] font-black px-2 py-0.5 rounded shrink-0 uppercase tracking-widest ${
                        log.method === "POST"
                          ? "bg-indigo-950/30 text-indigo-400 border border-indigo-900/40"
                          : log.method === "DELETE"
                          ? "bg-rose-950/30 text-rose-400 border border-rose-900/40"
                          : log.method === "PATCH"
                          ? "bg-amber-950/30 text-amber-400 border border-amber-900/40"
                          : "bg-neutral-900 text-neutral-500 border border-neutral-800"
                      }`}>
                        {log.method}
                      </span>
                      <span className="font-mono text-xs text-white font-black truncate max-w-sm">
                        {log.path}
                      </span>
                    </div>

                    <div className="flex items-center space-x-4 shrink-0 font-bold">
                      <span className="text-[10px] text-neutral-600 font-mono hidden md:inline select-all truncate max-w-[120px]">
                        {log.requestId || log.id}
                      </span>
                      <span className="text-[9px] text-neutral-500 whitespace-nowrap">{formatDate(log.createdAt)}</span>
                      <span className="text-[10px] text-neutral-500 font-mono whitespace-nowrap">{log.duration ? `${log.duration}ms` : "N/A"}</span>
                      <span className={`font-mono font-black text-[10px] px-2 py-0.5 rounded ${
                        isSuccess
                          ? "bg-emerald-950/20 text-emerald-400 border border-emerald-900/30"
                          : isClientError
                          ? "bg-amber-950/20 text-amber-400 border border-amber-900/30"
                          : "bg-rose-950/20 text-rose-400 border border-rose-900/30"
                      }`}>
                        {log.statusCode}
                      </span>
                      <Link
                        to={`${log.requestId || log.id}`}
                        className="hidden sm:inline-flex items-center space-x-1.5 font-mono font-bold text-[9px] uppercase tracking-wider text-indigo-400 hover:text-indigo-300 border border-indigo-900/45 bg-indigo-950/20 px-2 py-1 rounded transition-colors shrink-0"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <span>inspect trace</span>
                        <ArrowRight className="h-3 w-3" />
                      </Link>
                      {isExpanded ? (
                        <ChevronUp className="h-4 w-4 text-neutral-600 shrink-0" />
                      ) : (
                        <ChevronDown className="h-4 w-4 text-neutral-600 shrink-0" />
                      )}
                    </div>
                  </div>

                  {/* Expanded Payload drawers */}
                  {isExpanded && (
                    <div className="bg-neutral-950/80 border-t border-neutral-900 p-5 space-y-6">
                      
                      {/* Technical Meta Header specs */}
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-[9px] font-bold uppercase tracking-wider pb-4 border-b border-neutral-900 text-neutral-500">
                        <div className="flex items-center space-x-2">
                          <Network className="h-4 w-4 text-neutral-600 shrink-0" />
                          <div>
                            <span className="block text-[8px] text-neutral-700">Inbound Origin IP</span>
                            <span className="font-mono text-neutral-300">{log.ip || "127.0.0.1"}</span>
                          </div>
                        </div>
                        <div className="flex items-center space-x-2">
                          <Cpu className="h-4 w-4 text-neutral-600 shrink-0" />
                          <div>
                            <span className="block text-[8px] text-neutral-700">Latency clearing</span>
                            <span className="font-mono text-neutral-300">{log.duration ? `${log.duration} ms` : "N/A"}</span>
                          </div>
                        </div>
                        <div className="flex items-center space-x-2">
                          <Code className="h-4 w-4 text-neutral-600 shrink-0" />
                          <div>
                            <span className="block text-[8px] text-neutral-700">Trace Request ID</span>
                            <div className="flex items-center space-x-1.5">
                              <span className="font-mono text-neutral-300 truncate max-w-[140px] select-all">{log.requestId || log.id}</span>
                              <button
                                onClick={() => handleCopyText(log.requestId || log.id, log.id)}
                                className="text-neutral-500 hover:text-white cursor-pointer"
                              >
                                {isCopyingId === log.id ? (
                                  <Check className="h-3 w-3 text-emerald-500" />
                                ) : (
                                  <Copy className="h-3 w-3" />
                                )}
                              </button>
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Inbound / Outbound columns */}
                      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        
                        {/* Request block */}
                        <div className="space-y-2">
                          <div className="flex items-center justify-between text-[9px] font-bold uppercase tracking-wider">
                            <span className="text-indigo-400">Request Body Payload</span>
                            {log.requestBody && log.requestBody !== "{}" && (
                              <button
                                onClick={() => handleCopyJSON(sanitizePayloadStr(log.requestBody), `${log.id}-req`)}
                                className="text-[8px] font-black text-neutral-500 hover:text-white bg-neutral-900 border border-neutral-800 px-2 py-0.5 rounded transition-colors cursor-pointer"
                              >
                                {copiedSectionId === `${log.id}-req` ? "Copied!" : "Copy JSON"}
                              </button>
                            )}
                          </div>
                          {log.requestBody && log.requestBody !== "{}" ? (
                            <pre className="text-neutral-300 font-mono text-[10px] leading-relaxed p-4 bg-black border border-neutral-900 rounded-lg select-all overflow-x-auto max-h-[200px]">
                              {sanitizePayloadStr(log.requestBody)}
                            </pre>
                          ) : (
                            <div className="bg-black/40 text-neutral-700 rounded-lg p-4 border border-neutral-900/60 font-mono text-[10px] text-center italic font-bold">
                              No request body payload transmitted.
                            </div>
                          )}
                        </div>

                        {/* Response block */}
                        <div className="space-y-2">
                          <div className="flex items-center justify-between text-[9px] font-bold uppercase tracking-wider">
                            <span className="text-indigo-400">Response Body Payload</span>
                            {log.responseBody && (
                              <button
                                onClick={() => handleCopyJSON(sanitizePayloadStr(log.responseBody), `${log.id}-res`)}
                                className="text-[8px] font-black text-neutral-500 hover:text-white bg-neutral-900 border border-neutral-800 px-2 py-0.5 rounded transition-colors cursor-pointer"
                              >
                                {copiedSectionId === `${log.id}-res` ? "Copied!" : "Copy JSON"}
                              </button>
                            )}
                          </div>
                          {log.responseBody ? (
                            <pre className="text-neutral-300 font-mono text-[10px] leading-relaxed p-4 bg-black border border-neutral-900 rounded-lg select-all overflow-x-auto max-h-[200px]">
                              {sanitizePayloadStr(log.responseBody)}
                            </pre>
                          ) : (
                            <div className="bg-black/40 text-neutral-700 rounded-lg p-4 border border-neutral-900/60 font-mono text-[10px] text-center italic font-bold">
                              No response body payload returned.
                            </div>
                          )}
                        </div>

                      </div>

                      {/* Small viewport inspector trace button */}
                      <div className="sm:hidden pt-2 border-t border-neutral-900/40">
                        <Link
                          to={`${log.requestId || log.id}`}
                          className="w-full flex justify-center items-center space-x-1.5 font-mono font-bold text-[9px] uppercase tracking-wider text-indigo-400 border border-indigo-900/45 bg-indigo-950/20 py-2 rounded transition-colors"
                        >
                          <span>Full inspector trace</span>
                          <ArrowRight className="h-3 w-3" />
                        </Link>
                      </div>

                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Cursor pagination triggers */}
          {nextCursor && (
            <div className="pt-3 text-center">
              <button
                onClick={handleLoadMore}
                className="inline-flex items-center space-x-1 px-4 py-2 bg-neutral-950 border border-neutral-900 rounded text-xs font-bold uppercase text-neutral-400 hover:text-white hover:bg-neutral-900 transition-colors cursor-pointer"
              >
                <span>Load More logs</span>
                <ChevronDown className="h-4 w-4" />
              </button>
            </div>
          )}
        </div>
      )}

    </div>
  );
};

export default Logs;
