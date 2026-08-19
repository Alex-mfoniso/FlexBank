import React, { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { api } from "../lib/api";
import { formatMoney, formatDate } from "../utils/format";
import { StatusBadge } from "../components/StatusBadge";
import { SkeletonLoader } from "../components/SkeletonLoader";
import {
  Users,
  Wallet,
  ArrowLeft,
  Plus,
  X,
  AlertCircle,
  Building,
  Calendar,
  Layers,
  Fingerprint,
  Mail,
  ShieldCheck,
  PlusCircle,
  RefreshCw,
} from "lucide-react";

export const CustomerDetails: React.FC = () => {
  const { id } = useParams<{ id: string }>();

  const [customer, setCustomer] = useState<any | null>(null);
  const [accounts, setAccounts] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Modal Account Form States
  const [isModalOpen, setIsDrawerOpen] = useState(false);
  const [accountName, setAccountName] = useState("");
  const [currency, setCurrency] = useState("NGN");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const loadData = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const [custRes, accRes] = await Promise.all([
        api.get(`/api/v1/customers/${id}`),
        // Filter by customerId query parameters
        api.get("/api/v1/accounts", { params: { customerId: id } }),
      ]);

      setCustomer(custRes.data.customer || custRes.data.data);
      setAccounts(accRes.data.accounts || accRes.data.data || []);
    } catch (err: any) {
      console.error("Failed to load customer details data", err);
      setError(err.message || "Failed to retrieve the profile or linked financial bank accounts.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (id) {
      loadData();
    }
  }, [id]);

  const handleCreateAccount = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    setIsSubmitting(true);

    try {
      const payload = {
        customerId: id,
        currency,
        name: accountName,
      };

      await api.post("/api/v1/accounts", payload);

      setIsDrawerOpen(false);
      setAccountName("");
      setCurrency("NGN");

      // Reload accounts lists
      await loadData();
    } catch (err: any) {
      console.error("Failed to link customer bank account", err);
      setFormError(err.message || "Could not register ledger account.");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return <SkeletonLoader rows={5} columns={4} />;
  }

  if (error || !customer) {
    return (
      <div className="rounded-xl border border-red-200 bg-red-50 p-6 text-center shadow-xs">
        <AlertCircle className="mx-auto h-12 w-12 text-red-500" />
        <h3 className="mt-4 text-sm font-bold text-slate-900">Failed to load profile</h3>
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
      {/* Upper Breadcrumbs Navigation */}
      <div className="flex items-center space-x-3">
        <Link
          to="../"
          className="flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-500 hover:text-slate-700 transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
        </Link>
        <span className="text-xs font-bold uppercase text-slate-400 tracking-wider">Back to Customers</span>
      </div>

      {/* Main Dual Grid layout */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Left Side: Profile Meta Card */}
        <div className="space-y-6">
          <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-xs space-y-6">
            
            {/* Visual Header Initials */}
            <div className="flex flex-col items-center text-center pb-4 border-b border-slate-100">
              <div className="flex h-16 w-16 items-center justify-center rounded-full bg-indigo-50 text-indigo-700 font-extrabold text-2xl uppercase border-2 border-indigo-100 shadow-sm">
                {customer.firstName?.[0]}{customer.lastName?.[0]}
              </div>
              <h2 className="text-lg font-extrabold text-slate-900 mt-3">
                {customer.firstName} {customer.lastName}
              </h2>
              <span className="mt-1 text-[11px] font-bold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-100 uppercase tracking-wide">
                Profile Active
              </span>
            </div>

            {/* Profile fields */}
            <div className="space-y-4">
              <div className="flex items-start space-x-3 text-sm">
                <Fingerprint className="h-4.5 w-4.5 text-slate-400 mt-0.5 shrink-0" />
                <div className="space-y-0.5">
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Customer system id</p>
                  <p className="font-mono text-xs font-semibold text-slate-700 select-all">{customer.id}</p>
                </div>
              </div>

              <div className="flex items-start space-x-3 text-sm">
                <Building className="h-4.5 w-4.5 text-slate-400 mt-0.5 shrink-0" />
                <div className="space-y-0.5">
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">External integration id</p>
                  <p className="font-mono text-xs font-semibold text-slate-700 select-all">{customer.externalId || "N/A"}</p>
                </div>
              </div>

              <div className="flex items-start space-x-3 text-sm">
                <Mail className="h-4.5 w-4.5 text-slate-400 mt-0.5 shrink-0" />
                <div className="space-y-0.5">
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Email address</p>
                  <p className="font-semibold text-slate-700">{customer.email}</p>
                </div>
              </div>

              <div className="flex items-start space-x-3 text-sm">
                <Calendar className="h-4.5 w-4.5 text-slate-400 mt-0.5 shrink-0" />
                <div className="space-y-0.5">
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Registered on</p>
                  <p className="font-semibold text-slate-700">{formatDate(customer.createdAt)}</p>
                </div>
              </div>
            </div>
            
          </div>
        </div>

        {/* Right Side: Associated Accounts Lists */}
        <div className="lg:col-span-2 space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-md font-bold uppercase tracking-wider text-slate-500 flex items-center space-x-2">
              <Wallet className="h-4.5 w-4.5 text-slate-400" />
              <span>Associated Financial Accounts ({accounts.length})</span>
            </h2>
            <button
              onClick={() => {
                setFormError(null);
                setIsDrawerOpen(true);
              }}
              className="flex items-center space-x-1 rounded-lg border border-indigo-200 bg-indigo-50/50 hover:bg-indigo-50 text-indigo-700 px-3 py-1.5 text-xs font-bold transition-all"
            >
              <PlusCircle className="h-4 w-4" />
              <span>Issue Digital Account</span>
            </button>
          </div>

          {accounts.length === 0 ? (
            <div className="rounded-xl border border-dashed border-slate-300 bg-white p-12 text-center shadow-xs">
              <Wallet className="mx-auto h-12 w-12 text-slate-300 animate-pulse" />
              <h3 className="mt-4 text-sm font-bold text-slate-900">No linked bank accounts</h3>
              <p className="mt-2 text-xs text-slate-500 max-w-sm mx-auto leading-relaxed">
                Before this customer can initiate or receive payment transactions, you must issue them a dedicated digital currency account wallet.
              </p>
              <button
                onClick={() => setIsDrawerOpen(true)}
                className="mt-4 rounded-lg bg-indigo-600 px-4 py-2 text-xs font-bold text-white hover:bg-indigo-500 shadow-sm"
              >
                Issue First Account Wallet
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {accounts.map((acc) => (
                <div
                  key={acc.id}
                  className="rounded-xl border border-slate-200 bg-white p-5 shadow-xs flex flex-col justify-between"
                >
                  <div className="space-y-4">
                    <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                      <div>
                        <h4 className="font-bold text-slate-900 text-sm tracking-tight">{acc.name}</h4>
                        <p className="font-mono text-[10px] text-slate-400 mt-1 select-all">{acc.id}</p>
                      </div>
                      <StatusBadge status={acc.status} />
                    </div>

                    <div className="grid grid-cols-2 gap-2 text-sm pt-1">
                      <div>
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Booked Balance</p>
                        <p className="font-extrabold text-slate-900 mt-1">{formatMoney(acc.balance, acc.currency)}</p>
                      </div>
                      <div>
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Available (Net)</p>
                        <p className="font-extrabold text-slate-950 mt-1">{formatMoney(acc.available, acc.currency)}</p>
                      </div>
                    </div>
                  </div>

                  <div className="mt-5 pt-3 border-t border-slate-100 flex items-center justify-between text-[11px] font-semibold text-slate-500">
                    <span className="font-bold uppercase text-slate-400">{acc.currency} Wallet</span>
                    <Link
                      to={`/projects/${acc.projectId}/accounts/${acc.id}`}
                      className="text-indigo-600 hover:underline"
                    >
                      Audit Ledger Explorer
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

      </div>

      {/* Account issuance Modal Drawer */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          {/* Backdrop mask */}
          <div
            onClick={() => setIsDrawerOpen(false)}
            className="fixed inset-0 bg-black/40 backdrop-blur-xs"
          />

          {/* Modal Card content */}
          <div className="relative flex w-full max-w-sm flex-col bg-white p-6 shadow-xl rounded-xl border border-slate-200 z-50">
            <div className="flex items-center justify-between pb-3.5 border-b border-slate-100">
              <h3 className="text-sm font-bold text-slate-900 flex items-center space-x-2">
                <PlusCircle className="h-5 w-5 text-indigo-600 animate-spin" />
                <span>Issue Digital Wallet Account</span>
              </h3>
              <button
                onClick={() => setIsDrawerOpen(false)}
                className="text-slate-400 hover:text-slate-600 focus:outline-none"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {formError && (
              <div className="mt-4 flex items-start space-x-2 rounded-lg bg-red-50 p-3 border border-red-200 text-red-800">
                <AlertCircle className="h-4 w-4 text-red-500 shrink-0 mt-0.5" />
                <p className="text-xs font-semibold leading-normal">{formError}</p>
              </div>
            )}

            <form onSubmit={handleCreateAccount} className="mt-5 space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider">
                  Account Description Name *
                </label>
                <input
                  type="text"
                  required
                  value={accountName}
                  onChange={(e) => setAccountName(e.target.value)}
                  placeholder="e.g. John Doe NGN savings"
                  className="mt-1.5 block w-full rounded-lg border border-slate-300 bg-white px-3.5 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 transition-all"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider">
                  Denomination Currency *
                </label>
                <select
                  value={currency}
                  onChange={(e) => setCurrency(e.target.value)}
                  className="mt-1.5 block w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 transition-all font-semibold"
                >
                  <option value="NGN">NGN (Nigerian Naira - ₦)</option>
                  <option value="USD">USD (US Dollar - $)</option>
                </select>
              </div>

              <div className="pt-4 border-t border-slate-100 flex space-x-3 mt-6">
                <button
                  type="button"
                  onClick={() => setIsDrawerOpen(false)}
                  className="flex-1 rounded-lg border border-slate-200 py-2 text-center text-xs font-bold text-slate-700 hover:bg-slate-50 transition-all"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="flex-1 flex justify-center items-center rounded-lg bg-indigo-600 py-2 text-center text-xs font-bold text-white shadow-xs hover:bg-indigo-500 focus:outline-none disabled:opacity-50 transition-all"
                >
                  {isSubmitting ? (
                    <>
                      <RefreshCw className="h-3.5 w-3.5 animate-spin mr-1.5" />
                      <span>Issuing...</span>
                    </>
                  ) : (
                    <span>Issue Wallet</span>
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
