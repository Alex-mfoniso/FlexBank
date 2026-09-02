import React, { useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { useApp } from "../context/AppContext";
import { api } from "../lib/api";
import type { ApiErrorPayload } from "../lib/api";
import { KeyRound, ShieldAlert, Terminal, HelpCircle, Eye, EyeOff, CheckCircle2 } from "lucide-react";

export const Login: React.FC = () => {
  const { login } = useApp();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  const [error, setError] = useState<ApiErrorPayload | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showErrorTrace, setShowErrorTrace] = useState(false);

  const isExpired = searchParams.get("expired") === "true";
  const isRegistered = searchParams.get("registered") === "true";

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setShowErrorTrace(false);
    setIsSubmitting(true);

    try {
      const response = await api.post("/api/v1/auth/login", { 
        email: email.trim(), 
        password 
      });
      const { token, user } = response.data;
      
      // Standardize user object format for client use
      const formattedUser = {
        id: user.id,
        email: user.email,
        name: `${user.firstName} ${user.lastName}`,
        status: user.status,
        createdAt: user.createdAt,
        memberships: user.memberships,
      };

      login(token, formattedUser);

      // Programmatically check if they have any projects to route them correctly
      const fetchedProjects = response.data.projects || response.data.user?.projects || [];
      if (fetchedProjects.length > 0) {
        navigate(`/projects/${fetchedProjects[0].id}/overview`);
      } else {
        // First-time logged-in user without projects goes directly to Onboarding
        navigate("/onboarding");
      }
    } catch (err: any) {
      setError(err as ApiErrorPayload);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="flex min-h-screen flex-col lg:flex-row bg-[#030303] text-white">
      {/* Visual Technical Panel */}
      <div className="hidden lg:flex lg:w-1/2 flex-col justify-between bg-neutral-950 border-r border-neutral-900 p-12 relative overflow-hidden">
        <div className="absolute inset-0 opacity-5 bg-dot-pattern" />
        <div className="absolute -top-40 -left-40 w-80 h-80 bg-indigo-500/10 rounded-full blur-[120px]" />
        
        <div className="flex items-center space-x-3 z-10">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-indigo-600 font-mono font-black text-lg shadow-lg shadow-indigo-600/30 border border-indigo-500/20">
            R
          </div>
          <span className="text-lg font-black tracking-tight uppercase font-mono">Ricarut</span>
          <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded border bg-neutral-900 border-neutral-800 text-indigo-400">
            Platform Sandbox
          </span>
        </div>

        <div className="my-auto space-y-6 max-w-lg z-10 text-left">
          <p className="text-xs font-bold text-indigo-400 uppercase tracking-widest font-mono">
            Secure Session Gateway
          </p>
          <h1 className="text-4xl font-extrabold tracking-tight leading-tight text-white">
            Developer Financial Infrastructure, Built for Builders.
          </h1>
          <p className="text-neutral-400 text-sm leading-relaxed">
            One unified API client to manage customers, double-entry ledgers, wallets, multi-currency accounts, and payment settlements. Avoid managing complex point-to-point provider connections.
          </p>

          <div className="space-y-4 pt-4 border-t border-neutral-900 text-neutral-400 text-xs font-mono">
            <div className="flex items-start space-x-3">
              <div className="mt-1.5 h-1.5 w-1.5 rounded-full bg-indigo-500 shrink-0" />
              <p>
                <span className="text-white font-bold">Immutable Ledger:</span> Real-time, transaction-safe double-entry accounting engine.
              </p>
            </div>
            <div className="flex items-start space-x-3">
              <div className="mt-1.5 h-1.5 w-1.5 rounded-full bg-indigo-500 shrink-0" />
              <p>
                <span className="text-white font-bold">Event Streams:</span> Stripe-style webhook alerts with exponential backoffs.
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center justify-between text-xs text-neutral-600 z-10 font-mono">
          <span>© 2026 Ricarut Inc.</span>
          <a href="/docs" className="hover:text-neutral-400 transition-colors">
            Read platform specification
          </a>
        </div>
      </div>

      {/* Form Interaction Card Section */}
      <div className="flex flex-1 flex-col justify-center px-6 py-12 lg:px-20 bg-[#030303]">
        <div className="mx-auto w-full max-w-md">
          {/* Mobile view branding block */}
          <div className="flex items-center space-x-2 lg:hidden mb-8">
            <div className="flex h-8 w-8 items-center justify-center rounded bg-indigo-600 font-mono font-black text-white text-md">
              R
            </div>
            <span className="text-md font-bold tracking-tight text-white font-mono uppercase">Ricarut</span>
          </div>

          <div className="text-left space-y-2">
            <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white">
              Welcome back
            </h2>
            <p className="text-xs sm:text-sm text-neutral-400 leading-relaxed">
              Sign in to manage your sandbox projects, explore double-entry charts, and query integration logs.
            </p>
          </div>

          {/* Success Registration Notice */}
          {isRegistered && (
            <div className="mt-6 flex items-start space-x-3 rounded border border-indigo-950/60 bg-indigo-950/5 p-4 text-indigo-200/90 text-left select-none animate-fade-in font-mono">
              <CheckCircle2 className="h-4.5 w-4.5 text-indigo-400 shrink-0 mt-0.5 animate-bounce" />
              <div>
                <p className="text-[10px] font-bold uppercase tracking-wider text-indigo-400">Account created successfully</p>
                <p className="text-xs text-neutral-400 mt-1 leading-normal">
                  Your developer workspace has been reserved. Please enter your credentials below to authenticate.
                </p>
              </div>
            </div>
          )}

          {/* Session Expiry Notice */}
          {isExpired && (
            <div className="mt-6 flex items-start space-x-3 rounded border border-amber-950/60 bg-amber-950/5 p-4 text-amber-500/90 text-left select-none font-mono">
              <HelpCircle className="h-4.5 w-4.5 text-amber-500 shrink-0 mt-0.5" />
              <div>
                <p className="text-[10px] font-bold uppercase tracking-wider">Session expired</p>
                <p className="text-xs text-neutral-500 mt-1 leading-normal">
                  Your security session token has expired. Please log in again to continue building.
                </p>
              </div>
            </div>
          )}

          {/* Error Banner Panel */}
          {error && (
            <div className="mt-6 space-y-3 rounded border border-red-950/60 bg-red-950/5 p-4 text-red-200/90 text-left">
              <div className="flex items-start space-x-3">
                <ShieldAlert className="h-4 w-4 text-red-500 shrink-0 mt-0.5" />
                <div>
                  <p className="text-xs font-bold font-mono uppercase tracking-wider">Authentication failed</p>
                  <p className="text-xs text-red-300 mt-1">{error.message}</p>
                </div>
              </div>

              {error.requestId && (
                <div className="border-t border-red-950/40 pt-2 font-mono">
                  <button
                    type="button"
                    onClick={() => setShowErrorTrace(!showErrorTrace)}
                    className="flex items-center space-x-1.5 text-[10px] font-bold text-red-400 hover:text-red-300"
                  >
                    <Terminal className="h-3 w-3" />
                    <span>{showErrorTrace ? "Hide" : "Show"} developer diagnostic trace</span>
                  </button>
                  {showErrorTrace && (
                    <div className="mt-2 rounded bg-black p-2 font-mono text-[9px] text-neutral-400 overflow-x-auto select-all leading-relaxed">
                      <div className="flex justify-between border-b border-neutral-900 pb-1 mb-1 text-neutral-600">
                        <span>ERROR_CODE</span>
                        <span>REQUEST_ID</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-rose-500 font-semibold">{error.code}</span>
                        <span className="text-amber-500">{error.requestId}</span>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          <form onSubmit={handleSubmit} className="mt-6 space-y-4 text-left">
            <div>
              <label htmlFor="email" className="block text-[10px] font-bold text-neutral-400 uppercase tracking-wider font-mono">
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
                  placeholder="alex@startup.io"
                  className="block w-full rounded border border-neutral-900 bg-neutral-950/60 px-3.5 py-2 text-white placeholder:text-neutral-700 shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 text-xs transition-all font-mono"
                />
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between">
                <label htmlFor="password" className="block text-[10px] font-bold text-neutral-400 uppercase tracking-wider font-mono">
                  Password
                </label>
                <Link to="/forgot-password" className="text-[10px] font-bold text-neutral-500 hover:text-indigo-400 transition-colors font-mono">
                  Forgot password?
                </Link>
              </div>
              <div className="mt-1.5 relative">
                <input
                  id="password"
                  name="password"
                  type={showPassword ? "text" : "password"}
                  autoComplete="current-password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="block w-full rounded border border-neutral-900 bg-neutral-950/60 pl-3.5 pr-10 py-2 text-white placeholder:text-neutral-700 shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 text-xs transition-all font-mono"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-neutral-600 hover:text-neutral-400 focus:outline-none"
                  aria-label={showPassword ? "Hide password" : "Show password"}
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            <div className="pt-2">
              <button
                type="submit"
                disabled={isSubmitting}
                className="flex w-full justify-center items-center space-x-2 rounded bg-indigo-600 px-4 py-2.5 text-xs font-bold uppercase tracking-wider text-white shadow-sm hover:bg-indigo-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600 disabled:opacity-50 disabled:cursor-not-allowed transition-all active:scale-[0.98] font-mono cursor-pointer"
              >
                {isSubmitting ? (
                  <>
                    <div className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-white border-t-transparent" />
                    <span>Signing in...</span>
                  </>
                ) : (
                  <>
                    <KeyRound className="h-3.5 w-3.5" />
                    <span>Sign In</span>
                  </>
                )}
              </button>
            </div>
          </form>

          <p className="mt-6 text-center text-xs text-neutral-500 font-mono">
            Don't have an account?{" "}
            <Link to="/signup" className="font-bold text-indigo-400 hover:text-indigo-300 transition-colors">
              Create one
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
};
