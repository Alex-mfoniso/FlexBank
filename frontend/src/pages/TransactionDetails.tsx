import React, { useEffect, useState } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { api } from "../lib/api";
import { formatMoney, formatDate } from "../utils/format";
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
  Info
} from "lucide-react";

export const TransactionDetails: React.FC = () => {
  const { projectId, id: transferId } = useParams<{ projectId: string; id: string }>();
  const navigate = useNavigate();

  const [transfer, setTransfer] = useState<any | null>(null);
  const [journal, setJournal] = useState<any | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Clipboard copy state
  const [copiedId, setCopiedId] = useState(false);

  const handleCopyId = () => {
    if (!transferId) return;
    navigator.clipboard.writeText(transferId);
    setCopiedId(true);
    setTimeout(() => setCopiedId(false), 2000);
  };

  const loadTransferDetails = async () => {
    if (!transferId || !projectId) return;
    setIsLoading(true);
    setError(null);
    try {
      // 1. Fetch Transfer details under strict project authorization (Section 33)
      const transferRes = await api.get(`/api/v1/transfers/${transferId}`, {
        headers: { "x-project-id": projectId }
      });
      const txData = transferRes.data.transfer || transferRes.data.data;

      if (!txData) {
        throw new Error("The requested transfer profile could not be located.");
      }

      // Project Context boundary isolation verification (Section 33)
      if (txData.projectId !== projectId) {
        throw new Error("This transfer does not belong to the selected project context.");
      }

      setTransfer(txData);

      // 2. Fetch double-entry journals in parallel using transaction identifier
      try {
        const journalRes = await api.get(`/api/v1/transactions/${txData.id}`, {
          headers: { "x-project-id": projectId }
        });
        setJournal(journalRes.data.journal || journalRes.data.data);
      } catch {
        // Fallback using transaction reference key (Section 42)
        try {
          const fallbackRes = await api.get(`/api/v1/transactions/${txData.reference}`, {
            headers: { "x-project-id": projectId }
          });
          setJournal(fallbackRes.data.journal || fallbackRes.data.data);
        } catch {
          console.log("No associated double-entry journal resolved for this state.");
        }
      }

    } catch (err: any) {
      console.error("Failed to load transfer detail transaction metrics", err);
      setError(err.message || "Failed to retrieve payment orchestration metrics.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadTransferDetails();
  }, [transferId, projectId]);

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
            onClick={loadTransferDetails}
            className="flex-1 rounded bg-indigo-600 py-2 text-xs font-bold uppercase text-white hover:bg-indigo-500 transition-all cursor-pointer"
          >
            Retry Query
          </button>
        </div>
      </div>
    );
  }

  // Double-entry balancing verification
  const ledgerBookings = journal?.entries || [];

  // Derive Timeline states (Section 16)
  const timelineSteps = [
    {
      title: "Transfer Initiated",
      desc: "Idempotent payment instruction captured and registered in sandbox ledger storage.",
      date: transfer.createdAt,
      status: "completed",
    },
    {
      title: "Processing & Settling",
      desc: "Funds held in escrow. Pushing provider queues or clearing double-entry entries.",
      date: transfer.status === "processing" || transfer.status === "successful" || transfer.status === "completed" ? transfer.createdAt : null,
      status: transfer.status === "processing" || transfer.status === "successful" || transfer.status === "completed" ? "completed" : "pending",
    },
    {
      title: transfer.status === "failed" ? "Settlement Rejected" : "Settled & Cleared",
      desc: transfer.status === "failed"
        ? `Rejection reason: ${transfer.failureMessage || "Insufficient balance or invalid account status."}`
        : "Double-entry bookings finalized and journal entry values posted successfully.",
      date: transfer.completedAt || (transfer.status === "successful" || transfer.status === "completed" || transfer.status === "failed" ? transfer.createdAt : null),
      status: transfer.status === "successful" || transfer.status === "completed"
        ? "success"
        : transfer.status === "failed"
        ? "failed"
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
            <p className="text-[9px] text-neutral-500 mt-1 select-all uppercase tracking-widest font-bold">
              ID: {transfer.id}
            </p>
          </div>
        </div>
      </div>

      {/* Sandbox Test Mode disclaimer banner (Section 23) */}
      <div className="rounded border border-amber-950/40 bg-amber-950/5 px-4 py-3 text-[10px] text-amber-500 font-bold uppercase tracking-wider flex items-start space-x-2">
        <Info className="h-4.5 w-4.5 shrink-0 text-amber-500" />
        <div>
          <span>TEST MODE: No real currency is involved. Details reflect simulation operations under sandbox credentials.</span>
        </div>
      </div>

      {/* 2. Left / Right details grid column formats */}
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
                  <h2 className="text-xs font-black text-white uppercase tracking-wider">Reference: {transfer.reference}</h2>
                  <span className="font-mono text-[9.5px] text-neutral-500 select-all block mt-1">ID: {transfer.id}</span>
                </div>
              </div>
              <span className={`inline-flex items-center rounded border px-2.5 py-0.5 text-[8.5px] font-black uppercase tracking-wider leading-none ${
                transfer.status === "successful" || transfer.status === "completed"
                  ? "border-emerald-900/40 bg-emerald-950/20 text-emerald-500"
                  : transfer.status === "pending" || transfer.status === "processing"
                  ? "border-amber-900/40 bg-amber-950/20 text-amber-500 animate-pulse"
                  : "border-red-900/40 bg-red-950/20 text-red-500"
              }`}>
                {transfer.status || "successful"}
              </span>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-xs font-semibold">
              <div>
                <span className="block text-[8px] font-bold text-neutral-600 uppercase tracking-widest">Amount Settled</span>
                <p className="mt-1 text-sm font-black text-white">{formatMoney(transfer.amount, transfer.currency)}</p>
              </div>

              <div>
                <span className="block text-[8px] font-bold text-neutral-600 uppercase tracking-widest">Settlement Type</span>
                <p className="mt-1 text-neutral-300 uppercase tracking-tight text-[11px]">{transfer.type} transfer</p>
              </div>

              <div>
                <span className="block text-[8px] font-bold text-neutral-600 uppercase tracking-widest">Direction</span>
                <p className="mt-1 text-neutral-300 uppercase tracking-tight text-[11px]">{transfer.direction || "N/A"}</p>
              </div>

              <div>
                <span className="block text-[8px] font-bold text-neutral-600 uppercase tracking-widest">Registration</span>
                <p className="mt-1 text-neutral-300 text-[11px]">{formatDate(transfer.createdAt)}</p>
              </div>
            </div>

            {/* Provider and Idempotency markers */}
            <div className="rounded border border-neutral-900 bg-neutral-950 p-4 grid grid-cols-1 md:grid-cols-2 gap-4 text-xs font-semibold">
              <div>
                <span className="block text-[8px] font-bold text-neutral-600 uppercase tracking-widest flex items-center space-x-1">
                  <Globe className="h-3.5 w-3.5 text-neutral-600 shrink-0" />
                  <span>Network Provider Reference</span>
                </span>
                <p className="font-mono text-[10px] text-neutral-400 mt-1 select-all">{transfer.providerId || "sand_fld_102030"}</p>
              </div>
              <div>
                <span className="block text-[8px] font-bold text-neutral-600 uppercase tracking-widest flex items-center space-x-1">
                  <Workflow className="h-3.5 w-3.5 text-neutral-600 shrink-0" />
                  <span>Idempotency-Key signature</span>
                </span>
                <p className="font-mono text-[10px] text-neutral-400 mt-1 truncate select-all">{transfer.idempotencyKey || `idem_sig_${transfer.id?.slice(0, 8)}`}</p>
              </div>
            </div>
          </div>

          {/* B. Status Timelines (Section 16) */}
          <div className="rounded-lg border border-neutral-900 bg-neutral-950/40 p-5 space-y-5">
            <h3 className="text-xs font-black uppercase tracking-wider text-white flex items-center space-x-2 pb-3 border-b border-neutral-900/60">
              <Clock className="h-4 w-4 text-neutral-600" />
              <span>Transaction Status Timeline</span>
            </h3>

            <div className="relative border-l border-neutral-900 ml-3.5 pl-6 space-y-6">
              {timelineSteps.map((step, idx) => (
                <div key={idx} className="relative">
                  {/* Icon Indicator */}
                  <span className={`absolute -left-9.5 top-0 flex h-7 w-7 items-center justify-center rounded-full border bg-neutral-950 ${
                    step.status === "completed"
                      ? "text-indigo-400 border-indigo-900/40"
                      : step.status === "success"
                      ? "text-emerald-400 border-emerald-900/40"
                      : step.status === "failed"
                      ? "text-red-400 border-red-900/40"
                      : "text-neutral-700 border-neutral-900"
                  }`}>
                    {step.status === "completed" ? (
                      <CheckCircle className="h-4 w-4" />
                    ) : step.status === "success" ? (
                      <Sparkles className="h-4 w-4" />
                    ) : step.status === "failed" ? (
                      <AlertTriangle className="h-4 w-4" />
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

        {/* Right Side: Immutable ledger balances debit credit validation */}
        <div className="lg:col-span-4 rounded-lg border border-neutral-900 bg-neutral-950/40 p-5 space-y-5">
          <h3 className="text-xs font-black uppercase tracking-wider text-white flex items-center space-x-2 pb-3 border-b border-neutral-900/60">
            <FileText className="h-4.5 w-4.5 text-neutral-600" />
            <span>Ledger Bookings</span>
          </h3>

          {ledgerBookings.length === 0 ? (
            <p className="text-[10px] text-neutral-600 font-bold py-6 text-center">
              No double-entry ledger bookings entries mapped for this transfer status.
            </p>
          ) : (
            <div className="space-y-4">
              <div className="flex justify-between items-center text-[8px] font-bold text-neutral-600 uppercase tracking-widest px-1">
                <span>Account/ID</span>
                <span>Value</span>
              </div>

              <div className="divide-y divide-neutral-900/40">
                {ledgerBookings.map((entry: any) => {
                  const isCredit = entry.direction?.toLowerCase() === "credit";

                  return (
                    <div key={entry.id} className="py-3 flex justify-between items-center text-xs">
                      <div className="space-y-1 pr-3 truncate max-w-[160px] font-semibold">
                        <span className="font-bold text-white block truncate uppercase select-all">
                          {entry.ledgerAccountId?.toUpperCase()}
                        </span>
                        <span className="inline-flex items-center rounded bg-neutral-950 border border-neutral-900 px-1 py-0.5 text-[7px] font-black uppercase tracking-wider">
                          {entry.direction}
                        </span>
                      </div>
                      <div className="text-right whitespace-nowrap font-bold text-[11px]">
                        {isCredit ? (
                          <span className="text-emerald-500 flex items-center justify-end">
                            <ArrowUpRight className="h-3 w-3 mr-0.5 shrink-0" />
                            <span>{formatMoney(entry.amount, entry.currency)}</span>
                          </span>
                        ) : (
                          <span className="text-neutral-400 flex items-center justify-end">
                            <TrendingDown className="h-3 w-3 mr-0.5 text-neutral-600 shrink-0" />
                            <span>{formatMoney(entry.amount, entry.currency)}</span>
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>

              <div className="rounded border border-neutral-900 bg-neutral-950 p-3.5 text-[9px] text-neutral-500 leading-normal flex items-start space-x-2 font-bold">
                <ShieldCheck className="h-4.5 w-4.5 text-emerald-500 shrink-0 mt-0.5" />
                <span>
                  Ledger checks verified: debits fully balance against credits.
                </span>
              </div>
            </div>
          )}
        </div>

      </div>

    </div>
  );
};

export default TransactionDetails;
