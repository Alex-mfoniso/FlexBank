import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useApp } from "../context/AppContext";
import { api } from "../lib/api";
import type { ApiErrorPayload } from "../lib/api";
import { UserPlus, ShieldAlert, Terminal, Check, X } from "lucide-react";

export const Signup: React.FC = () => {
  const { login } = useApp();
  const navigate = useNavigate();

  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<ApiErrorPayload | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showErrorTrace, setShowErrorTrace] = useState(false);

  // Real-time password criteria validations
  const hasMinLength = password.length >= 8;
  const hasUppercase = /[A-Z]/.test(password);
  const hasLowercase = /[a-z]/.test(password);
  const hasNumber = /[0-9]/.test(password);

  const isPasswordValid = hasMinLength && hasUppercase && hasLowercase && hasNumber;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setShowErrorTrace(false);

    if (!isPasswordValid) {
      setError({
        code: "VALIDATION_ERROR",
        message: "Your password does not satisfy the secure platform criteria.",
      });
      return;
    }

    setIsSubmitting(true);

    try {
      const response = await api.post("/api/v1/auth/register", {
        email,
        password,
        firstName,
        lastName,
      });

      const { token, user } = response.data;
      
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
      {/* Visual Technical Panel */}
      <div className="hidden lg:flex lg:w-1/2 flex-col justify-between bg-slate-900 text-white p-12 relative overflow-hidden">
        <div className="absolute inset-0 opacity-10 bg-[linear-gradient(to_right,#808080_1px,transparent_1px),linear-gradient(to_bottom,#808080_1px,transparent_1px)] bg-[size:24px_24px]" />
        
        <div className="flex items-center space-x-3 z-10">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-indigo-500 font-bold text-xl shadow-lg shadow-indigo-500/30">
            F
          </div>
          <span className="text-xl font-bold tracking-tight">FlexBank</span>
          <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-slate-800 text-indigo-400 border border-slate-700">
            Developer MVP
          </span>
        </div>

        <div className="my-auto space-y-6 max-w-lg z-10">
          <h1 className="text-4xl font-extrabold tracking-tight leading-tight">
            Deploy Financial Services Instantly.
          </h1>
          <p className="text-slate-400 leading-relaxed">
            Create an active developer account in under 60 seconds and start issuing test customer accounts, executing ledger transfers, and testing live webhook integrations immediately.
          </p>

          <div className="pt-6 border-t border-slate-800">
            <div className="rounded-lg bg-slate-800/50 p-4 border border-slate-800/80">
              <span className="font-mono text-xs text-indigo-400">cURL GET check</span>
              <pre className="mt-2 font-mono text-[11px] text-slate-300 overflow-x-auto">
                {`curl -X GET "https://api.flexbank.dev/v1/ready" \\
  -H "Authorization: Bearer fb_test_..."`}
              </pre>
            </div>
          </div>
        </div>

        <div className="flex items-center justify-between text-xs text-slate-500 z-10">
          <span>© 2026 FlexBank Inc.</span>
          <a href="/docs" className="hover:text-slate-300 transition-colors">
            Terms of Service
          </a>
        </div>
      </div>

      {/* Onboarding Interactive Card Section */}
      <div className="flex flex-1 flex-col justify-center px-6 py-12 lg:px-20 bg-slate-50">
        <div className="mx-auto w-full max-w-md">
          <div className="flex items-center space-x-2 lg:hidden mb-8">
            <div className="flex h-8 w-8 items-center justify-center rounded-md bg-indigo-600 font-bold text-white text-md">
              F
            </div>
            <span className="text-lg font-bold tracking-tight text-slate-900">FlexBank</span>
          </div>

          <h2 className="text-3xl font-extrabold tracking-tight text-slate-900">
            Create your account
          </h2>
          <p className="mt-2 text-sm text-slate-600">
            Start modeling financial ledgers and generating sandbox transfers.
          </p>

          {/* Error Banner Panel */}
          {error && (
            <div className="mt-6 space-y-3 rounded-lg bg-red-50 p-4 border border-red-200 text-red-800">
              <div className="flex items-start space-x-3">
                <ShieldAlert className="h-5 w-5 text-red-500 shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-bold">Onboarding failed</p>
                  <p className="text-xs text-red-700 mt-1">{error.message}</p>
                </div>
              </div>

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

          <form onSubmit={handleSubmit} className="mt-8 space-y-5">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label htmlFor="firstName" className="block text-sm font-semibold text-slate-700">
                  First name
                </label>
                <div className="mt-1.5">
                  <input
                    id="firstName"
                    name="firstName"
                    type="text"
                    required
                    value={firstName}
                    onChange={(e) => setFirstName(e.target.value)}
                    placeholder="Alex"
                    className="block w-full rounded-lg border border-slate-300 bg-white px-4 py-2 text-slate-900 placeholder:text-slate-400 shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 sm:text-sm transition-all"
                  />
                </div>
              </div>

              <div>
                <label htmlFor="lastName" className="block text-sm font-semibold text-slate-700">
                  Last name
                </label>
                <div className="mt-1.5">
                  <input
                    id="lastName"
                    name="lastName"
                    type="text"
                    required
                    value={lastName}
                    onChange={(e) => setLastName(e.target.value)}
                    placeholder="Miller"
                    className="block w-full rounded-lg border border-slate-300 bg-white px-4 py-2 text-slate-900 placeholder:text-slate-400 shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 sm:text-sm transition-all"
                  />
                </div>
              </div>
            </div>

            <div>
              <label htmlFor="email" className="block text-sm font-semibold text-slate-700">
                Work email address
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
                  className="block w-full rounded-lg border border-slate-300 bg-white px-4 py-2 text-slate-900 placeholder:text-slate-400 shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 sm:text-sm transition-all"
                />
              </div>
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-semibold text-slate-700">
                Secure API account password
              </label>
              <div className="mt-1.5">
                <input
                  id="password"
                  name="password"
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="block w-full rounded-lg border border-slate-300 bg-white px-4 py-2 text-slate-900 placeholder:text-slate-400 shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 sm:text-sm transition-all"
                />
              </div>

              {/* Password Requirement checklist indicators */}
              <div className="mt-3 rounded-lg border border-slate-200 bg-slate-50 p-3 space-y-1.5">
                <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                  Password strength constraints
                </p>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div className="flex items-center space-x-1.5">
                    {hasMinLength ? (
                      <Check className="h-3.5 w-3.5 text-emerald-500 shrink-0" />
                    ) : (
                      <X className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                    )}
                    <span className={hasMinLength ? "text-slate-700 font-medium" : "text-slate-500"}>
                      Min 8 characters
                    </span>
                  </div>
                  <div className="flex items-center space-x-1.5">
                    {hasUppercase ? (
                      <Check className="h-3.5 w-3.5 text-emerald-500 shrink-0" />
                    ) : (
                      <X className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                    )}
                    <span className={hasUppercase ? "text-slate-700 font-medium" : "text-slate-500"}>
                      Uppercase letter
                    </span>
                  </div>
                  <div className="flex items-center space-x-1.5">
                    {hasLowercase ? (
                      <Check className="h-3.5 w-3.5 text-emerald-500 shrink-0" />
                    ) : (
                      <X className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                    )}
                    <span className={hasLowercase ? "text-slate-700 font-medium" : "text-slate-500"}>
                      Lowercase letter
                    </span>
                  </div>
                  <div className="flex items-center space-x-1.5">
                    {hasNumber ? (
                      <Check className="h-3.5 w-3.5 text-emerald-500 shrink-0" />
                    ) : (
                      <X className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                    )}
                    <span className={hasNumber ? "text-slate-700 font-medium" : "text-slate-500"}>
                      One numeric digit
                    </span>
                  </div>
                </div>
              </div>
            </div>

            <div className="pt-2">
              <button
                type="submit"
                disabled={isSubmitting}
                className="flex w-full justify-center items-center space-x-2 rounded-lg bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-indigo-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
              >
                {isSubmitting ? (
                  <>
                    <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                    <span>Registering workspace...</span>
                  </>
                ) : (
                  <>
                    <UserPlus className="h-4 w-4" />
                    <span>Create Developer Account</span>
                  </>
                )}
              </button>
            </div>
          </form>

          <p className="mt-8 text-center text-sm text-slate-600">
            Already have an account?{" "}
            <Link to="/login" className="font-semibold text-indigo-600 hover:text-indigo-500 transition-colors">
              Sign in instead
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
};
