import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../lib/api";
import { useApp } from "../context/AppContext";
import { formatDate } from "../utils/format";
import { SkeletonLoader } from "../components/SkeletonLoader";
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
} from "lucide-react";

export const Logs: React.FC = () => {
  const { selectedProjectId, environment } = useApp();

  const [logs, setLogs] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [methodFilter, setMethodFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [expandedLogId, setExpandedLogId] = useState<string | null>(null);
  const [copiedSectionId, setCopiedSectionId] = useState<string | null>(null);

  const fetchLogs = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const params: any = { limit: 50 };
      if (environment) {
        params.environment = environment;
      }
      if (methodFilter !== "all") {
        params.method = methodFilter;
      }

      const response = await api.get("/api/v1/logs", { params });
      setLogs(response.data.data || []);
    } catch (err: any) {
      console.error("Failed to load developer api request logs", err);
      setError(err.message || "Failed to retrieve inbound API activity records.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (selectedProjectId) {
      fetchLogs();
    }
  }, [selectedProjectId, environment, methodFilter]);

  const handleCopyJSON = (jsonStr: string, sectionId: string) => {
    navigator.clipboard.writeText(jsonStr);
    setCopiedSectionId(sectionId);
    setTimeout(() => setCopiedSectionId(null), 2000);
  };

  // Filter logs by status and local query search
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
      log.id?.toLowerCase().includes(term) ||
      log.statusCode?.toString().includes(term) ||
      log.method?.toLowerCase().includes(term)
    );
  });

  return (
    <div className="space-y-6">
      {/* Upper toolbar */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center pb-5 border-b border-slate-200">
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight text-slate-900">API Request Logs</h1>
          <p className="text-xs text-slate-500 font-semibold mt-1">
            Real-time inbound API gateway auditing, HTTP headers inspection, and pretty-printed json diagnostics.
          </p>
        </div>
      </div>

      {/* Filter and Search bars */}
      {logs.length > 0 && (
        <div className="flex flex-col md:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-2.5 h-4.5 w-4.5 text-slate-400" />
            <input
              type="text"
              placeholder="Search request paths, status codes, request IDs..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="block w-full rounded-lg border border-slate-200 bg-white pl-10 pr-4 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 transition-all"
            />
          </div>

          <div className="flex space-x-3">
            <select
              value={methodFilter}
              onChange={(e) => setMethodFilter(e.target.value)}
              className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-bold text-slate-700 focus:border-indigo-500 focus:outline-none transition-all"
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
              className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-bold text-slate-700 focus:border-indigo-500 focus:outline-none transition-all"
            >
              <option value="all">All Responses</option>
              <option value="2xx">2xx Success</option>
              <option value="4xx">4xx Client Errors</option>
              <option value="5xx">5xx Server Failures</option>
            </select>
          </div>
        </div>
      )}

      {/* Main logs display list */}
      {isLoading ? (
        <SkeletonLoader rows={6} columns={5} />
      ) : error ? (
        <div className="rounded-xl border border-red-200 bg-red-50 p-6 text-center shadow-xs">
          <AlertCircle className="mx-auto h-12 w-12 text-red-500" />
          <h3 className="mt-4 text-sm font-bold text-slate-900">Failed to load API request logs</h3>
          <p className="mt-2 text-xs text-slate-500 max-w-sm mx-auto leading-relaxed">{error}</p>
          <button
            onClick={fetchLogs}
            className="mt-4 rounded bg-slate-900 px-3 py-1.5 text-xs font-semibold text-white hover:bg-slate-800"
          >
            Retry
          </button>
        </div>
      ) : logs.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-12 text-center shadow-xs">
          <Terminal className="mx-auto h-12 w-12 text-slate-300 animate-pulse" />
          <h3 className="mt-4 text-sm font-bold text-slate-900">No request logs recorded</h3>
          <p className="mt-2 text-xs text-slate-500 max-w-md mx-auto leading-relaxed">
            API request logs capture all inbound endpoints calls associated with your credentials, recording headers, payloads, and response latencies.
          </p>
        </div>
      ) : filteredLogs.length === 0 ? (
        <div className="rounded-xl border border-slate-200 bg-white p-12 text-center shadow-xs">
          <Search className="mx-auto h-12 w-12 text-slate-300" />
          <h3 className="mt-4 text-sm font-bold text-slate-900">No matching logs found</h3>
          <p className="mt-2 text-xs text-slate-500">
            No API request logs match the selected filter configuration query.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredLogs.map((log) => {
            const isExpanded = expandedLogId === log.id;
            const isSuccess = log.statusCode >= 200 && log.statusCode < 300;
            
            return (
              <div
                key={log.id}
                className={`border rounded-xl bg-white overflow-hidden shadow-3xs transition-all ${
                  isExpanded ? "border-slate-300 shadow-xs" : "border-slate-200 hover:border-slate-300/80"
                }`}
              >
                {/* Collapsed view header list row */}
                <div
                  onClick={() => setExpandedLogId(isExpanded ? null : log.id)}
                  className="p-4 flex items-center justify-between text-xs cursor-pointer select-none font-semibold text-slate-700 hover:bg-slate-50/50"
                >
                  <div className="flex items-center space-x-3 min-w-0 flex-1 mr-4">
                    <span className={`font-mono text-[10px] font-bold px-2 py-0.5 rounded shrink-0 ${
                      log.method === "POST"
                        ? "bg-indigo-50 text-indigo-700 border border-indigo-100"
                        : log.method === "DELETE"
                        ? "bg-rose-50 text-rose-700 border border-rose-100"
                        : "bg-slate-100 text-slate-600 border border-slate-200"
                    }`}>
                      {log.method}
                    </span>
                    <span className="font-mono text-[11px] text-slate-900 font-bold truncate">
                      {log.path}
                    </span>
                  </div>

                  <div className="flex items-center space-x-3 shrink-0 font-medium">
                    <span className="text-[10px] text-slate-400 font-mono hidden sm:inline select-all">{log.id}</span>
                    <span className="text-[10px] text-slate-400 font-medium whitespace-nowrap">{formatDate(log.createdAt)}</span>
                    <span className="text-[10px] text-slate-400 font-mono whitespace-nowrap">{log.duration}ms</span>
                    <span className={`font-mono font-bold text-xs px-2.5 py-0.5 rounded-full ${
                      isSuccess
                        ? "bg-emerald-50 text-emerald-700 border border-emerald-100"
                        : "bg-rose-50 text-rose-700 border border-rose-100"
                    }`}>
                      {log.statusCode}
                    </span>
                    <Link
                      to={`${log.requestId}`}
                      className="inline-flex items-center space-x-1 font-mono font-bold text-[10px] text-indigo-600 hover:text-indigo-800 border border-indigo-100 bg-indigo-50/80 px-2 py-1 rounded shrink-0 transition-colors"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <span>inspect trace</span>
                    </Link>
                    {isExpanded ? (
                      <ChevronUp className="h-4 w-4 text-slate-400" />
                    ) : (
                      <ChevronDown className="h-4 w-4 text-slate-400" />
                    )}
                  </div>
                </div>

                {/* Expanded details drawers */}
                {isExpanded && (
                  <div className="bg-slate-950 border-t border-slate-200/10 p-5 space-y-6">
                    {/* Diagnostic headers banner */}
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs font-semibold pb-4 border-b border-slate-800/60 text-slate-400">
                      <div className="flex items-center space-x-2">
                        <Network className="h-4 w-4 text-indigo-400" />
                        <div>
                          <span className="block text-[9px] font-bold text-slate-500 uppercase">Gateway IP Caller</span>
                          <span className="font-mono text-slate-300 text-xs">{log.ip || "127.0.0.1"}</span>
                        </div>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Cpu className="h-4 w-4 text-indigo-400" />
                        <div>
                          <span className="block text-[9px] font-bold text-slate-500 uppercase">Process Duration</span>
                          <span className="font-mono text-slate-300 text-xs">{log.duration} milliseconds</span>
                        </div>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Code className="h-4 w-4 text-indigo-400" />
                        <div>
                          <span className="block text-[9px] font-bold text-slate-500 uppercase">Global Request Tracer ID</span>
                          <span className="font-mono text-slate-300 text-xs select-all truncate max-w-[160px]">{log.id}</span>
                        </div>
                      </div>
                    </div>

                    {/* Dual requests and responses payloads columns */}
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                      {/* Request block */}
                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="text-[10px] font-bold text-indigo-400 uppercase tracking-wider">
                            HTTP Inbound Body JSON
                          </span>
                          {log.requestBody && log.requestBody !== "{}" && (
                            <button
                              onClick={() => handleCopyJSON(JSON.stringify(JSON.parse(log.requestBody), null, 2), `${log.id}-req`)}
                              className="text-[10px] font-bold text-slate-500 hover:text-white bg-slate-900 border border-slate-800 px-2 py-0.5 rounded transition-colors"
                            >
                              {copiedSectionId === `${log.id}-req` ? "Copied Request!" : "Copy request"}
                            </button>
                          )}
                        </div>
                        {log.requestBody && log.requestBody !== "{}" ? (
                          <pre className="text-slate-300 font-mono text-[11px] leading-relaxed p-4 bg-black/40 rounded-lg select-all overflow-x-auto max-h-[220px]">
                            {JSON.stringify(JSON.parse(log.requestBody), null, 2)}
                          </pre>
                        ) : (
                          <div className="bg-black/25 text-slate-500 rounded-lg p-4 font-mono text-[11px] text-center italic">
                            Empty request body payload
                          </div>
                        )}
                      </div>

                      {/* Response block */}
                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="text-[10px] font-bold text-indigo-400 uppercase tracking-wider">
                            HTTP Outbound Response JSON
                          </span>
                          {log.responseBody && (
                            <button
                              onClick={() => handleCopyJSON(JSON.stringify(JSON.parse(log.responseBody), null, 2), `${log.id}-res`)}
                              className="text-[10px] font-bold text-slate-500 hover:text-white bg-slate-900 border border-slate-800 px-2 py-0.5 rounded transition-colors"
                            >
                              {copiedSectionId === `${log.id}-res` ? "Copied Response!" : "Copy response"}
                            </button>
                          )}
                        </div>
                        {log.responseBody ? (
                          <pre className="text-slate-300 font-mono text-[11px] leading-relaxed p-4 bg-black/40 rounded-lg select-all overflow-x-auto max-h-[220px]">
                            {JSON.stringify(JSON.parse(log.responseBody), null, 2)}
                          </pre>
                        ) : (
                          <div className="bg-black/25 text-slate-500 rounded-lg p-4 font-mono text-[11px] text-center italic">
                            Empty response body payload
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

    </div>
  );
};
export default Logs;
