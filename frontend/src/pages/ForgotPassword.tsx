import React, { useState } from "react";
import { Link } from "react-router-dom";
import { AlertCircle, ArrowLeft, Mail, ShieldAlert } from "lucide-react";

export const ForgotPassword: React.FC = () => {
  const [email, setEmail] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsSubmitting(true);

    // Simulate standard connection latency and then report the actual backend limitation
    setTimeout(() => {
      setIsSubmitting(false);
      setError(
        "Password reset SMTP capability is currently not implemented on the backend server. Please contact your system administrator to perform a manual ledger credentials overwrite."
      );
    }, 1000);
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-[#030303] text-white px-6">
      <div className="absolute inset-0 opacity-5 bg-dot-pattern pointer-events-none" />
      <div className="absolute -top-40 -left-40 w-80 h-80 bg-indigo-500/10 rounded-full blur-[120px]" />

      <div className="w-full max-w-md rounded-lg border border-neutral-900 bg-neutral-950/60 p-8 shadow-2xl relative z-10 text-left">
        
        {/* Back Link */}
        <Link
          to="/login"
          className="inline-flex items-center space-x-2 text-xs font-bold text-neutral-500 hover:text-indigo-400 transition-colors mb-6 font-mono"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          <span>Back to log in</span>
        </Link>

        <div className="space-y-2">
          <h2 className="text-xl sm:text-2xl font-extrabold text-white">
            Forgot password?
          </h2>
          <p className="text-xs text-neutral-400 leading-relaxed font-mono">
            Enter your developer email address to request a secure credential reset link.
          </p>
        </div>

        {error && (
          <div className="mt-5 space-y-3 rounded border border-rose-950/60 bg-rose-950/5 p-4 text-rose-200/90">
            <div className="flex items-start space-x-3">
              <ShieldAlert className="h-4.5 w-4.5 text-rose-500 shrink-0 mt-0.5" />
              <div className="space-y-1">
                <p className="text-xs font-bold uppercase tracking-wider font-mono text-rose-400">SMTP Server Offline</p>
                <p className="text-xs text-neutral-400 leading-relaxed font-medium">{error}</p>
              </div>
            </div>
          </div>
        )}

        <form onSubmit={handleSubmit} className="mt-6 space-y-4 font-mono">
          <div>
            <label htmlFor="email" className="block text-[10px] font-bold text-neutral-400 uppercase tracking-wider">
              Work email address
            </label>
            <div className="mt-1.5">
              <input
                id="email"
                name="email"
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="alex@startup.io"
                className="block w-full rounded border border-neutral-900 bg-neutral-950/60 px-3.5 py-2 text-white placeholder:text-neutral-700 shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 text-xs transition-all"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={isSubmitting}
            className="flex w-full justify-center items-center space-x-2 rounded bg-indigo-600 px-4 py-2.5 text-xs font-bold uppercase tracking-wider text-white shadow-sm hover:bg-indigo-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600 disabled:opacity-50 disabled:cursor-not-allowed transition-all active:scale-[0.98] cursor-pointer"
          >
            {isSubmitting ? (
              <>
                <div className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-white border-t-transparent" />
                <span>Requesting reset...</span>
              </>
            ) : (
              <>
                <Mail className="h-3.5 w-3.5" />
                <span>Send Reset Link</span>
              </>
            )}
          </button>
        </form>

        <p className="mt-6 text-center text-xs text-neutral-600 font-mono">
          Need database support? Open an active GitHub issue context.
        </p>
      </div>
    </div>
  );
};
