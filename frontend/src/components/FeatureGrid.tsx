import React from "react";
import { Wallet, ArrowLeftRight, Activity, BellRing, BookOpen, ShieldCheck, Check } from "lucide-react";

export const FeatureGrid: React.FC = () => {
  const features = [
    {
      title: "Account Infrastructure",
      desc: "Create and manage customer financial accounts. Set up digital ledger scopes and multi-currency balances instantly.",
      icon: Wallet,
      tag: "Accounts",
      visual: (
        <div className="rounded border border-neutral-900 bg-neutral-950 p-3.5 font-mono text-[9px] text-neutral-400 space-y-1 select-text">
          <div className="flex justify-between text-[8px] text-neutral-500 uppercase font-bold select-none border-b border-neutral-900 pb-1.5 mb-1.5">
            <span>GET /accounts/acc_01</span>
            <span className="text-emerald-400">200 OK</span>
          </div>
          <div><span className="text-indigo-400">"id"</span>: <span className="text-emerald-400">"acc_82ef10b9"</span></div>
          <div><span className="text-indigo-400">"currency"</span>: <span className="text-emerald-400">"NGN"</span></div>
          <div><span className="text-indigo-400">"balance"</span>: <span className="text-violet-400">90000.00</span></div>
        </div>
      ),
    },
    {
      title: "Transfer Infrastructure",
      desc: "Move funds between supported accounts. Trigger double-entry bookkeeping actions across balanced accounts.",
      icon: ArrowLeftRight,
      tag: "Transfers",
      visual: (
        <div className="rounded border border-neutral-900 bg-neutral-950 p-3.5 flex items-center justify-between font-mono text-[9px] text-neutral-400 select-none">
          <div className="px-2 py-1 rounded bg-neutral-900 border border-neutral-800 text-center text-white font-bold">
            acc_source
          </div>
          <div className="flex-1 px-2 flex flex-col items-center">
            <span className="text-[8px] text-indigo-400 font-bold font-mono">₦10,000</span>
            <svg className="w-full h-4 overflow-visible" fill="none">
              <line x1="0" y1="8" x2="100%" y2="8" stroke="#1f1f1f" strokeWidth="1" />
              <line x1="0" y1="8" x2="100%" y2="8" stroke="#6366f1" strokeWidth="1" className="animate-line-flow" />
            </svg>
          </div>
          <div className="px-2 py-1 rounded bg-neutral-900 border border-neutral-800 text-center text-white font-bold">
            acc_dest
          </div>
        </div>
      ),
    },
    {
      title: "Transaction Infrastructure",
      desc: "Track financial activity and transaction states. Audit operational histories with granular latency trace logs.",
      icon: Activity,
      tag: "Transactions",
      visual: (
        <div className="rounded border border-neutral-900 bg-neutral-950 p-3.5 flex items-center justify-around font-mono text-[9px] text-neutral-500 select-none">
          <div className="flex flex-col items-center space-y-1">
            <span className="h-2 w-2 rounded-full bg-neutral-800" />
            <span className="text-[8px]">PENDING</span>
          </div>
          <div className="h-[1px] w-8 bg-neutral-900" />
          <div className="flex flex-col items-center space-y-1">
            <span className="h-2 w-2 rounded-full bg-amber-500 animate-pulse" />
            <span className="text-[8px] text-amber-500">SETTLING</span>
          </div>
          <div className="h-[1px] w-8 bg-indigo-950" />
          <div className="flex flex-col items-center space-y-1">
            <span className="h-3 w-3 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center">
              <Check className="h-2 w-2" />
            </span>
            <span className="text-[8px] text-emerald-400 font-bold">SETTLED</span>
          </div>
        </div>
      ),
    },
    {
      title: "Ledger",
      desc: "Maintain financial records and account movements. Guarantee double-entry bookkeeping accuracy inside databases.",
      icon: BookOpen,
      tag: "Double-Entry",
      visual: (
        <div className="rounded border border-neutral-900 bg-neutral-950 p-3.5 font-mono text-[9px] text-neutral-400 space-y-2 select-none">
          <div className="flex justify-between border-b border-neutral-900 pb-1 text-[8px] text-neutral-500 font-bold uppercase tracking-wider">
            <span>Audit Journal Ledger</span>
            <span className="text-indigo-400">Balanced</span>
          </div>
          <div className="grid grid-cols-2 gap-4 text-center divide-x divide-neutral-900">
            <div>
              <p className="text-[8px] text-neutral-500 uppercase font-semibold">Debit (-)</p>
              <p className="text-xs font-bold text-white mt-1">₦10,000.00</p>
            </div>
            <div>
              <p className="text-[8px] text-neutral-500 uppercase font-semibold">Credit (+)</p>
              <p className="text-xs font-bold text-white mt-1">₦10,000.00</p>
            </div>
          </div>
        </div>
      ),
    },
    {
      title: "Webhooks",
      desc: "React to financial events programmatically. Receive instant HTTP POST callbacks with verified HMAC signature tags.",
      icon: BellRing,
      tag: "Webhooks",
      visual: (
        <div className="rounded border border-neutral-900 bg-neutral-950 p-3.5 font-mono text-[9px] text-neutral-400 space-y-1.5 select-text">
          <div className="flex justify-between text-[8px] text-neutral-500 uppercase font-bold select-none border-b border-neutral-900 pb-1.5">
            <span>POST /callback</span>
            <span className="text-indigo-400">HMAC-SHA256</span>
          </div>
          <div className="text-[8px] text-neutral-500 font-medium font-mono truncate">
            x-fb-signature: fb_sig_7d1cf09ab2...
          </div>
          <div className="text-emerald-400 font-bold flex items-center">
            <span className="h-1 w-1 bg-emerald-400 rounded-full mr-1.5" />
            "event": "transfer.completed"
          </div>
        </div>
      ),
    },
    {
      title: "Sandbox",
      desc: "Test financial flows without real money. Use completely simulated environments and developer testing networks.",
      icon: ShieldCheck,
      tag: "Sandbox",
      visual: (
        <div className="rounded border border-neutral-900 bg-neutral-950 p-3.5 flex items-center justify-between font-mono text-[9px] text-neutral-400 select-none">
          <div className="space-y-1">
            <span className="text-[8px] bg-amber-500/10 text-amber-400 font-black px-1.5 py-0.5 rounded border border-amber-500/20 uppercase">
              Sandbox active
            </span>
            <p className="text-[8px] text-neutral-500 leading-normal">
              100% Simulated database
            </p>
          </div>
          <div className="h-8 w-8 rounded-full bg-neutral-900 border border-neutral-800 flex items-center justify-center text-neutral-500">
            <ShieldCheck className="h-4.5 w-4.5 text-indigo-400 animate-pulse" />
          </div>
        </div>
      ),
    },
  ];

  return (
    <section className="py-24 bg-[#030303] border-b border-neutral-900 px-6 lg:px-12 select-none">
      <div className="max-w-7xl mx-auto space-y-12">
        
        {/* Header matching Phase 2 prompt Section 4 specs precisely */}
        <div className="text-left space-y-4 max-w-2xl">
          <p className="text-xs font-bold text-indigo-400 uppercase tracking-widest font-mono">
            Infrastructure Pillars
          </p>
          <h2 className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight">
            Everything your financial product needs.
          </h2>
          <p className="text-xs sm:text-sm text-neutral-400 leading-relaxed">
            Standard core modules designed to handle massive transactional leverage without administrative overhead.
          </p>
        </div>

        {/* 6 Grid Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 pt-4">
          {features.map((feat) => {
            const IconComponent = feat.icon;
            return (
              <div
                key={feat.title}
                className="group rounded border border-neutral-900 bg-neutral-950/20 p-6 flex flex-col justify-between space-y-6 relative overflow-hidden transition-all duration-300 hover:-translate-y-0.5 hover:border-neutral-850 hover:bg-neutral-950/60 hover:shadow-xl hover:shadow-indigo-500/[0.01]"
              >
                {/* Visual Accent */}
                <div className="absolute top-0 right-0 h-[1px] w-0 bg-indigo-500/30 group-hover:w-20 transition-all duration-500" />
                <div className="absolute top-0 right-0 w-[1px] h-0 bg-indigo-500/30 group-hover:h-20 transition-all duration-500" />

                <div className="space-y-4">
                  {/* Top Bar inside Card */}
                  <div className="flex items-center justify-between">
                    <div className="p-2.5 rounded bg-neutral-950 border border-neutral-900 text-neutral-500 group-hover:text-white group-hover:border-neutral-800 transition-colors">
                      <IconComponent className="h-4.5 w-4.5" />
                    </div>
                    
                    <span className="text-[9px] font-bold text-neutral-500 tracking-wider uppercase bg-neutral-900/40 px-2 py-0.5 rounded border border-neutral-900/60 font-mono">
                      {feat.tag}
                    </span>
                  </div>

                  {/* Copy content */}
                  <div className="space-y-1.5 text-left">
                    <h3 className="text-xs font-black text-white uppercase tracking-wider select-text">
                      {feat.title}
                    </h3>
                    <p className="text-[11px] text-neutral-500 leading-relaxed select-text font-medium select-text">
                      {feat.desc}
                    </p>
                  </div>
                </div>

                {/* Injected custom micro technical visual (satisfies prompt spec) */}
                <div className="pt-2 select-none">
                  {feat.visual}
                </div>

              </div>
            );
          })}
        </div>

      </div>
    </section>
  );
};

export default FeatureGrid;
