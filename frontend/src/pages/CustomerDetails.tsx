import React, { useEffect, useState } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { api } from "../lib/api";
import { formatMoney, formatDate } from "../utils/format";
import {
  Users,
  Wallet,
  ArrowLeft,
  Plus,
  X,
  AlertTriangle,
  Building,
  Calendar,
  Layers,
  Fingerprint,
  Mail,
  ShieldCheck,
  PlusCircle,
  RefreshCw,
  Copy,
  Check,
  Loader2,
  Terminal,
  Activity,
  UserCheck,
  UserMinus,
  CheckCircle2,
  ArrowUpRight
} from "lucide-react";

export const CustomerDetails: React.FC = () => {
  const { projectId, id: customerId } = useParams<{ projectId: string; id: string }>();
  const navigate = useNavigate();

  // Selected Tab state (Section 11 compliance)
  const [activeTab, setActiveTab] = useState<"overview" | "accounts" | "transactions">("overview");

  const [customer, setCustomer] = useState<any | null>(null);
  const [accounts, setAccounts] = useState<any[]>([]);
  const [transfers, setTransfers] = useState<any[]>([]);

  // Loader and error state management
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Clipboard copy state
  const [copied, setCopied] = useState(false);

  // Digital account issuance Modal form states (Section 13)
  const [isAccountModalOpen, setIsAccountModalOpen] = useState(false);
  const [accountName, setAccountName] = useState("");
  const [currency, setCurrency] = useState("NGN");
  const [isIssuing, setIsIssuing] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  // Status deactivation form states (Section 17)
  const [isDeactivating, setIsDeactivating] = useState(false);

  const handleCopyId = () => {
    if (!customerId) return;
    navigator.clipboard.writeText(customerId);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const loadCustomerData = async () => {
    if (!customerId || !projectId) return;
    setIsLoading(true);
    setError(null);
    try {
      // Load customer, customer accounts and customer transactions concurrently (Section 30)
      const [custRes, accRes, trfRes] = await Promise.all([
        api.get(`/api/v1/customers/${customerId}`, { headers: { "x-project-id": projectId } }),
        api.get("/api/v1/accounts", {
          params: { customerId },
          headers: { "x-project-id": projectId }
        }),
        api.get("/api/v1/transfers", {
          params: { customerId },
          headers: { "x-project-id": projectId }
        })
      ]);

      setCustomer(custRes.data.customer || custRes.data.data);
      setAccounts(accRes.data.accounts || accRes.data.data || []);
      
      const retrievedTransfers = trfRes.data.transfers || trfRes.data.data || [];
      // Enforce project boundary isolation (Section 21)
      const isolatedTransfers = retrievedTransfers.filter(
        (tx: any) => tx.projectId === projectId
      );
      setTransfers(isolatedTransfers);

    } catch (err: any) {
      console.error("Failed to load customer profile parameters", err);
      setError(err.message || "Failed to retrieve the profile or linked financial bank accounts.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadCustomerData();
  }, [customerId, projectId]);

  // Customer account provisioning (Section 13)
  const handleIssueAccount = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!accountName.trim()) {
      setFormError("Account name is required.");
      return;
    }

    setFormError(null);
    setIsIssuing(true);

    try {
      const payload = {
        customerId,
        currency,
        name: accountName.trim(),
      };

      await api.post("/api/v1/accounts", payload, {
        headers: { "x-project-id": projectId }
      });

      setIsAccountModalOpen(false);
      setAccountName("");
      setCurrency("NGN");

      // Reload accounts lists
      await loadCustomerData();
    } catch (err: any) {
      console.error("Failed to issue customer ledger account", err);
      setFormError(err.message || "Could not register ledger account.");
    } finally {
      setIsIssuing(false);
    }
  };

  // Customer status update - Toggle Active / Inactive (Section 15 & 17)
  const handleToggleCustomerStatus = async () => {
    if (!customer || !projectId) return;

    const nextStatus = customer.status === "active" ? "inactive" : "active";
    const promptMessage = nextStatus === "inactive"
      ? "Deactivate customer? This will prevent this customer from initiating future transactions or transfers."
      : "Activate customer? This profile will be enabled for future financial operations.";

    if (!window.confirm(promptMessage)) return;

    setIsDeactivating(true);
    try {
      const updated = await api.patch(
        `/api/v1/customers/${customerId}`,
        { status: nextStatus },
        { headers: { "x-project-id": projectId } }
      );

      setCustomer(updated.data.customer || updated.data.data);
      await loadCustomerData();
    } catch (err: any) {
      alert(err.message || "Could not alter active customer profile status.");
    } finally {
      setIsDeactivating(false);
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

  if (error || !customer) {
    return (
      <div className="rounded border border-red-950 bg-red-950/5 p-8 text-center max-w-md mx-auto font-mono text-left">
        <AlertTriangle className="mx-auto h-12 w-12 text-rose-500" />
        <h3 className="mt-4 text-xs font-black uppercase tracking-wider text-white">Failed to load profile</h3>
        <p className="mt-2 text-[10px] text-neutral-500 leading-relaxed font-semibold">{error}</p>
        <div className="mt-6 flex space-x-3">
          <button
            onClick={() => navigate(`/projects/${projectId}/customers`)}
            className="flex-1 rounded border border-neutral-900 bg-neutral-950 py-2 text-xs font-bold uppercase text-neutral-500 hover:text-white transition-all cursor-pointer"
          >
            Go Back
          </button>
          <button
            onClick={loadCustomerData}
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
            to={`/projects/${projectId}/customers`}
            className="flex h-8 w-8 items-center justify-center rounded border border-neutral-900 bg-neutral-950 text-neutral-500 hover:text-white transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
          </Link>
          <div>
            <h1 className="text-md font-black text-white uppercase tracking-wider">
              {customer.firstName} {customer.lastName}
            </h1>
            <p className="text-[9px] text-neutral-500 mt-1 select-all uppercase tracking-widest font-bold">
              ID: {customer.id}
            </p>
          </div>
        </div>

        <div className="flex space-x-2 shrink-0">
          <button
            onClick={handleToggleCustomerStatus}
            disabled={isDeactivating}
            className={`inline-flex items-center space-x-1.5 rounded border px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider transition-all cursor-pointer ${
              customer.status === "active"
                ? "border-red-900/40 bg-red-950/20 text-red-500 hover:bg-red-950/45"
                : "border-emerald-900/40 bg-emerald-950/20 text-emerald-500 hover:bg-emerald-950/45"
            }`}
          >
            {isDeactivating ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : customer.status === "active" ? (
              <>
                <UserMinus className="h-3.5 w-3.5" />
                <span>Deactivate customer</span>
              </>
            ) : (
              <>
                <UserCheck className="h-3.5 w-3.5" />
                <span>Activate customer</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* 2. Left / Right Grid breakdown */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        
        {/* Left Card: Core Credentials Overview */}
        <div className="lg:col-span-4 rounded-lg border border-neutral-900 bg-neutral-950/40 p-5 space-y-6">
          <div className="flex flex-col items-center text-center pb-5 border-b border-neutral-900/60">
            <div className="flex h-16 w-16 items-center justify-center rounded bg-indigo-950/60 border border-indigo-900/40 text-indigo-400 font-black text-2xl uppercase shadow-md select-none">
              {customer.firstName?.[0]}{customer.lastName?.[0]}
            </div>
            <h2 className="text-sm font-black text-white mt-3 uppercase tracking-tight">
              {customer.firstName} {customer.lastName}
            </h2>
            <div className="mt-2.5">
              <span className={`inline-flex items-center rounded border px-2.5 py-0.5 text-[8.5px] font-black uppercase tracking-wider leading-none ${
                customer.status === "active"
                  ? "border-emerald-900/40 bg-emerald-950/20 text-emerald-500"
                  : "border-red-900/40 bg-red-950/20 text-red-500"
              }`}>
                Profile {customer.status || "active"}
              </span>
            </div>
          </div>

          <div className="space-y-4 text-xs font-semibold">
            <div>
              <span className="block text-[8px] font-bold text-neutral-600 uppercase tracking-widest">Customer ID</span>
              <div className="mt-1 flex items-center justify-between font-mono text-[10px] text-neutral-300 bg-neutral-950 border border-neutral-900 rounded p-1.5 px-2 select-all">
                <span className="truncate pr-4">{customer.id}</span>
                <button onClick={handleCopyId} className="text-neutral-500 hover:text-white transition-colors cursor-pointer shrink-0">
                  {copied ? <Check className="h-3.5 w-3.5 text-emerald-500" /> : <Copy className="h-3.5 w-3.5" />}
                </button>
              </div>
            </div>

            <div>
              <span className="block text-[8px] font-bold text-neutral-600 uppercase tracking-widest">External System Ref</span>
              <span className="mt-1 block font-mono text-[10px] text-neutral-400 bg-neutral-950 border border-neutral-900 rounded p-1.5 px-2 select-all truncate">
                {customer.externalId || "N/A"}
              </span>
            </div>

            <div>
              <span className="block text-[8px] font-bold text-neutral-600 uppercase tracking-widest">Email Address</span>
              <span className="mt-1 block text-neutral-300 truncate">{customer.email}</span>
            </div>

            <div>
              <span className="block text-[8px] font-bold text-neutral-600 uppercase tracking-widest">Phone Number</span>
              <span className="mt-1 block text-neutral-300">{customer.phone || "N/A"}</span>
            </div>

            <div>
              <span className="block text-[8px] font-bold text-neutral-600 uppercase tracking-widest">Registered Date</span>
              <span className="mt-1 block text-neutral-300">{formatDate(customer.createdAt)}</span>
            </div>
          </div>
        </div>

        {/* Right Panel: Tabs, associated Accounts & Transaction Streams (Section 11) */}
        <div className="lg:col-span-8 space-y-6">
          
          {/* Tabs bar */}
          <div className="flex border-b border-neutral-900 text-xs">
            <button
              onClick={() => setActiveTab("overview")}
              className={`px-4 py-2.5 font-bold uppercase tracking-widest border-b-2 transition-colors cursor-pointer ${
                activeTab === "overview"
                  ? "border-indigo-500 text-indigo-400 font-black"
                  : "border-transparent text-neutral-500 hover:text-neutral-300"
              }`}
            >
              Overview
            </button>
            <button
              onClick={() => setActiveTab("accounts")}
              className={`px-4 py-2.5 font-bold uppercase tracking-widest border-b-2 transition-colors cursor-pointer ${
                activeTab === "accounts"
                  ? "border-indigo-500 text-indigo-400 font-black"
                  : "border-transparent text-neutral-500 hover:text-neutral-300"
              }`}
            >
              Accounts ({accounts.length})
            </button>
            <button
              onClick={() => setActiveTab("transactions")}
              className={`px-4 py-2.5 font-bold uppercase tracking-widest border-b-2 transition-colors cursor-pointer ${
                activeTab === "transactions"
                  ? "border-indigo-500 text-indigo-400 font-black"
                  : "border-transparent text-neutral-500 hover:text-neutral-300"
              }`}
            >
              Transactions ({transfers.length})
            </button>
          </div>

          {/* TAB 1: OVERVIEW PANEL */}
          {activeTab === "overview" && (
            <div className="rounded-lg border border-neutral-900 bg-neutral-950/40 p-5 space-y-5">
              <div className="border-b border-neutral-900/60 pb-3">
                <h4 className="text-xs font-bold text-white uppercase tracking-wider">Customer Overview Details</h4>
                <p className="text-[10px] text-neutral-500 font-semibold mt-1">Detailed double-entry ledger associations for this user</p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs font-semibold leading-relaxed">
                <div className="bg-neutral-950 border border-neutral-900/60 p-4 rounded">
                  <span className="block text-[8px] font-bold text-neutral-600 uppercase tracking-widest">Active Accounts</span>
                  <p className="mt-1 text-base font-black text-white">{accounts.length} Wallets</p>
                </div>
                <div className="bg-neutral-950 border border-neutral-900/60 p-4 rounded">
                  <span className="block text-[8px] font-bold text-neutral-600 uppercase tracking-widest">Volume Processed</span>
                  <p className="mt-1 text-base font-black text-indigo-400">
                    {formatMoney(
                      transfers.reduce((acc, curr) => acc + (curr.amount || 0), 0),
                      "NGN"
                    )}
                  </p>
                </div>
              </div>

              {customer.metadata && Object.keys(customer.metadata).length > 0 && (
                <div className="space-y-2">
                  <span className="block text-[8px] font-bold text-neutral-600 uppercase tracking-widest">Profile Metadata Payload</span>
                  <pre className="block p-3 rounded bg-neutral-950 border border-neutral-900 font-mono text-[10px] text-neutral-400 overflow-x-auto select-text leading-relaxed">
                    {JSON.stringify(customer.metadata, null, 2)}
                  </pre>
                </div>
              )}
            </div>
          )}

          {/* TAB 2: ACCOUNTS PANEL */}
          {activeTab === "accounts" && (
            <div className="space-y-4">
              <div className="flex justify-between items-center bg-neutral-950/20 border border-neutral-900 rounded p-3 px-4">
                <span className="text-[10px] font-bold text-neutral-500 uppercase tracking-widest">Linked Wallet Accounts</span>
                <button
                  onClick={() => {
                    setFormError(null);
                    setIsAccountModalOpen(true);
                  }}
                  className="rounded border border-indigo-900/30 bg-indigo-950/20 hover:bg-indigo-950/40 text-indigo-400 px-3 py-1 text-[10px] font-bold uppercase tracking-wider flex items-center space-x-1 cursor-pointer transition-colors"
                >
                  <PlusCircle className="h-3.5 w-3.5" />
                  <span>Issue Account</span>
                </button>
              </div>

              {accounts.length === 0 ? (
                <div className="rounded-lg border border-dashed border-neutral-900 bg-neutral-950/10 p-12 text-center">
                  <Wallet className="mx-auto h-12 w-12 text-neutral-800 animate-pulse" />
                  <h3 className="mt-4 text-xs font-black uppercase text-neutral-400 tracking-widest">No accounts linked</h3>
                  <p className="mt-2 text-[10px] text-neutral-500 font-medium max-w-sm mx-auto leading-relaxed">
                    This customer does not have any financial currency wallets assigned. Issue an account to start double-entry ledger settlements.
                  </p>
                  <button
                    onClick={() => setIsAccountModalOpen(true)}
                    className="mt-6 rounded bg-indigo-600 px-4 py-2 text-xs font-bold uppercase tracking-wider text-white hover:bg-indigo-500 transition-all cursor-pointer"
                  >
                    Issue First Account
                  </button>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {accounts.map((acc) => (
                    <div
                      key={acc.id}
                      className="rounded-lg border border-neutral-900 bg-neutral-950/40 p-4 space-y-4 flex flex-col justify-between"
                    >
                      <div className="space-y-3">
                        <div className="flex items-center justify-between border-b border-neutral-900/60 pb-2.5">
                          <div>
                            <h4 className="font-bold text-white text-xs uppercase tracking-tight">{acc.name}</h4>
                            <p className="font-mono text-[9px] text-neutral-600 mt-1 select-all">ID: {acc.id}</p>
                          </div>
                          <span className={`inline-flex items-center rounded border px-1.5 py-0.5 text-[7.5px] font-black uppercase tracking-wider leading-none ${
                            acc.status === "active"
                              ? "border-emerald-900/40 bg-emerald-950/20 text-emerald-500"
                              : "border-neutral-800 bg-neutral-950 text-neutral-500"
                          }`}>
                            {acc.status}
                          </span>
                        </div>

                        <div className="grid grid-cols-2 gap-2 text-xs pt-1">
                          <div>
                            <p className="text-[8px] font-bold text-neutral-600 uppercase tracking-widest">Booked Balance</p>
                            <p className="font-black text-white mt-1">{formatMoney(acc.balance, acc.currency)}</p>
                          </div>
                          <div>
                            <p className="text-[8px] font-bold text-neutral-600 uppercase tracking-widest">Available Balance</p>
                            <p className="font-black text-neutral-400 mt-1">{formatMoney(acc.available, acc.currency)}</p>
                          </div>
                        </div>
                      </div>

                      <div className="mt-4 pt-2.5 border-t border-neutral-900/60 flex items-center justify-between text-[10px] font-semibold text-neutral-500">
                        <span className="font-bold uppercase tracking-wider">{acc.currency} Denomination</span>
                        <Link
                          to={`/projects/${projectId}/accounts/${acc.id}`}
                          className="text-indigo-400 hover:text-white uppercase transition-colors text-[9px] font-black tracking-widest"
                        >
                          Audit Explorer →
                        </Link>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* TAB 3: TRANSACTIONS PANEL */}
          {activeTab === "transactions" && (
            <div className="rounded-lg border border-neutral-900 bg-neutral-950/40 p-5 space-y-4">
              <div className="pb-3 border-b border-neutral-900/60">
                <h4 className="text-xs font-bold text-white uppercase tracking-wider">Associated Transactions</h4>
                <p className="text-[10px] text-neutral-500 mt-1">Simulated Double-entry transactions mapped against customer accounts</p>
              </div>

              {transfers.length === 0 ? (
                <div className="py-8 text-center space-y-1">
                  <p className="text-xs text-neutral-500 font-bold">No transactions yet.</p>
                  <p className="text-[10px] text-neutral-600 font-semibold">Initiate a payment transfer using this customer's account to view transactions here.</p>
                </div>
              ) : (
                <div className="overflow-x-auto select-none">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="border-b border-neutral-900/60 text-[8px] text-neutral-500 uppercase tracking-wider font-bold">
                        <th className="py-2">Transaction ID</th>
                        <th className="py-2">Type</th>
                        <th className="py-2">Amount</th>
                        <th className="py-2">Currency</th>
                        <th className="py-2">Status</th>
                        <th className="py-2 text-right">Created</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-neutral-900/20 font-mono text-[10.5px] text-neutral-300">
                      {transfers.map((tx) => (
                        <tr
                          key={tx.id}
                          onClick={() => navigate(`/projects/${projectId}/transfers/${tx.id}`)}
                          className="hover:bg-neutral-950/30 cursor-pointer transition-colors"
                        >
                          <td className="py-2.5 font-bold text-neutral-300 truncate max-w-[80px]">
                            {tx.id.substring(0, 10)}...
                          </td>
                          <td className="py-2.5 text-neutral-500 capitalize">{tx.type}</td>
                          <td className="py-2.5 font-bold text-white">
                            {formatMoney(tx.amount, tx.currency)}
                          </td>
                          <td className="py-2.5 text-neutral-500">{tx.currency}</td>
                          <td className="py-2.5">
                            <span className={`inline-block px-1.5 py-0.5 rounded text-[8px] font-bold uppercase tracking-wider border ${
                              tx.status === "successful" || tx.status === "completed"
                                ? "border-emerald-900/40 bg-emerald-950/20 text-emerald-500"
                                : "border-neutral-800 bg-neutral-900 text-neutral-500"
                            }`}>
                              {tx.status}
                            </span>
                          </td>
                          <td className="py-2.5 text-right text-neutral-600">{formatDate(tx.createdAt)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

        </div>

      </div>

      {/* Account Creation Modal Dialog */}
      {isAccountModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center font-mono">
          <div
            onClick={() => setIsAccountModalOpen(false)}
            className="fixed inset-0 bg-black/60 backdrop-blur-xs transition-all"
          />

          <div className="relative flex w-full max-w-sm flex-col bg-neutral-950 border border-neutral-900 p-6 rounded-lg shadow-2xl z-10 text-left">
            <div className="absolute right-4 top-4">
              <button
                onClick={() => setIsAccountModalOpen(false)}
                className="text-neutral-600 hover:text-white transition-colors cursor-pointer"
                aria-label="Close form"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="flex items-center space-x-2.5 pb-4 border-b border-neutral-900">
              <div className="flex h-8 w-8 items-center justify-center rounded bg-indigo-600 text-white font-black">
                <Wallet className="h-4.5 w-4.5" />
              </div>
              <h2 className="text-sm font-black uppercase text-white tracking-wider">Issue Account</h2>
            </div>

            {formError && (
              <div className="mt-4 flex items-start space-x-2 rounded border border-red-950 bg-red-950/10 p-3 text-red-200/90 leading-relaxed text-[11px] font-semibold">
                <AlertTriangle className="h-4 w-4 text-red-500 shrink-0 mt-0.5" />
                <p className="leading-snug">{formError}</p>
              </div>
            )}

            <form onSubmit={handleIssueAccount} className="mt-5 space-y-4">
              <div>
                <label className="block text-[9px] font-bold text-neutral-500 uppercase tracking-widest">
                  Account Name Description *
                </label>
                <input
                  type="text"
                  required
                  value={accountName}
                  onChange={(e) => setAccountName(e.target.value)}
                  placeholder="e.g. John Savings NGN Wallet"
                  className="mt-1.5 block w-full rounded border border-neutral-900 bg-neutral-950 px-3 py-2 text-xs text-white placeholder:text-neutral-700 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 transition-all"
                />
              </div>

              <div>
                <label className="block text-[9px] font-bold text-neutral-500 uppercase tracking-widest">
                  Denomination Currency *
                </label>
                <select
                  value={currency}
                  onChange={(e) => setCurrency(e.target.value)}
                  className="mt-1.5 block w-full rounded border border-neutral-900 bg-neutral-950 px-3 py-2 text-xs text-white focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 transition-all font-bold uppercase tracking-wider"
                >
                  <option value="NGN">NGN (Nigerian Naira - ₦)</option>
                  <option value="USD">USD (US Dollar - $)</option>
                </select>
              </div>

              <div className="pt-4 border-t border-neutral-900 flex space-x-3 mt-6">
                <button
                  type="button"
                  onClick={() => setIsAccountModalOpen(false)}
                  className="flex-1 rounded border border-neutral-900 bg-neutral-950 py-2.5 text-center text-xs font-bold uppercase tracking-wider text-neutral-500 hover:text-white transition-all cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isIssuing}
                  className="flex-1 flex justify-center items-center space-x-1.5 rounded bg-indigo-600 py-2.5 text-center text-xs font-bold uppercase tracking-wider text-white hover:bg-indigo-500 transition-all disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                >
                  {isIssuing ? (
                    <>
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      <span>Issuing...</span>
                    </>
                  ) : (
                    <span>Issue wallet</span>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};

export default CustomerDetails;
