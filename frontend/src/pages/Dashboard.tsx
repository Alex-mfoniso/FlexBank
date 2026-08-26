import React, { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useApp } from "../context/AppContext";
import { api } from "../lib/api";
import {
  FolderKanban,
  Activity,
  ArrowUpRight,
  TrendingUp,
  Terminal,
  Loader2,
  AlertTriangle,
  FolderPlus,
  ArrowRight,
  ShieldCheck,
  Check,
  Clock
} from "lucide-react";

interface GlobalMetricCardProps {
  title: string;
  value: string | number;
  label: string;
  icon: React.ComponentType<any>;
  isDemo?: boolean;
  colorClass: string;
}

const GlobalMetricCard: React.FC<GlobalMetricCardProps> = ({
  title,
  value,
  label,
  icon: Icon,
  isDemo = false,
  colorClass
}) => (
  <div className="rounded-lg border border-neutral-900 bg-neutral-950/40 p-5 shadow-xs flex flex-col justify-between text-left font-mono relative overflow-hidden group hover:border-neutral-800 transition-colors">
    <div className="absolute top-0 right-0 w-24 h-24 bg-indigo-500/[0.01] rounded-full blur-xl group-hover:bg-indigo-500/[0.02] transition-colors" />
    <div className="flex justify-between items-start">
      <div className="space-y-1 z-10">
        <span className="text-[9px] font-bold text-neutral-500 uppercase tracking-widest block">{title}</span>
        <h2 className="text-2xl font-black tracking-tight text-white mt-1">
          {value}
        </h2>
      </div>
      <div className={`flex h-9 w-9 items-center justify-center rounded border ${colorClass} shrink-0`}>
        <Icon className="h-4.5 w-4.5" />
      </div>
    </div>
    
    <div className="mt-4 flex items-center justify-between text-[10px] z-10">
      <span className="text-neutral-500 font-medium">{label}</span>
      {isDemo && (
        <span className="bg-indigo-950/40 text-indigo-400 border border-indigo-900/40 font-bold px-1.5 py-0.5 rounded text-[8px] tracking-wider uppercase font-mono">
          DEMO DATA
        </span>
      )}
    </div>
  </div>
);

