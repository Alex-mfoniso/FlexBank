import React, { useEffect, useState, useRef, useCallback } from "react";
import { Link, useParams, useNavigate, useSearchParams } from "react-router-dom";
import { api } from "../lib/api";
import { transferService } from "../services/transfer.service";
import { accountService } from "../services/account.service";
import { formatMoney, formatDate } from "../utils/format";
import { NIGERIAN_BANKS, getBankName } from "../utils/banks";
import type { Transfer } from "../types";
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
  ChevronRight,
  Wallet,
  Copy,
  Check,
  Loader2,
  Building,
  CheckCircle,
  Clock,
  Sparkles
} from "lucide-react";

export const Transfers: React.FC = () => {
  const { projectId } = useParams<{ projectId: string }>();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  // Search & Filters
  const initialSearch = searchParams.get("search") || "";
  const [searchQuery, setSearchQuery] = useState(initialSearch);
  const [typeFilter, setTypeFilter] = useState("all");

  const [transfers, setTransfers] = useState<Transfer[]>([]);
  const [accounts, setAccounts] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Syncing specific transfer in table
  const [syncingId, setSyncingId] = useState<string | null>(null);

  // Multi-step modal/drawer states
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [step, setStep] = useState(1); // 1 = Form, 2 = Confirmation, 3 = Outcome
  const [transferType, setTransferType] = useState<"external" | "internal">("external");
  const [sourceAccountId, setSourceAccountId] = useState("");
  const [destinationAccountId, setDestinationAccountId] = useState("");

  // External payout parameters
  const [bankCode, setBankCode] = useState("058"); // Default to GTBank for quick testing
  const [isCustomBank, setIsCustomBank] = useState(false);
  const [customBankCode, setCustomBankCode] = useState("");
  const [accountNumber, setAccountNumber] = useState("");
  const [beneficiaryName, setBeneficiaryName] = useState("");
  const [isResolvingAccount, setIsResolvingAccount] = useState(false);
  const [accountResolutionError, setAccountResolutionError] = useState<string | null>(null);
  const [accountResolved, setAccountResolved] = useState(false);

  // Transfer values
  const [amountStr, setAmountStr] = useState("");
  const [reference, setReference] = useState("");
  const [reason, setReason] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [submitOutcome, setSubmitOutcome] = useState<Transfer | null>(null);

  // Persistent Idempotency-Key per drawer session
  const idempotencyKeyRef = useRef<string>("");

  // Clipboard copy state
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const activeBankCode = isCustomBank ? customBankCode : bankCode;
  const activeSourceAcc = accounts.find((a) => a.id === sourceAccountId);
  const activeDestAcc = accounts.find((a) => a.id === destinationAccountId);

  const handleCopy = (id: string) => {
    navigator.clipboard.writeText(id);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  // Fetch transfers and accounts for this project
  const fetchTransfersAndAccounts = useCallback(async (silent = false) => {
    if (!projectId) return;
    if (!silent) setIsLoading(true);
    setError(null);
    try {
      const [transfersData, accRes] = await Promise.all([
        transferService.list(),
        api.get("/api/v1/accounts", { headers: { "x-project-id": projectId } }),
      ]);

      const retrievedAccounts = accRes.data.accounts || accRes.data.data || [];
      const isolatedAccounts = retrievedAccounts.filter((ac: any) => ac.projectId === projectId);

      setTransfers(transfersData);
      setAccounts(isolatedAccounts);

      if (isolatedAccounts.length > 0 && !sourceAccountId) {
        setSourceAccountId(isolatedAccounts[0].id);
      }
    } catch (err: any) {
      console.error("Failed to load transfers or accounts", err);
      if (!silent) {
        setError(err.message || "Failed to retrieve payment records.");
      }
    } finally {
      if (!silent) setIsLoading(false);
      setIsRefreshing(false);
    }
  }, [projectId, sourceAccountId]);

  useEffect(() => {
    fetchTransfersAndAccounts();
  }, [fetchTransfersAndAccounts]);

  // Automatic Polling for in-flight transfers (pending or processing)
  useEffect(() => {
    const hasInFlight = transfers.some(
      (tx) => tx.status === "pending" || tx.status === "processing"
    );

    if (!hasInFlight) return;

    const pollInterval = setInterval(() => {
      fetchTransfersAndAccounts(true);
    }, 5000);

    return () => clearInterval(pollInterval);
  }, [transfers, fetchTransfersAndAccounts]);

  // Sync searches to URL
  useEffect(() => {
    if (searchQuery.trim()) {
      setSearchParams({ search: searchQuery });
    } else {
      searchParams.delete("search");
      setSearchParams(searchParams);
    }
  }, [searchQuery, setSearchParams, searchParams]);

  // Account Resolution Handler
  const handleResolveAccount = async (targetCode?: string, targetNum?: string) => {
    const code = (targetCode || activeBankCode).trim();
    const num = (targetNum || accountNumber).trim();

    if (!code) {
      setAccountResolutionError("Please select or enter a valid bank code.");
      return;
    }
    if (num.length !== 10) {
      setAccountResolutionError("NUBAN account number must be exactly 10 digits.");
      return;
    }

    setIsResolvingAccount(true);
    setAccountResolutionError(null);
    setAccountResolved(false);

    try {
      const resolved = await accountService.resolve(code, num);
      if (resolved && resolved.account_name) {
        setBeneficiaryName(resolved.account_name);
        setAccountResolved(true);
      } else {
        setAccountResolutionError("No account name returned by the bank verification rail.");
      }
    } catch (err: any) {
      console.error("Account resolution failed", err);
      setAccountResolutionError(
        err.message || "Could not resolve bank account. Verify the account number and bank code."
      );
      setBeneficiaryName("");
      setAccountResolved(false);
    } finally {
      setIsResolvingAccount(false);
    }
  };

  // Auto-resolve when account number reaches 10 digits and bank code is selected
  const handleAccountNumberChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value.replace(/\D/g, "").slice(0, 10);
    setAccountNumber(val);
    setAccountResolved(false);
    setAccountResolutionError(null);

    if (val.length === 10 && activeBankCode) {
      handleResolveAccount(activeBankCode, val);
    }
  };

  // Sync individual transfer status
  const handleSyncStatus = async (txId: string) => {
    setSyncingId(txId);
    try {
      const updated = await transferService.syncStatus(txId);
      setTransfers((prev) =>
        prev.map((tx) => (tx.id === txId ? { ...tx, ...updated } : tx))
      );
    } catch (err: any) {
      console.error("Status sync failed", err);
    } finally {
      setSyncingId(null);
    }
  };

  const handleOpenDrawer = () => {
    // Generate fresh idempotency key once per transfer drawer session
    idempotencyKeyRef.current = `idem_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
    setStep(1);
    setFormError(null);
    setAccountResolutionError(null);
    setReference(`ref_trf_${Date.now().toString().slice(-6)}`);
    setIsDrawerOpen(true);
  };

  const handleResetDrawerState = () => {
    setIsDrawerOpen(false);
    setStep(1);
    setAmountStr("");
    setReference("");
    setReason("");
    setDestinationAccountId("");
    setBankCode("058");
    setCustomBankCode("");
    setIsCustomBank(false);
    setAccountNumber("");
    setBeneficiaryName("");
    setAccountResolved(false);
    setAccountResolutionError(null);
    setSubmitOutcome(null);
    setFormError(null);
  };

  const handleNextStep = (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    const val = parseFloat(amountStr);
    if (isNaN(val) || val <= 0) {
      setFormError("Please enter a valid positive transfer amount in NGN.");
      return;
    }

    if (transferType === "internal") {
      if (!destinationAccountId) {
        setFormError("Please select a destination account for internal transfer.");
        return;
      }
      if (sourceAccountId === destinationAccountId) {
        setFormError("Source and destination accounts must be different.");
        return;
      }
    } else {
      if (!activeBankCode.trim()) {
        setFormError("Please select or enter a Nigerian bank code.");
        return;
      }
      if (accountNumber.trim().length !== 10) {
        setFormError("Please enter a 10-digit NUBAN account number.");
        return;
      }
      if (!beneficiaryName.trim()) {
        setFormError("Please resolve or provide the beneficiary account name.");
        return;
      }
    }

    setStep(2); // Move to review step
  };

  const handleConfirmTransfer = async () => {
    if (isSubmitting) return; // Prevent duplicate clicks
    setFormError(null);
    setIsSubmitting(true);
    setStep(3);

    const majorAmount = parseFloat(amountStr);
    const minorAmount = Math.round(majorAmount * 100); // Minor units (kobo)
    const idempotencyKey = idempotencyKeyRef.current;

    try {
      let outcome: Transfer;

      if (transferType === "external") {
        // Direct developer transfer backed by Paystack TEST mode
        outcome = await transferService.initiateDeveloperTransfer(
          {
            amount: minorAmount,
            currency: "NGN",
            bank_code: activeBankCode.trim(),
            account_number: accountNumber.trim(),
            account_name: beneficiaryName.trim(),
            reference: reference.trim() || `ref_trf_${Date.now().toString().slice(-6)}`,
            reason: reason.trim() || undefined,
          },
          idempotencyKey
        );
      } else {
        // Internal ledger transfer
        outcome = await transferService.initiate(
          {
            type: "internal",
            sourceAccountId,
            destinationAccountId,
            amount: minorAmount,
            currency: activeSourceAcc?.currency || "NGN",
            reference: reference.trim() || `ref_trf_${Date.now().toString().slice(-6)}`,
          },
          idempotencyKey
        );
      }

      setSubmitOutcome(outcome);
      await fetchTransfersAndAccounts(true);
    } catch (err: any) {
      console.error("Transfer submission failed", err);
      setFormError(err.message || "Transfer initiation was rejected by the payment rail.");
      setStep(1); // Revert to inputs step so user can correct parameters
    } finally {
      setIsSubmitting(false);
    }
  };

  // Safe client-side search & filtering
  const filteredTransfers = transfers.filter((tx) => {
    if (typeFilter !== "all") {
      const isInternal = tx.type === "internal" || tx.direction === "internal";
      if (typeFilter === "internal" && !isInternal) return false;
      if (typeFilter === "external" && isInternal) return false;
    }

    const term = searchQuery.toLowerCase().trim();
    if (!term) return true;

    const ref = (tx.reference || "").toLowerCase();
    const id = (tx.id || "").toLowerCase();
    const status = (tx.status || "").toLowerCase();
    const destName = (
      tx.destination?.account_name ||
      tx.account_name ||
      tx.beneficiary?.name ||
      ""
    ).toLowerCase();
    const destAcct = (
      tx.destination?.account_number ||
      tx.account_number ||
      tx.beneficiary?.accountNumber ||
      ""
    ).toLowerCase();

    return (
      ref.includes(term) ||
      id.includes(term) ||
      status.includes(term) ||
      destName.includes(term) ||
      destAcct.includes(term)
    );
  });

  return (
    <div className="space-y-8 font-mono select-none text-left relative">
      {/* 1. Header Toolbar */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center pb-5 border-b border-neutral-900 gap-4">
        <div>
          <h1 className="text-xl font-black text-white uppercase tracking-tight">
            Transfers & Payouts
          </h1>
          <p className="text-[10px] text-neutral-500 font-semibold mt-1">
            Real-time financial payout orchestration powered by Ricarut.
          </p>
        </div>
        <div className="flex items-center space-x-2">
          <button
            onClick={() => {
              setIsRefreshing(true);
              fetchTransfersAndAccounts(false);
            }}
            disabled={isRefreshing}
            className="rounded border border-neutral-900 bg-neutral-950 px-3 py-2 text-xs font-bold uppercase tracking-wider text-neutral-400 hover:text-white transition-all flex items-center space-x-1.5 cursor-pointer"
            title="Refresh transfer list"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${isRefreshing ? "animate-spin text-indigo-400" : ""}`} />
            <span className="hidden sm:inline">Refresh</span>
          </button>
          <button
            onClick={handleOpenDrawer}
            className="rounded bg-indigo-600 px-4 py-2 text-xs font-bold uppercase tracking-wider text-white hover:bg-indigo-500 transition-all active:scale-[0.98] flex items-center space-x-1.5 cursor-pointer shadow-md shadow-indigo-600/10"
          >
            <Plus className="h-4 w-4 shrink-0" />
            <span>Create Transfer</span>
          </button>
        </div>
      </div>

      {/* Sandbox Test Environment Notice Banner */}
      <div className="rounded border border-amber-950/40 bg-amber-950/10 px-4 py-3 text-[10px] text-amber-500 font-bold uppercase tracking-wider flex items-start space-x-2.5">
        <Info className="h-4.5 w-4.5 shrink-0 text-amber-400 mt-0.5" />
        <div className="space-y-0.5">
          <span className="block font-black text-amber-300">
            SANDBOX ENVIRONMENT (Paystack TEST Rails)
          </span>
          <span className="text-amber-400/80 font-medium normal-case block">
            Transfers interact with banking rails under sandbox simulation credentials. No real currency is moved.
          </span>
        </div>
      </div>

      {/* 2. Search & Filtering Bar */}
      {transfers.length > 0 && (
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3.5 top-2.5 h-4 w-4 text-neutral-600" />
            <input
              type="text"
              placeholder="Search by transfer ID, reference, account number, or name..."
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
            <option value="all">All Settlements</option>
            <option value="external">External Bank Payouts</option>
            <option value="internal">Internal Wallets</option>
          </select>
        </div>
      )}

      {/* 3. Operational Transfers Table & List */}
      {isLoading ? (
        <div className="space-y-4 pt-4">
          <div className="h-10 bg-neutral-950 border border-neutral-900 rounded animate-pulse" />
          <div className="h-24 bg-neutral-950 border border-neutral-900 rounded animate-pulse" />
          <div className="h-24 bg-neutral-950 border border-neutral-900 rounded animate-pulse" />
        </div>
      ) : error ? (
        <div className="rounded border border-red-950 bg-red-950/5 p-6 text-center max-w-md mx-auto">
          <AlertTriangle className="mx-auto h-10 w-10 text-red-500" />
          <h3 className="mt-4 text-xs font-black uppercase tracking-wider text-white">Unable to load transfers</h3>
          <p className="mt-2 text-[10px] text-neutral-500 font-semibold leading-relaxed">{error}</p>
          <button
            onClick={() => fetchTransfersAndAccounts(false)}
            className="mt-5 inline-flex items-center space-x-1.5 rounded bg-neutral-900 px-4 py-2 text-xs font-bold uppercase tracking-wider text-white hover:bg-neutral-800 transition-all border border-neutral-800 cursor-pointer"
          >
            <RefreshCw className="h-3.5 w-3.5" />
            <span>Retry Query</span>
          </button>
        </div>
      ) : transfers.length === 0 ? (
        <div className="rounded-lg border border-dashed border-neutral-900 bg-neutral-950/10 p-12 text-center max-w-lg mx-auto">
          <ArrowUpRight className="mx-auto h-12 w-12 text-neutral-700 animate-pulse" />
          <h3 className="mt-4 text-xs font-black uppercase tracking-widest text-neutral-400">
            No transfers initiated yet
          </h3>
          <p className="mt-2 text-[10px] text-neutral-500 font-medium leading-relaxed">
            Create your first test transfer using Nigerian bank rails to see Ricarut's provider integration in action.
          </p>
          <div className="mt-6">
            <button
              onClick={handleOpenDrawer}
              className="rounded bg-indigo-600 px-4 py-2 text-xs font-bold uppercase text-white hover:bg-indigo-500 transition-all cursor-pointer shadow-md shadow-indigo-600/10"
            >
              + Create Test Transfer
            </button>
          </div>
        </div>
      ) : filteredTransfers.length === 0 ? (
        <div className="rounded-lg border border-neutral-900 bg-neutral-950/20 p-12 text-center max-w-lg mx-auto">
          <Search className="mx-auto h-10 w-10 text-neutral-700" />
          <h3 className="mt-4 text-xs font-black uppercase tracking-widest text-neutral-400">
            No matching transfers
          </h3>
          <p className="mt-2 text-[10px] text-neutral-500 font-medium">
            No transfer records matched your search query.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {/* Desktop Table View */}
          <div className="hidden lg:block rounded-lg border border-neutral-900 bg-neutral-950/40 overflow-hidden">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-neutral-950/80 border-b border-neutral-900 text-neutral-500 font-black text-[9px] uppercase tracking-wider">
                  <th className="px-6 py-3.5">Reference / Ricarut ID</th>
                  <th className="px-6 py-3.5">Destination Bank & Account</th>
                  <th className="px-6 py-3.5">Amount</th>
                  <th className="px-6 py-3.5">Status</th>
                  <th className="px-6 py-3.5">Date</th>
                  <th className="px-6 py-3.5 text-right pr-6">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-900/40 text-[11px] font-semibold text-neutral-300">
                {filteredTransfers.map((tx) => {
                  const destName =
                    tx.destination?.account_name ||
                    tx.account_name ||
                    tx.beneficiary?.name ||
                    (tx.destinationAccount ? tx.destinationAccount.name : "N/A");
                  const destBank =
                    tx.destination?.bank_code ||
                    tx.bank_code ||
                    tx.beneficiary?.bankCode ||
                    "";
                  const destAccount =
                    tx.destination?.account_number ||
                    tx.account_number ||
                    tx.beneficiary?.accountNumber ||
                    "";

                  const isNonTerminal = tx.status === "pending" || tx.status === "processing";

                  return (
                    <tr key={tx.id} className="hover:bg-neutral-950/30 transition-colors">
                      {/* Reference / ID */}
                      <td className="px-6 py-4">
                        <div>
                          <span className="font-bold text-white block uppercase tracking-tight">
                            {tx.reference}
                          </span>
                          <div className="flex items-center space-x-1.5 font-mono text-[9.5px] mt-1 text-neutral-500 select-all">
                            <span>{tx.id}</span>
                            <button
                              onClick={() => handleCopy(tx.id)}
                              className="text-neutral-700 hover:text-white transition-colors cursor-pointer"
                              title="Copy ID"
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

                      {/* Destination Details */}
                      <td className="px-6 py-4 text-xs">
                        <div>
                          <span className="block font-bold text-white uppercase truncate max-w-[200px]">
                            {destName}
                          </span>
                          {destBank && destAccount ? (
                            <span className="text-[9.5px] text-neutral-500">
                              {getBankName(destBank)} • {destAccount}
                            </span>
                          ) : tx.destinationAccount ? (
                            <span className="text-[9.5px] text-indigo-400 font-mono">
                              Wallet: {tx.destinationAccount.id}
                            </span>
                          ) : (
                            <span className="text-neutral-600">Standard Rail</span>
                          )}
                        </div>
                      </td>

                      {/* Amount */}
                      <td className="px-6 py-4 text-white font-black whitespace-nowrap">
                        {formatMoney(tx.amount, tx.currency)}
                      </td>

                      {/* Status Badge */}
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span
                          className={`inline-flex items-center rounded border px-2 py-0.5 text-[8.5px] font-black uppercase tracking-wider leading-none ${
                            tx.status === "successful"
                              ? "border-emerald-900/40 bg-emerald-950/20 text-emerald-400"
                              : tx.status === "pending"
                              ? "border-amber-900/40 bg-amber-950/20 text-amber-400 animate-pulse"
                              : tx.status === "processing"
                              ? "border-blue-900/40 bg-blue-950/20 text-blue-400 animate-pulse"
                              : tx.status === "reversed"
                              ? "border-purple-900/40 bg-purple-950/20 text-purple-400"
                              : "border-red-900/40 bg-red-950/20 text-red-400"
                          }`}
                        >
                          {tx.status === "successful"
                            ? "✓ "
                            : isNonTerminal
                            ? "◌ "
                            : tx.status === "reversed"
                            ? "↺ "
                            : "× "}
                          {tx.status}
                        </span>
                      </td>

                      {/* Date */}
                      <td className="px-6 py-4 text-[10px] text-neutral-500 whitespace-nowrap">
                        {formatDate(tx.createdAt || tx.created_at || "")}
                      </td>

                      {/* Actions */}
                      <td className="px-6 py-4 text-right pr-6 whitespace-nowrap space-x-2">
                        {isNonTerminal && (
                          <button
                            onClick={() => handleSyncStatus(tx.id)}
                            disabled={syncingId === tx.id}
                            className="inline-flex items-center space-x-1 text-[9px] font-bold text-amber-400 hover:text-amber-300 uppercase tracking-widest cursor-pointer mr-2"
                            title="Sync status with Paystack TEST rail"
                          >
                            <RefreshCw className={`h-3 w-3 ${syncingId === tx.id ? "animate-spin" : ""}`} />
                            <span>Sync</span>
                          </button>
                        )}
                        <Link
                          to={`/projects/${projectId}/transfers/${tx.id}`}
                          className="inline-flex items-center space-x-1 text-[10px] font-black text-indigo-400 hover:text-white uppercase tracking-widest transition-colors"
                        >
                          <span>Inspect</span>
                          <ChevronRight className="h-3.5 w-3.5 shrink-0" />
                        </Link>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Mobile / Card List View */}
          <div className="block lg:hidden space-y-3">
            {filteredTransfers.map((tx) => {
              const destName =
                tx.destination?.account_name ||
                tx.account_name ||
                tx.beneficiary?.name ||
                (tx.destinationAccount ? tx.destinationAccount.name : "N/A");
              const destBank =
                tx.destination?.bank_code || tx.bank_code || tx.beneficiary?.bankCode || "";
              const destAccount =
                tx.destination?.account_number ||
                tx.account_number ||
                tx.beneficiary?.accountNumber ||
                "";
              const isNonTerminal = tx.status === "pending" || tx.status === "processing";

              return (
                <div key={tx.id} className="rounded-lg border border-neutral-900 bg-neutral-950/40 p-4 space-y-3">
                  <div className="flex items-center justify-between border-b border-neutral-900 pb-2">
                    <div>
                      <span className="font-bold text-white text-[11.5px] uppercase tracking-tight">
                        {tx.reference}
                      </span>
                      <p className="font-mono text-[9px] text-neutral-500 mt-0.5 select-all">{tx.id}</p>
                    </div>
                    <span
                      className={`inline-flex items-center rounded border px-1.5 py-0.5 text-[7.5px] font-black uppercase tracking-wider leading-none ${
                        tx.status === "successful"
                          ? "border-emerald-900/40 bg-emerald-950/20 text-emerald-400"
                          : isNonTerminal
                          ? "border-amber-900/40 bg-amber-950/20 text-amber-400 animate-pulse"
                          : "border-red-900/40 bg-red-950/20 text-red-400"
                      }`}
                    >
                      {tx.status}
                    </span>
                  </div>

                  <div className="text-[10px] space-y-1.5 font-medium text-neutral-400">
                    <div className="flex justify-between">
                      <span className="text-neutral-600 uppercase">Destination</span>
                      <span className="font-bold text-neutral-200 truncate max-w-[170px] text-right">
                        {destName}
                      </span>
                    </div>
                    {destBank && destAccount && (
                      <div className="flex justify-between">
                        <span className="text-neutral-600 uppercase">Bank / Acct</span>
                        <span className="text-neutral-400 text-right">
                          {getBankName(destBank)} ({destAccount})
                        </span>
                      </div>
                    )}
                    <div className="flex justify-between">
                      <span className="text-neutral-600 uppercase">Amount</span>
                      <span className="font-bold text-white">{formatMoney(tx.amount, tx.currency)}</span>
                    </div>
                  </div>

                  <div className="pt-2 border-t border-neutral-900/60 flex justify-between items-center">
                    {isNonTerminal ? (
                      <button
                        onClick={() => handleSyncStatus(tx.id)}
                        disabled={syncingId === tx.id}
                        className="inline-flex items-center space-x-1 text-[9px] font-bold text-amber-400 hover:text-amber-300 uppercase cursor-pointer"
                      >
                        <RefreshCw className={`h-3 w-3 ${syncingId === tx.id ? "animate-spin" : ""}`} />
                        <span>Sync Status</span>
                      </button>
                    ) : <span />}
                    <Link
                      to={`/projects/${projectId}/transfers/${tx.id}`}
                      className="inline-flex items-center space-x-1 text-[9px] font-black text-indigo-400 hover:text-white uppercase tracking-widest"
                    >
                      <span>Inspect Details</span>
                      <ArrowRight className="h-3 w-3 shrink-0" />
                    </Link>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* 4. Sliding Multi-step Transfer Drawer */}
      {isDrawerOpen && (
        <div className="fixed inset-0 z-50 flex justify-end font-mono">
          <div onClick={handleResetDrawerState} className="fixed inset-0 bg-black/70 backdrop-blur-xs transition-all" />

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

            {/* Drawer Header */}
            <div className="flex items-center space-x-2.5 pb-4 border-b border-neutral-900">
              <div className="flex h-8 w-8 items-center justify-center rounded bg-indigo-600 text-white font-black">
                <ArrowUpRight className="h-4.5 w-4.5" />
              </div>
              <div>
                <h2 className="text-sm font-black uppercase text-white tracking-wider">
                  Create Test Transfer
                </h2>
                <span className="text-[9px] text-neutral-500 uppercase font-bold tracking-widest">
                  Step {step} of 3 • Sandbox Rail
                </span>
              </div>
            </div>

            {/* Error Banner */}
            {formError && step !== 3 && (
              <div className="mt-4 flex items-start space-x-2 rounded border border-red-950 bg-red-950/20 p-3 text-red-200/90 leading-relaxed text-[11px] font-semibold">
                <AlertTriangle className="h-4 w-4 text-red-400 shrink-0 mt-0.5" />
                <p className="leading-snug">{formError}</p>
              </div>
            )}

            {/* STEP 1: FORM INPUTS */}
            {step === 1 && (
              <form onSubmit={handleNextStep} className="mt-6 space-y-4 flex-1">
                {/* Mode Selector */}
                <div>
                  <label className="block text-[9px] font-bold text-neutral-500 uppercase tracking-widest">
                    Settlement Rail Type
                  </label>
                  <div className="mt-1.5 grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        setTransferType("external");
                        setFormError(null);
                      }}
                      className={`rounded py-2 text-[10px] font-bold uppercase tracking-wider border transition-all cursor-pointer ${
                        transferType === "external"
                          ? "bg-indigo-950/50 text-indigo-400 border-indigo-900/70"
                          : "bg-neutral-950 text-neutral-600 border-neutral-900 hover:text-neutral-400"
                      }`}
                    >
                      Nigerian Bank Payout
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setTransferType("internal");
                        setFormError(null);
                      }}
                      className={`rounded py-2 text-[10px] font-bold uppercase tracking-wider border transition-all cursor-pointer ${
                        transferType === "internal"
                          ? "bg-indigo-950/50 text-indigo-400 border-indigo-900/70"
                          : "bg-neutral-950 text-neutral-600 border-neutral-900 hover:text-neutral-400"
                      }`}
                    >
                      Internal Wallet Transfer
                    </button>
                  </div>
                </div>

                {/* External Bank Transfer Form (Phase 6.5 Core Flow) */}
                {transferType === "external" ? (
                  <div className="space-y-4 rounded-lg border border-neutral-900 bg-neutral-950/60 p-4">
                    <span className="block text-[8.5px] font-bold text-neutral-400 uppercase tracking-wider flex items-center space-x-1.5 pb-2 border-b border-neutral-900">
                      <Building className="h-3.5 w-3.5 text-indigo-400" />
                      <span>Destination Bank Details (Nigeria)</span>
                    </span>

                    {/* Bank Selection */}
                    <div>
                      <div className="flex justify-between items-center">
                        <label className="block text-[9px] font-bold text-neutral-400 uppercase">
                          Bank Name / Code *
                        </label>
                        <button
                          type="button"
                          onClick={() => {
                            setIsCustomBank(!isCustomBank);
                            setAccountResolved(false);
                            setBeneficiaryName("");
                          }}
                          className="text-[8.5px] font-bold text-indigo-400 hover:text-indigo-300 uppercase cursor-pointer"
                        >
                          {isCustomBank ? "Choose from list" : "Custom bank code"}
                        </button>
                      </div>

                      {isCustomBank ? (
                        <input
                          type="text"
                          required
                          value={customBankCode}
                          onChange={(e) => {
                            setCustomBankCode(e.target.value.replace(/\D/g, ""));
                            setAccountResolved(false);
                          }}
                          placeholder="Enter 3-6 digit CBN code (e.g. 058)"
                          className="mt-1 block w-full rounded border border-neutral-900 bg-neutral-950 px-3 py-2 text-xs text-white focus:border-indigo-500 focus:outline-none font-bold"
                        />
                      ) : (
                        <select
                          value={bankCode}
                          onChange={(e) => {
                            setBankCode(e.target.value);
                            setAccountResolved(false);
                            setBeneficiaryName("");
                            if (accountNumber.length === 10) {
                              handleResolveAccount(e.target.value, accountNumber);
                            }
                          }}
                          className="mt-1 block w-full rounded border border-neutral-900 bg-neutral-950 px-3 py-2 text-xs text-white focus:border-indigo-500 focus:outline-none font-semibold cursor-pointer"
                        >
                          {NIGERIAN_BANKS.map((bank) => (
                            <option key={bank.code} value={bank.code}>
                              {bank.name} ({bank.code})
                            </option>
                          ))}
                        </select>
                      )}
                    </div>

                    {/* NUBAN Account Number */}
                    <div>
                      <label className="block text-[9px] font-bold text-neutral-400 uppercase">
                        NUBAN Account Number (10 Digits) *
                      </label>
                      <div className="relative mt-1">
                        <input
                          type="text"
                          inputMode="numeric"
                          maxLength={10}
                          required
                          value={accountNumber}
                          onChange={handleAccountNumberChange}
                          placeholder="e.g. 0123456789"
                          className="block w-full rounded border border-neutral-900 bg-neutral-950 px-3 py-2 text-xs text-white placeholder:text-neutral-700 focus:border-indigo-500 focus:outline-none font-bold tracking-wider"
                        />
                        <button
                          type="button"
                          onClick={() => handleResolveAccount()}
                          disabled={isResolvingAccount || accountNumber.length !== 10}
                          className="absolute right-1.5 top-1.5 rounded bg-neutral-900 border border-neutral-800 px-2.5 py-1 text-[8.5px] font-bold uppercase tracking-wider text-neutral-300 hover:text-white disabled:opacity-40 transition-all cursor-pointer"
                        >
                          {isResolvingAccount ? (
                            <Loader2 className="h-3 w-3 animate-spin text-indigo-400" />
                          ) : (
                            "Verify"
                          )}
                        </button>
                      </div>
                    </div>

                    {/* Account Resolution Status & Resolved Name */}
                    {isResolvingAccount && (
                      <div className="flex items-center space-x-2 text-[10px] text-neutral-400 py-1 font-semibold">
                        <Loader2 className="h-3.5 w-3.5 animate-spin text-indigo-400" />
                        <span>Verifying account details with financial rail...</span>
                      </div>
                    )}

                    {accountResolutionError && (
                      <div className="rounded border border-red-950/80 bg-red-950/20 p-2.5 text-[10px] text-red-400 font-semibold flex items-start space-x-2">
                        <AlertTriangle className="h-3.5 w-3.5 shrink-0 mt-0.5 text-red-400" />
                        <span>{accountResolutionError}</span>
                      </div>
                    )}

                    {accountResolved && beneficiaryName && (
                      <div className="rounded border border-emerald-950/80 bg-emerald-950/20 p-2.5 space-y-1">
                        <div className="flex items-center space-x-1.5 text-emerald-400 text-[10px] font-black uppercase tracking-wider">
                          <CheckCircle className="h-3.5 w-3.5 shrink-0 text-emerald-400" />
                          <span>Account Verified</span>
                        </div>
                        <p className="text-xs font-black text-white uppercase tracking-tight pl-5">
                          {beneficiaryName}
                        </p>
                      </div>
                    )}

                    {/* Manual name override fallback if needed */}
                    {!accountResolved && !isResolvingAccount && (
                      <div>
                        <label className="block text-[9px] font-bold text-neutral-500 uppercase">
                          Beneficiary Legal Name {accountResolved ? "" : "*"}
                        </label>
                        <input
                          type="text"
                          required
                          value={beneficiaryName}
                          onChange={(e) => setBeneficiaryName(e.target.value)}
                          placeholder="Auto-resolves on 10 digits or enter manually"
                          className="mt-1 block w-full rounded border border-neutral-900 bg-neutral-950 px-3 py-1.5 text-xs text-white focus:border-indigo-500 focus:outline-none"
                        />
                      </div>
                    )}
                  </div>
                ) : (
                  /* Internal Wallet Transfer Form */
                  <div className="space-y-4 rounded-lg border border-neutral-900 bg-neutral-950/60 p-4">
                    <div>
                      <label className="block text-[9px] font-bold text-neutral-400 uppercase">
                        Source Wallet *
                      </label>
                      <select
                        value={sourceAccountId}
                        onChange={(e) => setSourceAccountId(e.target.value)}
                        className="mt-1 block w-full rounded border border-neutral-900 bg-neutral-950 px-3 py-2 text-xs text-white focus:border-indigo-500 focus:outline-none font-semibold cursor-pointer"
                      >
                        {accounts.map((acc) => (
                          <option key={acc.id} value={acc.id}>
                            {acc.name} ({acc.currency}) • Avail: {formatMoney(acc.available, acc.currency)}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-[9px] font-bold text-neutral-400 uppercase">
                        Destination Wallet *
                      </label>
                      <select
                        value={destinationAccountId}
                        required
                        onChange={(e) => setDestinationAccountId(e.target.value)}
                        className="mt-1 block w-full rounded border border-neutral-900 bg-neutral-950 px-3 py-2 text-xs text-white focus:border-indigo-500 focus:outline-none font-semibold cursor-pointer"
                      >
                        <option value="">-- Choose destination wallet --</option>
                        {accounts.map((acc) => (
                          <option key={acc.id} value={acc.id}>
                            {acc.name} ({acc.currency})
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                )}

                {/* Amount & Reference Grid */}
                <div className="grid grid-cols-2 gap-3 pt-1">
                  <div>
                    <label className="block text-[9px] font-bold text-neutral-400 uppercase tracking-widest">
                      Amount (NGN) *
                    </label>
                    <div className="relative mt-1.5 rounded shadow-sm">
                      <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                        <span className="text-neutral-500 text-xs font-black">₦</span>
                      </div>
                      <input
                        type="number"
                        step="0.01"
                        min="1"
                        required
                        value={amountStr}
                        onChange={(e) => setAmountStr(e.target.value)}
                        placeholder="5000.00"
                        className="block w-full rounded border border-neutral-900 bg-neutral-950 pl-8 pr-3 py-2 text-xs text-white placeholder:text-neutral-700 focus:border-indigo-500 focus:outline-none font-bold"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-[9px] font-bold text-neutral-400 uppercase tracking-widest">
                      Reference Key *
                    </label>
                    <input
                      type="text"
                      required
                      value={reference}
                      onChange={(e) => setReference(e.target.value)}
                      placeholder="e.g. order_1020"
                      className="mt-1.5 block w-full rounded border border-neutral-900 bg-neutral-950 px-3 py-2 text-xs text-white placeholder:text-neutral-700 focus:border-indigo-500 focus:outline-none font-mono"
                    />
                  </div>
                </div>

                {/* Reason / Narration */}
                <div>
                  <label className="block text-[9px] font-bold text-neutral-500 uppercase tracking-widest">
                    Narration / Reason (Optional)
                  </label>
                  <input
                    type="text"
                    value={reason}
                    onChange={(e) => setReason(e.target.value)}
                    placeholder="e.g. Vendor settlement payment"
                    className="mt-1.5 block w-full rounded border border-neutral-900 bg-neutral-950 px-3 py-1.5 text-xs text-white placeholder:text-neutral-700 focus:border-indigo-500 focus:outline-none"
                  />
                </div>

                {/* Drawer Footer Actions */}
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
                    Review Transfer →
                  </button>
                </div>
              </form>
            )}

            {/* STEP 2: CONFIRMATION REVIEW */}
            {step === 2 && (
              <div className="mt-6 flex-1 flex flex-col justify-between">
                <div className="space-y-6 text-xs font-semibold">
                  <div className="rounded border border-indigo-950 bg-indigo-950/20 p-3.5 text-indigo-400 text-[10.5px] leading-relaxed flex items-start space-x-2">
                    <Info className="h-4.5 w-4.5 text-indigo-400 shrink-0 mt-0.5" />
                    <span>
                      Review transfer parameters before execution. Ricarut will route this payment to Paystack TEST rails.
                    </span>
                  </div>

                  <div className="rounded-lg border border-neutral-900 bg-neutral-950/60 p-4 space-y-4">
                    <div className="grid grid-cols-2 gap-x-2 gap-y-4">
                      {transferType === "external" ? (
                        <>
                          <div className="col-span-2">
                            <span className="block text-[8px] font-bold text-neutral-500 uppercase tracking-widest">
                              Destination Account
                            </span>
                            <p className="text-white font-black mt-1 text-sm uppercase">
                              {beneficiaryName}
                            </p>
                            <span className="text-[10px] text-neutral-400 font-mono mt-0.5 block">
                              {getBankName(activeBankCode)} • {accountNumber}
                            </span>
                          </div>
                        </>
                      ) : (
                        <>
                          <div>
                            <span className="block text-[8px] font-bold text-neutral-500 uppercase tracking-widest">
                              Source Wallet
                            </span>
                            <p className="text-white font-bold mt-1 text-xs uppercase">{activeSourceAcc?.name}</p>
                            <span className="font-mono text-[9px] text-neutral-500">{activeSourceAcc?.id}</span>
                          </div>
                          <div>
                            <span className="block text-[8px] font-bold text-neutral-500 uppercase tracking-widest">
                              Destination Wallet
                            </span>
                            <p className="text-indigo-400 font-bold mt-1 text-xs uppercase">{activeDestAcc?.name}</p>
                            <span className="font-mono text-[9px] text-neutral-500">{activeDestAcc?.id}</span>
                          </div>
                        </>
                      )}

                      <div className="col-span-2 border-t border-neutral-900/60 pt-3">
                        <span className="block text-[8px] font-bold text-neutral-500 uppercase tracking-widest">
                          Amount
                        </span>
                        <p className="text-xl font-black text-white mt-1">
                          ₦{parseFloat(amountStr).toLocaleString("en-US", { minimumFractionDigits: 2 })}
                        </p>
                      </div>

                      <div className="col-span-2 border-t border-neutral-900/60 pt-3">
                        <span className="block text-[8px] font-bold text-neutral-500 uppercase tracking-widest">
                          Reference
                        </span>
                        <p className="text-neutral-300 font-mono text-[10px] mt-1 bg-neutral-950 p-2 rounded border border-neutral-900 select-all">
                          {reference}
                        </p>
                      </div>

                      <div className="col-span-2">
                        <span className="block text-[8px] font-bold text-neutral-500 uppercase tracking-widest">
                          Idempotency Signature
                        </span>
                        <p className="text-neutral-400 font-mono text-[9px] mt-1 truncate">
                          {idempotencyKeyRef.current}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="pt-4 border-t border-neutral-900 flex space-x-3 mt-6">
                  <button
                    type="button"
                    onClick={() => setStep(1)}
                    disabled={isSubmitting}
                    className="flex-1 rounded border border-neutral-900 bg-neutral-950 py-2.5 text-center text-xs font-bold uppercase tracking-wider text-neutral-500 hover:text-white transition-all cursor-pointer"
                  >
                    ← Edit Inputs
                  </button>
                  <button
                    type="button"
                    onClick={handleConfirmTransfer}
                    disabled={isSubmitting}
                    className="flex-1 flex justify-center items-center space-x-1.5 rounded bg-emerald-600 py-2.5 text-center text-xs font-bold uppercase tracking-wider text-white hover:bg-emerald-500 disabled:opacity-50 transition-all cursor-pointer shadow-md shadow-emerald-600/10"
                  >
                    {isSubmitting ? (
                      <Loader2 className="h-4 w-4 animate-spin text-white" />
                    ) : (
                      <ShieldCheck className="h-4 w-4 shrink-0 mr-1" />
                    )}
                    <span>{isSubmitting ? "Submitting..." : "Authorize Transfer"}</span>
                  </button>
                </div>
              </div>
            )}

            {/* STEP 3: SUBMIT PROGRESS & OUTCOME */}
            {step === 3 && (
              <div className="mt-6 flex-1 flex flex-col justify-center items-center py-8 text-center font-mono">
                {isSubmitting ? (
                  <div className="space-y-4">
                    <Loader2 className="h-10 w-10 animate-spin text-indigo-500 mx-auto" />
                    <h3 className="text-xs font-black uppercase text-white tracking-widest">
                      Routing Transfer to Payment Rail...
                    </h3>
                    <p className="text-[10px] text-neutral-500 max-w-xs leading-normal">
                      Initiating transfer with Paystack TEST mode provider adapter.
                    </p>
                  </div>
                ) : submitOutcome ? (
                  <div className="space-y-6 w-full">
                    {submitOutcome.status === "successful" ? (
                      <CheckCircle2 className="h-12 w-12 text-emerald-500 mx-auto animate-bounce" />
                    ) : submitOutcome.status === "failed" ? (
                      <AlertTriangle className="h-12 w-12 text-red-500 mx-auto" />
                    ) : (
                      <Clock className="h-12 w-12 text-amber-500 mx-auto animate-pulse" />
                    )}

                    <div className="space-y-1.5">
                      <h3 className="text-sm font-black uppercase text-white tracking-wider">
                        {submitOutcome.status === "successful"
                          ? "✓ Transfer Successful"
                          : submitOutcome.status === "failed"
                          ? "× Transfer Failed"
                          : "◌ Transfer Submitted (In Progress)"}
                      </h3>
                      <p className="text-[10px] text-neutral-500 max-w-sm mx-auto leading-relaxed">
                        Ricarut transfer identifier:{" "}
                        <span className="font-mono text-neutral-300 font-bold select-all">
                          {submitOutcome.id}
                        </span>
                      </p>
                    </div>

                    <div className="rounded border border-neutral-900 bg-neutral-950 p-4 text-left space-y-2.5 max-w-xs mx-auto text-[10px] font-bold">
                      <div className="flex justify-between">
                        <span className="text-neutral-600 uppercase">Transfer ID</span>
                        <span className="text-neutral-300 font-mono select-all">
                          {submitOutcome.id.slice(0, 16)}...
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-neutral-600 uppercase">Reference</span>
                        <span className="text-white font-mono select-all">
                          {submitOutcome.reference}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-neutral-600 uppercase">Status</span>
                        <span
                          className={`uppercase font-bold ${
                            submitOutcome.status === "successful"
                              ? "text-emerald-400"
                              : submitOutcome.status === "failed"
                              ? "text-red-400"
                              : "text-amber-400"
                          }`}
                        >
                          {submitOutcome.status}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-neutral-600 uppercase">Amount</span>
                        <span className="text-white font-black">
                          {formatMoney(submitOutcome.amount, submitOutcome.currency)}
                        </span>
                      </div>
                    </div>

                    <div className="pt-4 flex flex-col sm:flex-row justify-center gap-3">
                      <button
                        type="button"
                        onClick={() => navigate(`/projects/${projectId}/transfers/${submitOutcome.id}`)}
                        className="rounded border border-neutral-800 bg-neutral-900 hover:bg-neutral-800 text-white font-bold text-xs px-5 py-2.5 uppercase cursor-pointer"
                      >
                        Inspect Details
                      </button>
                      <button
                        type="button"
                        onClick={handleResetDrawerState}
                        className="rounded bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs px-5 py-2.5 uppercase cursor-pointer shadow-md shadow-indigo-600/10"
                      >
                        Create Another
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
