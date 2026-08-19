import React, { useEffect, useState } from "react";
import { api } from "../lib/api";
import { useApp } from "../context/AppContext";
import { formatMoney, formatDate } from "../utils/format";
import { SkeletonLoader } from "../components/SkeletonLoader";
import {
  Beaker,
  AlertTriangle,
  Coins,
  Send,
  Trash2,
  RefreshCw,
  CheckCircle,
  HelpCircle,
  TrendingUp,
  Sliders,
  Wallet,
  ArrowRight,
  Info,
  Layers,
  History,
} from "lucide-react";

export const Sandbox: React.FC = () => {
  const { selectedProjectId, environment } = useApp();

  const [accounts, setAccounts] = useState<any[]>([]);
  const [transfers, setTransfers] = useState<any[]>([]);
  const [fundingHistory, setFundingHistory] = useState<any[]>([]);
  
  const [isLoading, setIsLoading] = useState(true);
  const [isHistoryLoading, setIsHistoryLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Funding form state
  const [fundAccountId, setFundAccountId] = useState("");
  const [fundAmountStr, setFundAmountStr] = useState("");
  const [isFunding, setIsFunding] = useState(false);
  
  // Successful funding receipt data
  const [lastFundResult, setLastFundResult] = useState<{
    amount: number;
    currency: string;
    accountId: string;
    accountName: string;
    transactionId: string;
    newBalance: number;
  } | null>(null);

  // Transfer simulation state
  const [simTransferId, setSimTransferId] = useState("");
  const [simScenario, setSimScenario] = useState("successful_transfer");
  const [isSimulating, setIsSimulating] = useState(false);
  const [simSuccessMsg, setSimSuccessMsg] = useState<string | null>(null);

  // Reset state
  const [confirmResetText, setConfirmResetText] = useState("");
  const [isResetting, setIsResetting] = useState(false);
  const [resetSuccessMsg, setResetSuccessMsg] = useState<string | null>(null);

  const loadSandboxData = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const [accRes, transRes] = await Promise.all([
        api.get("/api/v1/accounts"),
        api.get("/api/v1/transfers"),
      ]);

      const accList = accRes.data.accounts || accRes.data.data || [];
      setAccounts(accList);
      
      // Auto-select first account if none selected
      if (accList.length > 0 && !fundAccountId) {
        setFundAccountId(accList[0].id);
      }

      const allTransfers = transRes.data.transfers || transRes.data.data || [];
      // Filter non-terminal transfers that can actually be simulated
      const pendingTransfers = allTransfers.filter((t: any) =>
        ["created", "pending", "processing"].includes(t.status?.toLowerCase())
      );
      setTransfers(pendingTransfers);
      if (pendingTransfers.length > 0 && !simTransferId) {
        setSimTransferId(pendingTransfers[0].id);
      }
    } catch (err: any) {
      console.error("Failed to load sandbox options", err);
      setError(err.message || "Failed to retrieve sandbox workspace states.");
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * Queries double-entry journal postings for the selected account
   * to construct an authentic, live sandbox funding operations history log.
   */
  const loadFundingHistory = async (accId: string) => {
    if (!accId) return;
    setIsHistoryLoading(true);
    try {
      const res = await api.get(`/api/v1/accounts/${accId}/ledger`, { params: { limit: 20 } });
      const ledgerEntries = res.data.data || [];
      
      // Filter entries representing sandbox funding adjustments
      const fundingTxns = ledgerEntries.filter((ent: any) => 
        ent.journal?.type === "adjustment" || 
        ent.journal?.reference?.startsWith("sandbox_fund_")
      );
      setFundingHistory(fundingTxns);
    } catch (err) {
      console.error("Failed to load ledger funding history", err);
    } finally {
      setIsHistoryLoading(false);
    }
  };

  useEffect(() => {
    if (selectedProjectId && environment === "test") {
      loadSandboxData();
    }
  }, [selectedProjectId, environment]);

  useEffect(() => {
    if (fundAccountId && environment === "test") {
      loadFundingHistory(fundAccountId);
    }
  }, [fundAccountId, environment]);

  const handleFundAccount = async (e: React.FormEvent) => {
    e.preventDefault();
    setLastFundResult(null);
    const amountVal = parseFloat(fundAmountStr);
    if (isNaN(amountVal) || amountVal <= 0) {
      alert("Please enter a valid positive funding amount.");
      return;
    }

    setIsFunding(true);
    const minorAmount = Math.round(amountVal * 100);

    try {
      const res = await api.post(`/api/v1/test/accounts/${fundAccountId}/fund`, {
        amount: minorAmount,
      });

      const updatedAccount = res.data.data;
      const targetAccObj = accounts.find(a => a.id === fundAccountId);

      // Query ledger right after to pinpoint the specific Journal Transaction ID
      let txnId = "N/A (Pending Journal Settlement)";
      try {
        const ledgerRes = await api.get(`/api/v1/accounts/${fundAccountId}/ledger`, { params: { limit: 5 } });
        const latestEntry = ledgerRes.data.data?.[0];
        if (latestEntry && latestEntry.journal) {
          txnId = latestEntry.journalId || latestEntry.journal.id;
        }
      } catch (lErr) {
        console.warn("Could not retrieve latest transaction journal ID from book line", lErr);
      }

      setLastFundResult({
        amount: minorAmount,
        currency: updatedAccount.currency,
        accountId: fundAccountId,
        accountName: targetAccObj?.name || "Workspace Wallet",
        transactionId: txnId,
        newBalance: updatedAccount.available,
      });

      setFundAmountStr("");
      
      // Reload lists and active histories
      await loadSandboxData();
      await loadFundingHistory(fundAccountId);
    } catch (err: any) {
      console.error("Funding operation failed", err);
      alert(err.response?.data?.message || err.message || "Sandbox wallet funding rejected.");
    } finally {
      setIsFunding(false);
    }
  };

  const handleSimulateTransfer = async (e: React.FormEvent) => {
    e.preventDefault();
    setSimSuccessMsg(null);
    if (!simTransferId) return;

    setIsSimulating(true);
    try {
      await api.post(`/api/v1/test/transfers/${simTransferId}/simulate`, {
        scenario: simScenario,
      });

      setSimSuccessMsg(`Transfer simulator outcome '${simScenario}' executed successfully! Status updated.`);
      setSimTransferId("");
      
      await loadSandboxData();
    } catch (err: any) {
      console.error("Simulation failed", err);
      alert(err.response?.data?.message || err.message || "Mock payout scenario simulation rejected.");
    } finally {
      setIsSimulating(false);
    }
  };

  const handleResetSandbox = async (e: React.FormEvent) => {
    e.preventDefault();
    setResetSuccessMsg(null);
    if (confirmResetText !== "RESET") {
      alert("Please type 'RESET' exactly to authorize.");
      return;
    }

    if (!window.confirm("CRITICAL WARNING: This action permanently wipes ALL records (customers, accounts, ledgers, transfers, webhooks, request logs) for this test project. This cannot be undone. Proceed?")) {
      return;
    }

    setIsResetting(true);
    try {
      await api.post("/api/v1/test/reset");
      setResetSuccessMsg("Database successfully wiped! Your test environment is fresh and clean.");
      setConfirmResetText("");
      setFundingHistory([]);
      setLastFundResult(null);
      
      await loadSandboxData();
    } catch (err: any) {
      console.error("Reset operation failed", err);
      alert(err.response?.data?.message || err.message || "Failed to clear sandbox database state.");
    } finally {
      setIsResetting(false);
    }
  };

  if (environment !== "test") {
    return (
      <div className="rounded-xl border border-amber-200 bg-amber-50 p-6 text-center shadow-xs max-w-lg mx-auto mt-12 space-y-4">
        <AlertTriangle className="mx-auto h-12 w-12 text-amber-500 animate-pulse" />
        <h3 className="text-md font-bold text-slate-900">Sandbox Console Disabled</h3>
        <p className="text-xs text-slate-500 leading-relaxed">
          Sandbox simulator tools are strictly locked and restricted in the <b>LIVE environment</b> to protect audit records. Toggle your sidebar environment mode to <b>TEST</b> to access simulator functions.
        </p>
      </div>
    );
  }

  if (isLoading) {
    return <SkeletonLoader rows={4} columns={4} />;
  }

  return (
    <div className="space-y-8">
      {/* Header section */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center pb-5 border-b border-slate-200">
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight text-slate-900 flex items-center gap-2">
            <Beaker className="h-6 w-6 text-indigo-600" />
            Sandbox Developer Workbench
          </h1>
          <p className="text-xs text-slate-500 font-semibold mt-1">
            Test FlexBank integrations without moving real money.
          </p>
        </div>
        <div className="mt-4 sm:mt-0 shrink-0">
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-indigo-50 border border-indigo-200 text-indigo-700 uppercase tracking-wide">
            <span className="h-2 w-2 rounded-full bg-indigo-500 animate-pulse" />
            test mode active
          </span>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        
        {/* LEFT COLUMN: FUNDING SIMULATOR & HISTORY */}
        <div className="space-y-8">
          {/* A. Funding form */}
          <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-3xs flex flex-col justify-between">
            <form onSubmit={handleFundAccount} className="space-y-4">
              <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider flex items-center space-x-2 pb-3 border-b border-slate-100">
                <Coins className="h-4.5 w-4.5 text-indigo-500" />
                <span>Issue Sandbox Credits</span>
              </h3>

              <div className="rounded-lg bg-amber-50/55 p-3 border border-amber-200 text-[11px] font-semibold text-amber-800 leading-normal flex items-start gap-2">
                <Info className="h-4 w-4 shrink-0 mt-0.5 text-amber-600" />
                <span>This creates simulated test funds for development purposes. No real money is moved.</span>
              </div>

              {/* Receipt popup alert */}
              {lastFundResult && (
                <div className="rounded-lg bg-emerald-50 p-4 border border-emerald-200 text-emerald-800 text-xs space-y-2">
                  <div className="flex items-center space-x-1.5 font-bold">
                    <CheckCircle className="h-4.5 w-4.5 text-emerald-500 shrink-0" />
                    <span>Funding Successful</span>
                  </div>
                  <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-[11px] font-semibold border-t border-emerald-100 pt-2 font-mono">
                    <span className="text-emerald-600">Credited Amount:</span>
                    <span className="text-slate-900 text-right">{formatMoney(lastFundResult.amount, lastFundResult.currency)}</span>
                    
                    <span className="text-emerald-600">Target Account:</span>
                    <span className="text-slate-900 text-right truncate" title={lastFundResult.accountId}>{lastFundResult.accountName}</span>
                    
                    <span className="text-emerald-600">Transaction ID:</span>
                    <span className="text-slate-900 text-right select-all truncate" title={lastFundResult.transactionId}>{lastFundResult.transactionId}</span>
                    
                    <span className="text-emerald-600">New Balance:</span>
                    <span className="text-slate-900 text-right font-bold">{formatMoney(lastFundResult.newBalance, lastFundResult.currency)}</span>
                  </div>
                </div>
              )}

              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                  Target Financial Account Wallet
                </label>
                {accounts.length === 0 ? (
                  <p className="text-xs text-rose-500 font-bold mt-2">
                    No financial accounts available in this project. Create a customer and issue a wallet account first!
                  </p>
                ) : (
                  <select
                    value={fundAccountId}
                    onChange={(e) => setFundAccountId(e.target.value)}
                    className="mt-1.5 block w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 font-semibold"
                  >
                    {accounts.map((acc) => (
                      <option key={acc.id} value={acc.id}>
                        {acc.name} ({acc.currency}) • Available: {formatMoney(acc.available, acc.currency)}
                      </option>
                    ))}
                  </select>
                )}
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                  Funding Amount (Major Units) *
                </label>
                <div className="relative mt-1.5 rounded-lg shadow-3xs">
                  <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                    <span className="text-slate-400 text-xs font-bold">₦</span>
                  </div>
                  <input
                    type="number"
                    step="0.01"
                    required
                    disabled={accounts.length === 0}
                    value={fundAmountStr}
                    onChange={(e) => setFundAmountStr(e.target.value)}
                    placeholder="100,000.00"
                    className="block w-full rounded-lg border border-slate-300 bg-white pl-8 pr-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 transition-all font-bold"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={isFunding || accounts.length === 0}
                className="w-full flex justify-center items-center rounded-lg bg-indigo-600 px-4 py-2 text-xs font-bold text-white hover:bg-indigo-500 shadow-sm transition-all disabled:opacity-50 cursor-pointer"
              >
                {isFunding ? (
                  <>
                    <RefreshCw className="h-3.5 w-3.5 animate-spin mr-1.5" />
                    <span>Funding...</span>
                  </>
                ) : (
                  <span>Fund Account</span>
                )}
              </button>
            </form>
          </div>

          {/* B. Funding History logs */}
          <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-3xs space-y-4">
            <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider flex items-center space-x-2 pb-3 border-b border-slate-100">
              <History className="h-4.5 w-4.5 text-indigo-500" />
              <span>Recent Funding History</span>
            </h3>

            {isHistoryLoading ? (
              <div className="py-6 text-center text-xs text-slate-400 font-semibold animate-pulse flex items-center justify-center gap-1.5">
                <RefreshCw className="h-4.5 w-4.5 animate-spin" />
                Loading double-entry ledger audits...
              </div>
            ) : fundingHistory.length === 0 ? (
              <p className="text-xs text-slate-400 font-semibold italic text-center py-6">
                No recent sandbox funding operations registered for this account wallet.
              </p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs font-mono">
                  <thead>
                    <tr className="border-b border-slate-100 text-slate-400 font-bold uppercase text-[10px]">
                      <th className="pb-2">Transaction ID</th>
                      <th className="pb-2">Amount</th>
                      <th className="pb-2 text-center">Status</th>
                      <th className="pb-2 text-right">Created</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50 font-semibold text-slate-600">
                    {fundingHistory.map((ent) => (
                      <tr key={ent.id} className="hover:bg-slate-50/50">
                        <td className="py-2.5 pr-2 select-all font-mono font-bold text-slate-800" title={ent.journalId}>
                          {ent.journalId?.slice(0, 15)}...
                        </td>
                        <td className="py-2.5 pr-2 text-slate-900 font-bold">
                          {formatMoney(ent.amount, ent.currency)}
                        </td>
                        <td className="py-2.5 pr-2 text-center">
                          <span className="px-1.5 py-0.5 rounded text-[10px] bg-emerald-50 border border-emerald-100 text-emerald-700 uppercase font-mono">
                            {ent.journal?.status || "posted"}
                          </span>
                        </td>
                        <td className="py-2.5 text-right text-slate-400 font-medium">
                          {formatDate(ent.createdAt)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
            <div className="text-[10px] font-semibold text-slate-400 leading-normal bg-slate-50 rounded-lg p-2.5 border border-slate-100">
              <span className="font-bold text-slate-500">Note: </span>
              A project-wide sandbox event list endpoint is missing (Contract Mismatch). Funding operations are queried using direct double-entry ledger listings scoped to the active customer account context.
            </div>
          </div>
        </div>

        {/* RIGHT COLUMN: PROVIDER TRANSFERS SIMULATOR */}
        <div className="space-y-8">
          {/* C. Transfer Outcomes Box */}
          <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-3xs flex flex-col justify-between">
            <form onSubmit={handleSimulateTransfer} className="space-y-4">
              <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider flex items-center space-x-2 pb-3 border-b border-slate-100">
                <Sliders className="h-4.5 w-4.5 text-indigo-500" />
                <span>Simulate Transfer Outcomes</span>
              </h3>

              {simSuccessMsg && (
                <div className="flex items-center space-x-2 rounded-lg bg-emerald-50 p-2.5 border border-emerald-200 text-emerald-800 text-xs font-bold leading-normal">
                  <CheckCircle className="h-4.5 w-4.5 text-emerald-500 shrink-0" />
                  <span>{simSuccessMsg}</span>
                </div>
              )}

              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                  Active Non-Terminal Transfer
                </label>
                {transfers.length === 0 ? (
                  <div className="mt-1.5 rounded-lg border border-dashed border-slate-200 p-6 text-center bg-slate-50 text-slate-400 text-xs font-semibold">
                    No pending/processing transfers found. Initiate a transfer from the transfers interface first!
                  </div>
                ) : (
                  <select
                    value={simTransferId}
                    onChange={(e) => setSimTransferId(e.target.value)}
                    className="mt-1.5 block w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 font-semibold"
                  >
                    {transfers.map((t) => (
                      <option key={t.id} value={t.id}>
                        Ref: {t.reference} • {formatMoney(t.amount, t.currency)} ({t.id?.slice(0, 12)}...)
                      </option>
                    ))}
                  </select>
                )}
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                  Simulated Outcome Scenario
                </label>
                <select
                  value={simScenario}
                  disabled={transfers.length === 0}
                  onChange={(e) => setSimScenario(e.target.value)}
                  className="mt-1.5 block w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 font-semibold"
                >
                  <option value="successful_transfer">SUCCESS - Settle and Credit Beneficiary Account</option>
                  <option value="failed_transfer">FAILED - Terminate and Reverse Escrow Reserves</option>
                  <option value="provider_rejected">REJECTED - Simulate Instant Network API Rejection</option>
                  <option value="provider_timeout">TIMEOUT - Simulates Delivery Timeout / Maintain Pending</option>
                  <option disabled value="insufficient_funds">INSUFFICIENT_FUNDS (Disabled - Backend Mismatch)</option>
                  <option disabled value="reversed">REVERSED (Disabled - Backend Mismatch)</option>
                </select>
              </div>

              <button
                type="submit"
                disabled={isSimulating || transfers.length === 0}
                className="w-full flex justify-center items-center rounded-lg bg-indigo-600 px-4 py-2 text-xs font-bold text-white hover:bg-indigo-500 shadow-sm transition-all disabled:opacity-50 cursor-pointer"
              >
                {isSimulating ? (
                  <>
                    <RefreshCw className="h-3.5 w-3.5 animate-spin mr-1.5" />
                    <span>Processing scenario simulation...</span>
                  </>
                ) : (
                  <span>Simulate Scenario</span>
                )}
              </button>
            </form>
          </div>

          {/* D. Sandbox Reset Safety Control Center */}
          <div className="rounded-xl border border-red-200 bg-red-50/15 p-6 shadow-3xs space-y-4">
            <form onSubmit={handleResetSandbox} className="space-y-4">
              <h3 className="text-sm font-bold text-rose-800 uppercase tracking-wider flex items-center space-x-2 pb-3 border-b border-rose-100">
                <Trash2 className="h-4.5 w-4.5 text-rose-500 animate-bounce" />
                <span>Danger Zone: Reset Sandbox Workspace</span>
              </h3>

              <div className="rounded-lg bg-rose-50 border border-rose-150 p-3.5 text-rose-800 text-[11px] font-semibold leading-relaxed flex items-start gap-2">
                <AlertTriangle className="h-4.5 w-4.5 text-rose-600 shrink-0 mt-0.5" />
                <span>
                  Wiping sandbox data resets all digital profiles (customers, financial wallets, double-entry ledgers, webhook configurations, logs) for this test project. <b>This operation is 100% irreversible</b>.
                </span>
              </div>

              {resetSuccessMsg && (
                <div className="flex items-center space-x-2 rounded-lg bg-emerald-50 p-2.5 border border-emerald-200 text-emerald-800 text-xs font-bold leading-normal">
                  <CheckCircle className="h-4.5 w-4.5 text-emerald-500 shrink-0" />
                  <span>{resetSuccessMsg}</span>
                </div>
              )}

              <div className="flex flex-col sm:flex-row gap-4 items-end">
                <div className="flex-1 space-y-1.5">
                  <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                    Type <span className="font-mono text-rose-600 font-extrabold select-all">RESET</span> to authorize destruction
                  </label>
                  <input
                    type="text"
                    required
                    value={confirmResetText}
                    onChange={(e) => setConfirmResetText(e.target.value)}
                    placeholder="RESET"
                    className="block w-full rounded-lg border border-red-200 bg-white px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:border-red-500 focus:outline-none focus:ring-1 focus:ring-red-500 font-mono font-bold"
                  />
                </div>

                <button
                  type="submit"
                  disabled={isResetting || confirmResetText !== "RESET"}
                  className="rounded-lg bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs px-6 py-2.5 shadow-sm transition-all disabled:opacity-50 shrink-0 cursor-pointer"
                >
                  {isResetting ? "Wiping database..." : "Wipe Workspace Data"}
                </button>
              </div>
            </form>
          </div>
        </div>

      </div>
    </div>
  );
};

export default Sandbox;
