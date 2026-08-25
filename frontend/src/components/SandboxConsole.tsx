import React, { useState } from "react";
import { Link } from "react-router-dom";
import { useApp } from "../context/AppContext";
import { ShieldAlert, RotateCcw, Plus, Minus, ArrowRight, ListFilter } from "lucide-react";

interface ActivityItem {
  id: string;
  type: "funding" | "transfer_in" | "transfer_out";
  amount: number;
  label: string;
  timestamp: string;
}

export const SandboxConsole: React.FC = () => {
  const { token } = useApp();
  const [balance, setBalance] = useState(90000);
  const [activity, setActivity] = useState<ActivityItem[]>([
    { id: "act_1", type: "funding", amount: 50000, label: "Sandbox funding", timestamp: "5 mins ago" },
    { id: "act_2", type: "transfer_out", amount: 10000, label: "Transfer", timestamp: "12 mins ago" },
    { id: "act_3", type: "transfer_in", amount: 25000, label: "Transfer", timestamp: "1 hour ago" },
  ]);

  const handleFunding = () => {
    setBalance((prev) => prev + 50000);
    const newItem: ActivityItem = {
      id: `act_${Date.now()}`,
      type: "funding",
      amount: 50000,
      label: "Sandbox funding",
      timestamp: "Just now",
    };
    setActivity((prev) => [newItem, ...prev]);
  };

  const handleTransferOut = () => {
    if (balance < 10000) return;
    setBalance((prev) => prev - 10000);
    const newItem: ActivityItem = {
      id: `act_${Date.now()}`,
      type: "transfer_out",
      amount: 10000,
      label: "Transfer",
      timestamp: "Just now",
    };
    setActivity((prev) => [newItem, ...prev]);
  };

  const handleReset = () => {
    setBalance(90000);
    setActivity([
      { id: "act_1", type: "funding", amount: 50000, label: "Sandbox funding", timestamp: "5 mins ago" },
      { id: "act_2", type: "transfer_out", amount: 10000, label: "Transfer", timestamp: "12 mins ago" },
      { id: "act_3", type: "transfer_in", amount: 25000, label: "Transfer", timestamp: "1 hour ago" },
    ]);
  };

  return (
    <section className="py-24 bg-[#030303] border-b border-neutral-900 px-6 lg:px-12 select-none relative">
      <div className="absolute inset-0 bg-dot-pattern opacity-10 pointer-events-none" />

      <div className="max-w-7xl mx-auto space-y-16">
        
        {/* Header Text matching prompt precisely */}
        <div className="text-center max-w-2xl mx-auto space-y-4">
          <div className="inline-flex items-center space-x-1.5 rounded-full border border-amber-500/10 bg-amber-500/5 px-3 py-1 text-[10px] font-bold text-amber-400 uppercase tracking-wider font-mono">
            <ShieldAlert className="h-3 w-3" />
            <span>Developer Sandbox Environment</span>
          </div>
          
          <h2 className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight leading-tight">
            Build without risking real money.
          </h2>
          
          <p className="text-xs sm:text-sm text-neutral-400 leading-relaxed max-w-lg mx-auto">
            Create test customers, accounts and transactions using simulated financial flows before connecting production infrastructure.
          </p>
        </div>

        {/* Console Box Layout */}
        <div className="max-w-3xl mx-auto rounded-lg border border-neutral-900 bg-neutral-950/40 p-6 sm:p-8 relative overflow-hidden shadow-2xl">
          
          {/* Header row */}
          <div className="flex items-center justify-between border-b border-neutral-900 pb-4 mb-6 select-none font-mono">
            <div className="flex items-center space-x-2">
              <span className="h-1.5 w-1.5 rounded-full bg-amber-400 animate-pulse" />
              <span className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider">
                FLEXBANK SANDBOX CONSOLE
              </span>
            </div>

            <div className="flex items-center space-x-2">
              <span className="text-[8px] font-black uppercase tracking-wide bg-amber-500/10 border border-amber-500/20 px-2 py-0.5 rounded text-amber-400">
                TEST MODE
              </span>
              <span className="text-[8px] bg-neutral-900 text-neutral-600 font-bold px-2 py-0.5 rounded border border-neutral-900/60 uppercase">
                DEMO DATA
              </span>
            </div>
          </div>

          {/* Account Profile Card Split */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 text-left relative font-mono text-neutral-300">
            
            {/* Left Balance Display Card */}
            <div className="rounded border border-neutral-900 bg-neutral-950 p-6 space-y-4 relative flex flex-col justify-between hover:border-neutral-850 transition-colors duration-300">
              
              <div className="space-y-3">
                <div className="flex justify-between items-center select-none border-b border-neutral-900/60 pb-3">
                  <div>
                    <h4 className="text-xs font-bold text-white">Alexander</h4>
                    <p className="text-[8px] text-neutral-600 font-bold uppercase mt-0.5">primary Customer</p>
                  </div>
                  <span className="text-[9px] text-neutral-500 font-bold">acct_test_82ef10b9</span>
                </div>

                <div className="space-y-1 pt-1 select-text">
                  <span className="text-[8px] font-bold text-neutral-500 uppercase tracking-widest block">Book Ledger Balance</span>
                  <p className="text-2xl font-black text-white tracking-tight">
                    ₦{balance.toLocaleString()}.00
                  </p>
                </div>
              </div>

              {/* Simulation triggers panel */}
              <div className="flex flex-wrap gap-2.5 pt-4 border-t border-neutral-900/40 select-none">
                <button
                  onClick={handleFunding}
                  className="flex-1 inline-flex items-center justify-center space-x-1.5 rounded bg-neutral-900 hover:bg-neutral-850 hover:text-white border border-neutral-800 text-[10px] font-bold py-2 px-2.5 active:scale-[0.98] transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-1 focus-visible:ring-offset-[#030303] cursor-pointer"
                  title="Fund Sandbox"
                >
                  <Plus className="h-3 w-3 text-emerald-400" />
                  <span>Funding (+₦50k)</span>
                </button>

                <button
                  onClick={handleTransferOut}
                  disabled={balance < 10000}
                  className="flex-1 inline-flex items-center justify-center space-x-1.5 rounded bg-neutral-900 hover:bg-neutral-850 hover:text-white border border-neutral-800 text-[10px] font-bold py-2 px-2.5 disabled:opacity-35 disabled:cursor-not-allowed active:scale-[0.98] transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-1 focus-visible:ring-offset-[#030303] cursor-pointer"
                  title="Make Transfer"
                >
                  <Minus className="h-3 w-3 text-rose-400" />
                  <span>Transfer (-₦10k)</span>
                </button>

                <button
                  onClick={handleReset}
                  className="p-2 rounded bg-neutral-950 border border-neutral-900 text-neutral-600 hover:text-white hover:border-neutral-800 transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
                  title="Reset balances"
                >
                  <RotateCcw className="h-3.5 w-3.5" />
                </button>
              </div>

            </div>

            {/* Right Activity Logs Flow */}
            <div className="rounded border border-neutral-900 bg-neutral-950/40 p-5 space-y-4 flex flex-col justify-between hover:border-neutral-850 transition-colors duration-300">
              
              <div className="space-y-3.5">
                <div className="flex items-center justify-between text-[9px] font-black uppercase tracking-widest text-neutral-500 select-none border-b border-neutral-900 pb-2.5">
                  <span className="flex items-center">
                    <ListFilter className="h-3 w-3 mr-1.5 text-neutral-600" />
                    Recent Activity
                  </span>
                  <span>NGN (₦)</span>
                </div>

                {/* Vertical log tracer stream */}
                <div className="space-y-3 max-h-[160px] overflow-y-auto scrollbar-thin select-text">
                  {activity.map((item) => (
                    <div key={item.id} className="flex items-center justify-between text-[11px] animate-fade-in py-0.5">
                      <div className="flex items-center space-x-2">
                        <span className={`h-1.5 w-1.5 rounded-full ${
                          item.type === "funding" ? "bg-emerald-500" : item.type === "transfer_in" ? "bg-indigo-500" : "bg-neutral-500"
                        }`} />
                        <span className="text-neutral-400 font-semibold">{item.label}</span>
                      </div>
                      
                      <div className="flex items-center space-x-3 text-[10px] font-bold">
                        <span className={item.type === "funding" || item.type === "transfer_in" ? "text-emerald-500" : "text-rose-400"}>
                          {item.type === "funding" || item.type === "transfer_in" ? "+" : "-"} ₦{item.amount.toLocaleString()}
                        </span>
                        <span className="text-neutral-600 w-16 text-right font-medium text-[9px]">{item.timestamp}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="text-[8px] font-bold text-neutral-600 uppercase tracking-wider border-t border-neutral-900/60 pt-3 select-none">
                All ledger activity is sandboxed and audited internally.
              </div>

            </div>

          </div>

        </div>

        {/* Section 6: Sandbox CTA card */}
        <div className="max-w-3xl mx-auto rounded-lg border border-neutral-900 bg-neutral-950/40 p-6 sm:p-8 flex flex-col md:flex-row md:items-center justify-between gap-6 relative overflow-hidden text-left hover:-translate-y-0.5 hover:border-neutral-850 hover:shadow-xl hover:shadow-indigo-500/[0.01] transition-all duration-300">
          <div className="absolute top-0 left-0 w-[2px] h-full bg-amber-500/20" />
          
          <div className="space-y-2 max-w-xl">
            <span className="text-[9px] font-black uppercase tracking-widest text-amber-400 font-mono">
              Simulated Testing Environments
            </span>
            <h3 className="text-base sm:text-lg font-extrabold text-white tracking-tight uppercase font-mono">
              Try the FlexBank sandbox.
            </h3>
            <p className="text-[10px] text-neutral-500 font-medium leading-relaxed">
              Interact with the full API lifecycle, inspect transfer journals, and trigger simulated webhooks in a safe sandboxed ecosystem.
            </p>
          </div>

          <div className="shrink-0 select-none">
            <Link
              to={token ? "/projects" : "/signup"}
              className="w-full sm:w-auto inline-flex items-center justify-center space-x-2 rounded bg-white hover:bg-neutral-200 px-5 py-3 text-xs font-bold text-black active:scale-[0.98] transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2 focus-visible:ring-offset-[#030303] cursor-pointer"
            >
              <span>Open sandbox</span>
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </div>

      </div>
    </section>
  );
};

export default SandboxConsole;