export const Dashboard: React.FC = () => {
  const { user, projects } = useApp();
  const navigate = useNavigate();

  const [logs, setLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchGlobalLogs = async () => {
      setLoading(true);
      setError(null);
      try {
        const response = await api.get("/api/v1/logs");
        setLogs(response.data.data || []);
      } catch (err: any) {
        console.error("Failed to fetch global logs", err);
        // Fallback gracefully without throwing a full-screen block
        setError("Unable to sync recent global API stream logs.");
      } finally {
        setLoading(false);
      }
    };

    fetchGlobalLogs();
  }, []);

  const formatTimestamp = (isoStr: string) => {
    try {
      const d = new Date(isoStr);
      return d.toLocaleTimeString("en-US", { hour12: false, hour: "2-digit", minute: "2-digit", second: "2-digit" });
    } catch {
      return "--:--:--";
    }
  };

  // Static demo logs to display if no real transaction activity exists yet (labeled with DEMO DATA banner)
  const demoLogs = [
    { id: "demo-1", method: "POST", path: "/v1/transfers", statusCode: 200, duration: 231, createdAt: new Date(Date.now() - 120000).toISOString() },
    { id: "demo-2", method: "GET", path: "/v1/accounts", statusCode: 200, duration: 92, createdAt: new Date(Date.now() - 340000).toISOString() },
    { id: "demo-3", method: "POST", path: "/v1/customers", statusCode: 201, duration: 110, createdAt: new Date(Date.now() - 800000).toISOString() },
    { id: "demo-4", method: "GET", path: "/v1/ledgers/balance", statusCode: 200, duration: 45, createdAt: new Date(Date.now() - 1500000).toISOString() },
  ];

  const activeLogs = logs.length > 0 ? logs.slice(0, 6) : demoLogs;

  return (
    <div className="space-y-8 text-left font-mono select-none">
      
      {/* 1. Welcoming Title Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center pb-5 border-b border-neutral-900 gap-4">
        <div>
          <h1 className="text-xl font-black text-white uppercase tracking-tight">
            Good morning, {user?.name?.split(" ")[0] || "Alexander"}.
          </h1>
          <p className="text-[10px] text-neutral-500 font-semibold mt-1">
            Here's what's happening across your FlexBank financial projects.
          </p>
        </div>
        <div className="flex space-x-2 shrink-0">
          <Link
            to="/projects"
            className="flex items-center space-x-1.5 rounded border border-neutral-800 bg-neutral-950 px-3 py-1.5 text-[10px] font-bold text-neutral-400 hover:text-white hover:border-neutral-700 transition-colors"
          >
            <FolderKanban className="h-3.5 w-3.5" />
            <span>Manage Projects</span>
          </Link>
        </div>
      </div>

      {/* 2. Global Metric Cards Grid (Section 5 requirements) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <GlobalMetricCard
          title="API Requests"
          value="12,482"
          label="Inbound system transactions"
          icon={Terminal}
          isDemo={true}
          colorClass="bg-indigo-950/20 text-indigo-400 border-indigo-900/40"
        />
        <GlobalMetricCard
          title="Transactions"
          value="1,284"
          label="Settled double-entry items"
          icon={TrendingUp}
          isDemo={true}
          colorClass="bg-amber-950/20 text-amber-500 border-amber-900/40"
        />
        <GlobalMetricCard
          title="Success Rate"
          value="99.2%"
          label="Payload request success"
          icon={ShieldCheck}
          isDemo={true}
          colorClass="bg-emerald-950/20 text-emerald-400 border-emerald-900/40"
        />
        <GlobalMetricCard
          title="Active Projects"
          value={projects.length}
          label="Created workspace contexts"
          icon={FolderKanban}
          isDemo={false}
          colorClass="bg-rose-950/20 text-rose-500 border-rose-900/40"
        />
      </div>

      {/* 3. Global Activity Streams Section */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Recent API activity */}
        <div className="lg:col-span-8 rounded-lg border border-neutral-900 bg-neutral-950/30 p-5 space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-neutral-900">
            <h3 className="text-[10px] font-bold text-neutral-400 uppercase tracking-widest flex items-center space-x-2">
              <Activity className="h-4 w-4 text-neutral-600 animate-pulse" />
              <span>Recent API Activity</span>
            </h3>
            {logs.length > 0 && (
              <span className="text-[9px] text-emerald-500 font-bold flex items-center space-x-1 uppercase">
                <Check className="h-3 w-3" />
                <span>Live stream active</span>
              </span>
            )}
            {logs.length === 0 && (
              <span className="bg-indigo-950/40 text-indigo-400 border border-indigo-900/40 font-bold px-1.5 py-0.5 rounded text-[8px] tracking-wider uppercase font-mono">
                DEMO STREAM
              </span>
            )}
          </div>

          {loading ? (
            <div className="py-12 flex flex-col items-center justify-center space-y-2">
              <Loader2 className="h-6 w-6 animate-spin text-neutral-600" />
              <p className="text-[10px] text-neutral-500">Querying request histories...</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-neutral-900/60 text-[9px] text-neutral-500 uppercase tracking-wider font-bold">
                    <th className="py-2.5">Method</th>
                    <th className="py-2.5">Endpoint</th>
                    <th className="py-2.5">Status</th>
                    <th className="py-2.5 text-right">Latency</th>
                    <th className="py-2.5 text-right pr-2">Timestamp</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-900/30 font-mono text-[11px]">
                  {activeLogs.map((item) => (
                    <tr
                      key={item.id}
                      onClick={() => {
                        // Open logs screen details if the function is backed, otherwise navigate
                        if (logs.length > 0 && item.projectId) {
                          navigate(`/projects/${item.projectId}/logs/${item.id}`);
                        }
                      }}
                      className={`hover:bg-neutral-950/60 transition-colors group ${
                        logs.length > 0 ? "cursor-pointer" : "cursor-default"
                      }`}
                    >
                      <td className="py-3">
                        <span className={`inline-block px-1.5 py-0.5 rounded text-[9px] font-bold border ${
                          item.method === "POST"
                            ? "bg-indigo-950/20 text-indigo-400 border-indigo-900/40"
                            : item.method === "DELETE"
                            ? "bg-rose-950/20 text-rose-400 border-rose-900/40"
                            : "bg-neutral-900 text-neutral-400 border-neutral-800"
                        }`}>
                          {item.method}
                        </span>
                      </td>
                      <td className="py-3 font-semibold text-neutral-300 group-hover:text-indigo-400 transition-colors truncate max-w-[150px]">
                        {item.path}
                      </td>
                      <td className="py-3">
                        <span className={`font-bold ${
                          item.statusCode >= 200 && item.statusCode < 300
                            ? "text-emerald-500"
                            : "text-rose-500"
                        }`}>
                          {item.statusCode}
                        </span>
                      </td>
                      <td className="py-3 text-right text-neutral-500 font-medium">
                        {item.duration}ms
                      </td>
                      <td className="py-3 text-right text-neutral-600 font-medium pr-2 flex items-center justify-end space-x-1">
                        <Clock className="h-3 w-3 shrink-0 text-neutral-700" />
                        <span>{formatTimestamp(item.createdAt)}</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Console Quickstart Widget */}
        <div className="lg:col-span-4 rounded-lg border border-neutral-900 bg-neutral-950/30 p-5 space-y-4 text-left">
          <h3 className="text-[10px] font-bold text-neutral-400 uppercase tracking-widest border-b border-neutral-900 pb-3">
            Developer Quick Links
          </h3>

          <div className="space-y-3 text-[11px] leading-relaxed">
            <p className="text-neutral-500">
              Create independent development environments to build and mock complex ledgers, transfers, and integrations.
            </p>

            <div className="pt-2 space-y-2">
              {projects.length === 0 ? (
                <Link
                  to="/projects"
                  className="flex items-center justify-between rounded border border-dashed border-neutral-800 bg-neutral-950/60 p-3 hover:border-indigo-500/60 transition-colors"
                >
                  <div className="flex items-center space-x-2">
                    <FolderPlus className="h-4 w-4 text-indigo-400" />
                    <span className="font-bold text-white">Create project</span>
                  </div>
                  <ArrowRight className="h-3.5 w-3.5 text-neutral-600" />
                </Link>
              ) : (
                <div className="space-y-2">
                  <span className="block text-[9px] font-bold text-neutral-600 uppercase tracking-wider">
                    Your Active Sandboxes:
                  </span>
                  {projects.slice(0, 3).map((p) => (
                    <Link
                      key={p.id}
                      to={`/projects/${p.id}/overview`}
                      className="flex items-center justify-between rounded border border-neutral-900 bg-neutral-950/40 p-2.5 hover:border-neutral-800 hover:bg-neutral-950 transition-all"
                    >
                      <span className="font-bold text-neutral-300 truncate pr-2">{p.name}</span>
                      <span className="text-[8px] px-1.5 py-0.5 rounded font-bold uppercase bg-amber-950/20 text-amber-500 border border-amber-900/40">
                        {p.environment}
                      </span>
                    </Link>
                  ))}
                  {projects.length > 3 && (
                    <Link to="/projects" className="block text-[10px] font-bold text-indigo-400 hover:text-indigo-300 pt-1 text-right">
                      View all {projects.length} projects →
                    </Link>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>

      </div>

    </div>
  );
};

export default Dashboard;
