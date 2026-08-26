import React, { useEffect, useState } from "react";
import { Link, useParams, useSearchParams } from "react-router-dom";
import { api } from "../lib/api";
import { formatMoney, formatDate } from "../utils/format";
import {
  Wallet,
  Search,
  Plus,
  ArrowRight,
  AlertTriangle,
  Coins,
  ShieldCheck,
  X,
  User,
  Loader2,
  Check,
  Copy,
  ChevronRight,
  RefreshCw,
  SlidersHorizontal,
  Info
} from "lucide-react";

export const Accounts: React.FC = () => {
  const { projectId } = useParams<{ projectId: string }>();
  const [searchParams, setSearchParams] = useSearchParams();

  // URL state persistence (Section 22 compliance)
  const initialSearch = searchParams.get("search") || "";
  const [searchQuery, setSearchQuery] = useState(initialSearch);
  const [statusFilter, setStatusFilter] = useState("all");

  const [accounts, setAccounts] = useState<any[]>([]);
  const [customers, setCustomers] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Account creation modal form states
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedCustomerId, setSelectedCustomerId] = useState("");
  const [customerSearchQuery, setCustomerSearchQuery] = useState("");
  const [accountName, setAccountName] = useState("");
  const [currency, setCurrency] = useState("NGN");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Clipboard copy state
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const handleCopy = (id: string) => {
    navigator.clipboard.writeText(id);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const fetchAccountsAndCustomers = async () => {
    if (!projectId) return;
    setIsLoading(true);
    setError(null);
    try {
      // Authoritative project isolation (Section 25)
      const [accRes, custRes] = await Promise.all([
        api.get("/api/v1/accounts", { headers: { "x-project-id": projectId } }),
        api.get("/api/v1/customers", { headers: { "x-project-id": projectId } })
      ]);

      setAccounts(accRes.data.accounts || accRes.data.data || []);
      setCustomers(custRes.data.customers || custRes.data.data || []);
    } catch (err: any) {
      console.error("Failed to load accounts metadata", err);
      setError(err.message || "Failed to retrieve the workspace financial ledger accounts.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchAccountsAndCustomers();
  }, [projectId]);

  // Synchronize URL search params (Section 22)
  useEffect(() => {
    if (searchQuery.trim()) {
      setSearchParams({ search: searchQuery });
    } else {
      searchParams.delete("search");
      setSearchParams(searchParams);
    }
  }, [searchQuery]);

  const handleCreateAccount = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    setSuccessMessage(null);

    // Form client-side validation
    if (!selectedCustomerId) {
      setFormError("You must select an account owner customer profile (Section 7).");
      return;
    }
    if (!accountName.trim()) {
      setFormError("Please enter a custom account description name.");
      return;
    }

    setIsSubmitting(true); // Disable buttons immediately to prevent duplicate submissions (Section 8)

    try {
      const payload = {
        customerId: selectedCustomerId,
        currency,
        name: accountName.trim(),
      };

      await api.post("/api/v1/accounts", payload, {
        headers: { "x-project-id": projectId }
      });

      setIsModalOpen(false);
      setSelectedCustomerId("");
      setCustomerSearchQuery("");
      setAccountName("");
      setCurrency("NGN");
      setSuccessMessage("Financial ledger account successfully created!");

      await fetchAccountsAndCustomers();

      setTimeout(() => setSuccessMessage(null), 4000);
    } catch (err: any) {
      console.error("Failed to provision account profile", err);
      setFormError(err.message || "Could not register ledger account.");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Safe client-side filtering matching status filters and search terms (Section 3 & 4)
  const filteredAccounts = accounts.filter((acc) => {
    if (statusFilter !== "all" && acc.status?.toLowerCase() !== statusFilter) {
      return false;
    }

    const term = searchQuery.toLowerCase().trim();
    if (!term) return true;

    return (
      acc.name?.toLowerCase().includes(term) ||
      acc.id?.toLowerCase().includes(term) ||
      acc.currency?.toLowerCase().includes(term) ||
      acc.customer?.firstName?.toLowerCase().includes(term) ||
      acc.customer?.lastName?.toLowerCase().includes(term) ||
      acc.customerId?.toLowerCase().includes(term)
    );
  });

  // Filtered customer listing inside our creation selector
  const filteredCustomersForSelect = customers.filter((cust) => {
    const term = customerSearchQuery.toLowerCase().trim();
    if (!term) return true;
    return (
      cust.firstName?.toLowerCase().includes(term) ||
      cust.lastName?.toLowerCase().includes(term) ||
      cust.email?.toLowerCase().includes(term) ||
      cust.id?.toLowerCase().includes(term)
    );
  });

  const activeSelectedCustomer = customers.find(c => c.id === selectedCustomerId);

  return (
    <div className="space-y-8 font-mono select-none text-left relative">
      
      {/* 1. Header Toolbar */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center pb-5 border-b border-neutral-900 gap-4">
        <div>
          <h1 className="text-xl font-black text-white uppercase tracking-tight">Ledger Accounts</h1>
          <p className="text-[10px] text-neutral-500 font-semibold mt-1">
            Manage the financial accounts in this project.
          </p>
        </div>
        <button
          onClick={() => {
            setFormError(null);
            setIsModalOpen(true);
          }}
          className="rounded bg-indigo-600 px-4 py-2 text-xs font-bold uppercase tracking-wider text-white hover:bg-indigo-500 transition-all active:scale-[0.98] flex items-center space-x-1.5 cursor-pointer shadow-md shadow-indigo-600/10"
        >
          <Plus className="h-4 w-4 shrink-0" />
          <span>Create account</span>
        </button>
      </div>

      {/* Action Toasts */}
      {successMessage && (
        <div className="rounded border border-emerald-950/60 bg-emerald-950/5 p-4 text-[11px] text-emerald-400 font-bold uppercase tracking-wide">
          {successMessage}
        </div>
      )}

      {/* Legal sandbox disclaimer (Section 19 compliance) */}
      <div className="rounded border border-amber-950/40 bg-amber-950/5 px-4 py-3 text-[10px] text-amber-500 font-bold uppercase tracking-wider flex items-start space-x-2">
        <Info className="h-4.5 w-4.5 shrink-0 text-amber-500" />
        <div>
          <span>TEST MODE: No real currency is involved. Sandbox balances reflect mock operations.</span>
        </div>
      </div>

      {/* 2. Filter & Search Query Panel */}
      {accounts.length > 0 && (
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3.5 top-2.5 h-4 w-4 text-neutral-600" />
            <input
              type="text"
              placeholder="Search accounts by name, currency, ID, or customer owner..."
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
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="rounded border border-neutral-900 bg-neutral-950 px-3 py-2 text-xs font-bold text-neutral-400 focus:border-indigo-500 focus:outline-none transition-all cursor-pointer"
          >
            <option value="all">All statuses</option>
            <option value="active">Active</option>
            <option value="frozen">Frozen</option>
            <option value="closed">Closed</option>
          </select>
        </div>
      )}

      {/* 3. Operational view lists */}
      {isLoading ? (
        <div className="space-y-4 pt-4">
          <div className="h-10 bg-neutral-950 border border-neutral-900 rounded animate-pulse" />
          <div className="h-28 bg-neutral-950 border border-neutral-900 rounded animate-pulse" />
          <div className="h-28 bg-neutral-950 border border-neutral-900 rounded animate-pulse" />
        </div>
      ) : error ? (
        <div className="rounded border border-red-950 bg-red-950/5 p-6 text-center max-w-md mx-auto">
          <AlertTriangle className="mx-auto h-10 w-10 text-red-500" />
          <h3 className="mt-4 text-xs font-black uppercase tracking-wider text-white">Unable to load accounts</h3>
          <p className="mt-2 text-[10px] text-neutral-500 font-semibold leading-relaxed">{error}</p>
          <button
            onClick={fetchAccountsAndCustomers}
            className="mt-5 inline-flex items-center space-x-1.5 rounded bg-neutral-900 px-4 py-2 text-xs font-bold uppercase tracking-wider text-white hover:bg-neutral-800 transition-all active:scale-[0.98] border border-neutral-800"
          >
            <RefreshCw className="h-3.5 w-3.5" />
            <span>Retry Query</span>
          </button>
        </div>
      ) : accounts.length === 0 ? (
        <div className="rounded-lg border border-dashed border-neutral-900 bg-neutral-950/10 p-12 text-center max-w-lg mx-auto">
          <Wallet className="mx-auto h-12 w-12 text-neutral-700 animate-pulse" />
          <h3 className="mt-4 text-xs font-black uppercase tracking-widest text-neutral-400">No accounts yet</h3>
          <p className="mt-2 text-[10px] text-neutral-500 font-medium leading-relaxed">
            Create an account for a customer to start testing financial flows. Spawning digital currency ledger profiles enables mock funding simulations.
          </p>
          <div className="mt-6 flex flex-col sm:flex-row justify-center gap-3">
            <Link
              to={`/projects/${projectId}/customers`}
              className="rounded border border-neutral-800 bg-neutral-950 px-4 py-2 text-xs font-bold uppercase text-neutral-400 hover:text-white transition-all text-center"
            >
              Go to Customers
            </Link>
            <button
              onClick={() => setIsModalOpen(true)}
              className="rounded bg-indigo-600 px-4 py-2 text-xs font-bold uppercase text-white hover:bg-indigo-500 transition-all text-center cursor-pointer"
            >
              + Create account
            </button>
          </div>
        </div>
      ) : filteredAccounts.length === 0 ? (
        <div className="rounded-lg border border-neutral-900 bg-neutral-950/20 p-12 text-center max-w-lg mx-auto">
          <Search className="mx-auto h-10 w-10 text-neutral-700" />
          <h3 className="mt-4 text-xs font-black uppercase tracking-widest text-neutral-400">No matching results</h3>
          <p className="mt-2 text-[10px] text-neutral-500 font-medium">
            No accounts match your query criteria.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          
          {/* Desktop tabular columns (Section 26 compliance) */}
          <div className="hidden lg:block rounded-lg border border-neutral-900 bg-neutral-950/40 overflow-hidden">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-neutral-950/60 border-b border-neutral-900 text-neutral-500 font-black text-[9px] uppercase tracking-wider">
                  <th className="px-6 py-3.5">Account / ID</th>
                  <th className="px-6 py-3.5">Customer Owner</th>
                  <th className="px-6 py-3.5">Currency</th>
                  <th className="px-6 py-3.5">Book Balance</th>
                  <th className="px-6 py-3.5">Available Balance</th>
                  <th className="px-6 py-3.5">Status</th>
                  <th className="px-6 py-3.5 text-right pr-6">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-900/40 text-[11px] font-semibold text-neutral-300">
                {filteredAccounts.map((acc) => (
                  <tr key={acc.id} className="hover:bg-neutral-950/30 transition-colors">
                    <td className="px-6 py-4">
                      <div>
                        <span className="font-bold text-white block uppercase tracking-tight">{acc.name}</span>
                        <div className="flex items-center space-x-1.5 font-mono text-[9.5px] mt-1 text-neutral-500 select-all">
                          <span>{acc.id}</span>
                          <button
                            onClick={() => handleCopy(acc.id)}
                            className="text-neutral-700 hover:text-white transition-colors"
                          >
                            {copiedId === acc.id ? (
                              <Check className="h-3 w-3 text-emerald-500" />
                            ) : (
                              <Copy className="h-3 w-3" />
                            )}
                          </button>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      {acc.customer ? (
                        <Link
                          to={`/projects/${projectId}/customers/${acc.customer.id}`}
                          className="font-bold text-indigo-400 hover:text-white underline decoration-dotted transition-colors"
                        >
                          {acc.customer.firstName} {acc.customer.lastName}
                        </Link>
                      ) : (
                        <span className="text-neutral-600">No Owner</span>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      <span className="inline-flex items-center space-x-1 font-bold text-neutral-400 bg-neutral-950 border border-neutral-900 px-2 py-0.5 rounded text-[10px] uppercase">
                        <Coins className="h-3 w-3 text-neutral-600 shrink-0" />
                        <span>{acc.currency}</span>
                      </span>
                    </td>
                    <td className="px-6 py-4 text-white font-black">{formatMoney(acc.balance, acc.currency)}</td>
                    <td className="px-6 py-4 text-white font-black">{formatMoney(acc.available, acc.currency)}</td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex items-center rounded border px-2 py-0.5 text-[8.5px] font-black uppercase tracking-wider leading-none ${
                        acc.status === "active"
                          ? "border-emerald-900/40 bg-emerald-950/20 text-emerald-500"
                          : acc.status === "frozen"
                          ? "border-amber-900/40 bg-amber-950/20 text-amber-500"
                          : "border-red-900/40 bg-red-950/20 text-red-500"
                      }`}>
                        {acc.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right pr-6">
                      <Link
                        to={`/projects/${projectId}/accounts/${acc.id}`}
                        className="inline-flex items-center space-x-1 text-[10px] font-black text-indigo-400 hover:text-white uppercase tracking-widest transition-colors"
                      >
                        <span>View Ledger</span>
                        <ChevronRight className="h-3.5 w-3.5 shrink-0" />
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Tablet & Mobile cards (Section 26 compliance) */}
          <div className="block lg:hidden space-y-3">
            {filteredAccounts.map((acc) => (
              <div key={acc.id} className="rounded-lg border border-neutral-900 bg-neutral-950/40 p-4 space-y-3">
                <div className="flex items-center justify-between border-b border-neutral-900 pb-2">
                  <div>
                    <span className="font-bold text-white text-[11.5px] uppercase tracking-tight">{acc.name}</span>
                    <p className="font-mono text-[9px] text-neutral-500 mt-0.5 select-all">{acc.id}</p>
                  </div>
                  <span className={`inline-flex items-center rounded border px-1.5 py-0.5 text-[7.5px] font-black uppercase tracking-wider leading-none ${
                    acc.status === "active"
                      ? "border-emerald-900/40 bg-emerald-950/20 text-emerald-500"
                      : acc.status === "frozen"
                      ? "border-amber-900/40 bg-amber-950/20 text-amber-500"
                      : "border-red-900/40 bg-red-950/20 text-red-500"
                  }`}>
                    {acc.status}
                  </span>
                </div>
                <div className="text-[10px] space-y-1.5 font-medium text-neutral-400">
                  <div className="flex justify-between">
                    <span className="text-neutral-600 uppercase">Customer Owner</span>
                    {acc.customer ? (
                      <Link
                        to={`/projects/${projectId}/customers/${acc.customer.id}`}
                        className="font-bold text-indigo-400"
                      >
                        {acc.customer.firstName} {acc.customer.lastName}
                      </Link>
                    ) : (
                      <span className="text-neutral-600">None</span>
                    )}
                  </div>
                  <div className="flex justify-between">
                    <span className="text-neutral-600 uppercase">Booked Balance</span>
                    <span className="font-bold text-white">{formatMoney(acc.balance, acc.currency)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-neutral-600 uppercase">Available Balance</span>
                    <span className="font-bold text-white">{formatMoney(acc.available, acc.currency)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-neutral-600 uppercase">Currency</span>
                    <span className="font-mono uppercase text-neutral-300">{acc.currency}</span>
                  </div>
                </div>
                <div className="pt-2 border-t border-neutral-900/60 flex justify-end">
                  <Link
                    to={`/projects/${projectId}/accounts/${acc.id}`}
                    className="inline-flex items-center space-x-1 text-[9px] font-black text-indigo-400 hover:text-white uppercase tracking-widest"
                  >
                    <span>Ledger Details</span>
                    <ArrowRight className="h-3 w-3 shrink-0" />
                  </Link>
                </div>
              </div>
            ))}
          </div>

        </div>
      )}

      {/* 4. Sliding Modal for Account Creation with searchable customer selectors */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center font-mono">
          <div
            onClick={() => setIsModalOpen(false)}
            className="fixed inset-0 bg-black/60 backdrop-blur-xs transition-all"
          />

          <div className="relative flex w-full max-w-md flex-col bg-neutral-950 border border-neutral-900 p-6 rounded-lg shadow-2xl z-10 text-left h-full max-h-[580px] overflow-y-auto">
            <div className="absolute right-4 top-4">
              <button
                onClick={() => setIsModalOpen(false)}
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
              <h2 className="text-sm font-black uppercase text-white tracking-wider">Create Account</h2>
            </div>

            {formError && (
              <div className="mt-4 flex items-start space-x-2 rounded border border-red-950 bg-red-950/10 p-3 text-red-200/90 leading-relaxed text-[11px] font-semibold">
                <AlertTriangle className="h-4 w-4 text-red-500 shrink-0 mt-0.5" />
                <p className="leading-snug">{formError}</p>
              </div>
            )}

            <form onSubmit={handleCreateAccount} className="mt-6 space-y-4 flex-1">
              {/* Searchable Customer Selector (Section 7 compliance) */}
              <div>
                <label className="block text-[9px] font-bold text-neutral-500 uppercase tracking-widest flex items-center space-x-1">
                  <User className="h-3.5 w-3.5 text-neutral-600" />
                  <span>Account Owner (Select Customer) *</span>
                </label>

                {activeSelectedCustomer ? (
                  <div className="mt-1.5 flex items-center justify-between border border-neutral-900 bg-neutral-950 p-3 rounded">
                    <div>
                      <p className="text-xs font-bold text-white uppercase tracking-tight">
                        {activeSelectedCustomer.firstName} {activeSelectedCustomer.lastName}
                      </p>
                      <p className="font-mono text-[9px] text-neutral-600 mt-0.5 select-all">ID: {activeSelectedCustomer.id}</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => setSelectedCustomerId("")}
                      className="rounded border border-neutral-800 bg-neutral-950 px-2 py-1 text-[9px] font-bold text-red-500 hover:text-white hover:border-red-950 transition-colors uppercase tracking-widest"
                    >
                      Clear Selection
                    </button>
                  </div>
                ) : (
                  <div className="mt-1.5 space-y-2">
                    <div className="relative">
                      <Search className="absolute left-3 top-2.5 h-3.5 w-3.5 text-neutral-600" />
                      <input
                        type="text"
                        placeholder="Search workspace customers..."
                        value={customerSearchQuery}
                        onChange={(e) => setCustomerSearchQuery(e.target.value)}
                        className="block w-full rounded border border-neutral-900 bg-neutral-950 pl-9 pr-4 py-2 text-xs text-white placeholder:text-neutral-700 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 transition-all"
                      />
                    </div>

                    <div className="border border-neutral-900 bg-neutral-950 rounded max-h-[140px] overflow-y-auto divide-y divide-neutral-900/60">
                      {filteredCustomersForSelect.length === 0 ? (
                        <div className="p-3 text-[10px] text-neutral-600 text-center font-bold">
                          No customer profiles matched the query term.
                        </div>
                      ) : (
                        filteredCustomersForSelect.map((cust) => (
                          <button
                            key={cust.id}
                            type="button"
                            onClick={() => {
                              setSelectedCustomerId(cust.id);
                              setCustomerSearchQuery("");
                            }}
                            className="w-full text-left p-2.5 hover:bg-neutral-900/40 flex items-center justify-between transition-colors cursor-pointer group"
                          >
                            <div>
                              <span className="text-xs font-bold text-neutral-400 group-hover:text-white transition-colors">
                                {cust.firstName} {cust.lastName}
                              </span>
                              <span className="block font-mono text-[8.5px] text-neutral-600 mt-0.5">{cust.id}</span>
                            </div>
                            <span className="text-[9px] font-black text-indigo-400 opacity-0 group-hover:opacity-100 uppercase tracking-widest transition-opacity">Select</span>
                          </button>
                        ))
                      )}
                    </div>
                  </div>
                )}
              </div>

              <div>
                <label className="block text-[9px] font-bold text-neutral-500 uppercase tracking-widest">
                  Account Name Description *
                </label>
                <input
                  type="text"
                  required
                  value={accountName}
                  onChange={(e) => setAccountName(e.target.value)}
                  placeholder="e.g. John Doe USD Wallet"
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
                  className="mt-1.5 block w-full rounded border border-neutral-900 bg-neutral-950 px-3 py-2 text-xs text-white focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 transition-all font-bold uppercase tracking-wider cursor-pointer"
                >
                  <option value="NGN">NGN (Nigerian Naira - ₦)</option>
                  <option value="USD">USD (US Dollar - $)</option>
                </select>
              </div>

              <div className="pt-4 border-t border-neutral-900 flex space-x-3 mt-6">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="flex-1 rounded border border-neutral-900 bg-neutral-950 py-2.5 text-center text-xs font-bold uppercase tracking-wider text-neutral-500 hover:text-white transition-all cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="flex-1 flex justify-center items-center space-x-1.5 rounded bg-indigo-600 py-2.5 text-center text-xs font-bold uppercase tracking-wider text-white hover:bg-indigo-500 transition-all disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      <span>Creating...</span>
                    </>
                  ) : (
                    <span>Create account</span>
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

export default Accounts;
