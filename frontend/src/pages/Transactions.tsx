import React, { useEffect, useState } from "react";
import { Link, useParams, useSearchParams } from "react-router-dom";
import { api } from "../lib/api";
import { formatMoney, formatDate } from "../utils/format";
import {
  Search,
  X,
  AlertTriangle,
  RefreshCw,
  Info,
  ChevronRight,
  ArrowUpRight,
  ArrowRight,
  Copy,
  Check,
  Coins,
  Activity
} from "lucide-react";

export const Transactions: React.FC = () => {
  const { projectId } = useParams<{ projectId: string }>();
  const [searchParams, setSearchParams] = useSearchParams();

  // URL state tracking (Section 27)
  const initialSearch = searchParams.get("search") || "";
  const [searchQuery, setSearchQuery] = useState(initialSearch);
  const [typeFilter, setTypeFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");

  const [transactions, setTransactions] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Copy click tracking
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const handleCopy = (id: string, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    navigator.clipboard.writeText(id);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const fetchTransactions = async () => {
    if (!projectId) return;
    setIsLoading(true);
    setError(null);
    try {
      // Authoritative project boundary checks (Section 21)
      const res = await api.get("/api/v1/transactions", {
        headers: { "x-project-id": projectId }
      });

      const list = res.data.transfers || res.data.data || [];
      
      // Ensure records strictly match parent project context (Section 21)
      const isolatedTx = list.filter((tx: any) => tx.projectId === projectId);
      setTransactions(isolatedTx);
    } catch (err: any) {
      console.error("Failed to fetch project transactions", err);
      setError(err.message || "Failed to retrieve transaction journals.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchTransactions();
  }, [projectId]);

  // Sync searches to URL
  useEffect(() => {
    if (searchQuery.trim()) {
      setSearchParams({ search: searchQuery });
    } else {
      searchParams.delete("search");
      setSearchParams(searchParams);
    }
  }, [searchQuery]);

  // Safe client-side search & filters (Section 5 & 6)
  const filteredTransactions = transactions.filter((tx) => {
    if (typeFilter !== "all" && tx.type !== typeFilter) return false;
    if (statusFilter !== "all" && tx.status !== statusFilter) return false;

    const term = searchQuery.toLowerCase().trim();
    if (!term) return true;

    return (
      tx.id?.toLowerCase().includes(term) ||
      tx.reference?.toLowerCase().includes(term) ||
      tx.status?.toLowerCase().includes(term) ||
      tx.sourceAccountId?.toLowerCase().includes(term) ||
      tx.destinationAccountId?.toLowerCase().includes(term) ||
      tx.sourceAccount?.name?.toLowerCase().includes(term) ||
      tx.destinationAccount?.name?.toLowerCase().includes(term) ||
      tx.beneficiary?.name?.toLowerCase().includes(term)
    );
  });

  return (
    <div className="space-y-8 font-mono select-none text-left relative">
      
      {/* 1. Header Toolbar */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center pb-5 border-b border-neutral-900 gap-4">
        <div>
          <h1 className="text-xl font-black text-white uppercase tracking-tight">Transactions Log</h1>
          <p className="text-[10px] text-neutral-500 font-semibold mt-1">
            View and inspect financial activity across your project.
          </p>
        </div>
        <Link
          to={`/projects/${projectId}/transfers`}
          className="rounded bg-indigo-600 px-4 py-2 text-xs font-bold uppercase tracking-wider text-white hover:bg-indigo-500 transition-all active:scale-[0.98] flex items-center space-x-1.5 shadow-md shadow-indigo-600/10"
        >
          <ArrowUpRight className="h-4 w-4 shrink-0" />
          <span>Create transfer</span>
        </Link>
      </div>

      {/* Sandbox Warning Card (Section 25) */}
      <div className="rounded border border-amber-950/40 bg-amber-950/5 px-4 py-3 text-[10px] text-amber-500 font-bold uppercase tracking-wider flex items-start space-x-2">
        <Info className="h-4.5 w-4.5 shrink-0 text-amber-500" />
        <div>
          <span>TEST MODE: No real currency is involved. Sandbox transactions reflect mock ledger settlements.</span>
        </div>
      </div>

      {/* 2. Advanced Search & Filtering (Section 5 & 6) */}
      {transactions.length > 0 && (
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3.5 top-2.5 h-4 w-4 text-neutral-600" />
            <input
              type="text"
              placeholder="Search by transaction ID, reference, source, destination..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="block w-full rounded border border-neutral-900 bg-neutral-950 pl-10 pr-4 py-2 text-xs text-white placeholder:text-neutral-700 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 transition-all"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery("")}
                className="absolute right-3 top-2.5 text-neutral-600 hover:text-white cursor-pointer"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>
          
          <div className="flex gap-2">
            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
              className="rounded border border-neutral-900 bg-neutral-950 px-3 py-2 text-xs font-bold text-neutral-400 focus:border-indigo-500 focus:outline-none cursor-pointer"
            >
              <option value="all">All Types</option>
              <option value="internal">Internal</option>
              <option value="external">External</option>
            </select>

            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="rounded border border-neutral-900 bg-neutral-950 px-3 py-2 text-xs font-bold text-neutral-400 focus:border-indigo-500 focus:outline-none cursor-pointer"
            >
              <option value="all">All Statuses</option>
              <option value="successful">Successful</option>
              <option value="pending">Pending</option>
              <option value="processing">Processing</option>
              <option value="failed">Failed</option>
            </select>
          </div>
        </div>
      )}

      {/* 3. Main content body */}
      {isLoading ? (
        <div className="space-y-4 pt-4">
          <div className="h-10 bg-neutral-950 border border-neutral-900 rounded animate-pulse" />
          <div className="h-28 bg-neutral-950 border border-neutral-900 rounded animate-pulse" />
          <div className="h-28 bg-neutral-950 border border-neutral-900 rounded animate-pulse" />
        </div>
      ) : error ? (
        <div className="rounded border border-red-950 bg-red-950/5 p-6 text-center max-w-md mx-auto">
          <AlertTriangle className="mx-auto h-10 w-10 text-red-500" />
          <h3 className="mt-4 text-xs font-black uppercase tracking-wider text-white">Failed to load transactions</h3>
          <p className="mt-2 text-[10px] text-neutral-500 font-semibold">{error}</p>
          <button
            onClick={fetchTransactions}
            className="mt-5 inline-flex items-center space-x-1.5 rounded bg-neutral-900 px-4 py-2 text-xs font-bold uppercase tracking-wider text-white hover:bg-neutral-800 border border-neutral-800 cursor-pointer"
          >
            <RefreshCw className="h-3.5 w-3.5" />
            <span>Retry Query</span>
          </button>
        </div>
      ) : transactions.length === 0 ? (
        <div className="rounded-lg border border-neutral-900 bg-neutral-950/10 p-12 text-center max-w-lg mx-auto">
          <Activity className="mx-auto h-12 w-12 text-neutral-700 animate-pulse" />
          <h3 className="mt-4 text-xs font-black uppercase tracking-widest text-neutral-400">NO TRANSACTIONS YET</h3>
          <p className="mt-2 text-[10px] text-neutral-500 font-medium leading-relaxed">
            Transactions created by your FlexBank financial flows will appear here. Move sandbox funds between digital wallets to post balancing journal lines.
          </p>
          <div className="mt-6">
            <Link
              to={`/projects/${projectId}/transfers`}
              className="rounded bg-indigo-600 px-4 py-2 text-xs font-bold uppercase text-white hover:bg-indigo-500 transition-all"
            >
              Create transfer
            </Link>
          </div>
        </div>
      ) : filteredTransactions.length === 0 ? (
        <div className="rounded-lg border border-neutral-900 bg-neutral-950/20 p-12 text-center max-w-lg mx-auto">
          <Search className="mx-auto h-10 w-10 text-neutral-700" />
          <h3 className="mt-4 text-xs font-black uppercase tracking-widest text-neutral-400">No matching records</h3>
          <p className="mt-2 text-[10px] text-neutral-500 font-medium">
            No database transactions match the active search filters.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          
          {/* Desktop view (Section 26) */}
          <div className="hidden lg:block rounded-lg border border-neutral-900 bg-neutral-950/40 overflow-hidden">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-neutral-950/60 border-b border-neutral-900 text-neutral-500 font-black text-[9px] uppercase tracking-wider">
                  <th className="px-6 py-3.5">Transaction ID</th>
                  <th className="px-6 py-3.5">Type</th>
                  <th className="px-6 py-3.5">Amount</th>
                  <th className="px-6 py-3.5">From</th>
                  <th className="px-6 py-3.5">To</th>
                  <th className="px-6 py-3.5">Status</th>
                  <th className="px-6 py-3.5 text-right pr-6">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-900/40 text-[11px] font-semibold text-neutral-300">
                {filteredTransactions.map((tx) => (
                  <tr key={tx.id} className="hover:bg-neutral-950/30 transition-colors">
                    <td className="px-6 py-4">
                      <div>
                        <span className="font-bold text-white block uppercase tracking-tight">{tx.reference || "DEBIT/CREDIT"}</span>
                        <div className="flex items-center space-x-1.5 font-mono text-[9.5px] mt-1 text-neutral-500 select-all">
                          <span>{tx.id}</span>
                          <button
                            onClick={(e) => handleCopy(tx.id, e)}
                            className="text-neutral-700 hover:text-white transition-colors cursor-pointer"
                          >
                            {copiedId === tx.id ? (
                              <Check className="h-3 w-3 text-emerald-500" />
                            ) : (
                              <Copy className="h-3 w-3" />
                            )}
                          </button>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className="inline-block px-1.5 py-0.5 rounded text-[8px] font-black uppercase tracking-wider border border-neutral-900 bg-neutral-950 text-neutral-400">
                        {tx.type}
                      </span>
                    </td>
                    <td className="px-6 py-4 font-black text-white">{formatMoney(tx.amount, tx.currency)}</td>
                    <td className="px-6 py-4 text-xs">
                      {tx.sourceAccount ? (
                        <div>
                          <span className="block font-bold text-white uppercase">{tx.sourceAccount.name}</span>
                          <span className="font-mono text-[9.5px] text-neutral-500">{tx.sourceAccount.id}</span>
                        </div>
                      ) : (
                        <span className="text-neutral-600">Merchant Core / Pool</span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-xs">
                      {tx.type === "internal" ? (
                        tx.destinationAccount ? (
                          <div>
                            <span className="block font-bold text-indigo-400 uppercase">{tx.destinationAccount.name}</span>
                            <span className="font-mono text-[9.5px] text-neutral-500">{tx.destinationAccount.id}</span>
                          </div>
                        ) : (
                          <span className="text-neutral-600">Unknown destination</span>
                        )
                      ) : tx.beneficiary ? (
                        <div>
                          <span className="block font-bold text-white uppercase">{tx.beneficiary.name}</span>
                          <span className="text-[9.5px] text-neutral-500">{tx.beneficiary.bankCode} • Acct: {tx.beneficiary.accountNumber}</span>
                        </div>
                      ) : (
                        <span className="text-neutral-600">N/A</span>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex items-center rounded border px-2 py-0.5 text-[8.5px] font-black uppercase tracking-wider leading-none ${
                        tx.status === "successful" || tx.status === "completed"
                          ? "border-emerald-900/40 bg-emerald-950/20 text-emerald-500"
                          : tx.status === "pending" || tx.status === "processing"
                          ? "border-amber-900/40 bg-amber-950/20 text-amber-500 animate-pulse"
                          : "border-red-900/40 bg-red-950/20 text-red-500"
                      }`}>
                        {tx.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right pr-6">
                      <Link
                        to={`/projects/${projectId}/transactions/${tx.id}`}
                        className="inline-flex items-center space-x-1 text-[10px] font-black text-indigo-400 hover:text-white uppercase tracking-widest transition-colors"
                      >
                        <span>Inspect</span>
                        <ChevronRight className="h-3.5 w-3.5 shrink-0" />
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Mobile view (Section 26) */}
          <div className="block lg:hidden space-y-3">
            {filteredTransactions.map((tx) => (
              <div key={tx.id} className="rounded-lg border border-neutral-900 bg-neutral-950/40 p-4 space-y-3">
                <div className="flex items-center justify-between border-b border-neutral-900 pb-2">
                  <div>
                    <span className="font-bold text-white text-[11.5px] uppercase tracking-tight">{tx.reference || "DEBIT/CREDIT"}</span>
                    <p className="font-mono text-[9px] text-neutral-500 mt-0.5 select-all">{tx.id}</p>
                  </div>
                  <span className={`inline-flex items-center rounded border px-1.5 py-0.5 text-[7.5px] font-black uppercase tracking-wider leading-none ${
                    tx.status === "successful" || tx.status === "completed"
                      ? "border-emerald-900/40 bg-emerald-950/20 text-emerald-500"
                      : tx.status === "pending" || tx.status === "processing"
                      ? "border-amber-900/40 bg-amber-950/20 text-amber-500 animate-pulse"
                      : "border-red-900/40 bg-red-950/20 text-red-500"
                  }`}>
                    {tx.status}
                  </span>
                </div>
                <div className="text-[10px] space-y-1.5 font-medium text-neutral-400">
                  <div className="flex justify-between">
                    <span className="text-neutral-600 uppercase">Type</span>
                    <span className="font-bold uppercase text-neutral-300">{tx.type}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-neutral-600 uppercase">Amount</span>
                    <span className="font-bold text-white">{formatMoney(tx.amount, tx.currency)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-neutral-600 uppercase">From</span>
                    <span className="font-bold text-neutral-300 truncate max-w-[150px]">
                      {tx.sourceAccount?.name || "Merchant Core"}
                    </span>
                  </div>
                </div>
                <div className="pt-2 border-t border-neutral-900/60 flex justify-end">
                  <Link
                    to={`/projects/${projectId}/transactions/${tx.id}`}
                    className="inline-flex items-center space-x-1 text-[9px] font-black text-indigo-400 hover:text-white uppercase tracking-widest"
                  >
                    <span>Inspect Details</span>
                    <ChevronRight className="h-3 w-3 shrink-0" />
                  </Link>
                </div>
              </div>
            ))}
          </div>

        </div>
      )}

    </div>
  );
};

export default Transactions;
