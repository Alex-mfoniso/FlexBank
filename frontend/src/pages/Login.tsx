import React, { useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { useApp } from "../context/AppContext";
import { api } from "../lib/api";
import type { ApiErrorPayload } from "../lib/api";
import { KeyRound, ShieldAlert, Terminal, HelpCircle } from "lucide-react";

export const Login: React.FC = () => {
  const { login } = useApp();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<ApiErrorPayload | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showErrorTrace, setShowErrorTrace] = useState(false);

  const isExpired = searchParams.get("expired") === "true";

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setShowErrorTrace(false);
    setIsSubmitting(true);

    try {
      const response = await api.post("/api/v1/auth/login", { email, password });
      const { token, user } = response.data;
      
      // Standardize user object name format
      const formattedUser = {
        id: user.id,
        email: user.email,
        name: `${user.firstName} ${user.lastName}`,
        status: user.status,
        createdAt: user.createdAt,
      };

      login(token, formattedUser);
      navigate("/projects");
    } catch (err: any) {
      setError(err as ApiErrorPayload);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="flex min-h-screen flex-col lg:flex-row bg-slate-50">
      {/* Visual Technical Intro Panel */}
      <div className="hidden lg:flex lg:w-1/2 flex-col justify-between bg-slate-900 text-white p-12 relative overflow-hidden">
        {/* Subtle decorative grid backing */}
        <div className="absolute inset-0 opacity-10 bg-[linear-gradient(to_right,#808080_1px,transparent_1px),linear-gradient(to_bottom,#808080_1px,transparent_1px)] bg-[size:24px_24px]" />
        
        {/* Top Branding Section */}
        <div className="flex items-center space-x-3 z-10">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-indigo-500 font-bold text-xl shadow-lg shadow-indigo-500/30">
            F
          </div>
          <span className="text-xl font-bold tracking-tight">FlexBank</span>
          <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-slate-800 text-indigo-400 border border-slate-700">
            Developer MVP
          </span>
        </div>

        {/* Center Feature Section */}
        <div className="my-auto space-y-6 max-w-lg z-10">
          <h1 className="text-4xl font-extrabold tracking-tight leading-tight">
            Developer Financial Infrastructure, Built for Builders.
          </h1>
          <p className="text-slate-400 leading-relaxed">
            One unified API client to manage customers, double-entry ledgers, wallets, multi-currency accounts, and payment settlements. Avoid managing complex point-to-point provider connections.
          </p>

          <div className="space-y-4 pt-4 border-t border-slate-800">
            <div className="flex items-start space-x-3">
              <div className="mt-1 h-2 w-2 rounded-full bg-indigo-400" />
              <p className="text-sm text-slate-300">
                <span className="font-semibold text-white">Immutable Ledger:</span> Real-time, transaction-safe double-entry accounting engine.
              </p>
            </div>
            <div className="flex items-start space-x-3">
              <div className="mt-1 h-2 w-2 rounded-full bg-indigo-400" />
              <p className="text-sm text-slate-300">
                <span className="font-semibold text-white">Event Streams:</span> Stripe-style webhook alerts with automated exponential backoff retries.
              </p>
            </div>
            <div className="flex items-start space-x-3">
              <div className="mt-1 h-2 w-2 rounded-full bg-indigo-400" />
              <p className="text-sm text-slate-300">
                <span className="font-semibold text-white">Sandbox Simulators:</span> Test network responses, fund test accounts, and trigger simulations.
              </p>
            </div>
          </div>
        </div>

        {/* Footer info */}
        <div className="flex items-center justify-between text-xs text-slate-500 z-10">
          <span>© 2026 FlexBank Inc.</span>
          <a href="/docs" className="hover:text-slate-300 transition-colors">
            Read platform specification
          </a>
        </div>
      </div>

      {/* Form Interaction Card Section */}
      <div className="flex flex-1 flex-col justify-center px-6 py-12 lg:px-20 bg-slate-50">
        <div className="mx-auto w-full max-w-md">
          {/* Logo only shown on small viewports */}
          <div className="flex items-center space-x-2 lg:hidden mb-8">
            <div className="flex h-8 w-8 items-center justify-center rounded-md bg-indigo-600 font-bold text-white text-md">
              F
            </div>
            <span className="text-lg font-bold tracking-tight text-slate-900">FlexBank</span>
          </div>

          <h2 className="text-3xl font-extrabold tracking-tight text-slate-900">
            Sign in to dashboard
          </h2>
          <p className="mt-2 text-sm text-slate-600">
            Welcome back. Access your sandbox environments, API logs, and ledger explorers.
          </p>

          {/* Session Expiry Notice */}
          {isExpired && (
            <div className="mt-6 flex items-start space-x-3 rounded-lg bg-amber-50 p-4 border border-amber-200 text-amber-800">
              <HelpCircle className="h-5 w-5 text-amber-500 shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-semibold">Session expired</p>
                <p className="text-xs text-amber-700 mt-1">
                  Your session token has expired or is no longer valid. Please sign in again to restore access.
                </p>
              </div>
            </div>
          )}

          {/* Error Banner Panel */}
          {error && (
            <div className="mt-6 space-y-3 rounded-lg bg-red-50 p-4 border border-red-200 text-red-800">
              <div className="flex items-start space-x-3">
                <ShieldAlert className="h-5 w-5 text-red-500 shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-bold">Authentication failed</p>
                  <p className="text-xs text-red-700 mt-1">{error.message}</p>
                </div>
              </div>

              {/* Dev Info Dropdown */}
              {error.requestId && (
                <div className="border-t border-red-100 pt-2">
                  <button
                    type="button"
                    onClick={() => setShowErrorTrace(!showErrorTrace)}
                    className="flex items-center space-x-1.5 text-xs font-semibold text-red-600 hover:text-red-800"
                  >
                    <Terminal className="h-3.5 w-3.5" />
                    <span>{showErrorTrace ? "Hide" : "Show"} developer diagnostic trace</span>
                  </button>
                  {showErrorTrace && (
                    <div className="mt-2 rounded bg-slate-900 p-2 font-mono text-[10px] text-slate-300 overflow-x-auto select-all">
                      <div className="flex justify-between border-b border-slate-800 pb-1 mb-1 text-slate-500">
                        <span>ERROR_CODE</span>
                        <span>REQUEST_ID</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-rose-400">{error.code}</span>
                        <span className="text-amber-400">{error.requestId}</span>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          <form onSubmit={handleSubmit} className="mt-8 space-y-6">
            <div className="space-y-4">
              <div>
                <label htmlFor="email" className="block text-sm font-semibold text-slate-700">
                  Developer email address
                </label>
                <div className="mt-1.5">
                  <input
                    id="email"
                    name="email"
                    type="email"
                    autoComplete="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="you@domain.com"
                    className="block w-full rounded-lg border border-slate-300 bg-white px-4 py-2.5 text-slate-900 placeholder:text-slate-400 shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 sm:text-sm transition-all"
                  />
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between">
                  <label htmlFor="password" className="block text-sm font-semibold text-slate-700">
                    Account password
                  </label>
                </div>
                <div className="mt-1.5">
                  <input
                    id="password"
                    name="password"
                    type="password"
                    autoComplete="current-password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="block w-full rounded-lg border border-slate-300 bg-white px-4 py-2.5 text-slate-900 placeholder:text-slate-400 shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 sm:text-sm transition-all"
                  />
                </div>
              </div>
            </div>

            <div>
              <button
                type="submit"
                disabled={isSubmitting}
                className="flex w-full justify-center items-center space-x-2 rounded-lg bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-indigo-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
              >
                {isSubmitting ? (
                  <>
                    <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                    <span>Verifying credentials...</span>
                  </>
                ) : (
                  <>
                    <KeyRound className="h-4 w-4" />
                    <span>Sign In</span>
                  </>
                )}
              </button>
            </div>
          </form>

          <p className="mt-8 text-center text-sm text-slate-600">
            New to FlexBank?{" "}
            <Link to="/signup" className="font-semibold text-indigo-600 hover:text-indigo-500 transition-colors">
              Create developer account
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
};
