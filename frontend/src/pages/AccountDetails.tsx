import React, { useEffect, useState } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { api } from "../lib/api";
import { formatMoney, formatDate } from "../utils/format";
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
  RefreshCw,
  Loader2,
  Copy,
  Check,
  User,
  ExternalLink,
  Info
} from "lucide-react";

export const AccountDetails: React.FC = () => {
  const { projectId, id: accountId } = useParams<{ projectId: string; id: string }>();
  const navigate = useNavigate();

  const [account, setAccount] = useState<any | null>(null);
  const [ledgerEntries, setLedgerEntries] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Administrative action states
  const [isMutatingStatus, setIsMutatingStatus] = useState(false);
  const [mutationError, setMutationError] = useState<string | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Copy click tracking
  const [copiedId, setCopiedId] = useState(false);

  const handleCopyId = () => {
    if (!accountId) return;
    navigator.clipboard.writeText(accountId);
    setCopiedId(true);
    setTimeout(() => setCopiedId(false), 2000);
  };

  const loadAccountLedgerData = async (showSpin = true) => {
    if (!accountId || !projectId) return;
    if (showSpin) setIsLoading(true);
    setError(null);
    try {
      // Authoritative project boundary checks (Section 25)
      const [accRes, ledgerRes] = await Promise.all([
        api.get(`/api/v1/accounts/${accountId}`, { headers: { "x-project-id": projectId } }),
        api.get(`/api/v1/accounts/${accountId}/ledger`, { headers: { "x-project-id": projectId } }),
      ]);

      const retrievedAccount = accRes.data.account || accRes.data.data;
      
      // Strict project context protection
      if (retrievedAccount.projectId !== projectId) {
        throw new Error("This financial ledger account does not belong to the active project context.");
      }

      setAccount(retrievedAccount);
      setLedgerEntries(ledgerRes.data.entries || ledgerRes.data.data || []);
    } catch (err: any) {
      console.error("Failed to fetch ledger details data", err);
      setError(err.message || "Failed to retrieve account records or double-entry ledger history.");
    } finally {
      if (showSpin) setIsLoading(false);
    }
  };

  useEffect(() => {
    loadAccountLedgerData();
  }, [accountId, projectId]);

  // Balance Refresh Action Button (Section 11 compliance)
  const handleRefreshBalance = async () => {
    setIsRefreshing(true);
    setMutationError(null);
    try {
      await loadAccountLedgerData(false);
    } catch (err: any) {
      setMutationError("Could not synchronize book balances.");
    } finally {
      setIsRefreshing(false);
    }
  };

  // Status Mutation Handler (Section 16 & 17 compliance)
  const handleUpdateStatus = async (targetStatus: "active" | "frozen" | "closed") => {
    if (!account || !projectId) return;

    const confirmMsg =
      targetStatus === "closed"
        ? "Permanently CLOSE account? Closed accounts cannot receive or send transactions, and this action is completely irreversible."
        : `Are you sure you want to change the status of this account to ${targetStatus.toUpperCase()}?`;

    if (!window.confirm(confirmMsg)) {
      return;
    }

    setMutationError(null);
    setIsMutatingStatus(true);

    try {
      // Execute status update call authoritatively on the backend
      await api.patch(
        `/api/v1/accounts/${accountId}`,
        { status: targetStatus },
        { headers: { "x-project-id": projectId } }
      );

      await loadAccountLedgerData(false);
    } catch (err: any) {
      console.error("Failed to patch account status", err);
      setMutationError(err.message || "Could not update account status.");
    } finally {
      setIsMutatingStatus(false);
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-6 font-mono select-none text-left">
        <div className="h-6 bg-neutral-950 border border-neutral-900 rounded w-1/4 animate-pulse" />
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="h-60 bg-neutral-950 border border-neutral-900 rounded-lg animate-pulse" />
          <div className="lg:col-span-2 h-60 bg-neutral-950 border border-neutral-900 rounded-lg animate-pulse" />
        </div>
      </div>
    );
  }

  if (error || !account) {
    return (
      <div className="rounded border border-red-950 bg-red-950/5 p-8 text-center max-w-md mx-auto font-mono text-left">
        <AlertTriangle className="mx-auto h-12 w-12 text-rose-500" />
        <h3 className="mt-4 text-xs font-black uppercase tracking-wider text-white">Account Not Found</h3>
        <p className="mt-2 text-[10px] text-neutral-500 leading-relaxed font-semibold">{error}</p>
        <div className="mt-6 flex space-x-3">
          <button
            onClick={() => navigate(`/projects/${projectId}/accounts`)}
            className="flex-1 rounded border border-neutral-900 bg-neutral-950 py-2 text-xs font-bold uppercase text-neutral-500 hover:text-white transition-all cursor-pointer text-center"
          >
            Back to accounts
          </button>
          <button
            onClick={() => loadAccountLedgerData(true)}
            className="flex-1 rounded bg-indigo-600 py-2 text-xs font-bold uppercase text-white hover:bg-indigo-500 transition-all cursor-pointer"
          >
            Retry Query
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8 font-mono select-none text-left">
      
      {/* 1. Header Toolbar */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center pb-5 border-b border-neutral-900 gap-4">
        <div className="flex items-center space-x-3">
          <Link
            to={`/projects/${projectId}/accounts`}
            className="flex h-8 w-8 items-center justify-center rounded border border-neutral-900 bg-neutral-950 text-neutral-500 hover:text-white transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
          </Link>
          <div>
            <h1 className="text-md font-black text-white uppercase tracking-wider">
              {account.name}
            </h1>
            <p className="text-[9px] text-neutral-500 mt-1 select-all uppercase tracking-widest font-bold">
              ID: {account.id}
            </p>
          </div>
        </div>

        <div className="flex items-center space-x-2 shrink-0">
          {/* Manual Real Refresh Controls (Section 11) */}
          <button
            onClick={handleRefreshBalance}
            disabled={isRefreshing}
            className="rounded border border-neutral-800 bg-neutral-950 px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider text-neutral-400 hover:text-white transition-all disabled:opacity-50 cursor-pointer flex items-center space-x-1.5"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${isRefreshing ? "animate-spin" : ""}`} />
            <span>{isRefreshing ? "Refreshing..." : "Refresh"}</span>
          </button>
        </div>
      </div>

      {/* Sandbox Test Mode alert indicator (Section 19 & 20 compliance) */}
      <div className="rounded border border-amber-950/40 bg-amber-950/5 px-4 py-3 text-[10px] text-amber-500 font-bold uppercase tracking-wider flex items-start space-x-2">
        <Info className="h-4.5 w-4.5 shrink-0 text-amber-500" />
        <div>
          <span>TEST MODE: No real money is involved. Spawning and funding digital ledger assets operate strictly under mock configurations.</span>
        </div>
      </div>

      {/* 2. Left / Right details layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        
        {/* Left Side: Ledger Meta and controls */}
        <div className="lg:col-span-4 space-y-5">
          <div className="rounded-lg border border-neutral-900 bg-neutral-950/40 p-5 space-y-6">
            <div className="flex flex-col items-center text-center pb-5 border-b border-neutral-900/60">
              <div className="flex h-12 w-12 items-center justify-center rounded bg-indigo-950/60 border border-indigo-900/40 text-indigo-400 font-black text-lg uppercase select-none">
                <Wallet className="h-5 w-5" />
              </div>
              <h2 className="text-sm font-black text-white mt-3 uppercase tracking-tight truncate max-w-full">
                {account.name}
              </h2>
              <div className="mt-2.5 flex items-center space-x-2">
                <span className="inline-flex items-center space-x-1 font-bold text-neutral-400 bg-neutral-950 border border-neutral-900 px-2 py-0.5 rounded text-[8.5px] uppercase">
                  <Coins className="h-3 w-3 text-neutral-600 shrink-0" />
                  <span>{account.currency}</span>
                </span>
                <span className={`inline-flex items-center rounded border px-2 py-0.5 text-[8.5px] font-black uppercase tracking-wider leading-none ${
                  account.status === "active"
                    ? "border-emerald-900/40 bg-emerald-950/20 text-emerald-500"
                    : account.status === "frozen"
                    ? "border-amber-900/40 bg-amber-950/20 text-amber-500"
                    : "border-red-900/40 bg-red-950/20 text-red-500"
                }`}>
                  {account.status || "active"}
                </span>
              </div>
            </div>

            {/* Prominent dynamic balance panel block (Section 10) */}
            <div className="rounded border border-neutral-900 bg-neutral-950 p-4 space-y-4 font-mono">
              <div>
                <span className="block text-[8px] font-bold text-neutral-600 uppercase tracking-widest">Available Balance</span>
                <p className="text-lg font-black text-white mt-1">{formatMoney(account.available, account.currency)}</p>
              </div>
              <div className="pt-3 border-t border-neutral-900/60">
                <span className="block text-[8px] font-bold text-neutral-600 uppercase tracking-widest">Booked Ledger Balance</span>
                <p className="text-lg font-black text-neutral-400 mt-1">{formatMoney(account.balance, account.currency)}</p>
              </div>
              {account.pending !== 0 && (
                <div className="pt-3 border-t border-neutral-900/60">
                  <span className="block text-[8px] font-bold text-neutral-600 uppercase tracking-widest">Pending Reserves (Held)</span>
                  <p className="text-xs font-black text-neutral-500 mt-1">{formatMoney(account.pending, account.currency)}</p>
                </div>
              )}
            </div>

            {/* Profile fields and Owner parameters (Section 12) */}
            <div className="space-y-4 text-xs font-semibold">
              <div>
                <span className="block text-[8px] font-bold text-neutral-600 uppercase tracking-widest">Account ID</span>
                <div className="mt-1 flex items-center justify-between font-mono text-[10px] text-neutral-300 bg-neutral-950 border border-neutral-900 rounded p-1.5 px-2 select-all">
                  <span className="truncate pr-4">{account.id}</span>
                  <button onClick={handleCopyId} className="text-neutral-500 hover:text-white transition-colors cursor-pointer shrink-0">
                    {copiedId ? <Check className="h-3.5 w-3.5 text-emerald-500" /> : <Copy className="h-3.5 w-3.5" />}
                  </button>
                </div>
              </div>

              {account.customer && (
                <div className="bg-neutral-950 border border-neutral-900/60 p-3 rounded space-y-2.5">
                  <div className="flex items-center space-x-1.5 text-neutral-600">
                    <User className="h-3.5 w-3.5" />
                    <span className="text-[8px] font-bold uppercase tracking-widest">Customer Owner</span>
                  </div>
                  <div>
                    <p className="text-xs font-bold text-white uppercase tracking-tight">
                      {account.customer.firstName} {account.customer.lastName}
                    </p>
                    <p className="font-mono text-[9px] text-neutral-500 mt-0.5 select-all">ID: {account.customer.id}</p>
                  </div>
                  <Link
                    to={`/projects/${projectId}/customers/${account.customer.id}`}
                    className="inline-flex items-center space-x-1 text-[9px] font-black uppercase text-indigo-400 hover:text-white transition-colors tracking-widest mt-1"
                  >
                    <span>View Customer</span>
                    <ExternalLink className="h-3 w-3 shrink-0" />
                  </Link>
                </div>
              )}

              <div>
                <span className="block text-[8px] font-bold text-neutral-600 uppercase tracking-widest">Opened On</span>
                <span className="mt-1 block text-neutral-300">{formatDate(account.createdAt)}</span>
              </div>
            </div>

            {/* Administrative freeze/unfreeze actions (Section 16 & 17) */}
            <div className="border-t border-neutral-900 pt-5 space-y-4">
              <span className="block text-[9px] font-bold text-neutral-600 uppercase tracking-widest">
                Ledger controls
              </span>

              {mutationError && (
                <div className="flex items-start space-x-1.5 rounded border border-red-950 bg-red-950/10 p-2.5 text-red-400 text-[10px] font-semibold">
                  <AlertTriangle className="h-4 w-4 text-red-500 shrink-0" />
                  <span>{mutationError}</span>
                </div>
              )}

              <div className="flex flex-col gap-2">
                {account.status === "active" && (
                  <button
                    onClick={() => handleUpdateStatus("frozen")}
                    disabled={isMutatingStatus}
                    className="flex w-full items-center justify-center space-x-2 rounded border border-amber-900/40 bg-amber-950/20 text-amber-500 px-3 py-2 text-[10px] font-bold uppercase hover:bg-amber-950/45 transition-all disabled:opacity-50 cursor-pointer"
                  >
                    {isMutatingStatus ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Lock className="h-3.5 w-3.5 shrink-0" />}
                    <span>Freeze Digital Account</span>
                  </button>
                )}

                {account.status === "frozen" && (
                  <button
                    onClick={() => handleUpdateStatus("active")}
                    disabled={isMutatingStatus}
                    className="flex w-full items-center justify-center space-x-2 rounded border border-emerald-900/40 bg-emerald-950/20 text-emerald-500 px-3 py-2 text-[10px] font-bold uppercase hover:bg-emerald-950/45 transition-all disabled:opacity-50 cursor-pointer"
                  >
                    {isMutatingStatus ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Unlock className="h-3.5 w-3.5 shrink-0" />}
                    <span>Unfreeze Digital Account</span>
                  </button>
                )}

                {account.status !== "closed" && (
                  <button
                    onClick={() => handleUpdateStatus("closed")}
                    disabled={isMutatingStatus}
                    className="flex w-full items-center justify-center space-x-2 rounded border border-red-900/40 bg-red-950/20 text-red-500 px-3 py-2 text-[10px] font-bold uppercase hover:bg-red-950/45 transition-all disabled:opacity-50 cursor-pointer"
                  >
                    {isMutatingStatus ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Slash className="h-3.5 w-3.5 shrink-0" />}
                    <span>Permanently Close Account</span>
                  </button>
                )}

                {account.status === "closed" && (
                  <div className="flex items-center space-x-2 rounded border border-neutral-900 bg-neutral-950 p-3.5 text-neutral-600 text-[10px] font-bold uppercase tracking-wider">
                    <CheckCircle className="h-4.5 w-4.5 text-neutral-700 shrink-0" />
                    <span>This financial account is permanently closed.</span>
                  </div>
                )}
              </div>
            </div>

          </div>
        </div>

        {/* Right Side: Immutable Double-Entry Ledger streams */}
        <div className="lg:col-span-8 rounded-lg border border-neutral-900 bg-neutral-950/40 p-5 space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-neutral-900">
            <h2 className="text-xs font-black uppercase tracking-wider text-white flex items-center space-x-2">
              <Layers className="h-4 w-4 text-neutral-600" />
              <span>Immutable Ledger Balance Stream</span>
            </h2>
            <span className="text-[10px] font-bold text-neutral-500 uppercase tracking-widest">{ledgerEntries.length} entries</span>
          </div>

          {ledgerEntries.length === 0 ? (
            <div className="py-12 text-center max-w-sm mx-auto space-y-2">
              <Layers className="mx-auto h-10 w-10 text-neutral-800 animate-pulse" />
              <h3 className="text-xs font-bold text-neutral-400 uppercase tracking-wider">No transactions posted</h3>
              <p className="text-[10px] text-neutral-600 font-semibold leading-relaxed">
                This digital account has not recorded ledger transactions yet. Use the Sandbox Console to post dynamic deposits!
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto select-none">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-neutral-900/60 text-[8px] text-neutral-500 uppercase tracking-wider font-bold">
                    <th className="py-2.5">Booking Date</th>
                    <th className="py-2.5">Journal Details</th>
                    <th className="py-2.5">Entry Reference</th>
                    <th className="py-2.5 text-right pr-4">Amount Direction</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-900/20 font-mono text-[10.5px] text-neutral-300">
                  {ledgerEntries.map((entry) => {
                    const isCredit = entry.direction?.toLowerCase() === "credit";
                    const parentJournal = entry.journal || {};

                    return (
                      <tr key={entry.id} className="hover:bg-neutral-950/30 transition-colors">
                        <td className="py-3 text-neutral-500 whitespace-nowrap text-[9.5px]">
                          {formatDate(entry.createdAt)}
                        </td>
                        <td className="py-3 pr-4">
                          <div>
                            <span className="text-white font-bold text-[11px] block uppercase tracking-tight">
                              {parentJournal.description || "General ledger transfer"}
                            </span>
                            <span className="inline-block mt-1 px-1.5 py-0.5 rounded text-[7.5px] font-black uppercase tracking-wider border border-neutral-900/60 bg-neutral-950 text-neutral-600">
                              Type: {parentJournal.type || "transfer"}
                            </span>
                          </div>
                        </td>
                        <td className="py-3 font-mono text-[9px] text-neutral-500 space-y-0.5 select-all">
                          <span className="block text-neutral-500">Entry: {entry.id.substring(0, 15)}...</span>
                          <span className="block text-neutral-600 font-bold">Ref: {parentJournal.reference}</span>
                        </td>
                        <td className="py-3 text-right pr-4">
                          {isCredit ? (
                            <span className="font-black text-emerald-500 whitespace-nowrap">
                              + {formatMoney(entry.amount, entry.currency)}
                            </span>
                          ) : (
                            <span className="font-black text-neutral-300 whitespace-nowrap">
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
          )}
        </div>

      </div>

    </div>
  );
};

export default AccountDetails;
