import React, { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { api } from "../lib/api";
import { formatMoney, formatDate } from "../utils/format";
import { StatusBadge } from "../components/StatusBadge";
import { SkeletonLoader } from "../components/SkeletonLoader";
import {
  Wallet,
  ArrowLeft,
  Coins,
  Fingerprint,
  Calendar,
  AlertTriangle,
  Layers,
  ArrowUpRight,
  ArrowDownLeft,
  Lock,
  Unlock,
  Slash,
  CheckCircle,
} from "lucide-react";

export const AccountDetails: React.FC = () => {
  const { id } = useParams<{ id: string }>();

  const [account, setAccount] = useState<any | null>(null);
  const [ledgerEntries, setLedgerEntries] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [isMutatingStatus, setIsMutatingStatus] = useState(false);
  const [mutationError, setMutationError] = useState<string | null>(null);

  const loadData = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const [accRes, ledgerRes] = await Promise.all([
        api.get(`/api/v1/accounts/${id}`),
        api.get(`/api/v1/accounts/${id}/ledger`),
      ]);

      setAccount(accRes.data.account || accRes.data.data);
      setLedgerEntries(ledgerRes.data.entries || ledgerRes.data.data || []);
    } catch (err: any) {
      console.error("Failed to load ledger account details", err);
      setError(err.message || "Failed to retrieve account records or double-entry ledger history.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (id) {
      loadData();
    }
  }, [id]);

  const handleUpdateStatus = async (targetStatus: "active" | "frozen" | "closed") => {
    if (!account) return;
    
    const confirmMsg = 
      targetStatus === "closed" 
        ? "Are you absolutely sure you want to permanently CLOSE this financial account? Closed accounts cannot receive or send transactions, and this action is irreversible."
        : `Are you sure you want to change the status of this account to ${targetStatus.toUpperCase()}?`;

    if (!window.confirm(confirmMsg)) {
      return;
    }

    setMutationError(null);
    setIsMutatingStatus(true);

    try {
      await api.patch(`/api/v1/accounts/${id}`, { status: targetStatus });
      // Reload profile
      await loadData();
    } catch (err: any) {
      console.error("Failed to patch account status", err);
      setMutationError(err.message || "Could not update account status.");
    } finally {
      setIsMutatingStatus(false);
    }
  };

  if (isLoading) {
    return <SkeletonLoader rows={6} columns={5} />;
  }

  if (error || !account) {
    return (
      <div className="rounded-xl border border-red-200 bg-red-50 p-6 text-center shadow-xs">
        <AlertTriangle className="mx-auto h-12 w-12 text-red-500" />
        <h3 className="mt-4 text-sm font-bold text-slate-900">Failed to load account</h3>
        <p className="mt-2 text-xs text-slate-500 max-w-sm mx-auto leading-relaxed">{error}</p>
        <div className="mt-4 flex justify-center space-x-3">
          <Link
            to="../"
            className="rounded bg-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-300"
          >
            Go Back
          </Link>
          <button
            onClick={loadData}
            className="rounded bg-slate-900 px-3 py-1.5 text-xs font-semibold text-white hover:bg-slate-800"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      
      {/* Back button */}
      <div className="flex items-center space-x-3">
        <Link
          to="../"
          className="flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-500 hover:text-slate-700 transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
        </Link>
        <span className="text-xs font-bold uppercase text-slate-400 tracking-wider">Back to Accounts</span>
      </div>

      {/* Grid container */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Left column: Account meta card */}
        <div className="space-y-6">
          <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-xs space-y-6">
            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
              <div>
                <h2 className="text-lg font-extrabold text-slate-900">{account.name}</h2>
                <span className="inline-flex items-center space-x-1 font-bold text-slate-500 bg-slate-100 px-2 py-0.5 rounded text-[10px] uppercase border border-slate-200 mt-1.5">
                  <Coins className="h-3 w-3 text-slate-400 shrink-0" />
                  <span>{account.currency} Wallet</span>
                </span>
              </div>
              <StatusBadge status={account.status} />
            </div>

            {/* Balances details block */}
            <div className="rounded-lg bg-slate-50 p-4 border border-slate-100 space-y-4">
              <div>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Booked ledger balance</p>
                <p className="text-xl font-extrabold text-slate-900 mt-1">{formatMoney(account.balance, account.currency)}</p>
              </div>
              <div className="pt-3 border-t border-slate-200/60">
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Available (unreserved)</p>
                <p className="text-xl font-extrabold text-slate-950 mt-1">{formatMoney(account.available, account.currency)}</p>
              </div>
              {account.pending !== 0 && (
                <div className="pt-3 border-t border-slate-200/60">
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Pending reserves (held)</p>
                  <p className="text-sm font-bold text-slate-600 mt-1">{formatMoney(account.pending, account.currency)}</p>
                </div>
              )}
            </div>

            {/* Profile fields */}
            <div className="space-y-4 pt-1">
              <div className="flex items-start space-x-3 text-sm">
                <Fingerprint className="h-4.5 w-4.5 text-slate-400 mt-0.5 shrink-0" />
                <div className="space-y-0.5">
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Account ledger id</p>
                  <p className="font-mono text-xs font-semibold text-slate-700 select-all">{account.id}</p>
                </div>
              </div>

              {account.customer && (
                <div className="flex items-start space-x-3 text-sm">
                  <Coins className="h-4.5 w-4.5 text-slate-400 mt-0.5 shrink-0" />
                  <div className="space-y-0.5">
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Account owner customer</p>
                    <Link
                      to={`/projects/${account.projectId}/customers/${account.customer.id}`}
                      className="text-xs font-bold text-indigo-600 hover:underline"
                    >
                      {account.customer.firstName} {account.customer.lastName}
                    </Link>
                  </div>
                </div>
              )}

              <div className="flex items-start space-x-3 text-sm">
                <Calendar className="h-4.5 w-4.5 text-slate-400 mt-0.5 shrink-0" />
                <div className="space-y-0.5">
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Opened on</p>
                  <p className="font-semibold text-slate-700">{formatDate(account.createdAt)}</p>
                </div>
              </div>
            </div>

            {/* Gated action triggers Freezing & Closing (Section 6) */}
            <div className="border-t border-slate-100 pt-5 space-y-4">
              <span className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                Administrative account controls
              </span>

              {mutationError && (
                <div className="flex items-start space-x-1.5 rounded-lg bg-red-50 p-2 border border-red-200 text-red-800 text-xs">
                  <AlertTriangle className="h-4 w-4 text-red-500 shrink-0" />
                  <span>{mutationError}</span>
                </div>
              )}

              <div className="flex flex-col gap-2">
                {account.status === "active" && (
                  <button
                    onClick={() => handleUpdateStatus("frozen")}
                    disabled={isMutatingStatus}
                    className="flex w-full items-center justify-center space-x-2 rounded-lg border border-amber-200 bg-amber-50/50 text-amber-800 px-3 py-2 text-xs font-bold hover:bg-amber-50 transition-all disabled:opacity-50"
                  >
                    <Lock className="h-4 w-4 text-amber-500 shrink-0" />
                    <span>Freeze Digital Account</span>
                  </button>
                )}

                {account.status === "frozen" && (
                  <button
                    onClick={() => handleUpdateStatus("active")}
                    disabled={isMutatingStatus}
                    className="flex w-full items-center justify-center space-x-2 rounded-lg border border-emerald-200 bg-emerald-50/50 text-emerald-800 px-3 py-2 text-xs font-bold hover:bg-emerald-50 transition-all disabled:opacity-50"
                  >
                    <Unlock className="h-4 w-4 text-emerald-500 shrink-0" />
                    <span>Unfreeze Digital Account</span>
                  </button>
                )}

                {account.status !== "closed" && (
                  <button
                    onClick={() => handleUpdateStatus("closed")}
                    disabled={isMutatingStatus}
                    className="flex w-full items-center justify-center space-x-2 rounded-lg border border-rose-200 bg-rose-50/50 text-rose-800 px-3 py-2 text-xs font-bold hover:bg-rose-50 transition-all disabled:opacity-50"
                  >
                    <Slash className="h-4 w-4 text-rose-500 shrink-0" />
                    <span>Permanently Close Account</span>
                  </button>
                )}

                {account.status === "closed" && (
                  <div className="flex items-center space-x-2 rounded-lg bg-slate-100 border border-slate-200 p-3 text-slate-500 text-xs font-medium">
                    <CheckCircle className="h-4.5 w-4.5 text-slate-400 shrink-0" />
                    <span>This financial account is closed and cannot be altered.</span>
                  </div>
                )}
              </div>
            </div>
            
          </div>
        </div>

        {/* Right column: Double-entry Ledger listings */}
        <div className="lg:col-span-2 space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-md font-bold uppercase tracking-wider text-slate-500 flex items-center space-x-2">
              <Layers className="h-4.5 w-4.5 text-slate-400" />
              <span>Immutable Ledger History ({ledgerEntries.length} entries)</span>
            </h2>
          </div>

          {ledgerEntries.length === 0 ? (
            <div className="rounded-xl border border-dashed border-slate-300 bg-white p-12 text-center shadow-xs">
              <Layers className="mx-auto h-12 w-12 text-slate-300 animate-pulse" />
              <h3 className="mt-4 text-sm font-bold text-slate-900">No ledger transactions posted</h3>
              <p className="mt-2 text-xs text-slate-500 max-w-sm mx-auto leading-relaxed">
                This digital account has not recorded any accounting entries. You can fund this wallet using the Sandbox Console to post a deposit journal!
              </p>
            </div>
          ) : (
            <div className="border border-slate-200 rounded-xl bg-white overflow-hidden shadow-xs">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-sm">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-200 text-slate-400 font-semibold text-xs uppercase tracking-wider">
                      <th className="px-6 py-3.5">Booking Date</th>
                      <th className="px-6 py-3.5">Journal Details</th>
                      <th className="px-6 py-3.5">Entry Reference</th>
                      <th className="px-6 py-3.5 text-right">Amount (Debits / Credits)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 font-medium">
                    {ledgerEntries.map((entry) => {
                      const isCredit = entry.direction?.toLowerCase() === "credit";
                      const parentJournal = entry.journal || {};
                      
                      return (
                        <tr key={entry.id} className="hover:bg-slate-50/50 transition-colors">
                          <td className="px-6 py-4 text-slate-400 text-xs shrink-0 whitespace-nowrap">
                            {formatDate(entry.createdAt)}
                          </td>
                          <td className="px-6 py-4">
                            <div>
                              <span className="text-slate-800 font-bold text-sm block">
                                {parentJournal.description || "General ledger transfer transaction"}
                              </span>
                              <span className="inline-flex items-center rounded bg-slate-100 px-1.5 py-0.5 text-[9px] font-bold text-slate-500 uppercase tracking-wide border border-slate-200/50 mt-1">
                                Type: {parentJournal.type || "transfer"}
                              </span>
                            </div>
                          </td>
                          <td className="px-6 py-4">
                            <div className="space-y-0.5">
                              <span className="font-mono text-[10px] text-slate-400 select-all block">Entry: {entry.id}</span>
                              <span className="font-mono text-[10px] text-slate-500 font-bold select-all block">Ref: {parentJournal.reference}</span>
                            </div>
                          </td>
                          <td className="px-6 py-4 text-right">
                            {isCredit ? (
                              <span className="font-extrabold text-emerald-600 text-sm tracking-tight whitespace-nowrap">
                                + {formatMoney(entry.amount, entry.currency)}
                              </span>
                            ) : (
                              <span className="font-extrabold text-slate-800 text-sm tracking-tight whitespace-nowrap">
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

      </div>

    </div>
  );
};
export default AccountDetails;
