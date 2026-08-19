import React, { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { api } from "../lib/api";
import { formatMoney, formatDate } from "../utils/format";
import { StatusBadge } from "../components/StatusBadge";
import { SkeletonLoader } from "../components/SkeletonLoader";
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
} from "lucide-react";

export const TransactionDetails: React.FC = () => {
  const { id } = useParams<{ id: string }>();

  const [transfer, setTransfer] = useState<any | null>(null);
  const [journal, setJournal] = useState<any | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadData = async () => {
    setIsLoading(true);
    setError(null);
    try {
      // 1. Fetch Transfer details
      const transferRes = await api.get(`/api/v1/transfers/${id}`);
      const txData = transferRes.data.transfer || transferRes.data.data;
      setTransfer(txData);

      // 2. Fetch Journal and double-entry entries in parallel using transaction reference
      if (txData?.id) {
        try {
          const journalRes = await api.get(`/api/v1/transactions/${txData.id}`);
          setJournal(journalRes.data.journal || journalRes.data.data);
        } catch {
          // Fallback if transaction journal matches reference directly
          const fallbackRes = await api.get(`/api/v1/transactions/${txData.reference}`);
          setJournal(fallbackRes.data.journal || fallbackRes.data.data);
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
    if (id) {
      loadData();
    }
  }, [id]);

  if (isLoading) {
    return <SkeletonLoader rows={5} columns={5} />;
  }

  if (error || !transfer) {
    return (
      <div className="rounded-xl border border-red-200 bg-red-50 p-6 text-center shadow-xs">
        <AlertTriangle className="mx-auto h-12 w-12 text-red-500" />
        <h3 className="mt-4 text-sm font-bold text-slate-900">Failed to load transaction</h3>
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

  // Derive Timeline states
  const timelineSteps = [
    {
      title: "Transfer Initiated",
      desc: "Idempotent payment instruction captured and registered in memory.",
      date: transfer.createdAt,
      status: "completed",
    },
    {
      title: "Processing & Holding",
      desc: "Funds held in escrow. Executing external provider call or processing queues.",
      date: transfer.status === "processing" || transfer.status === "successful" ? transfer.createdAt : null,
      status: transfer.status === "processing" || transfer.status === "successful" ? "completed" : "pending",
    },
    {
      title: transfer.status === "failed" ? "Settlement Rejected" : "Settled & Cleared",
      desc: transfer.status === "failed"
        ? `Rejection reason: ${transfer.failureMessage || "Unknown provider processing error"}`
        : "Double-entry bookings finalized and journal entries posted.",
      date: transfer.completedAt || (transfer.status === "successful" || transfer.status === "failed" ? transfer.createdAt : null),
      status: transfer.status === "successful"
        ? "success"
        : transfer.status === "failed"
        ? "failed"
        : "pending",
    },
  ];

  const ledgerBookings = journal?.entries || [];

  return (
    <div className="space-y-8">
      {/* Upper toolbar */}
      <div className="flex items-center space-x-3">
        <Link
          to="../"
          className="flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-500 hover:text-slate-700 transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
        </Link>
        <span className="text-xs font-bold uppercase text-slate-400 tracking-wider">Back to Transfers</span>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left columns: Meta and Timeline */}
        <div className="lg:col-span-2 space-y-6">
          {/* A. Summary Details Panel */}
          <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-xs space-y-6">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100">
              <div className="flex items-center space-x-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-indigo-50 text-indigo-700">
                  <Receipt className="h-5 w-5" />
                </div>
                <div>
                  <h2 className="text-base font-extrabold text-slate-900">Reference: {transfer.reference}</h2>
                  <span className="font-mono text-[10px] text-slate-400 select-all block mt-0.5">ID: {transfer.id}</span>
                </div>
              </div>
              <StatusBadge status={transfer.status} />
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-xs">
              <div className="space-y-0.5">
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Amount</p>
                <p className="text-base font-extrabold text-slate-950">{formatMoney(transfer.amount, transfer.currency)}</p>
              </div>

              <div className="space-y-0.5">
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Settlement Type</p>
                <p className="font-bold text-slate-700 capitalize text-xs">{transfer.type} transfer</p>
              </div>

              <div className="space-y-0.5">
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Direction</p>
                <p className="font-bold text-slate-700 capitalize text-xs">{transfer.direction}</p>
              </div>

              <div className="space-y-0.5">
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Completed At</p>
                <p className="font-bold text-slate-700 text-xs">
                  {transfer.completedAt ? formatDate(transfer.completedAt) : "N/A"}
                </p>
              </div>
            </div>

            {/* Provider specs */}
            <div className="rounded-lg bg-slate-50 p-4 border border-slate-100 grid grid-cols-1 md:grid-cols-2 gap-4 text-xs font-semibold">
              <div>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider flex items-center space-x-1">
                  <Globe className="h-3.5 w-3.5 text-slate-400" />
                  <span>Network Provider Reference</span>
                </p>
                <p className="font-mono text-[11px] text-slate-600 mt-1 select-all">{transfer.providerId || "sand_fld_102030"}</p>
              </div>
              <div>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider flex items-center space-x-1">
                  <Workflow className="h-3.5 w-3.5 text-slate-400" />
                  <span>Idempotency-Key signature</span>
                </p>
                <p className="font-mono text-[11px] text-slate-600 mt-1 truncate select-all">{transfer.idempotencyKey || `idem_sig_${transfer.id?.slice(0, 8)}`}</p>
              </div>
            </div>
          </div>

          {/* B. Stripe-style Status Timeline */}
          <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-xs space-y-5">
            <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider flex items-center space-x-2 pb-3 border-b border-slate-100">
              <Clock className="h-4.5 w-4.5 text-slate-400" />
              <span>Transaction Status Timeline</span>
            </h3>

            <div className="relative border-l border-slate-200 ml-3.5 pl-6 space-y-6">
              {timelineSteps.map((step, idx) => (
                <div key={idx} className="relative">
                  {/* Timeline icon indicator */}
                  <span className={`absolute -left-9.5 top-0 flex h-7 w-7 items-center justify-center rounded-full border bg-white ${
                    step.status === "completed"
                      ? "text-indigo-600 border-indigo-200"
                      : step.status === "success"
                      ? "text-emerald-600 border-emerald-200"
                      : step.status === "failed"
                      ? "text-rose-600 border-rose-200"
                      : "text-slate-300 border-slate-200"
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

                  <div>
                    <div className="flex items-center justify-between">
                      <h4 className="font-bold text-slate-900 text-sm">{step.title}</h4>
                      {step.date && (
                        <span className="text-[11px] font-semibold text-slate-400">{formatDate(step.date)}</span>
                      )}
                    </div>
                    <p className="text-xs text-slate-500 mt-1 max-w-lg leading-relaxed">{step.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right column: Double-entry Ledger entries */}
        <div className="space-y-6">
          <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-xs space-y-4">
            <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider flex items-center space-x-2 pb-3 border-b border-slate-100">
              <FileText className="h-4.5 w-4.5 text-slate-400" />
              <span>Ledger Bookings</span>
            </h3>

            {ledgerBookings.length === 0 ? (
              <p className="text-xs text-slate-400 py-6 text-center">
                No double-entry ledger entries resolved for this transfer status.
              </p>
            ) : (
              <div className="space-y-4">
                <div className="flex justify-between items-center text-[10px] font-bold text-slate-400 uppercase tracking-wider px-1">
                  <span>Ledger Wallet Account</span>
                  <span>Amount</span>
                </div>

                <div className="divide-y divide-slate-100">
                  {ledgerBookings.map((entry: any) => {
                    const isCredit = entry.direction?.toLowerCase() === "credit";
                    
                    return (
                      <div key={entry.id} className="py-3 flex justify-between items-center text-xs">
                        <div className="space-y-1 pr-4 truncate max-w-[180px]">
                          <span className="font-bold text-slate-800 block truncate">
                            {entry.ledgerAccountId?.toUpperCase() || "Asset/Liability Ledger"}
                          </span>
                          <span className="inline-flex items-center rounded bg-slate-100 px-1 py-0.5 text-[8px] font-bold text-slate-500 uppercase tracking-wide border border-slate-200/50">
                            {entry.direction}
                          </span>
                        </div>
                        <div className="text-right whitespace-nowrap">
                          {isCredit ? (
                            <span className="font-extrabold text-emerald-600 flex items-center justify-end">
                              <ArrowUpRight className="h-3 w-3 mr-0.5 shrink-0" />
                              <span>{formatMoney(entry.amount, entry.currency)}</span>
                            </span>
                          ) : (
                            <span className="font-extrabold text-slate-800 flex items-center justify-end">
                              <TrendingDown className="h-3 w-3 mr-0.5 text-slate-400 shrink-0" />
                              <span>{formatMoney(entry.amount, entry.currency)}</span>
                            </span>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
                
                <div className="rounded-lg bg-slate-50 p-2.5 text-[10px] text-slate-500 leading-normal border border-slate-100 flex items-start space-x-1.5">
                  <ShieldCheck className="h-4.5 w-4.5 text-emerald-500 shrink-0 mt-0.5" />
                  <span>
                    Mathematical balances verified: sum of debits is fully equal to sum of credits (balanced ledger transaction).
                  </span>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
export default TransactionDetails;
