import React, { useState } from "react";
import { ArrowRight, Coins, ShieldAlert, CheckCircle2, RefreshCw } from "lucide-react";

export const SandboxPreview: React.FC = () => {
  const [alexBalance, setAlexBalance] = useState(90000);
  const [mfonisoBalance, setMfonisoBalance] = useState(60000);
  const [isSettling, setIsSettling] = useState(false);
  const [isSettled, setIsSettled] = useState(false);
  const [coinAnimating, setCoinAnimating] = useState(false);

  const handleSettle = () => {
    if (isSettled || isSettling) return;
    setIsSettling(true);
    setCoinAnimating(true);

    // After coin slide finishes
    setTimeout(() => {
      setAlexBalance(80000);
      setMfonisoBalance(70000);
      setIsSettled(true);
      setIsSettling(false);
      setCoinAnimating(false);
    }, 1500);
  };

  const handleReset = () => {
    setAlexBalance(90000);
    setMfonisoBalance(60000);
    setIsSettled(false);
    setIsSettling(false);
    setCoinAnimating(false);
  };

  return (
    <section className="py-24 bg-[#030303] border-b border-neutral-900 px-6 lg:px-12 select-none">
      <div className="max-w-7xl mx-auto space-y-16">
        
        {/* Section Header */}
        <div className="text-center max-w-2xl mx-auto space-y-4">
          <div className="inline-flex items-center space-x-1.5 rounded-full border border-indigo-500/10 bg-indigo-500/5 px-3 py-1 text-[10px] font-bold text-indigo-400 uppercase tracking-wider font-mono">
            <Coins className="h-3 w-3 animate-pulse" />
            <span>Multi-Account Sandbox Demo</span>
          </div>
          <h2 className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight leading-tight">
            Cross-Account Sandbox Demo
          </h2>
          <p className="text-xs sm:text-sm text-neutral-400 leading-relaxed max-w-lg mx-auto">
            Experience our symmetrical transaction settlement core in real time. Instruct ledger movements and audit balances immediately.
          </p>
        </div>

        {/* Interactive Double Wallet Panel */}
        <div className="max-w-3xl mx-auto rounded-lg border border-neutral-900 bg-neutral-950/40 p-6 sm:p-8 relative overflow-hidden shadow-2xl">
          
          {/* Header watermark indicators */}
          <div className="flex items-center justify-between border-b border-neutral-900 pb-4 mb-8 font-mono text-[10px]">
            <div className="flex items-center space-x-2">
              <span className="h-1.5 w-1.5 rounded-full bg-indigo-500" />
              <span className="text-neutral-400 font-bold uppercase tracking-wider">
                CORE SETTLEMENT PROTOCOL
              </span>
            </div>

            <div className="flex items-center space-x-2">
              <span className="text-[8px] font-black uppercase tracking-wide bg-indigo-500/15 border border-indigo-500/20 px-2 py-0.5 rounded text-indigo-400">
                SANDBOX DEMO
              </span>
              <span className="text-[8px] bg-neutral-900 text-neutral-600 font-bold px-2 py-0.5 rounded border border-neutral-900/60 uppercase">
                DEMO DATA
              </span>
              <span className="text-[8px] font-black uppercase tracking-wide bg-amber-500/10 border border-amber-500/20 px-2 py-0.5 rounded text-amber-400">
                TEST MODE
              </span>
            </div>
          </div>

          {/* Symmetrical Node Transfer flow */}
          <div className="grid grid-cols-1 md:grid-cols-12 gap-8 items-center relative font-mono">
            
            {/* 1. ALEXANDER SOURCE WALLET (Col-span-4) */}
            <div className="md:col-span-4 rounded border border-neutral-900 bg-neutral-950 p-5 space-y-4 text-left relative flex flex-col justify-between min-h-[140px]">
              <div className="space-y-1 select-none">
                <span className="text-[8px] text-neutral-500 font-bold uppercase tracking-wider block">source node</span>
                <h4 className="text-xs font-black text-white uppercase tracking-wider select-text">Alexander</h4>
                <p className="text-[8px] text-neutral-600 font-bold">acct_test_82ef10b9</p>
              </div>

              <div className="space-y-0.5 select-text pt-2 border-t border-neutral-900/40">
                <span className="text-[8px] text-neutral-500 font-bold uppercase tracking-widest block">balance (NGN)</span>
                <p className="text-xl font-black text-white tracking-tight">
                  ₦{alexBalance.toLocaleString()}.00
                </p>
              </div>
            </div>

            {/* 2. CORE TRANSFER ANIMATION BRIDGE (Col-span-4) */}
            <div className="md:col-span-4 flex flex-col items-center justify-center space-y-4 py-4 md:py-0 select-none relative h-20">
              
              {/* Coin flying track */}
              <div className="w-full h-1 bg-neutral-900 relative rounded overflow-hidden">
                {coinAnimating && (
                  <div className="absolute top-0 bottom-0 w-8 bg-gradient-to-r from-transparent via-indigo-400 to-transparent animate-line-flow" style={{ width: '40px' }} />
                )}
              </div>

              {/* Action trigger button */}
              {!isSettled ? (
                <button
                  onClick={handleSettle}
                  disabled={isSettling}
                  className="px-4 py-2.5 rounded bg-white hover:bg-neutral-200 text-black text-[10px] font-black uppercase tracking-wider flex items-center space-x-1.5 shadow-md shadow-white/5 disabled:opacity-50 disabled:cursor-not-allowed transition-colors cursor-pointer"
                >
                  {isSettling ? (
                    <>
                      <RefreshCw className="h-3 w-3 animate-spin text-black" />
                      <span>Settling...</span>
                    </>
                  ) : (
                    <>
                      <Coins className="h-3 w-3 text-black" />
                      <span>Settle ₦10,000</span>
                      <ArrowRight className="h-3 w-3 text-black" />
                    </>
                  )}
                </button>
              ) : (
                <button
                  onClick={handleReset}
                  className="px-4 py-2.5 rounded border border-neutral-900 bg-neutral-950/60 text-neutral-500 hover:text-white text-[10px] font-bold uppercase tracking-wider flex items-center space-x-1.5 transition-colors cursor-pointer"
                >
                  <RefreshCw className="h-3 w-3" />
                  <span>Reset Demo</span>
                </button>
              )}

              {/* Float flying currency node */}
              {coinAnimating && (
                <div className="absolute top-1/2 left-4 -translate-y-1/2 h-5 w-5 bg-indigo-500 text-white font-bold text-[8px] rounded-full flex items-center justify-center shadow-lg shadow-indigo-500/40 select-none pointer-events-none animate-line-flow">
                  ₦
                </div>
              )}

            </div>

            {/* 3. MFONISO DESTINATION WALLET (Col-span-4) */}
            <div className="md:col-span-4 rounded border border-neutral-900 bg-neutral-950 p-5 space-y-4 text-left relative flex flex-col justify-between min-h-[140px]">
              <div className="space-y-1 select-none">
                <span className="text-[8px] text-neutral-500 font-bold uppercase tracking-wider block">destination node</span>
                <h4 className="text-xs font-black text-white uppercase tracking-wider select-text">Mfoniso</h4>
                <p className="text-[8px] text-neutral-600 font-bold">acct_test_91ab45f2</p>
              </div>

              <div className="space-y-0.5 select-text pt-2 border-t border-neutral-900/40">
                <span className="text-[8px] text-neutral-500 font-bold uppercase tracking-widest block">balance (NGN)</span>
                <p className="text-xl font-black text-white tracking-tight">
                  ₦{mfonisoBalance.toLocaleString()}.00
                </p>
              </div>
            </div>

          </div>

          {/* Settle Audit Success Card Details (Section 7 Exact Match) */}
          {isSettled && (
            <div className="mt-8 pt-6 border-t border-neutral-900/80 animate-fade-in text-left font-mono select-text">
              <div className="rounded border border-emerald-500/10 bg-emerald-500/5 p-4.5 space-y-3.5 relative overflow-hidden">
                <div className="absolute top-0 right-0 p-3 select-none">
                  <CheckCircle2 className="h-5 w-5 text-emerald-500/80" />
                </div>

                <div className="flex items-center space-x-2 text-[10px] text-emerald-400 font-black uppercase tracking-wider select-none">
                  <span>✓ Transfer successful</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-[10px]">
                  <div className="space-y-1">
                    <span className="text-[8px] text-neutral-500 font-bold uppercase select-none">Transaction ID</span>
                    <p className="text-neutral-300 font-mono tracking-tight font-semibold">tx_81bc09a2</p>
                  </div>
                  <div className="space-y-1">
                    <span className="text-[8px] text-neutral-500 font-bold uppercase select-none">Settlement Amount</span>
                    <p className="text-white font-mono font-bold">₦10,000.00 NGN</p>
                  </div>
                  <div className="space-y-1">
                    <span className="text-[8px] text-neutral-500 font-bold uppercase select-none">Journal Status</span>
                    <p className="text-emerald-400 font-mono font-black uppercase">COMPLETED</p>
                  </div>
                </div>

                <div className="text-[8px] text-neutral-500/80 font-bold uppercase tracking-wide pt-1 select-none border-t border-neutral-900/40 mt-1">
                  Double-entry bookkeeping validation complete • ledger balanced.
                </div>
              </div>
            </div>
          )}

        </div>

      </div>
    </section>
  );
};

export default SandboxPreview;
