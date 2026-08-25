import React from "react";
import { CreditCard, Landmark, RefreshCw, Send, Users, ShieldAlert, ArrowRight } from "lucide-react";

export const UseCases: React.FC = () => {
  const cases = [
    {
      title: "Digital wallets",
      desc: "Provision virtual wallets, store multi-currency balances, and settle peer-to-peer transfers with ledger finality.",
      icon: CreditCard,
      visual: (
        <div className="h-10 rounded border border-neutral-900 bg-neutral-950 flex items-center justify-between px-3 select-none">
          <div className="flex items-center space-x-2">
            <div className="h-5 w-7 rounded bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 flex items-center justify-center font-bold text-[8px] font-mono">
              USD
            </div>
            <span className="text-[10px] font-bold text-white font-mono">$1,240.00</span>
          </div>
          <span className="text-[8px] text-neutral-600 font-bold uppercase font-mono">active</span>
        </div>
      ),
    },
    {
      title: "Fintech applications",
      desc: "Assemble robust financial consumer software products with transparent audit journals underneath.",
      icon: Send,
      visual: (
        <div className="h-10 rounded border border-neutral-900 bg-neutral-950 flex items-center justify-between px-3 select-none">
          <span className="text-[9px] text-neutral-400 font-bold font-mono">App Client</span>
          <div className="flex space-x-1">
            <span className="h-1.5 w-1.5 rounded-full bg-indigo-500" />
            <span className="h-1.5 w-1.5 rounded-full bg-neutral-800" />
            <span className="h-1.5 w-1.5 rounded-full bg-neutral-800" />
          </div>
        </div>
      ),
    },
    {
      title: "Payment platforms",
      desc: "Incorporate core ledgers directly underneath payment systems to balance, route, and reconcile money easily.",
      icon: RefreshCw,
      visual: (
        <div className="h-10 rounded border border-neutral-900 bg-neutral-950 flex items-center justify-around font-mono text-[8px] select-none text-neutral-500">
          <span>Route</span>
          <span className="text-indigo-400">→</span>
          <span>Settle</span>
          <span className="text-indigo-400">→</span>
          <span>Ledger</span>
        </div>
      ),
    },
    {
      title: "Marketplace payments",
      desc: "Maintain separate merchant escrow accounts and automate split commission payouts programmatically.",
      icon: Users,
      visual: (
        <div className="h-10 rounded border border-neutral-900 bg-neutral-950 p-2.5 flex justify-between items-center text-[9px] font-mono select-none">
          <span className="text-neutral-500">Buyer</span>
          <span className="text-neutral-600">→</span>
          <div className="px-1.5 py-0.5 rounded bg-neutral-900 border border-neutral-800 text-white font-bold text-[8px]">
            Split (90/10)
          </div>
        </div>
      ),
    },
    {
      title: "Embedded financial experiences",
      desc: "Directly integrate transparent core ledgers into legacy ERP corporate software systems and billing portals.",
      icon: Landmark,
      visual: (
        <div className="h-10 rounded border border-neutral-900 bg-neutral-950 p-2.5 flex items-center justify-between text-[9px] font-mono select-none">
          <span className="text-neutral-400 font-bold">API Gate</span>
          <span className="text-emerald-400 bg-emerald-500/10 px-1 py-0.5 rounded text-[8px] font-black uppercase">
            connected
          </span>
        </div>
      ),
    },
    {
      title: "Banking applications",
      desc: "Issue fully featured deposit accounts with customized account numbering systems as capabilities expand.",
      icon: ShieldAlert,
      visual: (
        <div className="h-10 rounded border border-neutral-900 bg-neutral-950 p-2.5 flex justify-between items-center text-[9px] font-mono select-none">
          <div>
            <p className="text-[8px] text-neutral-600 font-bold uppercase">Transit No</p>
            <p className="text-white font-bold text-[8px]">01120938</p>
          </div>
          <div>
            <p className="text-[8px] text-neutral-600 font-bold uppercase">Account No</p>
            <p className="text-indigo-400 font-bold text-[8px]">xxxx-4921</p>
          </div>
        </div>
      ),
    },
  ];

  return (
    <section id="products" className="py-24 bg-[#030303] border-b border-neutral-900 px-6 lg:px-12 select-none">
      <div className="max-w-7xl mx-auto space-y-16">
        
        {/* Section Header */}
        <div className="text-left max-w-2xl space-y-4">
          <p className="text-xs font-bold text-indigo-400 uppercase tracking-widest font-mono">
            Possibilities Showcase
          </p>
          <h2 className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight leading-tight">
            Build the product. We'll handle the infrastructure.
          </h2>
          <p className="text-xs sm:text-sm text-neutral-400 leading-relaxed max-w-lg">
            Assemble financial models programmatically. As FlexBank core capabilities expand, engineering teams can build complex applications seamlessly.
          </p>
        </div>

        {/* 6 Case Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {cases.map((cs) => {
            const IconComponent = cs.icon;
            return (
              <div
                key={cs.title}
                className="group rounded border border-neutral-900 bg-neutral-950/20 p-6 flex flex-col justify-between hover:-translate-y-0.5 hover:border-neutral-850 hover:bg-neutral-950/60 hover:shadow-xl hover:shadow-indigo-500/[0.01] transition-all duration-300 text-left space-y-5"
              >
                <div className="space-y-4">
                  <div className="h-9 w-9 rounded border border-neutral-900 bg-neutral-950 flex items-center justify-center text-neutral-500 group-hover:text-white group-hover:border-neutral-800 transition-all duration-300">
                    <IconComponent className="h-4.5 w-4.5" />
                  </div>

                  <div className="space-y-1.5">
                    <h3 className="text-xs font-black text-white uppercase tracking-wider select-text">
                      {cs.title}
                    </h3>
                    <p className="text-[11px] text-neutral-500 group-hover:text-neutral-400 leading-relaxed select-text font-medium select-text">
                      {cs.desc}
                    </p>
                  </div>
                </div>

                {/* Micro technical visual layout representing Section 10 */}
                <div className="pt-2 select-none">
                  {cs.visual}
                </div>

              </div>
            );
          })}
        </div>

      </div>
    </section>
  );
};

export default UseCases;
