import React, { useEffect, useState } from "react";
import { Link, useParams, useNavigate, useSearchParams } from "react-router-dom";
import { api } from "../lib/api";
import { formatMoney, formatDate } from "../utils/format";
import {
  ArrowUpRight,
  Plus,
  Search,
  X,
  AlertTriangle,
  RefreshCw,
  ShieldCheck,
  CheckCircle2,
  Info,
  ArrowRight,
  Coins,
  ChevronRight,
  SlidersHorizontal,
  Wallet,
  CornerDownRight,
  Copy,
  Check,
  Loader2
} from "lucide-react";

export const Transfers: React.FC = () => {
  const { projectId } = useParams<{ projectId: string }>();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  // URL state tracking (Section 19)
  const initialSearch = searchParams.get("search") || "";
  const [searchQuery, setSearchQuery] = useState(initialSearch);
  const [typeFilter, setTypeFilter] = useState("all");

  const [transfers, setTransfers] = useState<any[]>([]);
  const [accounts, setAccounts] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Multi-step modal/drawer states (Section 4)
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [step, setStep] = useState(1); // 1 = Form, 2 = Confirmation Overview, 3 = Progress & Outcome
  const [transferType, setTransferType] = useState<"internal" | "external">("internal");
  const [sourceAccountId, setSourceAccountId] = useState("");
  const [destinationAccountId, setDestinationAccountId] = useState("");

  // Beneficiary details for external payouts
  const [bankCode, setBankCode] = useState("");
  const [accountNumber, setAccountNumber] = useState("");
  const [beneficiaryName, setBeneficiaryName] = useState("");

  const [amountStr, setAmountStr] = useState(""); // Major units (e.g. 1000.50)
  const [reference, setReference] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [submitOutcome, setSubmitOutcome] = useState<any | null>(null);

  // Copy click tracking
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const activeSourceAcc = accounts.find((a) => a.id === sourceAccountId);
  const activeDestAcc = accounts.find((a) => a.id === destinationAccountId);

  const handleCopy = (id: string) => {
    navigator.clipboard.writeText(id);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const fetchTransfersAndAccounts = async () => {
    if (!projectId) return;
    setIsLoading(true);
    setError(null);
    try {
      // Authoritative project boundary checks (Section 33)
      const [transRes, accRes] = await Promise.all([
        api.get("/api/v1/transfers", { headers: { "x-project-id": projectId } }),
        api.get("/api/v1/accounts", { headers: { "x-project-id": projectId } }),
      ]);

      const retrievedTransfers = transRes.data.transfers || transRes.data.data || [];
      const retrievedAccounts = accRes.data.accounts || accRes.data.data || [];

      // Ensure data belongs strictly to the selected project context (Section 33)
      const isolatedTransfers = retrievedTransfers.filter((tx: any) => tx.projectId === projectId);
      const isolatedAccounts = retrievedAccounts.filter((ac: any) => ac.projectId === projectId);

      setTransfers(isolatedTransfers);
      setAccounts(isolatedAccounts);

      if (isolatedAccounts.length > 0) {
        setSourceAccountId(isolatedAccounts[0].id);
      }
    } catch (err: any) {
      console.error("Failed to load transfers or accounts", err);
      setError(err.message || "Failed to retrieve sandbox payments parameters.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchTransfersAndAccounts();
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

  const handleNextStep = (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    const val = parseFloat(amountStr);
    if (isNaN(val) || val <= 0) {
      setFormError("Please enter a valid positive transfer amount (Section 8).");
      return;
    }

    if (transferType === "internal" && !destinationAccountId) {
      setFormError("Please select a destination account for this internal wallet transfer.");
      return;
    }

    // Prevent self-transfers (Section 6)
    if (transferType === "internal" && sourceAccountId === destinationAccountId) {
      setFormError("Source and destination accounts must be different.");
      return;
    }

    if (transferType === "external" && (!bankCode.trim() || !accountNumber.trim() || !beneficiaryName.trim())) {
      setFormError("Please fill in all required beneficiary payout parameters (Section 13).");
      return;
    }

    // Insufficient funds soft warning
    if (activeSourceAcc && val * 100 > activeSourceAcc.available) {
      setFormError(`Insufficient balance. Available: ${formatMoney(activeSourceAcc.available, activeSourceAcc.currency)}, Requested: ${formatMoney(val * 100, activeSourceAcc.currency)} (Section 14).`);
      return;
    }

    setStep(2); // Progress to Confirm Review Card (Section 10)
  };

  const handleConfirmTransfer = async () => {
    setFormError(null);
    setIsSubmitting(true);
    setStep(3);

    const majorAmount = parseFloat(amountStr);
    const minorAmount = Math.round(majorAmount * 100);

    const payload: any = {
      type: transferType,
      sourceAccountId,
      amount: minorAmount,
      currency: activeSourceAcc?.currency || "NGN",
      reference: reference.trim() || `ref_trf_${Date.now().toString().slice(-6)}`,
    };

    if (transferType === "internal") {
      payload.destinationAccountId = destinationAccountId;
    } else {
      payload.beneficiary = {
        type: "bank_account",
        bankCode: bankCode.trim(),
        accountNumber: accountNumber.trim(),
        accountName: beneficiaryName.trim(),
      };
    }

    try {
      // Authoritative creation post (Section 11)
      const response = await api.post("/api/v1/transfers", payload, {
        headers: { "x-project-id": projectId }
      });

      setSubmitOutcome(response.data.transfer || response.data.data);
      await fetchTransfersAndAccounts(); // Authoritative server refresh instead of local mutations (Section 25)
    } catch (err: any) {
      console.error("Transfer failed on the backend", err);
      setFormError(err.message || "Transaction authorization rejected.");
      setStep(1); // Revert to let user adjust parameters
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleResetDrawerState = () => {
    setIsDrawerOpen(false);
    setStep(1);
    setAmountStr("");
    setReference("");
    setDestinationAccountId("");
    setBankCode("");
    setAccountNumber("");
    setBeneficiaryName("");
    setSubmitOutcome(null);
    setFormError(null);
  };

  // Safe client-side search & filters (Section 19 & 20)
  const filteredTransfers = transfers.filter((tx) => {
    if (typeFilter !== "all" && tx.type !== typeFilter) return false;

    const term = searchQuery.toLowerCase().trim();
    if (!term) return true;

    return (
      tx.reference?.toLowerCase().includes(term) ||
      tx.id?.toLowerCase().includes(term) ||
      tx.status?.toLowerCase().includes(term) ||
      tx.sourceAccount?.name?.toLowerCase().includes(term) ||
      tx.destinationAccount?.name?.toLowerCase().includes(term) ||
      tx.beneficiary?.name?.toLowerCase().includes(term) ||
      tx.sourceAccountId?.toLowerCase().includes(term) ||
      tx.destinationAccountId?.toLowerCase().includes(term)
    );
  });

  // Calculate previews (Section 8)
  const getEstimatedRemainingBalance = () => {
    if (!activeSourceAcc) return 0;
    const inputVal = parseFloat(amountStr) || 0;
    const rem = activeSourceAcc.available - (inputVal * 100);
    return rem < 0 ? 0 : rem;
  };

  return (
    <div className="space-y-8 font-mono select-none text-left relative">
      
      {/* 1. Header Toolbar */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center pb-5 border-b border-neutral-900 gap-4">
        <div>
          <h1 className="text-xl font-black text-white uppercase tracking-tight">Payment Transfers</h1>
          <p className="text-[10px] text-neutral-500 font-semibold mt-1">
            Move funds between accounts in your FlexBank sandbox.
          </p>
        </div>
        <button
          onClick={() => {
            setFormError(null);
            setStep(1);
            setIsDrawerOpen(true);
          }}
          className="rounded bg-indigo-600 px-4 py-2 text-xs font-bold uppercase tracking-wider text-white hover:bg-indigo-500 transition-all active:scale-[0.98] flex items-center space-x-1.5 cursor-pointer shadow-md shadow-indigo-600/10"
        >
          <Plus className="h-4 w-4 shrink-0" />
          <span>Create transfer</span>
        </button>
      </div>

      {/* Sandbox Warning Card (Section 23) */}
      <div className="rounded border border-amber-950/40 bg-amber-950/5 px-4 py-3 text-[10px] text-amber-500 font-bold uppercase tracking-wider flex items-start space-x-2">
        <Info className="h-4.5 w-4.5 shrink-0 text-amber-500" />
        <div>
          <span>TEST MODE: No real money is involved. Ledger orchestration utilizes mock providers.</span>
        </div>
      </div>

      {/* 2. Advanced Search & Filtering (Section 19 & 20) */}
      {transfers.length > 0 && (
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3.5 top-2.5 h-4 w-4 text-neutral-600" />
            <input
              type="text"
              placeholder="Search transfers by ID, reference, source, destination..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="block w-full rounded border border-neutral-900 bg-neutral-950 pl-10 pr-4 py-2 text-xs text-white placeholder:text-neutral-700 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 transition-all"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery("")}
                className="absolute right-3 top-2.5 text-neutral-600 hover:text-white"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>
          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            className="rounded border border-neutral-900 bg-neutral-950 px-3 py-2 text-xs font-bold text-neutral-400 focus:border-indigo-500 focus:outline-none transition-all cursor-pointer"
          >
            <option value="all">All Types</option>
            <option value="internal">Internal Wallet-to-Wallet</option>
            <option value="external">External Bank Payouts</option>
          </select>
        </div>
      )}

      {/* 3. Operational lists display */}
      {isLoading ? (
        <div className="space-y-4 pt-4">
          <div className="h-10 bg-neutral-950 border border-neutral-900 rounded animate-pulse" />
          <div className="h-28 bg-neutral-950 border border-neutral-900 rounded animate-pulse" />
          <div className="h-28 bg-neutral-950 border border-neutral-900 rounded animate-pulse" />
        </div>
      ) : error ? (
        <div className="rounded border border-red-950 bg-red-950/5 p-6 text-center max-w-md mx-auto">
          <AlertTriangle className="mx-auto h-10 w-10 text-red-500" />
          <h3 className="mt-4 text-xs font-black uppercase tracking-wider text-white">Unable to load transfers</h3>
          <p className="mt-2 text-[10px] text-neutral-500 font-semibold leading-relaxed">{error}</p>
          <button
            onClick={fetchTransfersAndAccounts}
            className="mt-5 inline-flex items-center space-x-1.5 rounded bg-neutral-900 px-4 py-2 text-xs font-bold uppercase tracking-wider text-white hover:bg-neutral-800 transition-all border border-neutral-800"
          >
            <RefreshCw className="h-3.5 w-3.5" />
            <span>Retry Query</span>
          </button>
        </div>
      ) : transfers.length === 0 ? (
        <div className="rounded-lg border border-dashed border-neutral-900 bg-neutral-950/10 p-12 text-center max-w-lg mx-auto">
          <ArrowUpRight className="mx-auto h-12 w-12 text-neutral-700 animate-pulse" />
          <h3 className="mt-4 text-xs font-black uppercase tracking-widest text-neutral-400">No transfers yet</h3>
          <p className="mt-2 text-[10px] text-neutral-500 font-medium leading-relaxed">
            Create a transfer between two test accounts to see your financial flow in action. Double-entry journals record asset allocations instantly.
          </p>
          <div className="mt-6">
            <button
              onClick={() => {
                setFormError(null);
                setStep(1);
                setIsDrawerOpen(true);
              }}
              className="rounded bg-indigo-600 px-4 py-2 text-xs font-bold uppercase text-white hover:bg-indigo-500 transition-all cursor-pointer"
            >
              + Create transfer
            </button>
          </div>
        </div>
      ) : filteredTransfers.length === 0 ? (
        <div className="rounded-lg border border-neutral-900 bg-neutral-950/20 p-12 text-center max-w-lg mx-auto">
          <Search className="mx-auto h-10 w-10 text-neutral-700" />
          <h3 className="mt-4 text-xs font-black uppercase tracking-widest text-neutral-400">No matching transfers</h3>
          <p className="mt-2 text-[10px] text-neutral-500 font-medium">
            No transfer records matched your filtering variables.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          
          {/* Desktop tabular view (Section 27) */}
          <div className="hidden lg:block rounded-lg border border-neutral-900 bg-neutral-950/40 overflow-hidden">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-neutral-950/60 border-b border-neutral-900 text-neutral-500 font-black text-[9px] uppercase tracking-wider">
                  <th className="px-6 py-3.5">Reference / ID</th>
                  <th className="px-6 py-3.5">Type</th>
                  <th className="px-6 py-3.5">Source Wallet</th>
                  <th className="px-6 py-3.5">Destination Details</th>
                  <th className="px-6 py-3.5">Amount Settled</th>
                  <th className="px-6 py-3.5">Settlement Status</th>
                  <th className="px-6 py-3.5 text-right pr-6">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-900/40 text-[11px] font-semibold text-neutral-300">
                {filteredTransfers.map((tx) => (
                  <tr key={tx.id} className="hover:bg-neutral-950/30 transition-colors">
                    <td className="px-6 py-4">
                      <div>
                        <span className="font-bold text-white block uppercase tracking-tight">{tx.reference}</span>
                        <div className="flex items-center space-x-1.5 font-mono text-[9.5px] mt-1 text-neutral-500 select-all">
                          <span>{tx.id}</span>
                          <button
                            onClick={() => handleCopy(tx.id)}
                            className="text-neutral-700 hover:text-white transition-colors"
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
                    <td className="px-6 py-4 text-white font-black">{formatMoney(tx.amount, tx.currency)}</td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex items-center rounded border px-2 py-0.5 text-[8.5px] font-black uppercase tracking-wider leading-none ${
                        tx.status === "successful" || tx.status === "completed"
                          ? "border-emerald-900/40 bg-emerald-950/20 text-emerald-500"
                          : tx.status === "pending" || tx.status === "processing"
                          ? "border-amber-900/40 bg-amber-950/20 text-amber-500 animate-pulse"
                          : "border-red-900/40 bg-red-950/20 text-red-500"
                      }`}>
                        {tx.status === "successful" || tx.status === "completed" ? "✓ " : tx.status === "pending" || tx.status === "processing" ? "◌ " : "× "}
                        {tx.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right pr-6">
                      <Link
                        to={`/projects/${projectId}/transfers/${tx.id}`}
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

          {/* Tablet & Mobile cards (Section 27) */}
          <div className="block lg:hidden space-y-3">
            {filteredTransfers.map((tx) => (
              <div key={tx.id} className="rounded-lg border border-neutral-900 bg-neutral-950/40 p-4 space-y-3">
                <div className="flex items-center justify-between border-b border-neutral-900 pb-2">
                  <div>
                    <span className="font-bold text-white text-[11.5px] uppercase tracking-tight">{tx.reference}</span>
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
                    to={`/projects/${projectId}/transfers/${tx.id}`}
                    className="inline-flex items-center space-x-1 text-[9px] font-black text-indigo-400 hover:text-white uppercase tracking-widest"
                  >
                    <span>Inspect Details</span>
                    <ArrowRight className="h-3 w-3 shrink-0" />
                  </Link>
                </div>
              </div>
            ))}
          </div>

        </div>
      )}

      {/* 4. Sliding Multi-step Drawer Portal */}
      {isDrawerOpen && (
        <div className="fixed inset-0 z-50 flex justify-end font-mono">
          <div onClick={handleResetDrawerState} className="fixed inset-0 bg-black/60 backdrop-blur-xs transition-all" />

          <div className="relative flex w-full max-w-lg flex-col bg-neutral-950 border-l border-neutral-900 p-6 shadow-2xl z-10 h-full overflow-y-auto text-left">
            <div className="absolute right-4 top-4">
              <button
                onClick={handleResetDrawerState}
                className="text-neutral-600 hover:text-white transition-colors cursor-pointer"
                aria-label="Close panel"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="flex items-center space-x-2.5 pb-4 border-b border-neutral-900">
              <div className="flex h-8 w-8 items-center justify-center rounded bg-indigo-600 text-white font-black">
                <ArrowUpRight className="h-4.5 w-4.5" />
              </div>
              <h2 className="text-sm font-black uppercase text-white tracking-wider">
                Initiate Transfer (Step {step} of 3)
              </h2>
            </div>

            {formError && step !== 3 && (
              <div className="mt-4 flex items-start space-x-2 rounded border border-red-950 bg-red-950/10 p-3 text-red-200/90 leading-relaxed text-[11px] font-semibold">
                <AlertTriangle className="h-4 w-4 text-red-500 shrink-0 mt-0.5" />
                <p className="leading-snug">{formError}</p>
              </div>
            )}

            {/* STEP 1: FORM INPUTS */}
            {step === 1 && (
              <form onSubmit={handleNextStep} className="mt-6 space-y-4 flex-1">
                <div>
                  <label className="block text-[9px] font-bold text-neutral-500 uppercase tracking-widest">
                    Orchestration Settlement Type
                  </label>
                  <div className="mt-1.5 grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        setTransferType("internal");
                        setFormError(null);
                      }}
                      className={`rounded py-2 text-[10px] font-bold uppercase tracking-wider border transition-all cursor-pointer ${
                        transferType === "internal"
                          ? "bg-indigo-950/40 text-indigo-400 border-indigo-900/60"
                          : "bg-neutral-950 text-neutral-600 border-neutral-900 hover:text-neutral-400"
                      }`}
                    >
                      Internal Wallet-to-Wallet
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setTransferType("external");
                        setFormError(null);
                      }}
                      className={`rounded py-2 text-[10px] font-bold uppercase tracking-wider border transition-all cursor-pointer ${
                        transferType === "external"
                          ? "bg-indigo-950/40 text-indigo-400 border-indigo-900/60"
                          : "bg-neutral-950 text-neutral-600 border-neutral-900 hover:text-neutral-400"
                      }`}
                    >
                      External Payout Network
                    </button>
                  </div>
                </div>

                {/* Source Account Selector (Section 5) */}
                <div>
                  <label className="block text-[9px] font-bold text-neutral-500 uppercase tracking-widest">
                    Source Wallet Account *
                  </label>
                  {accounts.length === 0 ? (
                    <p className="text-[10px] text-red-500 font-bold mt-1.5 uppercase">No financial wallets available.</p>
                  ) : (
                    <select
                      value={sourceAccountId}
                      onChange={(e) => {
                        setSourceAccountId(e.target.value);
                        setFormError(null);
                      }}
                      className="mt-1.5 block w-full rounded border border-neutral-900 bg-neutral-950 px-3 py-2 text-xs text-white focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 transition-all font-bold uppercase tracking-wider cursor-pointer"
                    >
                      {accounts.map((acc) => (
                        <option key={acc.id} value={acc.id}>
                          {acc.name} ({acc.currency}) • Avail: {formatMoney(acc.available, acc.currency)}
                        </option>
                      ))}
                    </select>
                  )}
                </div>

                {/* Destination Account Selector (Section 6) */}
                {transferType === "internal" ? (
                  <div>
                    <label className="block text-[9px] font-bold text-neutral-500 uppercase tracking-widest">
                      Destination Wallet Account *
                    </label>
                    <select
                      value={destinationAccountId}
                      required
                      onChange={(e) => {
                        setDestinationAccountId(e.target.value);
                        setFormError(null);
                      }}
                      className="mt-1.5 block w-full rounded border border-neutral-900 bg-neutral-950 px-3 py-2 text-xs text-white focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 transition-all font-bold uppercase tracking-wider cursor-pointer"
                    >
                      <option value="">-- Choose destination wallet --</option>
                      {accounts.map((acc) => (
                        <option key={acc.id} value={acc.id}>
                          {acc.name} ({acc.currency}) • Owner: {acc.customer?.firstName || "System"} {acc.customer?.lastName || ""}
                        </option>
                      ))}
                    </select>
                  </div>
                ) : (
                  <div className="space-y-4 rounded border border-neutral-900 bg-neutral-950/60 p-4 font-mono">
                    <span className="block text-[8px] font-bold text-neutral-600 uppercase tracking-widest">
                      Beneficiary digital bank details (Section 13)
                    </span>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-[9px] font-bold text-neutral-500 uppercase">
                          Bank Code *
                        </label>
                        <input
                          type="text"
                          required
                          value={bankCode}
                          onChange={(e) => setBankCode(e.target.value)}
                          placeholder="e.g. 011"
                          className="mt-1 block w-full rounded border border-neutral-900 bg-neutral-950 px-3 py-1.5 text-xs text-white focus:border-indigo-500 focus:outline-none"
                        />
                      </div>
                      <div>
                        <label className="block text-[9px] font-bold text-neutral-500 uppercase">
                          Account Number *
                        </label>
                        <input
                          type="text"
                          required
                          value={accountNumber}
                          onChange={(e) => setAccountNumber(e.target.value)}
                          placeholder="e.g. 1022045618"
                          className="mt-1 block w-full rounded border border-neutral-900 bg-neutral-950 px-3 py-1.5 text-xs text-white focus:border-indigo-500 focus:outline-none"
                        />
                      </div>
                    </div>
                    <div>
                      <label className="block text-[9px] font-bold text-neutral-500 uppercase">
                        Beneficiary Legal Name *
                      </label>
                      <input
                        type="text"
                        required
                        value={beneficiaryName}
                        onChange={(e) => setBeneficiaryName(e.target.value)}
                        placeholder="e.g. Alex Miller Ltd"
                        className="mt-1 block w-full rounded border border-neutral-900 bg-neutral-950 px-3 py-1.5 text-xs text-white focus:border-indigo-500 focus:outline-none"
                      />
                    </div>
                  </div>
                )}

                <div className="grid grid-cols-2 gap-3 pt-2">
                  <div>
                    <label className="block text-[9px] font-bold text-neutral-500 uppercase tracking-widest">
                      Amount (Major Units) *
                    </label>
                    <div className="relative mt-1.5 rounded shadow-sm">
                      <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                        <span className="text-neutral-500 text-xs font-bold uppercase">{activeSourceAcc?.currency || "NGN"}</span>
                      </div>
                      <input
                        type="number"
                        step="0.01"
                        required
                        value={amountStr}
                        onChange={(e) => setAmountStr(e.target.value)}
                        placeholder="0.00"
                        className="block w-full rounded border border-neutral-900 bg-neutral-950 pl-12 pr-3 py-2 text-xs text-white placeholder:text-neutral-700 focus:border-indigo-500 focus:outline-none font-bold"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-[9px] font-bold text-neutral-500 uppercase tracking-widest">
                      Reference Key *
                    </label>
                    <input
                      type="text"
                      required
                      value={reference}
                      onChange={(e) => setReference(e.target.value)}
                      placeholder="e.g. invoice_1020"
                      className="mt-1.5 block w-full rounded border border-neutral-900 bg-neutral-950 px-3 py-2 text-xs text-white placeholder:text-neutral-700 focus:border-indigo-500 focus:outline-none focus:ring-1"
                    />
                  </div>
                </div>

                {/* Estimate balances after transfer (Section 8 preview) */}
                {activeSourceAcc && amountStr && parseFloat(amountStr) > 0 && (
                  <div className="rounded border border-neutral-900 bg-neutral-950 p-3 space-y-2 text-[10px] font-bold">
                    <span className="block text-[8px] text-neutral-600 uppercase tracking-widest">Simulation Balance Preview</span>
                    <div className="flex justify-between text-neutral-400">
                      <span>Source Available</span>
                      <span>{formatMoney(activeSourceAcc.available, activeSourceAcc.currency)}</span>
                    </div>
                    <div className="flex justify-between text-neutral-400">
                      <span>Transfer Amount</span>
                      <span className="text-red-400">- {formatMoney(parseFloat(amountStr) * 100, activeSourceAcc.currency)}</span>
                    </div>
                    <div className="flex justify-between border-t border-neutral-900 pt-1.5 text-white">
                      <span>Estimated balance after transfer</span>
                      <span className="text-emerald-400">{formatMoney(getEstimatedRemainingBalance(), activeSourceAcc.currency)}</span>
                    </div>
                  </div>
                )}

                <div className="pt-4 border-t border-neutral-900 flex space-x-3 mt-6">
                  <button
                    type="button"
                    onClick={handleResetDrawerState}
                    className="flex-1 rounded border border-neutral-900 bg-neutral-950 py-2.5 text-center text-xs font-bold uppercase tracking-wider text-neutral-500 hover:text-white transition-all cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="flex-1 rounded bg-indigo-600 py-2.5 text-center text-xs font-bold uppercase tracking-wider text-white hover:bg-indigo-500 transition-all cursor-pointer"
                  >
                    Confirm Review →
                  </button>
                </div>
              </form>
            )}

            {/* STEP 2: HIGH-FIDELITY CONFIRMATION (Section 10) */}
            {step === 2 && activeSourceAcc && (
              <div className="mt-6 flex-1 flex flex-col justify-between">
                <div className="space-y-6 text-xs font-semibold">
                  <div className="rounded border border-indigo-950 bg-indigo-950/10 p-3.5 text-indigo-400 text-[10.5px] leading-relaxed flex items-start space-x-2">
                    <Info className="h-4.5 w-4.5 text-indigo-500 shrink-0 mt-0.5" />
                    <span>
                      Please review the final double-entry transfer values before execution. Authorization instantly moves ledger balances.
                    </span>
                  </div>

                  <div className="rounded-lg border border-neutral-900 bg-neutral-950/40 p-4 space-y-4">
                    <div className="grid grid-cols-2 gap-x-2 gap-y-4">
                      <div>
                        <span className="block text-[8px] font-bold text-neutral-600 uppercase tracking-widest">Source Wallet</span>
                        <p className="text-white font-bold mt-1 text-xs truncate uppercase">{activeSourceAcc.name}</p>
                        <span className="font-mono text-[9px] text-neutral-500 select-all">{activeSourceAcc.id}</span>
                      </div>

                      <div>
                        <span className="block text-[8px] font-bold text-neutral-600 uppercase tracking-widest">Destination / Beneficiary</span>
                        {transferType === "internal" && activeDestAcc ? (
                          <>
                            <p className="text-indigo-400 font-bold mt-1 text-xs truncate uppercase">{activeDestAcc.name}</p>
                            <span className="font-mono text-[9px] text-neutral-500 select-all">{activeDestAcc.id}</span>
                          </>
                        ) : (
                          <>
                            <p className="text-white font-bold mt-1 text-xs truncate uppercase">{beneficiaryName}</p>
                            <span className="text-[9px] text-neutral-500">{bankCode} • Acct: {accountNumber}</span>
                          </>
                        )}
                      </div>

                      <div className="col-span-2 border-t border-neutral-900/60 pt-3">
                        <span className="block text-[8px] font-bold text-neutral-600 uppercase tracking-widest">Transaction Amount</span>
                        <p className="text-xl font-black text-white mt-1">
                          {formatMoney(parseFloat(amountStr) * 100, activeSourceAcc.currency)}
                        </p>
                      </div>

                      <div className="col-span-2 border-t border-neutral-900/60 pt-3">
                        <span className="block text-[8px] font-bold text-neutral-600 uppercase tracking-widest">Reference Description</span>
                        <p className="text-neutral-300 font-mono text-[10px] mt-1.5 bg-neutral-950 p-2 rounded border border-neutral-900 select-all">{reference}</p>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="pt-4 border-t border-neutral-900 flex space-x-3 mt-6">
                  <button
                    type="button"
                    onClick={() => setStep(1)}
                    className="flex-1 rounded border border-neutral-900 bg-neutral-950 py-2.5 text-center text-xs font-bold uppercase tracking-wider text-neutral-500 hover:text-white transition-all cursor-pointer"
                  >
                    ← Edit Inputs
                  </button>
                  <button
                    type="button"
                    onClick={handleConfirmTransfer}
                    className="flex-1 flex justify-center items-center space-x-1 rounded bg-emerald-600 py-2.5 text-center text-xs font-bold uppercase tracking-wider text-white hover:bg-emerald-500 transition-all cursor-pointer"
                  >
                    <ShieldCheck className="h-4 w-4 shrink-0 mr-1" />
                    <span>Confirm transfer</span>
                  </button>
                </div>
              </div>
            )}

            {/* STEP 3: SUBMIT PROGRESS & SUCCESS STATE */}
            {step === 3 && (
              <div className="mt-6 flex-1 flex flex-col justify-center items-center py-12 text-center font-mono">
                {isSubmitting ? (
                  <div className="space-y-4">
                    <Loader2 className="h-10 w-10 animate-spin text-indigo-500 mx-auto" />
                    <h3 className="text-xs font-black uppercase text-white tracking-widest">Processing transfer...</h3>
                    <p className="text-[10px] text-neutral-500 max-w-xs leading-normal">
                      Orchestrating double-entry asset allocations and pushing payment webhook hooks asynchronously...
                    </p>
                  </div>
                ) : submitOutcome ? (
                  <div className="space-y-6 w-full">
                    <CheckCircle2 className="h-12 w-12 text-emerald-500 mx-auto animate-bounce" />
                    <div className="space-y-2">
                      <h3 className="text-xs font-black uppercase text-white tracking-widest">✓ Transfer successful</h3>
                      <p className="text-[10px] text-neutral-500 max-w-sm mx-auto leading-relaxed">
                        Ledger entries posted! Transfer reference ID <b className="font-mono text-neutral-300 select-all">{submitOutcome.id}</b> is authorized.
                      </p>
                    </div>

                    <div className="rounded border border-neutral-900 bg-neutral-950 p-4 text-left space-y-2.5 max-w-xs mx-auto text-[10px] font-bold">
                      <div className="flex justify-between">
                        <span className="text-neutral-600 uppercase">Transfer ID</span>
                        <span className="text-neutral-300 font-mono">{submitOutcome.id.substring(0, 15)}...</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-neutral-600 uppercase">Status</span>
                        <span className="text-emerald-500 font-bold uppercase">{submitOutcome.status}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-neutral-600 uppercase">Amount</span>
                        <span className="text-white font-black">{formatMoney(submitOutcome.amount, submitOutcome.currency)}</span>
                      </div>
                    </div>

                    <div className="pt-6 flex flex-col sm:flex-row justify-center gap-3">
                      <button
                        type="button"
                        onClick={() => navigate(`/projects/${projectId}/transfers/${submitOutcome.id}`)}
                        className="rounded border border-neutral-850 bg-neutral-950 hover:bg-neutral-900 text-white font-bold text-xs px-5 py-2 uppercase cursor-pointer"
                      >
                        View transfer
                      </button>
                      <button
                        type="button"
                        onClick={handleResetDrawerState}
                        className="rounded bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs px-5 py-2 uppercase cursor-pointer"
                      >
                        Create another transfer
                      </button>
                    </div>
                  </div>
                ) : null}
              </div>
            )}

          </div>
        </div>
      )}

    </div>
  );
};

export default Transfers;
