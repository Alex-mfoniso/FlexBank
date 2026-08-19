import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../lib/api";
import { useApp } from "../context/AppContext";
import { formatMoney, formatDate } from "../utils/format";
import { StatusBadge } from "../components/StatusBadge";
import { SkeletonLoader } from "../components/SkeletonLoader";
import {
  Layers,
  Search,
  Wallet,
  ArrowUpRight,
  TrendingDown,
  AlertTriangle,
  Info,
  ArrowRight,
} from "lucide-react";

export const Ledger: React.FC = () => {
  const { selectedProjectId } = useApp();

  const [accounts, setAccounts] = useState<any[]>([]);
  const [selectedAccountId, setSelectedAccountId] = useState("");
  const [ledgerEntries, setLedgerEntries] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  
  const [isLoadingAccounts, setIsLoadingAccounts] = useState(true);
  const [isLoadingLedger, setIsLoadingLedger] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchAccounts = async () => {
    setIsLoadingAccounts(true);
    setError(null);
    try {
      const response = await api.get("/api/v1/accounts");
      const accList = response.data.accounts || response.data.data || [];
      setAccounts(accList);
      
      if (accList.length > 0) {
        setSelectedAccountId(accList[0].id);
      }
    } catch (err: any) {
      console.error("Failed to load accounts for ledger explorer", err);
      setError("Could not retrieve account list. Please verify your sandbox state.");
    } finally {
      setIsLoadingAccounts(false);
    }
  };

  const fetchLedger = async (accountId: string) => {
    if (!accountId) return;
    setIsLoadingLedger(true);
    try {
      const response = await api.get(`/api/v1/accounts/${accountId}/ledger`);
      setLedgerEntries(response.data.entries || response.data.data || []);
    } catch (err) {
      console.error("Failed to fetch ledger entries for account", err);
    } finally {
      setIsLoadingLedger(false);
    }
  };

  useEffect(() => {
    if (selectedProjectId) {
      fetchAccounts();
    }
  }, [selectedProjectId]);

  useEffect(() => {
    if (selectedAccountId) {
      fetchLedger(selectedAccountId);
    } else {
      setLedgerEntries([]);
    }
  }, [selectedAccountId]);

  const activeAccount = accounts.find((a) => a.id === selectedAccountId);

  // Perform client-side filter
  const filteredEntries = ledgerEntries.filter((entry) => {
    const term = searchQuery.toLowerCase().trim();
    if (!term) return true;

    const parentJournal = entry.journal || {};
    return (
      entry.id?.toLowerCase().includes(term) ||
      entry.direction?.toLowerCase().includes(term) ||
      parentJournal.reference?.toLowerCase().includes(term) ||
      parentJournal.type?.toLowerCase().includes(term) ||
      parentJournal.description?.toLowerCase().includes(term)
    );
  });

  return (
    <div className="space-y-6">
      
      {/* Header section */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center pb-5 border-b border-slate-200">
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight text-slate-900">General Ledger Explorer</h1>
          <p className="text-xs text-slate-500 font-semibold mt-1">
            Audit immutable accounting logs and track transactional credit and debit mappings.
          </p>
        </div>
      </div>

      {isLoadingAccounts ? (
        <SkeletonLoader rows={4} columns={4} />
      ) : error ? (
        <div className="rounded-xl border border-red-200 bg-red-50 p-6 text-center shadow-xs">
          <AlertTriangle className="mx-auto h-12 w-12 text-red-500" />
          <h3 className="mt-4 text-sm font-bold text-slate-900">Failed to load ledger context</h3>
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
          <Layers className="mx-auto h-12 w-12 text-slate-300 animate-pulse" />
          <h3 className="mt-4 text-sm font-bold text-slate-900">No active ledgers mapped</h3>
          <p className="mt-2 text-xs text-slate-500 max-w-md mx-auto leading-relaxed">
            Create customer digital accounts and fund their wallets to post balanced journal items across asset/liability codes.
          </p>
        </div>
      ) : (
        <div className="space-y-6">
          {/* Account selector panel */}
          <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-xs grid grid-cols-1 md:grid-cols-3 gap-6 items-center">
            <div className="md:col-span-2 space-y-1">
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider">
                Select Active Digital Wallet Account to Audit
              </label>
              <select
                value={selectedAccountId}
                onChange={(e) => setSelectedAccountId(e.target.value)}
                className="mt-1.5 block w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 font-semibold"
              >
                {accounts.map((acc) => (
                  <option key={acc.id} value={acc.id}>
                    {acc.name} ({acc.currency}) • Owner: {acc.customer?.firstName} {acc.customer?.lastName} ({acc.id?.slice(0, 12)}...)
                  </option>
                ))}
              </select>
            </div>

            {activeAccount && (
              <div className="rounded-lg bg-slate-50 p-3 border border-slate-100 flex justify-between items-center text-xs">
                <div>
                  <span className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider">Booked Balance</span>
                  <p className="font-extrabold text-slate-900 mt-1 text-base">{formatMoney(activeAccount.balance, activeAccount.currency)}</p>
                </div>
                <div className="text-right">
                  <span className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider">Status</span>
                  <div className="mt-1"><StatusBadge status={activeAccount.status} /></div>
                </div>
              </div>
            )}
          </div>

          {/* Search bar inside list */}
          {ledgerEntries.length > 0 && (
            <div className="relative">
              <Search className="absolute left-3 top-2.5 h-4.5 w-4.5 text-slate-400" />
              <input
                type="text"
                placeholder="Search ledger entries by reference, journal description or journal types..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="block w-full rounded-lg border border-slate-200 bg-white pl-10 pr-4 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 transition-all"
              />
            </div>
          )}

          {/* Ledger table */}
          {isLoadingLedger ? (
            <SkeletonLoader rows={4} columns={4} />
          ) : ledgerEntries.length === 0 ? (
            <div className="rounded-xl border border-dashed border-slate-300 bg-white p-12 text-center shadow-xs">
              <Layers className="mx-auto h-12 w-12 text-slate-300 animate-bounce" />
              <h3 className="mt-4 text-sm font-bold text-slate-900">No postings recorded</h3>
              <p className="mt-2 text-xs text-slate-500 max-w-sm mx-auto leading-relaxed">
                This account has not booked any ledger actions yet. Trigger a sandbox fund operation or initiate a transfer to write debits/credits!
              </p>
            </div>
          ) : filteredEntries.length === 0 ? (
            <div className="rounded-xl border border-slate-200 bg-white p-12 text-center shadow-xs">
              <Search className="mx-auto h-12 w-12 text-slate-300" />
              <h3 className="mt-4 text-sm font-bold text-slate-900">No match found</h3>
              <p className="mt-2 text-xs text-slate-500">
                No ledger entries match search term "{searchQuery}".
              </p>
            </div>
          ) : (
            <div className="border border-slate-200 rounded-xl bg-white overflow-hidden shadow-xs">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-sm">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-200 text-slate-400 font-semibold text-xs uppercase tracking-wider">
                      <th className="px-6 py-3.5">Posting Date</th>
                      <th className="px-6 py-3.5">Journal Details</th>
                      <th className="px-6 py-3.5">General Reference</th>
                      <th className="px-6 py-3.5">Entry Booking ID</th>
                      <th className="px-6 py-3.5 text-right">Value (Debit / Credit)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 font-medium">
                    {filteredEntries.map((entry) => {
                      const isCredit = entry.direction?.toLowerCase() === "credit";
                      const journal = entry.journal || {};

                      return (
                        <tr key={entry.id} className="hover:bg-slate-50/50 transition-colors">
                          <td className="px-6 py-4 text-slate-400 text-xs shrink-0 whitespace-nowrap">
                            {formatDate(entry.createdAt)}
                          </td>
                          <td className="px-6 py-4">
                            <div>
                              <span className="text-slate-900 font-bold text-sm block">
                                {journal.description || "General double-entry transfer"}
                              </span>
                              <span className="inline-flex items-center rounded bg-slate-100 px-1.5 py-0.5 text-[9px] font-bold text-slate-500 uppercase tracking-wide border border-slate-200/50 mt-1">
                                {journal.type || "transfer"}
                              </span>
                            </div>
                          </td>
                          <td className="px-6 py-4">
                            <span className="font-mono text-xs text-slate-600 font-bold select-all">{journal.reference}</span>
                          </td>
                          <td className="px-6 py-4 font-mono text-[10px] text-slate-400 select-all">{entry.id}</td>
                          <td className="px-6 py-4 text-right shrink-0 whitespace-nowrap">
                            {isCredit ? (
                              <span className="font-extrabold text-emerald-600 text-sm tracking-tight">
                                + {formatMoney(entry.amount, entry.currency)}
                              </span>
                            ) : (
                              <span className="font-extrabold text-slate-800 text-sm tracking-tight">
                                - {formatMoney(entry.amount, entry.currency)}
                              </span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

    </div>
  );
};
export default Ledger;
