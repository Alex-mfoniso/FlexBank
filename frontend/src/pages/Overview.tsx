import React, { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useApp } from "../context/AppContext";
import { api } from "../lib/api";
import { formatMoney, formatDate } from "../utils/format";
import { StatusBadge } from "../components/StatusBadge";
import { CardSkeleton, SkeletonLoader } from "../components/SkeletonLoader";
import { OnboardingChecklist } from "../components/OnboardingChecklist";
import {
  Users,
  Wallet,
  ArrowUpRight,
  TrendingUp,
  AlertOctagon,
  FileCode,
  Terminal,
  Activity,
  ArrowRight,
  Beaker,
  ExternalLink,
} from "lucide-react";

interface OverviewMetrics {
  customersCount: number;
  accountsCount: number;
  transfersCount: number;
  successfulTransfersCount: number;
  failedTransfersCount: number;
  totalVolume: number;
}

export const Overview: React.FC = () => {
  const { selectedProjectId, environment } = useApp();
  const navigate = useNavigate();

  const [metrics, setMetrics] = useState<OverviewMetrics | null>(null);
  const [recentTransfers, setRecentTransfers] = useState<any[]>([]);
  const [recentLogs, setRecentLogs] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!selectedProjectId) return;

    const fetchOverviewData = async () => {
      setIsLoading(true);
      setError(null);

      try {
        const [metricRes, transferRes, logRes] = await Promise.all([
          api.get(`/api/v1/projects/${selectedProjectId}/overview`),
          api.get("/api/v1/transfers"),
          api.get("/api/v1/logs"),
        ]);

        setMetrics(metricRes.data.metrics);
        setRecentTransfers((transferRes.data.data || []).slice(0, 5));
        setRecentLogs((logRes.data.data || []).slice(0, 5));
      } catch (err: any) {
        console.error("Failed to load overview statistics", err);
        setError(err.message || "Could not retrieve operational performance indicators.");
      } finally {
        setIsLoading(false);
      }
    };

    fetchOverviewData();
  }, [selectedProjectId, environment]);

  if (isLoading) {
    return (
      <div className="space-y-8">
        <CardSkeleton />
        <SkeletonLoader rows={3} columns={4} />
      </div>
    );
  }

  if (error || !metrics) {
    return (
      <div className="rounded-xl border border-red-200 bg-red-50 p-6 text-center shadow-xs">
        <AlertOctagon className="mx-auto h-12 w-12 text-red-500" />
        <h3 className="mt-4 text-sm font-bold text-slate-900">Failed to load statistics</h3>
        <p className="mt-2 text-xs text-slate-500 max-w-sm mx-auto leading-relaxed">{error}</p>
        <button
          onClick={() => window.location.reload()}
          className="mt-4 rounded bg-slate-900 px-3 py-1.5 text-xs font-semibold text-white hover:bg-slate-800"
        >
          Retry
        </button>
      </div>
    );
  }

  const hasData = metrics.customersCount > 0 || metrics.transfersCount > 0;

  return (
    <div className="space-y-8">
      {/* 1. Header Information */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center pb-5 border-b border-slate-200">
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight text-slate-900">Project Overview</h1>
          <p className="text-xs text-slate-500 font-semibold mt-1">
            Real-time double-entry ledger summaries and API traffic metrics.
          </p>
        </div>
        <div className="mt-4 md:mt-0 flex space-x-2">
          <Link
            to={`/projects/${selectedProjectId}/sandbox`}
            className="flex items-center space-x-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-bold text-slate-700 hover:bg-slate-50"
          >
            <Beaker className="h-4 w-4 text-slate-400" />
            <span>Open Sandbox Console</span>
          </Link>
          <Link
            to={`/projects/${selectedProjectId}/docs`}
            className="flex items-center space-x-1.5 rounded-lg bg-indigo-600 px-3 py-1.5 text-xs font-bold text-white hover:bg-indigo-500 shadow-sm"
          >
            <FileCode className="h-4 w-4" />
            <span>Read API Guide</span>
          </Link>
        </div>
      </div>

      {/* Onboarding Checklist Tracker */}
      {selectedProjectId && (
        <OnboardingChecklist projectId={selectedProjectId} />
      )}

      {/* 2. KPI Metrics Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {/* Total Volume */}
        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-xs flex flex-col justify-between">
          <div className="flex justify-between items-start">
            <div className="space-y-1">
              <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Transaction Volume</span>
              <h2 className="text-2xl font-extrabold tracking-tight text-slate-950">
                {formatMoney(metrics.totalVolume, "NGN")}
              </h2>
            </div>
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-indigo-50 text-indigo-600">
              <TrendingUp className="h-5 w-5" />
            </div>
          </div>
          <div className="mt-4 text-[11px] font-semibold text-slate-400">
            Across {metrics.successfulTransfersCount} successful settlements.
          </div>
        </div>

        {/* Customers Count */}
        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-xs flex flex-col justify-between">
          <div className="flex justify-between items-start">
            <div className="space-y-1">
              <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Total Customers</span>
              <h2 className="text-2xl font-extrabold tracking-tight text-slate-950">
                {metrics.customersCount.toLocaleString()}
              </h2>
            </div>
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-50 text-emerald-600">
              <Users className="h-5 w-5" />
            </div>
          </div>
          <div className="mt-4 text-[11px] font-semibold text-slate-400 flex justify-between">
            <span>Linked accounts: {metrics.accountsCount}</span>
            <Link
              to={`/projects/${selectedProjectId}/customers`}
              className="text-indigo-600 hover:underline flex items-center space-x-0.5"
            >
              <span>Manage</span>
              <ArrowRight className="h-3 w-3" />
            </Link>
          </div>
        </div>

        {/* Transfers Performance */}
        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-xs flex flex-col justify-between">
          <div className="flex justify-between items-start">
            <div className="space-y-1">
              <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Transfer Success Rate</span>
              <h2 className="text-2xl font-extrabold tracking-tight text-slate-950">
                {metrics.transfersCount > 0
                  ? `${Math.round((metrics.successfulTransfersCount / metrics.transfersCount) * 100)}%`
                  : "100%"}
              </h2>
            </div>
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-amber-50 text-amber-600">
              <ArrowUpRight className="h-5 w-5" />
            </div>
          </div>
          <div className="mt-4 text-[11px] font-semibold text-slate-400 flex justify-between">
            <span className="text-emerald-600">Succeeded: {metrics.successfulTransfersCount}</span>
            <span className="text-rose-500">Failed: {metrics.failedTransfersCount}</span>
          </div>
        </div>
      </div>

      {/* 3. Empty State or Workspace Content Details */}
      {!hasData ? (
        <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-12 text-center shadow-xs">
          <Activity className="mx-auto h-12 w-12 text-indigo-400 animate-pulse" />
          <h3 className="mt-4 text-base font-bold text-slate-900">Sandbox initialized successfully</h3>
          <p className="mt-2 text-xs text-slate-500 max-w-md mx-auto leading-relaxed">
            Your sandbox workspace context is active! You can write to it by funding a test account, creating custom customers, or calling the API.
          </p>
          <div className="mt-6 flex justify-center space-x-3">
            <Link
              to={`/projects/${selectedProjectId}/sandbox`}
              className="rounded-lg bg-slate-900 px-4 py-2 text-xs font-bold text-white hover:bg-slate-800 shadow-sm"
            >
              Fund Test Account (Sandbox Tools)
            </Link>
            <Link
              to={`/projects/${selectedProjectId}/docs`}
              className="rounded-lg border border-slate-200 bg-white px-4 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50"
            >
              Learn API Quickstart
            </Link>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Recent Transfers/Transactions */}
          <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-xs space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider flex items-center space-x-2">
                <ArrowUpRight className="h-4.5 w-4.5 text-slate-400" />
                <span>Recent Ledger Movements</span>
              </h3>
              <Link
                to={`/projects/${selectedProjectId}/transactions`}
                className="text-xs font-bold text-indigo-600 hover:underline flex items-center space-x-1"
              >
                <span>View all</span>
                <ArrowRight className="h-3 w-3" />
              </Link>
            </div>

            {recentTransfers.length === 0 ? (
              <p className="text-xs text-slate-400 py-6 text-center">No transactions recorded yet.</p>
            ) : (
              <div className="divide-y divide-slate-100">
                {recentTransfers.map((tx) => (
                  <div key={tx.id} className="py-3 flex items-center justify-between text-sm hover:bg-slate-50/50 rounded-lg px-2 transition-all">
                    <div>
                      <div className="flex items-center space-x-2">
                        <span className="font-bold text-slate-900 font-mono text-xs">{tx.reference}</span>
                        <span className="text-[10px] bg-slate-100 text-slate-500 px-1 rounded uppercase font-bold shrink-0">
                          {tx.direction}
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-400 mt-1">{formatDate(tx.createdAt)}</p>
                    </div>
                    <div className="text-right space-y-1">
                      <p className="font-bold text-slate-900">{formatMoney(tx.amount, tx.currency)}</p>
                      <StatusBadge status={tx.status} />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Recent API Inbound Request Logs */}
          <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-xs space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider flex items-center space-x-2">
                <Terminal className="h-4.5 w-4.5 text-slate-400" />
                <span>Inbound API Activity Stream</span>
              </h3>
              <Link
                to={`/projects/${selectedProjectId}/logs`}
                className="text-xs font-bold text-indigo-600 hover:underline flex items-center space-x-1"
              >
                <span>Inspect logs</span>
                <ArrowRight className="h-3 w-3" />
              </Link>
            </div>

            {recentLogs.length === 0 ? (
              <p className="text-xs text-slate-400 py-6 text-center">No API request logs recorded yet.</p>
            ) : (
              <div className="divide-y divide-slate-100">
                {recentLogs.map((log) => (
                  <div key={log.id} className="py-3 flex items-center justify-between text-sm hover:bg-slate-50/50 rounded-lg px-2 transition-all">
                    <div className="flex items-center space-x-3">
                      <span className={`font-mono text-[10px] font-bold px-2 py-0.5 rounded shrink-0 ${
                        log.method === "POST"
                          ? "bg-indigo-50 text-indigo-600 border border-indigo-100"
                          : log.method === "DELETE"
                          ? "bg-rose-50 text-rose-600 border border-rose-100"
                          : "bg-slate-100 text-slate-600 border border-slate-200"
                      }`}>
                        {log.method}
                      </span>
                      <span className="font-semibold text-slate-700 font-mono text-xs truncate max-w-[140px] sm:max-w-[220px]">
                        {log.path}
                      </span>
                    </div>
                    <div className="text-right flex items-center space-x-3 shrink-0">
                      <span className="text-[11px] font-mono text-slate-400 font-medium">{log.duration}ms</span>
                      <span className={`font-bold font-mono text-xs ${
                        log.statusCode >= 200 && log.statusCode < 300
                          ? "text-emerald-600"
                          : "text-rose-600"
                      }`}>
                        {log.statusCode}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
export default Overview;
