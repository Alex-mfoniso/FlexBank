import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../lib/api";
import { useApp } from "../context/AppContext";
import { formatMoney } from "../utils/format";
import { StatusBadge } from "../components/StatusBadge";
import { SkeletonLoader } from "../components/SkeletonLoader";
import {
  ArrowUpRight,
  Plus,
  Search,
  X,
  AlertTriangle,
  RefreshCw,
  ShieldCheck,
  CheckCircle,
  Info,
  ArrowRight,
} from "lucide-react";

export const Transfers: React.FC = () => {
  const { selectedProjectId } = useApp();

  const [transfers, setTransfers] = useState<any[]>([]);
  const [accounts, setAccounts] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [typeFilter, setTypeFilter] = useState("all");
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Multi-step Drawer Form States
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [step, setStep] = useState(1); // 1 = Input, 2 = Confirm, 3 = Loading/Outcome
  const [transferType, setTransferType] = useState<"internal" | "external">("internal");
  const [sourceAccountId, setSourceAccountId] = useState("");
  const [destinationAccountId, setDestinationAccountId] = useState("");
  
  // Beneficiary form details for external payout
  const [bankCode, setBankCode] = useState("");
  const [accountNumber, setAccountNumber] = useState("");
  const [beneficiaryName, setBeneficiaryName] = useState("");

  const [amountStr, setAmountStr] = useState(""); // Inputted in major unit (e.g., "5000.50")
  const [reference, setReference] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [submitOutcome, setSubmitOutcome] = useState<any | null>(null);

  // Derived information for Step 2 (Confirmation)
  const activeSourceAcc = accounts.find((a) => a.id === sourceAccountId);
  const activeDestAcc = accounts.find((a) => a.id === destinationAccountId);

  const fetchTransfersAndAccounts = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const [transRes, accRes] = await Promise.all([
        api.get("/api/v1/transfers"),
        api.get("/api/v1/accounts"),
      ]);

      setTransfers(transRes.data.transfers || transRes.data.data || []);
      
      const accList = accRes.data.accounts || accRes.data.data || [];
      setAccounts(accList);
      
      if (accList.length > 0) {
        setSourceAccountId(accList[0].id);
      }
    } catch (err: any) {
      console.error("Failed to load transfers records", err);
      setError(err.message || "Failed to retrieve payment records.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (selectedProjectId) {
      fetchTransfersAndAccounts();
    }
  }, [selectedProjectId]);

  const handleNextToConfirm = (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    const val = parseFloat(amountStr);
    if (isNaN(val) || val <= 0) {
      setFormError("Please enter a valid positive transfer amount.");
      return;
    }

    if (transferType === "internal" && !destinationAccountId) {
      setFormError("Please select a destination account for this internal wallet transfer.");
      return;
    }

    if (transferType === "internal" && sourceAccountId === destinationAccountId) {
      setFormError("Source account and destination account cannot be the identical wallet.");
      return;
    }

    if (transferType === "external" && (!bankCode || !accountNumber || !beneficiaryName)) {
      setFormError("Please fill in all beneficiary bank details for this external payout.");
      return;
    }

    // Input validations passed, move to confirmation overview!
    setStep(2);
  };

  const handleAuthorizeTransfer = async () => {
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
      reference,
    };

    if (transferType === "internal") {
      payload.destinationAccountId = destinationAccountId;
    } else {
      payload.beneficiary = {
        type: "bank_account",
        bankCode,
        accountNumber,
        accountName: beneficiaryName,
      };
    }

    try {
      const response = await api.post("/api/v1/transfers", payload);
      setSubmitOutcome(response.data.transfer || response.data.data);
      await fetchTransfersAndAccounts();
    } catch (err: any) {
      console.error("Transfer settlement failed", err);
      setFormError(err.message || "Transaction authorization rejected.");
      setStep(1); // Drop back down to inputs for edits
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleResetDrawer = () => {
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

  // Filter transfers lists
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
      tx.beneficiary?.name?.toLowerCase().includes(term)
    );
  });

  return (
    <div className="space-y-6">
      
      {/* Upper toolbar */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center pb-5 border-b border-slate-200">
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight text-slate-900">Payment Transfers</h1>
          <p className="text-xs text-slate-500 font-semibold mt-1">
            Initiate, confirm, and audit internal ledger wallet movements or external bank payouts.
          </p>
        </div>
        <button
          onClick={() => {
            setFormError(null);
            setStep(1);
            setIsDrawerOpen(true);
          }}
          className="mt-4 sm:mt-0 flex items-center space-x-1.5 rounded-lg bg-indigo-600 px-4 py-2 text-xs font-bold text-white hover:bg-indigo-500 shadow-xs transition-all"
        >
          <Plus className="h-4 w-4" />
          <span>New Transfer</span>
        </button>
      </div>

      {/* Lists filters */}
      {transfers.length > 0 && (
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-2.5 h-4.5 w-4.5 text-slate-400" />
            <input
              type="text"
              placeholder="Search by transfer reference, ID, or accounts..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="block w-full rounded-lg border border-slate-200 bg-white pl-10 pr-4 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 transition-all"
            />
          </div>
          
          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700 focus:border-indigo-500 focus:outline-none transition-all"
          >
            <option value="all">All Types</option>
            <option value="internal">Internal Wallet-to-Wallet</option>
            <option value="external">External Bank Payouts</option>
          </select>
        </div>
      )}

      {/* Core transfer listings display */}
      {isLoading ? (
        <SkeletonLoader rows={4} columns={6} />
      ) : error ? (
        <div className="rounded-xl border border-red-200 bg-red-50 p-6 text-center shadow-xs">
          <AlertTriangle className="mx-auto h-12 w-12 text-red-500" />
          <h3 className="mt-4 text-sm font-bold text-slate-900">Failed to load transfers</h3>
          <p className="mt-2 text-xs text-slate-500 max-w-sm mx-auto leading-relaxed">{error}</p>
          <button
            onClick={fetchTransfersAndAccounts}
            className="mt-4 rounded bg-slate-900 px-3 py-1.5 text-xs font-semibold text-white hover:bg-slate-800"
          >
            Retry
          </button>
        </div>
      ) : transfers.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-12 text-center shadow-xs">
          <ArrowUpRight className="mx-auto h-12 w-12 text-slate-300" />
          <h3 className="mt-4 text-sm font-bold text-slate-900">No transfers executed yet</h3>
          <p className="mt-2 text-xs text-slate-500 max-w-md mx-auto leading-relaxed">
            Payment orchestration initiates double-entry ledger journals across asset and liability ledgers.
          </p>
          <button
            onClick={() => setIsDrawerOpen(true)}
            className="mt-6 rounded-lg bg-indigo-600 px-4 py-2 text-xs font-bold text-white hover:bg-indigo-500 shadow-sm"
          >
            Initiate First Transfer
          </button>
        </div>
      ) : filteredTransfers.length === 0 ? (
        <div className="rounded-xl border border-slate-200 bg-white p-12 text-center shadow-xs">
          <Search className="mx-auto h-12 w-12 text-slate-300" />
          <h3 className="mt-4 text-sm font-bold text-slate-900">No matches found</h3>
          <p className="mt-2 text-xs text-slate-500">
            No transfers match the active search criteria query.
          </p>
        </div>
      ) : (
        <div className="border border-slate-200 rounded-xl bg-white overflow-hidden shadow-xs">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-sm">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-slate-400 font-semibold text-xs uppercase tracking-wider">
                  <th className="px-6 py-3.5">Reference / Reference Key</th>
                  <th className="px-6 py-3.5">Type</th>
                  <th className="px-6 py-3.5">Source Ledger Wallet</th>
                  <th className="px-6 py-3.5">Destination Details</th>
                  <th className="px-6 py-3.5">Amount Settled</th>
                  <th className="px-6 py-3.5">Settlement Status</th>
                  <th className="px-6 py-3.5 text-right">Details</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium">
                {filteredTransfers.map((tx) => (
                  <tr key={tx.id} className="hover:bg-slate-50/50 transition-colors">
                    <td className="px-6 py-4 font-bold text-slate-900">
                      <div>
                        <span>{tx.reference}</span>
                        <span className="font-mono text-[10px] text-slate-400 select-all block mt-0.5">{tx.id}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-slate-500 uppercase text-xs font-bold">
                      {tx.type}
                    </td>
                    <td className="px-6 py-4 text-slate-700 text-xs font-semibold">
                      {tx.sourceAccount ? (
                        <div>
                          <span className="block font-bold text-slate-800">{tx.sourceAccount.name}</span>
                          <span className="font-mono text-[10px] text-slate-400">{tx.sourceAccount.id}</span>
                        </div>
                      ) : (
                        <span className="text-slate-400">Platform Core</span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-slate-700 text-xs font-semibold">
                      {tx.type === "internal" ? (
                        tx.destinationAccount ? (
                          <div>
                            <span className="block font-bold text-indigo-700">{tx.destinationAccount.name}</span>
                            <span className="font-mono text-[10px] text-slate-400">{tx.destinationAccount.id}</span>
                          </div>
                        ) : (
                          <span className="text-slate-400">Unknown Destination</span>
                        )
                      ) : tx.beneficiary ? (
                        <div>
                          <span className="block font-bold text-slate-900">{tx.beneficiary.name}</span>
                          <span className="text-[10px] text-slate-500">{tx.beneficiary.bankCode} • Acct: {tx.beneficiary.accountNumber}</span>
                        </div>
                      ) : (
                        <span className="text-slate-400">N/A</span>
                      )}
                    </td>
                    <td className="px-6 py-4 font-bold text-slate-950">{formatMoney(tx.amount, tx.currency)}</td>
                    <td className="px-6 py-4">
                      <StatusBadge status={tx.status} />
                    </td>
                    <td className="px-6 py-4 text-right">
                      <Link
                        to={`/projects/${tx.projectId}/transfers/${tx.id}`}
                        className="inline-flex items-center space-x-1 text-xs font-bold text-indigo-600 hover:text-indigo-800 transition-colors"
                      >
                        <span>Inspect</span>
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

      {/* Multi-step Sliding Drawer Overlay */}
      {isDrawerOpen && (
        <div className="fixed inset-0 z-50 flex justify-end">
          <div onClick={handleResetDrawer} className="fixed inset-0 bg-black/40 backdrop-blur-xs" />

          <div className="relative flex w-full max-w-lg flex-col bg-white p-6 shadow-xl ring-1 ring-black/10 h-full overflow-y-auto">
            {/* Drawer Header details */}
            <div className="flex items-center justify-between pb-4 border-b border-slate-100">
              <h2 className="text-base font-bold text-slate-900 flex items-center space-x-2">
                <ArrowUpRight className="h-5 w-5 text-indigo-600" />
                <span>Initiate Financial Transfer - Step {step} of 3</span>
              </h2>
              <button onClick={handleResetDrawer} className="text-slate-400 hover:text-slate-600">
                <X className="h-5 w-5" />
              </button>
            </div>

            {formError && step !== 3 && (
              <div className="mt-4 flex items-start space-x-2.5 rounded-lg bg-red-50 p-3 border border-red-200 text-red-800">
                <AlertTriangle className="h-4 w-4 text-red-500 shrink-0 mt-0.5" />
                <p className="text-xs font-semibold leading-normal">{formError}</p>
              </div>
            )}

            {/* Step 1: Input form fields */}
            {step === 1 && (
              <form onSubmit={handleNextToConfirm} className="mt-6 space-y-4 flex-1">
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider">
                    Orchestration Settlement Type
                  </label>
                  <div className="mt-1.5 grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        setTransferType("internal");
                        setFormError(null);
                      }}
                      className={`rounded-lg py-2.5 text-xs font-bold uppercase tracking-wider border transition-all ${
                        transferType === "internal"
                          ? "bg-indigo-50 text-indigo-700 border-indigo-300 shadow-xs"
                          : "bg-white text-slate-500 border-slate-200 hover:bg-slate-50"
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
                      className={`rounded-lg py-2.5 text-xs font-bold uppercase tracking-wider border transition-all ${
                        transferType === "external"
                          ? "bg-indigo-50 text-indigo-700 border-indigo-300 shadow-xs"
                          : "bg-white text-slate-500 border-slate-200 hover:bg-slate-50"
                      }`}
                    >
                      External Payout (Provider network)
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider">
                    Source Account Wallet
                  </label>
                  {accounts.length === 0 ? (
                    <p className="text-xs text-rose-500 font-bold mt-1.5">No financial wallets available.</p>
                  ) : (
                    <select
                      value={sourceAccountId}
                      onChange={(e) => {
                        setSourceAccountId(e.target.value);
                        setFormError(null);
                      }}
                      className="mt-1.5 block w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 transition-all font-semibold"
                    >
                      {accounts.map((acc) => (
                        <option key={acc.id} value={acc.id}>
                          {acc.name} ({acc.currency}) • Avail: {formatMoney(acc.available, acc.currency)}
                        </option>
                      ))}
                    </select>
                  )}
                </div>

                {transferType === "internal" ? (
                  <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider">
                      Destination Account Wallet *
                    </label>
                    <select
                      value={destinationAccountId}
                      required
                      onChange={(e) => {
                        setDestinationAccountId(e.target.value);
                        setFormError(null);
                      }}
                      className="mt-1.5 block w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 transition-all font-semibold"
                    >
                      <option value="">-- Select Destination Account --</option>
                      {accounts.map((acc) => (
                        <option key={acc.id} value={acc.id}>
                          {acc.name} ({acc.currency}) • Owner ID: {acc.customerId}
                        </option>
                      ))}
                    </select>
                  </div>
                ) : (
                  <div className="space-y-4 rounded-lg bg-slate-50 p-4 border border-slate-100">
                    <span className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                      Beneficiary digital bank details
                    </span>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-[11px] font-bold text-slate-500 uppercase">
                          Bank Code *
                        </label>
                        <input
                          type="text"
                          required
                          value={bankCode}
                          onChange={(e) => setBankCode(e.target.value)}
                          placeholder="e.g. 011"
                          className="mt-1 block w-full rounded-md border border-slate-300 bg-white px-3 py-1.5 text-xs text-slate-900 focus:border-indigo-500 focus:outline-none focus:ring-1"
                        />
                      </div>
                      <div>
                        <label className="block text-[11px] font-bold text-slate-500 uppercase">
                          Account Number *
                        </label>
                        <input
                          type="text"
                          required
                          value={accountNumber}
                          onChange={(e) => setAccountNumber(e.target.value)}
                          placeholder="e.g. 1022045618"
                          className="mt-1 block w-full rounded-md border border-slate-300 bg-white px-3 py-1.5 text-xs text-slate-900 focus:border-indigo-500 focus:outline-none focus:ring-1"
                        />
                      </div>
                    </div>
                    <div>
                      <label className="block text-[11px] font-bold text-slate-500 uppercase">
                        Beneficiary Legal Name *
                      </label>
                      <input
                        type="text"
                        required
                        value={beneficiaryName}
                        onChange={(e) => setBeneficiaryName(e.target.value)}
                        placeholder="e.g. Alex Miller Ltd"
                        className="mt-1 block w-full rounded-md border border-slate-300 bg-white px-3 py-1.5 text-xs text-slate-900 focus:border-indigo-500 focus:outline-none focus:ring-1"
                      />
                    </div>
                  </div>
                )}

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider">
                      Amount (Major Unit) *
                    </label>
                    <div className="relative mt-1.5 rounded-lg shadow-sm">
                      <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                        <span className="text-slate-400 text-xs font-bold uppercase">{activeSourceAcc?.currency || "NGN"}</span>
                      </div>
                      <input
                        type="number"
                        step="0.01"
                        required
                        value={amountStr}
                        onChange={(e) => setAmountStr(e.target.value)}
                        placeholder="0.00"
                        className="block w-full rounded-lg border border-slate-300 bg-white pl-12 pr-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 transition-all font-bold"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider">
                      Reference Key *
                    </label>
                    <input
                      type="text"
                      required
                      value={reference}
                      onChange={(e) => setReference(e.target.value)}
                      placeholder="e.g. tx_invoice_1020"
                      className="mt-1.5 block w-full rounded-lg border border-slate-300 bg-white px-3.5 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 transition-all"
                    />
                  </div>
                </div>

                <div className="pt-6 border-t border-slate-100 flex space-x-3 mt-auto">
                  <button
                    type="button"
                    onClick={handleResetDrawer}
                    className="flex-1 rounded-lg border border-slate-200 px-4 py-2.5 text-center text-sm font-semibold text-slate-700 hover:bg-slate-50 transition-all"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="flex-1 rounded-lg bg-indigo-600 px-4 py-2.5 text-center text-sm font-semibold text-white shadow-xs hover:bg-indigo-500 transition-all"
                  >
                    Confirm Review →
                  </button>
                </div>
              </form>
            )}

            {/* Step 2: Multi-step Confirmation Overview Card (Section 6 recommendation!) */}
            {step === 2 && activeSourceAcc && (
              <div className="mt-6 flex-1 flex flex-col justify-between">
                <div className="space-y-6">
                  <div className="flex items-start space-x-2 rounded-lg bg-indigo-50 p-3.5 border border-indigo-100 text-indigo-800 text-xs leading-relaxed">
                    <Info className="h-4.5 w-4.5 text-indigo-500 shrink-0 mt-0.5" />
                    <span>
                      Please review the final double-entry transfer values before execution. Authorization instantly moves ledger balances.
                    </span>
                  </div>

                  {/* Summary Card Details */}
                  <div className="rounded-xl border border-slate-200 bg-slate-50 p-5 space-y-4">
                    <div className="grid grid-cols-2 gap-x-2 gap-y-4 text-xs font-semibold">
                      <div>
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Source Wallet</p>
                        <p className="text-slate-800 font-bold mt-1 text-sm truncate">{activeSourceAcc.name}</p>
                        <span className="font-mono text-[10px] text-slate-400 select-all">{activeSourceAcc.id}</span>
                      </div>

                      <div>
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Destination / Beneficiary</p>
                        {transferType === "internal" && activeDestAcc ? (
                          <>
                            <p className="text-indigo-700 font-bold mt-1 text-sm truncate">{activeDestAcc.name}</p>
                            <span className="font-mono text-[10px] text-slate-400 select-all">{activeDestAcc.id}</span>
                          </>
                        ) : (
                          <>
                            <p className="text-slate-800 font-bold mt-1 text-sm truncate">{beneficiaryName}</p>
                            <span className="text-[10px] text-slate-500">{bankCode} • Acct: {accountNumber}</span>
                          </>
                        )}
                      </div>

                      <div className="col-span-2 border-t border-slate-200 pt-3">
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Transaction Amount</p>
                        <p className="text-2xl font-extrabold text-slate-950 mt-1">
                          {formatMoney(parseFloat(amountStr) * 100, activeSourceAcc.currency)}
                        </p>
                        <p className="text-[10px] text-slate-400 font-mono mt-0.5">
                          Equivalent value in minor units: {Math.round(parseFloat(amountStr) * 100)} unit codes.
                        </p>
                      </div>

                      <div className="col-span-2 border-t border-slate-200 pt-3">
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Reference Description</p>
                        <p className="text-slate-700 font-mono text-xs mt-1 bg-white p-2 rounded border border-slate-200 select-all">{reference}</p>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="pt-6 border-t border-slate-100 flex space-x-3 mt-10">
                  <button
                    type="button"
                    onClick={() => setStep(1)}
                    className="flex-1 rounded-lg border border-slate-200 px-4 py-2.5 text-center text-sm font-semibold text-slate-700 hover:bg-slate-50 transition-all"
                  >
                    ← Edit Inputs
                  </button>
                  <button
                    type="button"
                    onClick={handleAuthorizeTransfer}
                    className="flex-1 flex justify-center items-center space-x-1 rounded-lg bg-emerald-600 px-4 py-2.5 text-center text-sm font-bold text-white shadow-xs hover:bg-emerald-500 focus:outline-none transition-all"
                  >
                    <ShieldCheck className="h-4.5 w-4.5 mr-1" />
                    <span>Authorize Settlement</span>
                  </button>
                </div>
              </div>
            )}

            {/* Step 3: Processing & Outcome Spinner */}
            {step === 3 && (
              <div className="mt-6 flex-1 flex flex-col justify-center items-center py-12 text-center">
                {isSubmitting ? (
                  <div className="space-y-4">
                    <RefreshCw className="h-12 w-12 animate-spin text-indigo-500 mx-auto" />
                    <h3 className="text-md font-bold text-slate-900">Authorizing Settlement...</h3>
                    <p className="text-xs text-slate-500 max-w-xs leading-normal">
                      Orchestrating double-entry ledger allocations and pushing payment hooks asynchronously...
                    </p>
                  </div>
                ) : submitOutcome ? (
                  <div className="space-y-6">
                    <CheckCircle className="h-16 w-16 text-emerald-500 mx-auto" />
                    <div className="space-y-2">
                      <h3 className="text-lg font-extrabold text-slate-950">Transfer Authorized Successfully</h3>
                      <p className="text-xs text-slate-500 max-w-sm leading-relaxed">
                        Ledger entries posted! Transfer has been initiated with reference ID <b className="font-mono text-slate-800 select-all">{submitOutcome.id}</b>.
                      </p>
                    </div>

                    <div className="rounded-lg bg-slate-50 p-4 border border-slate-100 text-left space-y-2 max-w-xs mx-auto text-xs font-medium">
                      <div className="flex justify-between">
                        <span className="text-slate-400">Status</span>
                        <StatusBadge status={submitOutcome.status} />
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-400">Amount</span>
                        <span className="font-bold text-slate-900">{formatMoney(submitOutcome.amount, submitOutcome.currency)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-400">Environment</span>
                        <span className="uppercase text-amber-600 font-bold font-mono text-[10px]">{submitOutcome.projectId ? "test-mode" : ""}</span>
                      </div>
                    </div>

                    <div className="pt-6">
                      <button
                        type="button"
                        onClick={handleResetDrawer}
                        className="rounded-lg bg-slate-900 hover:bg-slate-800 text-white font-semibold text-xs px-6 py-2.5 shadow-sm transition-all"
                      >
                        Close Portal
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
