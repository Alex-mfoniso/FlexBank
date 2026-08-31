import React, { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { api } from "../lib/api";
import { useApp } from "../context/AppContext";

export const AdminPanel: React.FC = () => {
  const { user } = useApp();
  const navigate = useNavigate();

  const [activeSection, setActiveSection] = useState<
    "overview" | "users" | "projects" | "customers" | "accounts" | "transfers" | "transactions" | "api-activity" | "sandbox"
  >("overview");

  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isUnauthorized, setIsUnauthorized] = useState(false);

  // States for stats and data
  const [stats, setStats] = useState<any>(null);
  const [users, setUsers] = useState<any[]>([]);
  const [projects, setProjects] = useState<any[]>([]);
  const [customers, setCustomers] = useState<any[]>([]);
  const [accounts, setAccounts] = useState<any[]>([]);
  const [transfers, setTransfers] = useState<any[]>([]);
  const [transactions, setTransactions] = useState<any[]>([]);
  const [apiLogs, setApiLogs] = useState<any[]>([]);
  const [sandboxData, setSandboxData] = useState<any>(null);

  // Filters and queries
  const [userSearch, setUserSearch] = useState("");
  const [transferFilter, setTransferFilter] = useState("");
  const [logStatusFilter, setLogStatusFilter] = useState("");
  const [logCategoryFilter, setLogCategoryFilter] = useState("");

  const fetchData = async () => {
    setIsLoading(true);
    setError(null);
    setIsUnauthorized(false);
    try {
      if (activeSection === "overview") {
        const res = await api.get("/api/v1/admin/stats");
        setStats(res.data.data);
      } else if (activeSection === "users") {
        const res = await api.get(`/api/v1/admin/users?search=${encodeURIComponent(userSearch)}`);
        setUsers(res.data.data);
      } else if (activeSection === "projects") {
        const res = await api.get("/api/v1/admin/projects");
        setProjects(res.data.data);
      } else if (activeSection === "customers") {
        const res = await api.get("/api/v1/admin/customers");
        setCustomers(res.data.data);
      } else if (activeSection === "accounts") {
        const res = await api.get("/api/v1/admin/accounts");
        setAccounts(res.data.data);
      } else if (activeSection === "transfers") {
        const res = await api.get(`/api/v1/admin/transfers?status=${transferFilter}`);
        setTransfers(res.data.data);
      } else if (activeSection === "transactions") {
        const res = await api.get("/api/v1/admin/transactions");
        setTransactions(res.data.data);
      } else if (activeSection === "api-activity") {
        const res = await api.get(
          `/api/v1/admin/api-activity?status=${logStatusFilter}&category=${logCategoryFilter}`
        );
        setApiLogs(res.data.data);
      } else if (activeSection === "sandbox") {
        const res = await api.get("/api/v1/admin/sandbox");
        setSandboxData(res.data.data);
      }
    } catch (err: any) {
      if (err.response?.status === 403 || err.response?.status === 401) {
        setIsUnauthorized(true);
      } else {
        setError(err.response?.data?.message || err.message || "Failed to load admin data");
      }
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [activeSection, transferFilter, logStatusFilter, logCategoryFilter]);

  // Run user search with debounced style or button
  const handleUserSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    fetchData();
  };

  if (isUnauthorized) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-6 text-center">
        <div className="w-16 h-16 bg-red-950/40 border border-red-500 rounded-full flex items-center justify-center text-red-500 text-3xl font-bold mb-4">
          ⚠️
        </div>
        <h1 className="text-2xl font-bold text-white mb-2">Access Denied</h1>
        <p className="text-slate-400 max-w-md mb-6">
          You do not have the required platform administrator credentials to view the Ricarut Admin Panel.
        </p>
        <button
          onClick={() => navigate("/projects")}
          className="px-6 py-2.5 bg-amber-600 hover:bg-amber-500 text-slate-950 font-semibold rounded-lg transition-colors"
        >
          Return to Console
        </button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans">
      {/* Visual Distinct Admin Header */}
      <header className="bg-slate-900 border-b border-amber-500/20 px-6 py-4 flex items-center justify-between shadow-lg">
        <div className="flex items-center space-x-3">
          <span className="text-xl font-extrabold tracking-wider text-amber-500">RICARUT</span>
          <span className="bg-amber-500/10 border border-amber-500/30 text-amber-400 text-xs px-2.5 py-1 rounded font-mono uppercase tracking-widest font-bold">
            INTERNAL ADMIN
          </span>
        </div>
        <div className="flex items-center space-x-4">
          <div className="text-right">
            <p className="text-sm font-semibold text-white">{user?.name || "Administrator"}</p>
            <p className="text-xs text-slate-400">{user?.email}</p>
          </div>
          <button
            onClick={() => navigate("/projects")}
            className="px-4 py-1.5 bg-slate-800 hover:bg-slate-700 text-amber-500 text-sm font-semibold rounded-md border border-amber-500/10 transition-colors"
          >
            Developer Console
          </button>
        </div>
      </header>

      {/* Main Admin Workspace container */}
      <div className="flex-1 flex flex-col md:flex-row">
        {/* Navigation Sidebar */}
        <aside className="w-full md:w-64 bg-slate-900 border-r border-slate-800 p-4 space-y-1">
          <nav className="space-y-1">
            <button
              onClick={() => setActiveSection("overview")}
              className={`w-full text-left px-4 py-3 rounded-lg text-sm font-semibold transition-all duration-200 flex items-center space-x-3 ${
                activeSection === "overview"
                  ? "bg-amber-600 text-slate-950 shadow-md shadow-amber-600/10"
                  : "text-slate-400 hover:bg-slate-800 hover:text-white"
              }`}
            >
              <span>📊</span>
              <span>Overview</span>
            </button>
            <button
              onClick={() => setActiveSection("users")}
              className={`w-full text-left px-4 py-3 rounded-lg text-sm font-semibold transition-all duration-200 flex items-center space-x-3 ${
                activeSection === "users"
                  ? "bg-amber-600 text-slate-950 shadow-md shadow-amber-600/10"
                  : "text-slate-400 hover:bg-slate-800 hover:text-white"
              }`}
            >
              <span>👥</span>
              <span>Users / Developers</span>
            </button>
            <button
              onClick={() => setActiveSection("projects")}
              className={`w-full text-left px-4 py-3 rounded-lg text-sm font-semibold transition-all duration-200 flex items-center space-x-3 ${
                activeSection === "projects"
                  ? "bg-amber-600 text-slate-950 shadow-md shadow-amber-600/10"
                  : "text-slate-400 hover:bg-slate-800 hover:text-white"
              }`}
            >
              <span>📁</span>
              <span>Projects</span>
            </button>
            <button
              onClick={() => setActiveSection("customers")}
              className={`w-full text-left px-4 py-3 rounded-lg text-sm font-semibold transition-all duration-200 flex items-center space-x-3 ${
                activeSection === "customers"
                  ? "bg-amber-600 text-slate-950 shadow-md shadow-amber-600/10"
                  : "text-slate-400 hover:bg-slate-800 hover:text-white"
              }`}
            >
              <span>👤</span>
              <span>Customers</span>
            </button>
            <button
              onClick={() => setActiveSection("accounts")}
              className={`w-full text-left px-4 py-3 rounded-lg text-sm font-semibold transition-all duration-200 flex items-center space-x-3 ${
                activeSection === "accounts"
                  ? "bg-amber-600 text-slate-950 shadow-md shadow-amber-600/10"
                  : "text-slate-400 hover:bg-slate-800 hover:text-white"
              }`}
            >
              <span>💳</span>
              <span>Accounts</span>
            </button>
            <button
              onClick={() => setActiveSection("transfers")}
              className={`w-full text-left px-4 py-3 rounded-lg text-sm font-semibold transition-all duration-200 flex items-center space-x-3 ${
                activeSection === "transfers"
                  ? "bg-amber-600 text-slate-950 shadow-md shadow-amber-600/10"
                  : "text-slate-400 hover:bg-slate-800 hover:text-white"
              }`}
            >
              <span>💸</span>
              <span>Transfers</span>
            </button>
            <button
              onClick={() => setActiveSection("transactions")}
              className={`w-full text-left px-4 py-3 rounded-lg text-sm font-semibold transition-all duration-200 flex items-center space-x-3 ${
                activeSection === "transactions"
                  ? "bg-amber-600 text-slate-950 shadow-md shadow-amber-600/10"
                  : "text-slate-400 hover:bg-slate-800 hover:text-white"
              }`}
            >
              <span>📖</span>
              <span>Transactions Ledger</span>
            </button>
            <button
              onClick={() => setActiveSection("api-activity")}
              className={`w-full text-left px-4 py-3 rounded-lg text-sm font-semibold transition-all duration-200 flex items-center space-x-3 ${
                activeSection === "api-activity"
                  ? "bg-amber-600 text-slate-950 shadow-md shadow-amber-600/10"
                  : "text-slate-400 hover:bg-slate-800 hover:text-white"
              }`}
            >
              <span>⚡</span>
              <span>API Activity Logs</span>
            </button>
            <button
              onClick={() => setActiveSection("sandbox")}
              className={`w-full text-left px-4 py-3 rounded-lg text-sm font-semibold transition-all duration-200 flex items-center space-x-3 ${
                activeSection === "sandbox"
                  ? "bg-amber-600 text-slate-950 shadow-md shadow-amber-600/10"
                  : "text-slate-400 hover:bg-slate-800 hover:text-white"
              }`}
            >
              <span>🎮</span>
              <span>Sandbox Simulator</span>
            </button>
          </nav>
        </aside>

        {/* Dynamic Content Panel */}
        <main className="flex-1 p-6 md:p-8 overflow-y-auto">
          {error && (
            <div className="bg-red-950/20 border border-red-800/40 text-red-400 px-4 py-3.5 rounded-lg text-sm mb-6 flex items-center justify-between">
              <span>{error}</span>
              <button onClick={() => setError(null)} className="text-red-400 hover:text-white">✕</button>
            </div>
          )}

          {isLoading ? (
            <div className="min-h-[400px] flex items-center justify-center">
              <div className="w-8 h-8 border-4 border-amber-500 border-t-transparent rounded-full animate-spin"></div>
            </div>
          ) : (
            <>
              {/* SECTION: OVERVIEW / STATS */}
              {activeSection === "overview" && stats && (
                <div className="space-y-8">
                  <div>
                    <h2 className="text-xl font-bold text-white mb-1">Administrative Dashboard</h2>
                    <p className="text-sm text-slate-400">Real-time health metric aggregates and platform activity status.</p>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                    <div className="bg-slate-900 border border-slate-800 p-5 rounded-xl shadow-md">
                      <p className="text-xs font-mono text-slate-400 uppercase tracking-widest">Total Developers</p>
                      <p className="text-2xl font-bold text-white mt-1.5">{stats.totalUsers}</p>
                    </div>
                    <div className="bg-slate-900 border border-slate-800 p-5 rounded-xl shadow-md">
                      <p className="text-xs font-mono text-slate-400 uppercase tracking-widest">Active Projects</p>
                      <p className="text-2xl font-bold text-white mt-1.5">{stats.totalProjects}</p>
                    </div>
                    <div className="bg-slate-900 border border-slate-800 p-5 rounded-xl shadow-md">
                      <p className="text-xs font-mono text-slate-400 uppercase tracking-widest">Platform Customers</p>
                      <p className="text-2xl font-bold text-white mt-1.5">{stats.totalCustomers}</p>
                    </div>
                    <div className="bg-slate-900 border border-slate-800 p-5 rounded-xl shadow-md">
                      <p className="text-xs font-mono text-slate-400 uppercase tracking-widest">Platform Wallets</p>
                      <p className="text-2xl font-bold text-white mt-1.5">{stats.totalAccounts}</p>
                    </div>
                    <div className="bg-slate-900 border border-slate-800 p-5 rounded-xl shadow-md">
                      <p className="text-xs font-mono text-slate-400 uppercase tracking-widest">Total Transfers</p>
                      <p className="text-2xl font-bold text-white mt-1.5">{stats.totalTransfers}</p>
                    </div>
                    <div className="bg-slate-900 border border-slate-800 p-5 rounded-xl shadow-md">
                      <p className="text-xs font-mono text-slate-400 uppercase tracking-widest">Ledger Journals</p>
                      <p className="text-2xl font-bold text-white mt-1.5">{stats.totalTransactions}</p>
                    </div>
                    <div className="bg-slate-900 border border-slate-800 p-5 rounded-xl shadow-md">
                      <p className="text-xs font-mono text-slate-400 uppercase tracking-widest">API Requests</p>
                      <p className="text-2xl font-bold text-white mt-1.5">{stats.totalApiRequests}</p>
                      <p className="text-xs text-red-400 mt-1">{stats.failedApiRequests} errors logged</p>
                    </div>
                    <div className="bg-slate-900 border border-slate-800 p-5 rounded-xl shadow-md">
                      <p className="text-xs font-mono text-slate-400 uppercase tracking-widest">Sandbox Volume</p>
                      <p className="text-2xl font-bold text-amber-400 mt-1.5">
                        ₦{(stats.sandboxTransactionVolume / 100).toLocaleString()}
                      </p>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {/* Recent Transfers list */}
                    <div className="bg-slate-900 border border-slate-800 rounded-xl p-5">
                      <h3 className="text-md font-bold text-white mb-4 flex items-center justify-between">
                        <span>Recent Platform Transfers</span>
                        <span className="text-xs font-mono text-slate-400">Total: {stats.totalTransfers}</span>
                      </h3>
                      {stats.recentActivity.transfers.length === 0 ? (
                        <p className="text-sm text-slate-400 italic py-4">No recent transfers executed.</p>
                      ) : (
                        <div className="space-y-3">
                          {stats.recentActivity.transfers.map((t: any) => (
                            <div key={t.id} className="bg-slate-950 p-3 rounded-lg border border-slate-800 flex items-center justify-between text-sm">
                              <div>
                                <p className="font-semibold text-slate-200">Ref: {t.reference}</p>
                                <p className="text-xs text-slate-400">Project: {t.project?.name || "Unknown"}</p>
                              </div>
                              <div className="text-right">
                                <p className="font-semibold text-white">₦{(t.amount / 100).toLocaleString()}</p>
                                <span className={`text-[10px] uppercase font-mono px-2 py-0.5 rounded font-bold ${
                                  t.status === "settled" ? "bg-emerald-950 text-emerald-400" : "bg-slate-800 text-slate-400"
                                }`}>
                                  {t.status}
                                </span>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* Recent logs */}
                    <div className="bg-slate-900 border border-slate-800 rounded-xl p-5">
                      <h3 className="text-md font-bold text-white mb-4 flex items-center justify-between">
                        <span>Recent API Transactions</span>
                        <span className="text-xs font-mono text-slate-400">Total: {stats.totalApiRequests}</span>
                      </h3>
                      {stats.recentActivity.logs.length === 0 ? (
                        <p className="text-sm text-slate-400 italic py-4">No API request logs found.</p>
                      ) : (
                        <div className="space-y-3">
                          {stats.recentActivity.logs.map((log: any) => (
                            <div key={log.id} className="bg-slate-950 p-3 rounded-lg border border-slate-800 flex items-center justify-between text-xs font-mono">
                              <div>
                                <span className={`px-2 py-0.5 rounded font-bold mr-2 ${
                                  log.method === "POST" ? "bg-amber-950 text-amber-400" : "bg-slate-850 text-slate-300"
                                }`}>
                                  {log.method}
                                </span>
                                <span className="text-slate-300">{log.path}</span>
                              </div>
                              <div className="flex items-center space-x-3 text-right">
                                <span className="text-slate-400">{log.duration}ms</span>
                                <span className={`font-bold ${
                                  log.statusCode < 400 ? "text-emerald-400" : "text-red-400"
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
                </div>
              )}

              {/* SECTION: USERS */}
              {activeSection === "users" && (
                <div className="space-y-6">
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                    <div>
                      <h2 className="text-xl font-bold text-white mb-1">Developer Directory</h2>
                      <p className="text-sm text-slate-400">Inspect and search all registered developer profiles on the Ricarut platform.</p>
                    </div>
                    <form onSubmit={handleUserSearchSubmit} className="flex items-center space-x-2">
                      <input
                        type="text"
                        placeholder="Search by email, name..."
                        value={userSearch}
                        onChange={(e) => setUserSearch(e.target.value)}
                        className="bg-slate-900 border border-slate-800 rounded-lg px-4 py-2 text-sm text-slate-200 placeholder-slate-500 focus:outline-none focus:border-amber-500/50"
                      />
                      <button type="submit" className="px-4 py-2 bg-amber-600 hover:bg-amber-500 text-slate-950 font-bold rounded-lg text-sm transition-colors">
                        Search
                      </button>
                    </form>
                  </div>

                  <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow-md">
                    {users.length === 0 ? (
                      <p className="text-sm text-slate-400 py-12 text-center italic">No matching developer users found.</p>
                    ) : (
                      <div className="overflow-x-auto">
                        <table className="w-full text-left text-sm text-slate-300">
                          <thead className="bg-slate-850 text-slate-400 uppercase text-xs font-mono border-b border-slate-800">
                            <tr>
                              <th className="px-6 py-4">Developer</th>
                              <th className="px-6 py-4">Status</th>
                              <th className="px-6 py-4">Role</th>
                              <th className="px-6 py-4">Registered</th>
                              <th className="px-6 py-4">User ID</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-850">
                            {users.map((u) => (
                              <tr key={u.id} className="hover:bg-slate-850/40">
                                <td className="px-6 py-4">
                                  <p className="font-semibold text-white">{u.firstName} {u.lastName}</p>
                                  <p className="text-xs text-slate-400">{u.email}</p>
                                </td>
                                <td className="px-6 py-4">
                                  <span className={`px-2.5 py-0.5 rounded text-[11px] font-bold uppercase ${
                                    u.status === "active" ? "bg-emerald-950/40 text-emerald-400" : "bg-red-950/40 text-red-400"
                                  }`}>
                                    {u.status}
                                  </span>
                                </td>
                                <td className="px-6 py-4 font-mono text-xs uppercase text-slate-300">{u.role}</td>
                                <td className="px-6 py-4 text-xs text-slate-400">{new Date(u.createdAt).toLocaleDateString()}</td>
                                <td className="px-6 py-4 font-mono text-xs text-slate-500">{u.id}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* SECTION: PROJECTS */}
              {activeSection === "projects" && (
                <div className="space-y-6">
                  <div>
                    <h2 className="text-xl font-bold text-white mb-1">Registered Projects</h2>
                    <p className="text-sm text-slate-400">Review segregated project environments, owners, and resource limits.</p>
                  </div>

                  <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow-md">
                    {projects.length === 0 ? (
                      <p className="text-sm text-slate-400 py-12 text-center italic">No projects exist on the platform.</p>
                    ) : (
                      <div className="overflow-x-auto">
                        <table className="w-full text-left text-sm text-slate-300">
                          <thead className="bg-slate-850 text-slate-400 uppercase text-xs font-mono border-b border-slate-800">
                            <tr>
                              <th className="px-6 py-4">Project</th>
                              <th className="px-6 py-4">Owner/Org</th>
                              <th className="px-6 py-4">Environment</th>
                              <th className="px-6 py-4">Status</th>
                              <th className="px-6 py-4">Customers</th>
                              <th className="px-6 py-4">Wallets</th>
                              <th className="px-6 py-4">Transfers</th>
                              <th className="px-6 py-4">Created</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-850">
                            {projects.map((p) => (
                              <tr key={p.id} className="hover:bg-slate-850/40">
                                <td className="px-6 py-4">
                                  <p className="font-semibold text-white">{p.name}</p>
                                  <p className="text-xs text-slate-500 font-mono">{p.id}</p>
                                </td>
                                <td className="px-6 py-4">
                                  <p className="text-slate-300 font-semibold">{p.organization?.name || "Unknown Org"}</p>
                                  <p className="text-xs text-slate-400">
                                    {p.organization?.members?.[0]?.user?.email || "No email"}
                                  </p>
                                </td>
                                <td className="px-6 py-4">
                                  <span className={`px-2.5 py-0.5 rounded text-[11px] font-bold uppercase font-mono border ${
                                    p.environment === "live"
                                      ? "bg-red-950/20 border-red-500/20 text-red-400"
                                      : "bg-amber-950/20 border-amber-500/20 text-amber-400"
                                  }`}>
                                    {p.environment}
                                  </span>
                                </td>
                                <td className="px-6 py-4 text-xs font-bold text-emerald-400 uppercase">{p.status}</td>
                                <td className="px-6 py-4 font-mono text-sm text-white">{p._count?.customers || 0}</td>
                                <td className="px-6 py-4 font-mono text-sm text-white">{p._count?.accounts || 0}</td>
                                <td className="px-6 py-4 font-mono text-sm text-white">{p._count?.transfers || 0}</td>
                                <td className="px-6 py-4 text-xs text-slate-400">{new Date(p.createdAt).toLocaleDateString()}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* SECTION: CUSTOMERS */}
              {activeSection === "customers" && (
                <div className="space-y-6">
                  <div>
                    <h2 className="text-xl font-bold text-white mb-1">Customers</h2>
                    <p className="text-sm text-slate-400">Directly inspect all customers registered in multi-tenant sandboxes.</p>
                  </div>

                  <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow-md">
                    {customers.length === 0 ? (
                      <p className="text-sm text-slate-400 py-12 text-center italic">No customers registered yet.</p>
                    ) : (
                      <div className="overflow-x-auto">
                        <table className="w-full text-left text-sm text-slate-300">
                          <thead className="bg-slate-850 text-slate-400 uppercase text-xs font-mono border-b border-slate-800">
                            <tr>
                              <th className="px-6 py-4">Customer</th>
                              <th className="px-6 py-4">Project Workspace</th>
                              <th className="px-6 py-4">External ID</th>
                              <th className="px-6 py-4">Associated Accounts</th>
                              <th className="px-6 py-4">Status</th>
                              <th className="px-6 py-4">Created</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-850">
                            {customers.map((c) => (
                              <tr key={c.id} className="hover:bg-slate-850/40">
                                <td className="px-6 py-4">
                                  <p className="font-semibold text-white">{c.firstName} {c.lastName}</p>
                                  <p className="text-xs text-slate-400">{c.email}</p>
                                </td>
                                <td className="px-6 py-4 text-slate-300 font-semibold">{c.project?.name || "Unknown"}</td>
                                <td className="px-6 py-4 font-mono text-xs text-slate-400">{c.externalId || "N/A"}</td>
                                <td className="px-6 py-4 text-xs font-semibold text-white">
                                  {c.accounts?.map((a: any) => `${a.id} (${a.currency})`).join(", ") || "No Accounts"}
                                </td>
                                <td className="px-6 py-4">
                                  <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-emerald-950 text-emerald-400 border border-emerald-550/10">
                                    {c.status}
                                  </span>
                                </td>
                                <td className="px-6 py-4 text-xs text-slate-400">{new Date(c.createdAt).toLocaleDateString()}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* SECTION: ACCOUNTS */}
              {activeSection === "accounts" && (
                <div className="space-y-6">
                  <div>
                    <h2 className="text-xl font-bold text-white mb-1">Financial Accounts</h2>
                    <p className="text-sm text-slate-400">
                      Observe account ledger balances. Alterations can only be initiated by actual double-entry postings.
                    </p>
                  </div>

                  <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow-md">
                    {accounts.length === 0 ? (
                      <p className="text-sm text-slate-400 py-12 text-center italic">No financial accounts exist.</p>
                    ) : (
                      <div className="overflow-x-auto">
                        <table className="w-full text-left text-sm text-slate-300">
                          <thead className="bg-slate-850 text-slate-400 uppercase text-xs font-mono border-b border-slate-800">
                            <tr>
                              <th className="px-6 py-4">Account ID</th>
                              <th className="px-6 py-4">Customer</th>
                              <th className="px-6 py-4">Project</th>
                              <th className="px-6 py-4">Currency</th>
                              <th className="px-6 py-4">Available Balance</th>
                              <th className="px-6 py-4">Pending Balance</th>
                              <th className="px-6 py-4">Status</th>
                              <th className="px-6 py-4">Created</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-850">
                            {accounts.map((a) => (
                              <tr key={a.id} className="hover:bg-slate-850/40">
                                <td className="px-6 py-4 font-mono text-xs text-amber-500 font-bold">{a.id}</td>
                                <td className="px-6 py-4">
                                  {a.customer ? (
                                    <>
                                      <p className="font-semibold text-white">{a.customer.firstName} {a.customer.lastName}</p>
                                      <p className="text-xs text-slate-400">{a.customer.email}</p>
                                    </>
                                  ) : (
                                    <span className="text-xs text-slate-500 font-mono">None</span>
                                  )}
                                </td>
                                <td className="px-6 py-4 text-slate-300 font-semibold">{a.project?.name || "Unknown"}</td>
                                <td className="px-6 py-4 font-mono text-xs text-slate-300">{a.currency}</td>
                                <td className="px-6 py-4 font-mono font-bold text-white">
                                  ₦{(a.available / 100).toLocaleString()}
                                </td>
                                <td className="px-6 py-4 font-mono text-slate-400">
                                  ₦{(a.pending / 100).toLocaleString()}
                                </td>
                                <td className="px-6 py-4 text-xs font-bold text-emerald-400 uppercase">{a.status}</td>
                                <td className="px-6 py-4 text-xs text-slate-400">{new Date(a.createdAt).toLocaleDateString()}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* SECTION: TRANSFERS */}
              {activeSection === "transfers" && (
                <div className="space-y-6">
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                    <div>
                      <h2 className="text-xl font-bold text-white mb-1">Ledger Transfers</h2>
                      <p className="text-sm text-slate-400">Monitor multi-workspace payment allocations across different states.</p>
                    </div>
                    <div className="flex items-center space-x-2">
                      <span className="text-xs text-slate-400 uppercase tracking-widest font-mono">Filter Status:</span>
                      <select
                        value={transferFilter}
                        onChange={(e) => setTransferFilter(e.target.value)}
                        className="bg-slate-900 border border-slate-800 rounded-lg px-3 py-1.5 text-xs font-mono text-slate-200 focus:outline-none"
                      >
                        <option value="">ALL STATUSES</option>
                        <option value="created">CREATED</option>
                        <option value="processing">PROCESSING</option>
                        <option value="settled">SETTLED</option>
                        <option value="reversed">REVERSED</option>
                      </select>
                    </div>
                  </div>

                  <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow-md">
                    {transfers.length === 0 ? (
                      <p className="text-sm text-slate-400 py-12 text-center italic">No transfers match selection filters.</p>
                    ) : (
                      <div className="overflow-x-auto">
                        <table className="w-full text-left text-sm text-slate-300">
                          <thead className="bg-slate-850 text-slate-400 uppercase text-xs font-mono border-b border-slate-800">
                            <tr>
                              <th className="px-6 py-4">Transfer ID</th>
                              <th className="px-6 py-4">Project</th>
                              <th className="px-6 py-4">Routing Route</th>
                              <th className="px-6 py-4">Amount</th>
                              <th className="px-6 py-4">Reference</th>
                              <th className="px-6 py-4">Status</th>
                              <th className="px-6 py-4">Provider</th>
                              <th className="px-6 py-4">Executed</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-850">
                            {transfers.map((t) => (
                              <tr key={t.id} className="hover:bg-slate-850/40">
                                <td className="px-6 py-4 font-mono text-xs text-slate-400">{t.id}</td>
                                <td className="px-6 py-4 text-slate-300 font-semibold">{t.project?.name || "Unknown"}</td>
                                <td className="px-6 py-4">
                                  <p className="text-xs font-semibold text-slate-200">Src: {t.sourceAccountId || "Internal"}</p>
                                  <p className="text-xs text-slate-400">Dst: {t.destinationAccountId || "External Payout"}</p>
                                </td>
                                <td className="px-6 py-4 font-mono font-bold text-white">
                                  ₦{(t.amount / 100).toLocaleString()}
                                </td>
                                <td className="px-6 py-4 font-mono text-xs text-slate-400">{t.reference}</td>
                                <td className="px-6 py-4">
                                  <span className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold uppercase ${
                                    t.status === "settled"
                                      ? "bg-emerald-950 text-emerald-400"
                                      : t.status === "processing"
                                      ? "bg-blue-950 text-blue-400"
                                      : "bg-slate-800 text-slate-400"
                                  }`}>
                                    {t.status}
                                  </span>
                                </td>
                                <td className="px-6 py-4 font-mono text-xs text-slate-400">{t.providerId || "sandbox"}</td>
                                <td className="px-6 py-4 text-xs text-slate-400">{new Date(t.createdAt).toLocaleString()}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* SECTION: TRANSACTIONS (JOURNALS) */}
              {activeSection === "transactions" && (
                <div className="space-y-6">
                  <div>
                    <h2 className="text-xl font-bold text-white mb-1">Double-Entry Journals</h2>
                    <p className="text-sm text-slate-400">
                      Audit platform transactions ledger records. Arbitrary database additions or balance deletions are strictly disallowed.
                    </p>
                  </div>

                  <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow-md">
                    {transactions.length === 0 ? (
                      <p className="text-sm text-slate-400 py-12 text-center italic">No transaction journals found.</p>
                    ) : (
                      <div className="overflow-x-auto">
                        <table className="w-full text-left text-sm text-slate-300">
                          <thead className="bg-slate-850 text-slate-400 uppercase text-xs font-mono border-b border-slate-800">
                            <tr>
                              <th className="px-6 py-4">Journal / Transaction ID</th>
                              <th className="px-6 py-4">Project</th>
                              <th className="px-6 py-4">Reference</th>
                              <th className="px-6 py-4">Type</th>
                              <th className="px-6 py-4">Balance Sheet Scope (Entries)</th>
                              <th className="px-6 py-4">Status</th>
                              <th className="px-6 py-4">Posted Date</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-850">
                            {transactions.map((j) => (
                              <tr key={j.id} className="hover:bg-slate-850/40">
                                <td className="px-6 py-4 font-mono text-xs text-slate-400">{j.id}</td>
                                <td className="px-6 py-4 text-slate-300 font-semibold">{j.project?.name || "Unknown"}</td>
                                <td className="px-6 py-4 font-mono text-xs text-slate-300">{j.reference}</td>
                                <td className="px-6 py-4">
                                  <span className="bg-slate-800 text-slate-400 text-[10px] uppercase font-mono px-2 py-0.5 rounded font-bold">
                                    {j.type}
                                  </span>
                                </td>
                                <td className="px-6 py-4 space-y-1.5">
                                  {j.entries?.map((e: any) => (
                                    <div key={e.id} className="text-xs font-mono flex items-center justify-between min-w-[200px]">
                                      <span className="text-slate-400">{e.ledgerAccountId.substring(0, 14)}...</span>
                                      <span className={e.direction === "credit" ? "text-emerald-400 font-bold" : "text-amber-500 font-bold"}>
                                        {e.direction === "credit" ? "+" : "-"}{(e.amount / 100).toLocaleString()} {j.currency}
                                      </span>
                                    </div>
                                  ))}
                                </td>
                                <td className="px-6 py-4">
                                  <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold uppercase bg-emerald-950 text-emerald-400">
                                    {j.status}
                                  </span>
                                </td>
                                <td className="px-6 py-4 text-xs text-slate-400">{new Date(j.createdAt).toLocaleString()}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* SECTION: API ACTIVITY */}
              {activeSection === "api-activity" && (
                <div className="space-y-6">
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                    <div>
                      <h2 className="text-xl font-bold text-white mb-1">API Request Activity</h2>
                      <p className="text-sm text-slate-400">Trace and audit every request cycle across multi-project scopes.</p>
                    </div>
                    <div className="flex flex-wrap items-center gap-3">
                      <div className="flex items-center space-x-2">
                        <span className="text-[10px] uppercase font-mono text-slate-400">Response:</span>
                        <select
                          value={logStatusFilter}
                          onChange={(e) => setLogStatusFilter(e.target.value)}
                          className="bg-slate-900 border border-slate-800 rounded-lg px-2.5 py-1 text-xs font-mono text-slate-200 focus:outline-none"
                        >
                          <option value="">ALL STATUSES</option>
                          <option value="success">SUCCESS (&lt;400)</option>
                          <option value="4xx">CLIENT ERROR (4xx)</option>
                          <option value="5xx">SERVER ERROR (5xx)</option>
                        </select>
                      </div>

                      <div className="flex items-center space-x-2">
                        <span className="text-[10px] uppercase font-mono text-slate-400">Category:</span>
                        <select
                          value={logCategoryFilter}
                          onChange={(e) => setLogCategoryFilter(e.target.value)}
                          className="bg-slate-900 border border-slate-800 rounded-lg px-2.5 py-1 text-xs font-mono text-slate-200 focus:outline-none"
                        >
                          <option value="">ALL ENDPOINTS</option>
                          <option value="transfers">TRANSFERS (/transfers)</option>
                          <option value="auth">AUTH (/auth)</option>
                          <option value="other">OTHER</option>
                        </select>
                      </div>
                    </div>
                  </div>

                  <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow-md">
                    {apiLogs.length === 0 ? (
                      <p className="text-sm text-slate-400 py-12 text-center italic">No request logs match selection.</p>
                    ) : (
                      <div className="overflow-x-auto">
                        <table className="w-full text-left text-sm text-slate-300">
                          <thead className="bg-slate-850 text-slate-400 uppercase text-xs font-mono border-b border-slate-800">
                            <tr>
                              <th className="px-6 py-4">Request ID</th>
                              <th className="px-6 py-4">Method</th>
                              <th className="px-6 py-4">Endpoint Path</th>
                              <th className="px-6 py-4">Status Code</th>
                              <th className="px-6 py-4">Environment</th>
                              <th className="px-6 py-4">Latency</th>
                              <th className="px-6 py-4">Timestamp</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-850 font-mono text-xs">
                            {apiLogs.map((log) => (
                              <tr key={log.id} className="hover:bg-slate-850/40">
                                <td className="px-6 py-4 text-slate-400">{log.requestId}</td>
                                <td className="px-6 py-4">
                                  <span className={`px-2 py-0.5 rounded font-bold ${
                                    log.method === "POST"
                                      ? "bg-amber-950/40 text-amber-400"
                                      : log.method === "GET"
                                      ? "bg-blue-950/40 text-blue-400"
                                      : "bg-slate-800 text-slate-400"
                                  }`}>
                                    {log.method}
                                  </span>
                                </td>
                                <td className="px-6 py-4 text-white text-xs">{log.path}</td>
                                <td className="px-6 py-4">
                                  <span className={`font-bold ${
                                    log.statusCode < 400
                                      ? "text-emerald-400"
                                      : log.statusCode < 500
                                      ? "text-amber-400"
                                      : "text-red-400 animate-pulse"
                                  }`}>
                                    {log.statusCode}
                                  </span>
                                </td>
                                <td className="px-6 py-4 uppercase text-[10px] tracking-wider font-semibold text-slate-400">
                                  {log.environment || "test"}
                                </td>
                                <td className="px-6 py-4 text-slate-300 font-semibold">{log.duration}ms</td>
                                <td className="px-6 py-4 text-xs text-slate-500 font-sans">
                                  {new Date(log.createdAt).toLocaleString()}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* SECTION: SANDBOX MONITORS */}
              {activeSection === "sandbox" && sandboxData && (
                <div className="space-y-8">
                  <div>
                    <h2 className="text-xl font-bold text-white mb-1">Sandbox Environment Monitor</h2>
                    <p className="text-sm text-slate-400">
                      Observe sandbox simulation parameters, fake banking networks, and internal events.
                    </p>
                  </div>

                  <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-sm">
                    <p className="text-xs font-mono text-slate-400 uppercase tracking-widest">Simulator Interface Status</p>
                    <div className="flex items-center space-x-2 mt-2">
                      <span className="w-2.5 h-2.5 bg-emerald-400 rounded-full animate-ping"></span>
                      <span className="text-emerald-400 font-bold font-mono tracking-widest text-sm uppercase">
                        {sandboxData.providerStatus}
                      </span>
                    </div>
                    <p className="text-xs text-slate-400 mt-2">
                      Direct integration adapter intercepts are successfully routed through virtual providers with zero real-money connections.
                    </p>
                  </div>

                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {/* Sandbox Transfers */}
                    <div className="bg-slate-900 border border-slate-800 rounded-xl p-5">
                      <h3 className="text-md font-bold text-white mb-4 uppercase font-mono tracking-wider text-amber-500">
                        🕹️ Recent Sandbox Transfers
                      </h3>
                      {sandboxData.sandboxTransfers.length === 0 ? (
                        <p className="text-xs text-slate-400 italic py-4">No sandbox transfers recorded.</p>
                      ) : (
                        <div className="space-y-2.5">
                          {sandboxData.sandboxTransfers.slice(0, 5).map((t: any) => (
                            <div key={t.id} className="bg-slate-950 p-3 rounded-lg border border-slate-800 flex items-center justify-between text-xs">
                              <div>
                                <p className="font-mono text-slate-300">ID: {t.id}</p>
                                <p className="text-slate-400 mt-0.5">Reference: {t.reference}</p>
                              </div>
                              <div className="text-right">
                                <p className="font-mono font-bold text-white">₦{(t.amount / 100).toLocaleString()}</p>
                                <span className="bg-slate-800 text-slate-400 text-[9px] px-1.5 py-0.5 rounded font-bold uppercase font-mono mt-1 inline-block">
                                  {t.status}
                                </span>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* Sandbox Events */}
                    <div className="bg-slate-900 border border-slate-800 rounded-xl p-5">
                      <h3 className="text-md font-bold text-white mb-4 uppercase font-mono tracking-wider text-amber-500">
                        ⚡ Simulator Event Log
                      </h3>
                      {sandboxData.sandboxEvents.length === 0 ? (
                        <p className="text-xs text-slate-400 italic py-4">No simulation actions triggered.</p>
                      ) : (
                        <div className="space-y-2.5">
                          {sandboxData.sandboxEvents.slice(0, 5).map((e: any) => (
                            <div key={e.id} className="bg-slate-950 p-3 rounded-lg border border-slate-800 text-xs font-mono">
                              <div className="flex items-center justify-between mb-1.5">
                                <span className="bg-amber-950 text-amber-400 px-2 py-0.5 rounded font-bold font-mono">
                                  {e.scenario}
                                </span>
                                <span className="text-slate-500">{new Date(e.createdAt).toLocaleTimeString()}</span>
                              </div>
                              <pre className="text-[10px] text-slate-400 bg-slate-900/60 p-2 rounded border border-slate-850/80 overflow-x-auto">
                                {JSON.stringify(e.metadata, null, 2)}
                              </pre>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </>
          )}
        </main>
      </div>
    </div>
  );
};

export default AdminPanel;
