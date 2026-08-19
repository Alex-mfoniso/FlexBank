import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useApp } from "../context/AppContext";
import { api } from "../lib/api";
import { formatMoney, formatDate } from "../utils/format";
import { StatusBadge } from "../components/StatusBadge";
import { SkeletonLoader } from "../components/SkeletonLoader";
import {
  Wallet,
  Search,
  Plus,
  ArrowRight,
  AlertCircle,
  Coins,
  ShieldCheck,
} from "lucide-react";

export const Accounts: React.FC = () => {
  const { selectedProjectId } = useApp();

  const [accounts, setAccounts] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchAccounts = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await api.get("/api/v1/accounts");
      setAccounts(response.data.accounts || response.data.data || []);
    } catch (err: any) {
      console.error("Failed to fetch account records", err);
      setError(err.message || "Failed to retrieve the project financial accounts.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (selectedProjectId) {
      fetchAccounts();
    }
  }, [selectedProjectId]);

  // Perform filtering
  const filteredAccounts = accounts.filter((acc) => {
    // A. Filter by status
    if (statusFilter !== "all" && acc.status?.toLowerCase() !== statusFilter) {
      return false;
    }

    // B. Filter by query
    const term = searchQuery.toLowerCase().trim();
    if (!term) return true;

    return (
      acc.name?.toLowerCase().includes(term) ||
      acc.id?.toLowerCase().includes(term) ||
      acc.currency?.toLowerCase().includes(term) ||
      acc.customer?.firstName?.toLowerCase().includes(term) ||
      acc.customer?.lastName?.toLowerCase().includes(term)
    );
  });

  return (
    <div className="space-y-6">
      
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center pb-5 border-b border-slate-200">
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight text-slate-900">Financial Accounts</h1>
          <p className="text-xs text-slate-500 font-semibold mt-1">
            Audit book balances, pending reserves, and currency exposure limits.
          </p>
        </div>
      </div>

      {/* Advanced search and filter controls */}
      {accounts.length > 0 && (
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-2.5 h-4.5 w-4.5 text-slate-400" />
            <input
              type="text"
              placeholder="Search by account name, currency or customer..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="block w-full rounded-lg border border-slate-200 bg-white pl-10 pr-4 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 transition-all"
            />
          </div>
          
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700 focus:border-indigo-500 focus:outline-none transition-all"
          >
            <option value="all">All Statuses</option>
            <option value="active">Active Only</option>
            <option value="frozen">Frozen Only</option>
            <option value="closed">Closed Only</option>
          </select>
        </div>
      )}

      {/* Main Account listing Content */}
      {isLoading ? (
        <SkeletonLoader rows={4} columns={6} />
      ) : error ? (
        <div className="rounded-xl border border-red-200 bg-red-50 p-6 text-center shadow-xs">
          <AlertCircle className="mx-auto h-12 w-12 text-red-500" />
          <h3 className="mt-4 text-sm font-bold text-slate-900">Failed to load accounts</h3>
          <p className="mt-2 text-xs text-slate-500 max-w-sm mx-auto leading-relaxed">{error}</p>
          <button
            onClick={fetchAccounts}
            className="mt-4 rounded bg-slate-900 px-3 py-1.5 text-xs font-semibold text-white hover:bg-slate-800"
          >
            Retry
          </button>
        </div>
      ) : accounts.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-12 text-center shadow-xs">
          <Wallet className="mx-auto h-12 w-12 text-slate-300 animate-bounce" />
          <h3 className="mt-4 text-sm font-bold text-slate-900">No bank accounts registered</h3>
          <p className="mt-2 text-xs text-slate-500 max-w-md mx-auto leading-relaxed">
            Create customer profiles first, and issue digital currency accounts from their specific details card!
          </p>
          <div className="mt-6">
            <Link
              to={`/projects/${selectedProjectId}/customers`}
              className="inline-flex items-center space-x-1.5 rounded-lg bg-indigo-600 px-4 py-2 text-xs font-bold text-white hover:bg-indigo-500 shadow-sm transition-all"
            >
              <span>Go to Customers</span>
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </div>
      ) : filteredAccounts.length === 0 ? (
        <div className="rounded-xl border border-slate-200 bg-white p-12 text-center shadow-xs">
          <Search className="mx-auto h-12 w-12 text-slate-300" />
          <h3 className="mt-4 text-sm font-bold text-slate-900">No match found</h3>
          <p className="mt-2 text-xs text-slate-500">
            No accounts match the active filter parameters.
          </p>
        </div>
      ) : (
        <div className="border border-slate-200 rounded-xl bg-white overflow-hidden shadow-xs">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-sm">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-slate-400 font-semibold text-xs uppercase tracking-wider">
                  <th className="px-6 py-3.5">Account Details</th>
                  <th className="px-6 py-3.5">Linked Customer</th>
                  <th className="px-6 py-3.5">Currency</th>
                  <th className="px-6 py-3.5">Book Balance</th>
                  <th className="px-6 py-3.5">Available Balance</th>
                  <th className="px-6 py-3.5">Status</th>
                  <th className="px-6 py-3.5 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium">
                {filteredAccounts.map((acc) => (
                  <tr key={acc.id} className="hover:bg-slate-50/50 transition-colors">
                    <td className="px-6 py-4">
                      <div>
                        <span className="text-slate-900 font-bold block">{acc.name}</span>
                        <span className="font-mono text-[10px] text-slate-400 select-all">{acc.id}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-slate-700">
                      {acc.customer ? (
                        <Link
                          to={`/projects/${acc.projectId}/customers/${acc.customer.id}`}
                          className="text-indigo-600 hover:underline font-bold"
                        >
                          {acc.customer.firstName} {acc.customer.lastName}
                        </Link>
                      ) : (
                        <span className="text-slate-400">Merchant Pool / Platform Core</span>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      <span className="inline-flex items-center space-x-1 font-bold text-slate-700 bg-slate-100 px-2 py-0.5 rounded text-xs uppercase border border-slate-200">
                        <Coins className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                        <span>{acc.currency}</span>
                      </span>
                    </td>
                    <td className="px-6 py-4 text-slate-900 font-bold">{formatMoney(acc.balance, acc.currency)}</td>
                    <td className="px-6 py-4 text-slate-950 font-extrabold">{formatMoney(acc.available, acc.currency)}</td>
                    <td className="px-6 py-4">
                      <StatusBadge status={acc.status} />
                    </td>
                    <td className="px-6 py-4 text-right">
                      <Link
                        to={`/projects/${acc.projectId}/accounts/${acc.id}`}
                        className="inline-flex items-center space-x-1 text-xs font-bold text-indigo-600 hover:text-indigo-800 transition-colors"
                      >
                        <span>Ledger</span>
                        <ArrowRight className="h-3.5 w-3.5" />
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

    </div>
  );
};
export default Accounts;
