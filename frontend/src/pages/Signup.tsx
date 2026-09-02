import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { api } from "../lib/api";
import type { ApiErrorPayload } from "../lib/api";
import { UserPlus, ShieldAlert, Terminal, Check, X, Eye, EyeOff, Sparkles } from "lucide-react";

export const Signup: React.FC = () => {
  const navigate = useNavigate();

  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const [error, setError] = useState<ApiErrorPayload | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showErrorTrace, setShowErrorTrace] = useState(false);

  // Real-time password criteria validations
  const hasMinLength = password.length >= 8;
  const hasUppercase = /[A-Z]/.test(password);
  const hasLowercase = /[a-z]/.test(password);
  const hasNumber = /[0-9]/.test(password);
  const isPasswordValid = hasMinLength && hasUppercase && hasLowercase && hasNumber;

  const doPasswordsMatch = password === confirmPassword && confirmPassword.length > 0;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setShowErrorTrace(false);

    // Strict front-end verification
    if (!fullName.trim()) {
      setError({
        code: "VALIDATION_ERROR",
        message: "Please enter your full name.",
      });
      return;
    }

    if (!isPasswordValid) {
      setError({
        code: "VALIDATION_ERROR",
        message: "Your password does not satisfy the secure platform criteria.",
      });
      return;
    }

    if (password !== confirmPassword) {
      setError({
        code: "VALIDATION_ERROR",
        message: "Password and Confirm Password do not match.",
      });
      return;
    }

    setIsSubmitting(true);

    // Split Full Name into firstName and lastName for the backend register endpoint
    const nameParts = fullName.trim().split(/\s+/);
    const firstName = nameParts[0] || "";
    const lastName = nameParts.slice(1).join(" ") || "Developer";

    try {
      await api.post("/api/v1/auth/register", {
        email: email.trim(),
        password,
        firstName,
        lastName,
      });

      // Redirect user to the login screen with a registration confirmation flag
      navigate("/login?registered=true");
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
            Core Ledger Infrastructure
          </p>
          <h1 className="text-4xl font-extrabold tracking-tight leading-tight text-white">
            Deploy Financial Services Instantly.
          </h1>
          <p className="text-neutral-400 text-sm leading-relaxed">
            Create an active developer account in under 60 seconds and start issuing test customer accounts, executing ledger transfers, and testing live webhook integrations immediately.
          </p>

          <div className="pt-6 border-t border-neutral-900">
            <div className="rounded-lg bg-neutral-950 p-4 border border-neutral-900 font-mono">
              <div className="flex items-center justify-between text-neutral-500 text-[10px] mb-2">
                <span>cURL Registration POST</span>
                <span className="text-indigo-400">api/v1/auth/register</span>
              </div>
              <pre className="text-[11px] text-neutral-300 overflow-x-auto select-all leading-relaxed">
                {`curl -X POST "https://api.ricarut.com/v1/auth/register" \\
  -H "Content-Type: application/json" \\
  -d '{
    "email": "developer@startup.io",
    "password": "SecurePassword123",
    "firstName": "Alex",
    "lastName": "Miller"
  }'`}
              </pre>
            </div>
          </div>
        </div>

        <div className="flex items-center justify-between text-xs text-neutral-600 z-10 font-mono">
          <span>© 2026 Ricarut Inc.</span>
          <a href="/docs" className="hover:text-neutral-400 transition-colors">
            Terms of Service
          </a>
        </div>
      </div>

      {/* Onboarding Interactive Card Section */}
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
              Create your developer account
            </h2>
            <p className="text-xs sm:text-sm text-neutral-400 leading-relaxed">
              Build financial products with Ricarut. Start modeling financial ledgers and generating sandbox transfers.
            </p>
          </div>

          {/* TEST MODE BANNER */}
          <div className="mt-5 flex items-center space-x-2.5 rounded border border-neutral-900 bg-neutral-950 p-3 text-amber-500/95 font-mono select-none">
            <Sparkles className="h-4 w-4 shrink-0" />
            <div className="text-left">
              <div className="text-[10px] font-bold uppercase tracking-wider">TEST MODE ACTIVE</div>
              <div className="text-[10px] text-neutral-500 mt-0.5 leading-normal">
                Start building and testing with the fully featured platform sandbox environment.
              </div>
            </div>
          </div>

          {/* Error Banner Panel */}
          {error && (
            <div className="mt-5 space-y-3 rounded border border-red-950/60 bg-red-950/5 p-4 text-red-200/90 text-left">
              <div className="flex items-start space-x-3">
                <ShieldAlert className="h-4 w-4 text-red-500 shrink-0 mt-0.5" />
                <div>
                  <p className="text-xs font-bold font-mono uppercase tracking-wider">Onboarding failed</p>
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
              <label htmlFor="fullName" className="block text-[10px] font-bold text-neutral-400 uppercase tracking-wider font-mono">
                Full name
              </label>
              <div className="mt-1.5">
                <input
                  id="fullName"
                  name="fullName"
                  type="text"
                  required
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="Alexander Mfoniso"
                  className="block w-full rounded border border-neutral-900 bg-neutral-950/60 px-3.5 py-2 text-white placeholder:text-neutral-700 shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 text-xs transition-all font-mono"
                />
              </div>
            </div>

            <div>
              <label htmlFor="email" className="block text-[10px] font-bold text-neutral-400 uppercase tracking-wider font-mono">
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
                  className="block w-full rounded border border-neutral-900 bg-neutral-950/60 px-3.5 py-2 text-white placeholder:text-neutral-700 shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 text-xs transition-all font-mono"
                />
              </div>
            </div>

            <div>
              <label htmlFor="password" className="block text-[10px] font-bold text-neutral-400 uppercase tracking-wider font-mono">
                Secure Password
              </label>
              <div className="mt-1.5 relative">
                <input
                  id="password"
                  name="password"
                  type={showPassword ? "text" : "password"}
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

              {/* Password Requirement indicators */}
              <div className="mt-3 rounded border border-neutral-900 bg-neutral-950/30 p-3 space-y-1.5 font-mono">
                <p className="text-[9px] font-bold text-neutral-500 uppercase tracking-wider">
                  Password strength constraints
                </p>
                <div className="grid grid-cols-2 gap-2 text-[10px]">
                  <div className="flex items-center space-x-1.5">
                    {hasMinLength ? (
                      <Check className="h-3.5 w-3.5 text-indigo-400 shrink-0" />
                    ) : (
                      <X className="h-3.5 w-3.5 text-neutral-700 shrink-0" />
                    )}
                    <span className={hasMinLength ? "text-neutral-300" : "text-neutral-500"}>
                      Min 8 characters
                    </span>
                  </div>
                  <div className="flex items-center space-x-1.5">
                    {hasUppercase ? (
                      <Check className="h-3.5 w-3.5 text-indigo-400 shrink-0" />
                    ) : (
                      <X className="h-3.5 w-3.5 text-neutral-700 shrink-0" />
                    )}
                    <span className={hasUppercase ? "text-neutral-300" : "text-neutral-500"}>
                      Uppercase letter
                    </span>
                  </div>
                  <div className="flex items-center space-x-1.5">
                    {hasLowercase ? (
                      <Check className="h-3.5 w-3.5 text-indigo-400 shrink-0" />
                    ) : (
                      <X className="h-3.5 w-3.5 text-neutral-700 shrink-0" />
                    )}
                    <span className={hasLowercase ? "text-neutral-300" : "text-neutral-500"}>
                      Lowercase letter
                    </span>
                  </div>
                  <div className="flex items-center space-x-1.5">
                    {hasNumber ? (
                      <Check className="h-3.5 w-3.5 text-indigo-400 shrink-0" />
                    ) : (
                      <X className="h-3.5 w-3.5 text-neutral-700 shrink-0" />
                    )}
                    <span className={hasNumber ? "text-neutral-300" : "text-neutral-500"}>
                      One numeric digit
                    </span>
                  </div>
                </div>
              </div>
            </div>

            <div>
              <label htmlFor="confirmPassword" className="block text-[10px] font-bold text-neutral-400 uppercase tracking-wider font-mono">
                Confirm Password
              </label>
              <div className="mt-1.5 relative">
                <input
                  id="confirmPassword"
                  name="confirmPassword"
                  type={showConfirmPassword ? "text" : "password"}
                  required
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="••••••••"
                  className="block w-full rounded border border-neutral-900 bg-neutral-950/60 pl-3.5 pr-10 py-2 text-white placeholder:text-neutral-700 shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 text-xs transition-all font-mono"
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-neutral-600 hover:text-neutral-400 focus:outline-none"
                  aria-label={showConfirmPassword ? "Hide confirm password" : "Show confirm password"}
                >
                  {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>

              {confirmPassword.length > 0 && (
                <div className="mt-2 text-[10px] font-mono flex items-center space-x-1">
                  {doPasswordsMatch ? (
                    <>
                      <Check className="h-3.5 w-3.5 text-indigo-400" />
                      <span className="text-neutral-400">Passwords match perfectly</span>
                    </>
                  ) : (
                    <>
                      <X className="h-3.5 w-3.5 text-red-500" />
                      <span className="text-red-400 font-bold">Passwords do not match yet</span>
                    </>
                  )}
                </div>
              )}
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
                    <span>Creating account...</span>
                  </>
                ) : (
                  <>
                    <UserPlus className="h-3.5 w-3.5" />
                    <span>Create Developer Account</span>
                  </>
                )}
              </button>
            </div>
          </form>

          <p className="mt-6 text-center text-xs text-neutral-500 font-mono">
            Already have an account?{" "}
            <Link to="/login" className="font-bold text-indigo-400 hover:text-indigo-300 transition-colors">
              Log in
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
};
