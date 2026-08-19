import React, { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useApp } from "../context/AppContext";
import { api } from "../lib/api";
import { formatDate } from "../utils/format";
import { StatusBadge } from "../components/StatusBadge";
import { SkeletonLoader } from "../components/SkeletonLoader";
import {
  Users,
  Search,
  Plus,
  ArrowRight,
  UserPlus,
  X,
  AlertCircle,
  Mail,
  Smartphone,
  Fingerprint,
} from "lucide-react";

export const Customers: React.FC = () => {
  const { selectedProjectId } = useApp();
  const navigate = useNavigate();

  const [customers, setCustomers] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Drawer Form States
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [externalId, setExternalId] = useState("");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const fetchCustomers = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await api.get("/api/v1/customers");
      setCustomers(response.data.data || response.data.customers || []);
    } catch (err: any) {
      console.error("Failed to fetch customers", err);
      setError(err.message || "Failed to retrieve the workspace customer records.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (selectedProjectId) {
      fetchCustomers();
    }
  }, [selectedProjectId]);

  const handleCreateCustomer = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    setIsSubmitting(true);

    try {
      const payload = {
        externalId,
        firstName,
        lastName,
        email,
        phone: phone || null,
      };

      const response = await api.post("/api/v1/customers", payload);
      const newCustomer = response.data.customer || response.data.data;

      // Close drawer, reset form and refresh customer records
      setIsDrawerOpen(false);
      setExternalId("");
      setFirstName("");
      setLastName("");
      setEmail("");
      setPhone("");
      
      await fetchCustomers();
      
      // Selectively navigate to details
      if (newCustomer?.id) {
        navigate(`/projects/${selectedProjectId}/customers/${newCustomer.id}`);
      }
    } catch (err: any) {
      console.error("Failed to create customer", err);
      setFormError(err.message || "Could not register customer.");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Perform localized searching
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
    <div className="space-y-6 relative">
      
      {/* Upper toolbar */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center pb-5 border-b border-slate-200">
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight text-slate-900">Customers</h1>
          <p className="text-xs text-slate-500 font-semibold mt-1">
            Register and manage customer profiles, and associate digital ledger bank accounts.
          </p>
        </div>
        <button
          onClick={() => {
            setFormError(null);
            setIsDrawerOpen(true);
          }}
          className="mt-4 sm:mt-0 flex items-center space-x-1.5 rounded-lg bg-indigo-600 px-4 py-2 text-xs font-bold text-white hover:bg-indigo-500 shadow-xs transition-all"
        >
          <Plus className="h-4 w-4" />
          <span>Add Customer</span>
        </button>
      </div>

      {/* Filter and Search Bar */}
      {customers.length > 0 && (
        <div className="relative">
          <Search className="absolute left-3 top-2.5 h-4.5 w-4.5 text-slate-400" />
          <input
            type="text"
            placeholder="Search by first name, last name, email or IDs..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="block w-full rounded-lg border border-slate-200 bg-white pl-10 pr-4 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 transition-all"
          />
        </div>
      )}

      {/* Main Content Details */}
      {isLoading ? (
        <SkeletonLoader rows={4} columns={5} />
      ) : error ? (
        <div className="rounded-xl border border-red-200 bg-red-50 p-6 text-center shadow-xs">
          <AlertCircle className="mx-auto h-12 w-12 text-red-500" />
          <h3 className="mt-4 text-sm font-bold text-slate-900">Failed to load customers</h3>
          <p className="mt-2 text-xs text-slate-500 max-w-sm mx-auto leading-relaxed">{error}</p>
          <button
            onClick={fetchCustomers}
            className="mt-4 rounded bg-slate-900 px-3 py-1.5 text-xs font-semibold text-white hover:bg-slate-800"
          >
            Retry
          </button>
        </div>
      ) : customers.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-12 text-center shadow-xs">
          <Users className="mx-auto h-12 w-12 text-slate-300" />
          <h3 className="mt-4 text-sm font-bold text-slate-900">No customers registered</h3>
          <p className="mt-2 text-xs text-slate-500 max-w-md mx-auto leading-relaxed">
            Customers represent retail accounts or organizational units in your product core. Create your first customer to assign them a ledger account!
          </p>
          <button
            onClick={() => setIsDrawerOpen(true)}
            className="mt-6 rounded-lg bg-indigo-600 px-4 py-2 text-xs font-bold text-white hover:bg-indigo-500 shadow-sm"
          >
            Add Customer Profile
          </button>
        </div>
      ) : filteredCustomers.length === 0 ? (
        <div className="rounded-xl border border-slate-200 bg-white p-12 text-center shadow-xs">
          <Search className="mx-auto h-12 w-12 text-slate-300" />
          <h3 className="mt-4 text-sm font-bold text-slate-900">No match found</h3>
          <p className="mt-2 text-xs text-slate-500">
            No customers match the active query term "{searchQuery}".
          </p>
        </div>
      ) : (
        <div className="border border-slate-200 rounded-xl bg-white overflow-hidden shadow-xs">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-sm">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-slate-400 font-semibold text-xs uppercase tracking-wider">
                  <th className="px-6 py-3.5">Customer Name</th>
                  <th className="px-6 py-3.5">Email Address</th>
                  <th className="px-6 py-3.5">External System ID</th>
                  <th className="px-6 py-3.5">Registration Date</th>
                  <th className="px-6 py-3.5 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium">
                {filteredCustomers.map((cust) => (
                  <tr key={cust.id} className="hover:bg-slate-50/50 transition-colors">
                    <td className="px-6 py-4">
                      <div className="flex items-center space-x-3">
                        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-indigo-50 text-indigo-700 font-bold text-xs uppercase shrink-0">
                          {cust.firstName?.[0]}{cust.lastName?.[0]}
                        </div>
                        <span className="text-slate-900 font-bold">{cust.firstName} {cust.lastName}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-slate-500">{cust.email}</td>
                    <td className="px-6 py-4 text-slate-500 font-mono text-xs">{cust.externalId}</td>
                    <td className="px-6 py-4 text-slate-400">{formatDate(cust.createdAt)}</td>
                    <td className="px-6 py-4 text-right">
                      <Link
                        to={`/projects/${selectedProjectId}/customers/${cust.id}`}
                        className="inline-flex items-center space-x-1 text-xs font-bold text-indigo-600 hover:text-indigo-800 transition-colors"
                      >
                        <span>Details</span>
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

      {/* Sliding Drawer overlay container */}
      {isDrawerOpen && (
        <div className="fixed inset-0 z-50 flex justify-end">
          {/* Drawer Backdrop Mask */}
          <div
            onClick={() => setIsDrawerOpen(false)}
            className="fixed inset-0 bg-black/40 backdrop-blur-xs"
          />

          {/* Drawer Form Window sheet */}
          <div className="relative flex w-full max-w-md flex-col bg-white p-6 shadow-xl ring-1 ring-black/10 transition-transform h-full overflow-y-auto">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100">
              <h2 className="text-base font-bold text-slate-900 flex items-center space-x-2">
                <UserPlus className="h-5 w-5 text-indigo-600" />
                <span>Register Customer Profile</span>
              </h2>
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

            <form onSubmit={handleCreateCustomer} className="mt-6 space-y-4 flex-1">
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center space-x-1">
                  <Fingerprint className="h-3.5 w-3.5 text-slate-400" />
                  <span>External ID (Reference) *</span>
                </label>
                <input
                  type="text"
                  required
                  value={externalId}
                  onChange={(e) => setExternalId(e.target.value)}
                  placeholder="e.g. usr_100204"
                  className="mt-1.5 block w-full rounded-lg border border-slate-300 bg-white px-3.5 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 transition-all"
                />
                <p className="mt-1 text-[10px] text-slate-400">
                  Unique correlation key to associate this profile with records in your primary application database.
                </p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider">
                    First Name *
                  </label>
                  <input
                    type="text"
                    required
                    value={firstName}
                    onChange={(e) => setFirstName(e.target.value)}
                    placeholder="e.g. John"
                    className="mt-1.5 block w-full rounded-lg border border-slate-300 bg-white px-3.5 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 transition-all"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider">
                    Last Name *
                  </label>
                  <input
                    type="text"
                    required
                    value={lastName}
                    onChange={(e) => setLastName(e.target.value)}
                    placeholder="e.g. Doe"
                    className="mt-1.5 block w-full rounded-lg border border-slate-300 bg-white px-3.5 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 transition-all"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center space-x-1">
                  <Mail className="h-3.5 w-3.5 text-slate-400" />
                  <span>Email Address *</span>
                </label>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="e.g. john.doe@email.com"
                  className="mt-1.5 block w-full rounded-lg border border-slate-300 bg-white px-3.5 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 transition-all"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center space-x-1">
                  <Smartphone className="h-3.5 w-3.5 text-slate-400" />
                  <span>Phone Number (Optional)</span>
                </label>
                <input
                  type="text"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="e.g. +2348123456789"
                  className="mt-1.5 block w-full rounded-lg border border-slate-300 bg-white px-3.5 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 transition-all"
                />
              </div>

              <div className="pt-6 border-t border-slate-100 flex space-x-3 mt-auto">
                <button
                  type="button"
                  onClick={() => setIsDrawerOpen(false)}
                  className="flex-1 rounded-lg border border-slate-200 px-4 py-2.5 text-center text-sm font-semibold text-slate-700 hover:bg-slate-50 transition-all"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="flex-1 flex justify-center items-center space-x-1 rounded-lg bg-indigo-600 px-4 py-2.5 text-center text-sm font-semibold text-white shadow-xs hover:bg-indigo-500 focus:outline-none disabled:opacity-50 transition-all"
                >
                  {isSubmitting ? (
                    <>
                      <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                      <span>Saving profile...</span>
                    </>
                  ) : (
                    <span>Register Profile</span>
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
