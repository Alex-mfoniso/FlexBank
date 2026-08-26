import React, { useEffect, useState } from "react";
import { Link, useNavigate, useParams, useSearchParams } from "react-router-dom";
import { useApp } from "../context/AppContext";
import { api } from "../lib/api";
import { formatDate } from "../utils/format";
import {
  Users,
  Search,
  Plus,
  ArrowRight,
  UserPlus,
  X,
  AlertTriangle,
  Mail,
  Smartphone,
  Fingerprint,
  Loader2,
  Copy,
  Check,
  ChevronRight,
  RefreshCw,
  SlidersHorizontal
} from "lucide-react";

export const Customers: React.FC = () => {
  const { projectId } = useParams<{ projectId: string }>();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  // Load search filter state directly from URL query parameters (Section 22 compliance)
  const initialSearch = searchParams.get("search") || "";
  const [searchQuery, setSearchQuery] = useState(initialSearch);

  const [customers, setCustomers] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Modal / Sidebar Drawer States
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [externalId, setExternalId] = useState("");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Clipboard copies
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const handleCopy = (id: string) => {
    navigator.clipboard.writeText(id);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const fetchCustomers = async () => {
    if (!projectId) return;
    setIsLoading(true);
    setError(null);
    try {
      // Authoritative project isolation (Section 21 compliance): explicitly passing target headers
      const response = await api.get("/api/v1/customers", {
        headers: { "x-project-id": projectId }
      });
      setCustomers(response.data.customers || response.data.data || []);
    } catch (err: any) {
      console.error("Failed to load customer registry details", err);
      setError(err.message || "Failed to retrieve the workspace customer records.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchCustomers();
  }, [projectId]);

  // Synchronize URL search parameters gracefully on change (Section 22 compliance)
  useEffect(() => {
    if (searchQuery.trim()) {
      setSearchParams({ search: searchQuery });
    } else {
      searchParams.delete("search");
      setSearchParams(searchParams);
    }
  }, [searchQuery]);

  const handleCreateCustomer = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    setSuccessMessage(null);

    // Form Client side Validation (Section 7)
    if (!externalId.trim() || !firstName.trim() || !lastName.trim() || !email.trim()) {
      setFormError("All required fields (*) must be provided.");
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      setFormError("Please provide a valid email formatting address.");
      return;
    }

    if (phone.trim() && phone.length > 50) {
      setFormError("Phone number cannot exceed 50 characters.");
      return;
    }

    setIsSubmitting(true); // Disable buttons immediately to prevent duplicate submissions (Section 9)

    try {
      const payload = {
        externalId: externalId.trim(),
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        email: email.trim(),
        phone: phone.trim() || null,
      };

      // Create new customer authoritatively linked to active project context
      const response = await api.post("/api/v1/customers", payload, {
        headers: { "x-project-id": projectId }
      });

      const newCustomer = response.data.customer || response.data.data;

      // Close modal and clean forms
      setIsModalOpen(false);
      setExternalId("");
      setFirstName("");
      setLastName("");
      setEmail("");
      setPhone("");
      setSuccessMessage("Customer profile successfully created!");

      // Refresh listing
      await fetchCustomers();

      // Automatically clear toast notification after 4s
      setTimeout(() => setSuccessMessage(null), 4000);

    } catch (err: any) {
      console.error("Failed to register customer record", err);
      setFormError(err.message || "Could not register customer profile.");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Perform localized searching safely over loaded database arrays (Section 3 compliance)
  const filteredCustomers = customers.filter((cust) => {
    const term = searchQuery.toLowerCase().trim();
    if (!term) return true;

    return (
      cust.firstName?.toLowerCase().includes(term) ||
      cust.lastName?.toLowerCase().includes(term) ||
      cust.email?.toLowerCase().includes(term) ||
      cust.id?.toLowerCase().includes(term) ||
      cust.externalId?.toLowerCase().includes(term)
    );
  });

  return (
    <div className="space-y-8 font-mono select-none text-left relative">
      
      {/* 1. Header Toolbar */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center pb-5 border-b border-neutral-900 gap-4">
        <div>
          <h1 className="text-xl font-black text-white uppercase tracking-tight">Customer Management</h1>
          <p className="text-[10px] text-neutral-500 font-semibold mt-1">
            Manage the customers using your FlexBank project.
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
          <span>Create customer</span>
        </button>
      </div>

      {/* Action Toasts */}
      {successMessage && (
        <div className="rounded border border-emerald-950/60 bg-emerald-950/5 p-4 text-[11px] text-emerald-400 font-bold uppercase tracking-wide">
          {successMessage}
        </div>
      )}

      {/* 2. Filter & Search query inputs */}
      {customers.length > 0 && (
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3.5 top-2.5 h-4 w-4 text-neutral-600" />
            <input
              type="text"
              placeholder="Search customers by name, email, or system IDs..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="block w-full rounded border border-neutral-900 bg-neutral-950 pl-10 pr-4 py-2 text-xs text-white placeholder:text-neutral-600 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 transition-all"
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
          <div className="flex items-center space-x-2 border border-neutral-900 bg-neutral-950 px-3 py-2 rounded text-[10px] font-bold text-neutral-500">
            <SlidersHorizontal className="h-3.5 w-3.5" />
            <span className="uppercase tracking-wider">Filtered list: {filteredCustomers.length} of {customers.length}</span>
          </div>
        </div>
      )}

      {/* 3. Operational views / list structures */}
      {isLoading ? (
        <div className="space-y-4 pt-4">
          <div className="h-10 bg-neutral-950 border border-neutral-900 rounded animate-pulse" />
          <div className="h-28 bg-neutral-950 border border-neutral-900 rounded animate-pulse" />
          <div className="h-28 bg-neutral-950 border border-neutral-900 rounded animate-pulse" />
        </div>
      ) : error ? (
        <div className="rounded border border-red-950 bg-red-950/5 p-6 text-center max-w-md mx-auto">
          <AlertTriangle className="mx-auto h-10 w-10 text-red-500" />
          <h3 className="mt-4 text-xs font-black uppercase tracking-wider text-white">Unable to load customers</h3>
          <p className="mt-2 text-[10px] text-neutral-500 font-semibold leading-relaxed">{error}</p>
          <button
            onClick={fetchCustomers}
            className="mt-5 inline-flex items-center space-x-1.5 rounded bg-neutral-900 px-4 py-2 text-xs font-bold uppercase tracking-wider text-white hover:bg-neutral-800 transition-all active:scale-[0.98] border border-neutral-800"
          >
            <RefreshCw className="h-3.5 w-3.5" />
            <span>Retry Query</span>
          </button>
        </div>
      ) : customers.length === 0 ? (
        <div className="rounded-lg border border-dashed border-neutral-900 bg-neutral-950/10 p-12 text-center max-w-lg mx-auto">
          <Users className="mx-auto h-12 w-12 text-neutral-700 animate-pulse" />
          <h3 className="mt-4 text-xs font-black uppercase tracking-widest text-neutral-400">No customers yet</h3>
          <p className="mt-2 text-[10px] text-neutral-500 font-medium leading-relaxed">
            Create your first customer to start building your financial flow. Associate custom multi-currency wallets to begin simulated transaction runs.
          </p>
          <button
            onClick={() => setIsModalOpen(true)}
            className="mt-6 rounded bg-indigo-600 px-4 py-2.5 text-xs font-bold uppercase tracking-wider text-white hover:bg-indigo-500 transition-all active:scale-[0.98] cursor-pointer"
          >
            + Create customer
          </button>
        </div>
      ) : filteredCustomers.length === 0 ? (
        <div className="rounded-lg border border-neutral-900 bg-neutral-950/20 p-12 text-center max-w-lg mx-auto">
          <Search className="mx-auto h-10 w-10 text-neutral-700" />
          <h3 className="mt-4 text-xs font-black uppercase tracking-widest text-neutral-400">No matching results</h3>
          <p className="mt-2 text-[10px] text-neutral-500 font-medium">
            No active customers match your query term "{searchQuery}".
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          
          {/* Desktop structured table (Section 23 compliance) */}
          <div className="hidden md:block rounded-lg border border-neutral-900 bg-neutral-950/40 overflow-hidden">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-neutral-950/60 border-b border-neutral-900 text-neutral-500 font-black text-[9px] uppercase tracking-wider">
                  <th className="px-6 py-3.5">Customer Name</th>
                  <th className="px-6 py-3.5">Customer ID</th>
                  <th className="px-6 py-3.5">Email Address</th>
                  <th className="px-6 py-3.5">Status</th>
                  <th className="px-6 py-3.5">Created Date</th>
                  <th className="px-6 py-3.5 text-right pr-6">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-900/40 text-[11px] font-semibold text-neutral-300">
                {filteredCustomers.map((cust) => (
                  <tr key={cust.id} className="hover:bg-neutral-950/30 transition-colors">
                    <td className="px-6 py-4">
                      <div className="flex items-center space-x-3">
                        <div className="flex h-7 w-7 items-center justify-center rounded bg-indigo-950/60 border border-indigo-900/40 text-indigo-400 font-black text-[10px] uppercase">
                          {cust.firstName?.[0]}{cust.lastName?.[0]}
                        </div>
                        <span className="font-bold text-white">{cust.firstName} {cust.lastName}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 font-mono">
                      <div className="flex items-center space-x-1.5 select-all">
                        <span className="text-neutral-400">{cust.id}</span>
                        <button
                          onClick={() => handleCopy(cust.id)}
                          className="text-neutral-600 hover:text-white transition-colors"
                          title="Copy Customer ID"
                        >
                          {copiedId === cust.id ? (
                            <Check className="h-3 w-3 text-emerald-500" />
                          ) : (
                            <Copy className="h-3 w-3" />
                          )}
                        </button>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-neutral-400 font-medium">{cust.email}</td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex items-center rounded border px-2 py-0.5 text-[8.5px] font-black uppercase tracking-wider leading-none ${
                        cust.status === "active"
                          ? "border-emerald-900/40 bg-emerald-950/20 text-emerald-500"
                          : "border-neutral-800 bg-neutral-950 text-neutral-500"
                      }`}>
                        {cust.status || "active"}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-neutral-500 font-medium">{formatDate(cust.createdAt)}</td>
                    <td className="px-6 py-4 text-right pr-6">
                      <Link
                        to={`/projects/${projectId}/customers/${cust.id}`}
                        className="inline-flex items-center space-x-1 text-[10px] font-black text-indigo-400 hover:text-white uppercase tracking-widest transition-colors"
                      >
                        <span>View</span>
                        <ChevronRight className="h-3.5 w-3.5 shrink-0" />
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Tablet & Mobile card stacks (Section 23 compliance) */}
          <div className="block md:hidden space-y-3">
            {filteredCustomers.map((cust) => (
              <div key={cust.id} className="rounded-lg border border-neutral-900 bg-neutral-950/40 p-4 space-y-3">
                <div className="flex items-center justify-between border-b border-neutral-900 pb-2">
                  <div className="flex items-center space-x-2">
                    <div className="flex h-6.5 w-6.5 items-center justify-center rounded bg-indigo-950/60 border border-indigo-900/40 text-indigo-400 font-black text-[9px] uppercase">
                      {cust.firstName?.[0]}{cust.lastName?.[0]}
                    </div>
                    <span className="font-bold text-white text-[11.5px]">{cust.firstName} {cust.lastName}</span>
                  </div>
                  <span className={`inline-flex items-center rounded border px-1.5 py-0.5 text-[7.5px] font-black uppercase tracking-wider leading-none ${
                    cust.status === "active"
                      ? "border-emerald-900/40 bg-emerald-950/20 text-emerald-500"
                      : "border-neutral-800 bg-neutral-950 text-neutral-500"
                  }`}>
                    {cust.status || "active"}
                  </span>
                </div>
                <div className="text-[10px] space-y-1.5 font-medium text-neutral-400">
                  <div className="flex justify-between">
                    <span className="text-neutral-600 uppercase">Customer ID</span>
                    <span className="font-mono text-neutral-300">{cust.id}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-neutral-600 uppercase">Email</span>
                    <span className="text-neutral-300">{cust.email}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-neutral-600 uppercase">Registered</span>
                    <span className="text-neutral-300">{formatDate(cust.createdAt)}</span>
                  </div>
                </div>
                <div className="pt-2 border-t border-neutral-900/60 flex justify-end">
                  <Link
                    to={`/projects/${projectId}/customers/${cust.id}`}
                    className="inline-flex items-center space-x-1 text-[9px] font-black text-indigo-400 hover:text-white uppercase tracking-widest"
                  >
                    <span>Open details</span>
                    <ArrowRight className="h-3 w-3 shrink-0" />
                  </Link>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 4. Sliding Modal Sheet for Customer Registration */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center font-mono">
          <div
            onClick={() => setIsModalOpen(false)}
            className="fixed inset-0 bg-black/60 backdrop-blur-xs transition-all"
          />

          <div className="relative flex w-full max-w-md flex-col bg-neutral-950 border border-neutral-900 p-6 rounded-lg shadow-2xl z-10 text-left">
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
                <UserPlus className="h-4.5 w-4.5" />
              </div>
              <h2 className="text-sm font-black uppercase text-white tracking-wider">Create customer</h2>
            </div>

            {formError && (
              <div className="mt-4 flex items-start space-x-2 rounded border border-red-950 bg-red-950/10 p-3.5 text-red-200/90 leading-relaxed text-[11px] font-semibold">
                <AlertTriangle className="h-4 w-4 text-red-500 shrink-0 mt-0.5" />
                <p className="leading-snug">{formError}</p>
              </div>
            )}

            <form onSubmit={handleCreateCustomer} className="mt-6 space-y-4">
              <div>
                <label className="block text-[9px] font-bold text-neutral-500 uppercase tracking-widest flex items-center space-x-1">
                  <Fingerprint className="h-3.5 w-3.5 text-neutral-600" />
                  <span>External ID (Correlation Ref) *</span>
                </label>
                <input
                  type="text"
                  required
                  value={externalId}
                  onChange={(e) => setExternalId(e.target.value)}
                  placeholder="e.g. ext_usr_1001"
                  className="mt-1.5 block w-full rounded border border-neutral-900 bg-neutral-950 px-3 py-2 text-xs text-white placeholder:text-neutral-700 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 transition-all"
                />
                <p className="mt-1 text-[8.5px] text-neutral-600 leading-normal font-semibold">
                  Unique string linking this profile to records in your application database.
                </p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[9px] font-bold text-neutral-500 uppercase tracking-widest">
                    First Name *
                  </label>
                  <input
                    type="text"
                    required
                    value={firstName}
                    onChange={(e) => setFirstName(e.target.value)}
                    placeholder="John"
                    className="mt-1.5 block w-full rounded border border-neutral-900 bg-neutral-950 px-3 py-2 text-xs text-white placeholder:text-neutral-700 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 transition-all"
                  />
                </div>
                <div>
                  <label className="block text-[9px] font-bold text-neutral-500 uppercase tracking-widest">
                    Last Name *
                  </label>
                  <input
                    type="text"
                    required
                    value={lastName}
                    onChange={(e) => setLastName(e.target.value)}
                    placeholder="Doe"
                    className="mt-1.5 block w-full rounded border border-neutral-900 bg-neutral-950 px-3 py-2 text-xs text-white placeholder:text-neutral-700 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 transition-all"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[9px] font-bold text-neutral-500 uppercase tracking-widest flex items-center space-x-1">
                  <Mail className="h-3.5 w-3.5 text-neutral-600" />
                  <span>Email Address *</span>
                </label>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="john.doe@gmail.com"
                  className="mt-1.5 block w-full rounded border border-neutral-900 bg-neutral-950 px-3 py-2 text-xs text-white placeholder:text-neutral-700 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 transition-all"
                />
              </div>

              <div>
                <label className="block text-[9px] font-bold text-neutral-500 uppercase tracking-widest flex items-center space-x-1">
                  <Smartphone className="h-3.5 w-3.5 text-neutral-600" />
                  <span>Phone Number (Optional)</span>
                </label>
                <input
                  type="text"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="e.g. +2348000000000"
                  className="mt-1.5 block w-full rounded border border-neutral-900 bg-neutral-950 px-3 py-2 text-xs text-white placeholder:text-neutral-700 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 transition-all"
                />
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
                    <span>Create customer</span>
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

export default Customers;
