import React, { useEffect, useState, useCallback } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { api } from "../lib/api";
import { transferService } from "../services/transfer.service";
import { formatMoney, formatDate } from "../utils/format";
import { getBankName } from "../utils/banks";
import type { Transfer } from "../types";
import {
  Receipt,
  ArrowLeft,
  Calendar,
  AlertTriangle,
  Building,
  CheckCircle,
  HelpCircle,
  Clock,
  ArrowUpRight,
  TrendingDown,
  Globe,
  FileText,
  Workflow,
  Sparkles,
  ShieldCheck,
  Loader2,
  Copy,
  Check,
  Info,
  RefreshCw,
  XCircle,
  RotateCcw
} from "lucide-react";

export const TransactionDetails: React.FC = () => {
  const { projectId, id: transferId } = useParams<{ projectId: string; id: string }>();
  const navigate = useNavigate();

  const [transfer, setTransfer] = useState<Transfer | null>(null);
  const [journal, setJournal] = useState<any | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSyncing, setIsSyncing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Clipboard copy state
  const [copiedId, setCopiedId] = useState(false);
  const [copiedRef, setCopiedRef] = useState(false);

  const handleCopyId = () => {
    if (!transfer?.id) return;
    navigator.clipboard.writeText(transfer.id);
    setCopiedId(true);
    setTimeout(() => setCopiedId(false), 2000);
  };

  const handleCopyRef = () => {
    if (!transfer?.reference) return;
    navigator.clipboard.writeText(transfer.reference);
    setCopiedRef(true);
    setTimeout(() => setCopiedRef(false), 2000);
  };

  const loadTransferDetails = useCallback(async (silent = false) => {
    if (!transferId || !projectId) return;
    if (!silent) setIsLoading(true);
    setError(null);
    try {
      // 1. Fetch Transfer details through Ricarut Transfer Service
      const txData = await transferService.get(transferId);

      if (!txData) {
        throw new Error("The requested transfer could not be found.");
      }

      setTransfer(txData);

      // 2. Fetch double-entry journals if available
      try {
        const journalRes = await api.get(`/api/v1/transactions/${txData.id}`, {
          headers: { "x-project-id": projectId }
        });
        setJournal(journalRes.data.journal || journalRes.data.data);
      } catch {
        try {
          const fallbackRes = await api.get(`/api/v1/transactions/${txData.reference}`, {
            headers: { "x-project-id": projectId }
          });
          setJournal(fallbackRes.data.journal || fallbackRes.data.data);
        } catch {
          // No associated double-entry journal (normal for direct external provider payouts)
        }
      }
    } catch (err: any) {
      console.error("Failed to load transfer detail metrics", err);
      if (!silent) {
        setError(err.message || "Failed to retrieve transfer metrics.");
      }
    } finally {
      if (!silent) setIsLoading(false);
    }
  }, [transferId, projectId]);

  useEffect(() => {
    loadTransferDetails();
  }, [loadTransferDetails]);

  // Synchronize transfer status against Paystack TEST rail
  const handleSyncStatus = async () => {
    if (!transferId || isSyncing) return;
    setIsSyncing(true);
    try {
      const synced = await transferService.syncStatus(transferId);
      if (synced) {
        setTransfer((prev) => ({ ...prev, ...synced }));
      }
    } catch (err: any) {
      console.error("Status synchronization failed", err);
    } finally {
      setIsSyncing(false);
    }
  };

  // Automatic Polling for in-flight transfers (status === "pending" or "processing")
  useEffect(() => {
    if (!transfer) return;
    const isNonTerminal = transfer.status === "pending" || transfer.status === "processing";
    if (!isNonTerminal) return;

    const interval = setInterval(async () => {
      try {
        const synced = await transferService.syncStatus(transfer.id);
        if (synced) {
          setTransfer((prev) => ({ ...prev, ...synced }));
        }
      } catch {
        // Silently continue polling
      }
    }, 4000);

    return () => clearInterval(interval);
  }, [transfer?.id, transfer?.status]);

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

  if (error || !transfer) {
    return (
      <div className="rounded border border-red-950 bg-red-950/5 p-8 text-center max-w-md mx-auto font-mono text-left">
        <AlertTriangle className="mx-auto h-12 w-12 text-rose-500" />
        <h3 className="mt-4 text-xs font-black uppercase tracking-wider text-white">Transfer Not Found</h3>
        <p className="mt-2 text-[10px] text-neutral-500 leading-relaxed font-semibold">{error}</p>
        <div className="mt-6 flex space-x-3">
          <button
            onClick={() => navigate(`/projects/${projectId}/transfers`)}
            className="flex-1 rounded border border-neutral-900 bg-neutral-950 py-2 text-xs font-bold uppercase text-neutral-500 hover:text-white transition-all cursor-pointer text-center"
          >
            Back to transfers
          </button>
          <button
            onClick={() => loadTransferDetails(false)}
            className="flex-1 rounded bg-indigo-600 py-2 text-xs font-bold uppercase text-white hover:bg-indigo-500 transition-all cursor-pointer"
          >
            Retry Query
          </button>
        </div>
      </div>
    );
  }

  // Multi-rail detection
  const isMpesa =
    transfer.provider === "mpesa" ||
    transfer.providerId === "mpesa" ||
    transfer.currency === "KES" ||
    !!transfer.phone_number ||
    transfer.destination?.type === "mobile_money";

  const destPhone =
    transfer.phone_number ||
    transfer.destination?.phone_number ||
    "";

  // Destination variables resolution
  const destName =
    transfer.destination?.account_name ||
    transfer.account_name ||
    transfer.recipient_name ||
    transfer.beneficiary?.name ||
    (isMpesa ? "M-Pesa Recipient" : transfer.destinationAccount ? transfer.destinationAccount.name : "N/A");

  const destBankCode =
    transfer.destination?.bank_code ||
    transfer.bank_code ||
    transfer.beneficiary?.bankCode ||
    "";

  const destAccountNumber =
    transfer.destination?.account_number ||
    transfer.account_number ||
    transfer.beneficiary?.accountNumber ||
    "";

  const isNonTerminal = transfer.status === "pending" || transfer.status === "processing";
  const ledgerBookings = journal?.entries || [];

  // Derive status timeline steps
  const timelineSteps = [
    {
      title: "Transfer Initiated",
      desc: "Idempotent payment instruction captured and registered with Ricarut infrastructure.",
      date: transfer.createdAt || transfer.created_at,
      status: "completed",
    },
    {
      title: "Provider Network Processing",
      desc: isMpesa
        ? "Routing payment to Safaricom Daraja Sandbox B2C rail for mobile money disbursement."
        : "Routing payment to Paystack TEST banking rail for external verification and settlement.",
      date: isNonTerminal || transfer.status === "successful" ? transfer.createdAt || transfer.created_at : null,
      status: transfer.status === "successful" ? "completed" : isNonTerminal ? "processing" : "pending",
    },
    {
      title:
        transfer.status === "successful"
          ? "Settlement Confirmed"
          : transfer.status === "failed"
          ? "Settlement Rejected"
          : transfer.status === "reversed"
          ? "Settlement Reversed"
          : "Settlement Pending",
      desc:
        transfer.status === "failed"
          ? `Failure details: ${transfer.failureMessage || (isMpesa ? "M-Pesa B2C payment was rejected by Daraja." : "Provider transfer was rejected or bank account was invalid.")}`
          : transfer.status === "reversed"
          ? "Funds were returned and the transfer was reversed by the destination financial rail."
          : transfer.status === "successful"
          ? (isMpesa ? "Beneficiary mobile wallet credited successfully via Safaricom M-Pesa B2C." : "Beneficiary account credited successfully on the banking rail.")
          : "Awaiting final settlement webhook notification or status confirmation from payment rail.",
      date: transfer.completedAt || (transfer.status === "successful" || transfer.status === "failed" ? transfer.updatedAt || transfer.updated_at : null),
      status:
        transfer.status === "successful"
          ? "success"
          : transfer.status === "failed"
          ? "failed"
          : transfer.status === "reversed"
          ? "reversed"
          : "pending",
    },
  ];

  return (
    <div className="space-y-8 font-mono select-none text-left">
      {/* 1. Header Toolbar */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center pb-5 border-b border-neutral-900 gap-4">
        <div className="flex items-center space-x-3">
          <Link
            to={`/projects/${projectId}/transfers`}
            className="flex h-8 w-8 items-center justify-center rounded border border-neutral-900 bg-neutral-950 text-neutral-500 hover:text-white transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
          </Link>
          <div>
            <h1 className="text-md font-black text-white uppercase tracking-wider">
              Transfer Details
            </h1>
            <div className="flex items-center space-x-2 mt-1">
              <span className="text-[9px] text-neutral-500 uppercase tracking-widest font-bold font-mono select-all">
                ID: {transfer.id}
              </span>
              <button
                onClick={handleCopyId}
                className="text-neutral-600 hover:text-white transition-colors cursor-pointer"
                title="Copy Transfer ID"
              >
                {copiedId ? (
                  <Check className="h-3 w-3 text-emerald-400" />
                ) : (
                  <Copy className="h-3 w-3" />
                )}
              </button>
            </div>
          </div>
        </div>

        {/* Sync Button */}
        <div className="flex items-center space-x-2">
          <button
            onClick={handleSyncStatus}
            disabled={isSyncing}
            className="rounded border border-neutral-900 bg-neutral-950 hover:bg-neutral-900 px-3 py-1.5 text-xs font-bold uppercase tracking-wider text-neutral-300 hover:text-white transition-all flex items-center space-x-1.5 cursor-pointer disabled:opacity-50"
            title="Query Paystack TEST rail for live status"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${isSyncing ? "animate-spin text-indigo-400" : ""}`} />
            <span>{isSyncing ? "Synchronizing..." : "Refresh Status"}</span>
          </button>
        </div>
      </div>

      {/* Sandbox Test Mode disclaimer banner */}
      <div className="rounded border border-amber-950/40 bg-amber-950/10 px-4 py-3 text-[10px] text-amber-500 font-bold uppercase tracking-wider flex items-start space-x-2">
        <Info className="h-4.5 w-4.5 shrink-0 text-amber-400 mt-0.5" />
        <div>
          <span>
            TEST MODE: Payment rail simulated with{" "}
            {isMpesa ? "Safaricom Daraja Sandbox (Kenyan M-Pesa B2C)" : "Paystack TEST (Nigerian Banks)"}{" "}
            credentials. No real currency is involved.
          </span>
        </div>
      </div>

      {/* 2. Details Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Side: Summary overview card & Timeline */}
        <div className="lg:col-span-8 space-y-6">
          {/* A. Core Info Details */}
          <div className="rounded-lg border border-neutral-900 bg-neutral-950/40 p-5 space-y-6">
            <div className="flex items-center justify-between pb-4 border-b border-neutral-900/60">
              <div className="flex items-center space-x-3">
                <div className="flex h-10 w-10 items-center justify-center rounded bg-indigo-950/60 border border-indigo-900/40 text-indigo-400">
                  <Receipt className="h-5 w-5" />
                </div>
                <div>
                  <div className="flex items-center space-x-2">
                    <h2 className="text-xs font-black text-white uppercase tracking-wider">
                      Reference: {transfer.reference}
                    </h2>
                    <button
                      onClick={handleCopyRef}
                      className="text-neutral-600 hover:text-white transition-colors cursor-pointer"
                      title="Copy Reference"
                    >
                      {copiedRef ? (
                        <Check className="h-3 w-3 text-emerald-400" />
                      ) : (
                        <Copy className="h-3 w-3" />
                      )}
                    </button>
                  </div>
                  <span className="font-mono text-[9.5px] text-neutral-500 select-all block mt-0.5">
                    Ricarut ID: {transfer.id}
                  </span>
                </div>
              </div>
              <span
                className={`inline-flex items-center rounded border px-2.5 py-1 text-[9px] font-black uppercase tracking-wider leading-none ${
                  transfer.status === "successful"
                    ? "border-emerald-900/40 bg-emerald-950/20 text-emerald-400"
                    : isNonTerminal
                    ? "border-amber-900/40 bg-amber-950/20 text-amber-400 animate-pulse"
                    : transfer.status === "reversed"
                    ? "border-purple-900/40 bg-purple-950/20 text-purple-400"
                    : "border-red-900/40 bg-red-950/20 text-red-400"
                }`}
              >
                {transfer.status === "successful"
                  ? "✓ Successful"
                  : transfer.status === "processing"
                  ? "◌ Processing"
                  : transfer.status === "pending"
                  ? "◌ Pending"
                  : transfer.status === "reversed"
                  ? "↺ Reversed"
                  : "× Failed"}
              </span>
            </div>

            {/* Metrics Grid */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-xs font-semibold">
              <div>
                <span className="block text-[8px] font-bold text-neutral-500 uppercase tracking-widest">
                  Amount
                </span>
                <p className="mt-1 text-sm font-black text-white">
                  {formatMoney(transfer.amount, transfer.currency)}
                </p>
              </div>

              <div>
                <span className="block text-[8px] font-bold text-neutral-500 uppercase tracking-widest">
                  Currency
                </span>
                <p className="mt-1 text-neutral-300 uppercase tracking-tight text-[11px]">
                  {transfer.currency || "NGN"}
                </p>
              </div>

              <div>
                <span className="block text-[8px] font-bold text-neutral-500 uppercase tracking-widest">
                  Environment
                </span>
                <p className="mt-1 text-amber-400 uppercase tracking-tight text-[11px] font-bold">
                  {transfer.environment || "Sandbox"}
                </p>
              </div>

              <div>
                <span className="block text-[8px] font-bold text-neutral-500 uppercase tracking-widest">
                  Initiated At
                </span>
                <p className="mt-1 text-neutral-300 text-[11px]">
                  {formatDate(transfer.createdAt || transfer.created_at || "")}
                </p>
              </div>
            </div>

            {/* Destination Beneficiary Card */}
            {isMpesa ? (
              <div className="rounded border border-neutral-900 bg-neutral-950 p-4 space-y-3 font-mono">
                <span className="block text-[8px] font-bold text-neutral-500 uppercase tracking-widest flex items-center space-x-1.5">
                  <Sparkles className="h-3.5 w-3.5 text-emerald-400" />
                  <span>Destination Mobile Money Details (Kenya - Safaricom M-Pesa)</span>
                </span>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
                  <div>
                    <span className="block text-[8px] text-neutral-500 uppercase">Recipient Name</span>
                    <p className="text-white font-bold mt-0.5 truncate uppercase">
                      {destName || "M-Pesa Customer"}
                    </p>
                  </div>
                  <div>
                    <span className="block text-[8px] text-neutral-500 uppercase">Provider Rail</span>
                    <p className="text-emerald-400 mt-0.5 font-bold">
                      Safaricom M-Pesa (Daraja B2C)
                    </p>
                  </div>
                  <div>
                    <span className="block text-[8px] text-neutral-500 uppercase">Mobile Number</span>
                    <p className="text-white font-mono mt-0.5 select-all font-bold">
                      {destPhone || "N/A"}
                    </p>
                  </div>
                </div>
              </div>
            ) : (
              <div className="rounded border border-neutral-900 bg-neutral-950 p-4 space-y-3 font-mono">
                <span className="block text-[8px] font-bold text-neutral-500 uppercase tracking-widest flex items-center space-x-1.5">
                  <Building className="h-3.5 w-3.5 text-indigo-400" />
                  <span>Destination Banking Details (Nigeria)</span>
                </span>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
                  <div>
                    <span className="block text-[8px] text-neutral-500 uppercase">Account Name</span>
                    <p className="text-white font-bold mt-0.5 truncate uppercase">
                      {destName}
                    </p>
                  </div>
                  <div>
                    <span className="block text-[8px] text-neutral-500 uppercase">Bank Code / Name</span>
                    <p className="text-neutral-300 mt-0.5 font-bold">
                      {destBankCode ? `${getBankName(destBankCode)} (${destBankCode})` : "N/A"}
                    </p>
                  </div>
                  <div>
                    <span className="block text-[8px] text-neutral-500 uppercase">Account Number</span>
                    <p className="text-neutral-300 font-mono mt-0.5 select-all">
                      {destAccountNumber || "N/A"}
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Failure Message Banner if failed */}
            {transfer.status === "failed" && (
              <div className="rounded border border-red-950 bg-red-950/20 p-4 space-y-1">
                <div className="flex items-center space-x-1.5 text-red-400 text-xs font-black uppercase tracking-wider">
                  <XCircle className="h-4 w-4" />
                  <span>Transfer Failure Details</span>
                </div>
                <p className="text-[11px] text-red-300 font-semibold pl-5">
                  {transfer.failureMessage || "The destination account could not be credited or provider timed out."}
                </p>
                {transfer.failureCode && (
                  <p className="text-[9px] text-neutral-500 font-mono pl-5 uppercase">
                    Code: {transfer.failureCode}
                  </p>
                )}
              </div>
            )}
          </div>

          {/* B. Status Timeline */}
          <div className="rounded-lg border border-neutral-900 bg-neutral-950/40 p-5 space-y-5">
            <h3 className="text-xs font-black uppercase tracking-wider text-white flex items-center space-x-2 pb-3 border-b border-neutral-900/60">
              <Clock className="h-4 w-4 text-neutral-600" />
              <span>Transfer Lifecycle Timeline</span>
            </h3>

            <div className="relative border-l border-neutral-900 ml-3.5 pl-6 space-y-6">
              {timelineSteps.map((step, idx) => (
                <div key={idx} className="relative">
                  <span
                    className={`absolute -left-9.5 top-0 flex h-7 w-7 items-center justify-center rounded-full border bg-neutral-950 ${
                      step.status === "completed"
                        ? "text-indigo-400 border-indigo-900/40"
                        : step.status === "success"
                        ? "text-emerald-400 border-emerald-900/40"
                        : step.status === "failed"
                        ? "text-red-400 border-red-900/40"
                        : step.status === "reversed"
                        ? "text-purple-400 border-purple-900/40"
                        : step.status === "processing"
                        ? "text-amber-400 border-amber-900/40 animate-pulse"
                        : "text-neutral-700 border-neutral-900"
                    }`}
                  >
                    {step.status === "completed" ? (
                      <CheckCircle className="h-4 w-4" />
                    ) : step.status === "success" ? (
                      <Sparkles className="h-4 w-4" />
                    ) : step.status === "failed" ? (
                      <AlertTriangle className="h-4 w-4" />
                    ) : step.status === "reversed" ? (
                      <RotateCcw className="h-4 w-4" />
                    ) : (
                      <Clock className="h-4 w-4" />
                    )}
                  </span>

                  <div className="text-xs font-semibold">
                    <div className="flex items-center justify-between">
                      <h4 className="font-bold text-white uppercase tracking-tight">{step.title}</h4>
                      {step.date && (
                        <span className="text-[10px] text-neutral-500">{formatDate(step.date)}</span>
                      )}
                    </div>
                    <p className="text-[10px] text-neutral-500 mt-1 max-w-lg leading-relaxed">{step.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right Side: Ledger Bookings / Rail Validation */}
        <div className="lg:col-span-4 rounded-lg border border-neutral-900 bg-neutral-950/40 p-5 space-y-5">
          <h3 className="text-xs font-black uppercase tracking-wider text-white flex items-center space-x-2 pb-3 border-b border-neutral-900/60">
            <FileText className="h-4.5 w-4.5 text-neutral-600" />
            <span>Infrastructure Records</span>
          </h3>

          <div className="space-y-3 text-xs font-semibold">
            <div className="rounded border border-neutral-900 bg-neutral-950 p-3.5 space-y-2">
              <span className="block text-[8px] text-neutral-500 uppercase tracking-widest">
                Provider Abstraction
              </span>
              <p className="text-neutral-200 text-xs font-bold">
                {isMpesa ? "Safaricom M-Pesa B2C Rail (Sandbox)" : "Paystack TEST Rail"}
              </p>
              <span className="text-[9.5px] text-neutral-500 block">
                Normalized via Ricarut Provider Registry
              </span>
            </div>

            <div className="rounded border border-neutral-900 bg-neutral-950 p-3.5 space-y-2">
              <span className="block text-[8px] text-neutral-500 uppercase tracking-widest">
                Settlement Direction
              </span>
              <p className="text-neutral-200 text-xs font-bold uppercase">
                {transfer.direction || "Outbound Payout"}
              </p>
            </div>

            {ledgerBookings.length > 0 && (
              <div className="space-y-2 pt-2 border-t border-neutral-900">
                <span className="block text-[8px] text-neutral-500 uppercase tracking-widest">
                  Double-Entry Ledger Bookings
                </span>
                <div className="divide-y divide-neutral-900">
                  {ledgerBookings.map((entry: any) => (
                    <div key={entry.id} className="py-2 flex justify-between items-center text-[11px]">
                      <span className="text-neutral-400 font-mono truncate max-w-[140px]">
                        {entry.ledgerAccountId}
                      </span>
                      <span
                        className={
                          entry.direction === "credit"
                            ? "text-emerald-400 font-bold"
                            : "text-neutral-300 font-bold"
                        }
                      >
                        {entry.direction === "credit" ? "+" : "-"}
                        {formatMoney(entry.amount, entry.currency)}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="rounded border border-neutral-900 bg-neutral-950 p-3.5 text-[9px] text-neutral-500 leading-normal flex items-start space-x-2 font-bold mt-4">
              <ShieldCheck className="h-4.5 w-4.5 text-emerald-500 shrink-0 mt-0.5" />
              <span>
                Isolated multi-tenant execution verified. Only authorized project members can inspect this transfer.
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TransactionDetails;
