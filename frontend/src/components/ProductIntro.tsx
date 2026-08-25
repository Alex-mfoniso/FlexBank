import React from "react";
import { Cpu, Server, Layers } from "lucide-react";

export const ProductIntro: React.FC = () => {
  const blocks = [
    { label: "Customers", desc: "Bind legal entities" },
    { label: "Accounts", desc: "Settle currency balances" },
    { label: "Transfers", desc: "Double-entry rails" },
    { label: "Transactions", desc: "Trace status audits" },
    { label: "Ledger", desc: "Balanced transactional db" },
    { label: "Webhooks", desc: "Async callback triggers" },
  ];

  return (
    <section className="py-24 bg-[#030303] border-b border-neutral-900 px-6 lg:px-12 select-none relative overflow-hidden">
      
      {/* Background decorations */}
      <div className="absolute inset-0 bg-grid-pattern opacity-10 pointer-events-none" />
      
      <div className="max-w-4xl mx-auto space-y-16 relative z-10 text-center">
        
        {/* Header copy precisely matching prompt specs */}
        <div className="space-y-4 max-w-2xl mx-auto">
          <div className="inline-flex items-center space-x-1.5 rounded-full border border-indigo-500/10 bg-indigo-500/5 px-3 py-1 text-[10px] font-bold text-indigo-400 uppercase tracking-wider font-mono">
            <Layers className="h-3 w-3" />
            <span>Infrastructure Map</span>
          </div>
          <h2 className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight leading-tight">
            One API. Your entire financial infrastructure.
          </h2>
          <p className="text-xs sm:text-sm text-neutral-400 leading-relaxed max-w-lg mx-auto">
            FlexBank gives developers the building blocks to create financial products without managing every provider integration separately.
          </p>
        </div>

        {/* Animated Infrastructure Diagram */}
        <div className="flex flex-col items-center max-w-md mx-auto pt-4">
          
          {/* Node 1: YOUR APPLICATION */}
          <div className="w-56 p-4 rounded border border-neutral-900 bg-neutral-950 shadow-lg relative group transition-colors hover:border-neutral-800">
            <Cpu className="mx-auto h-5 w-5 text-neutral-400 mb-2 group-hover:text-white transition-colors" />
            <h4 className="text-xs font-bold text-white uppercase tracking-wider">Your Application</h4>
            <p className="text-[9px] text-neutral-500 font-medium font-mono uppercase mt-0.5 tracking-wider select-all">
              https://your-platform.com
            </p>
          </div>

          {/* Connection Line 1: App -> FlexBank */}
          <div className="w-6 h-12">
            <svg className="w-full h-full overflow-visible" fill="none">
              <line x1="12" y1="0" x2="12" y2="48" stroke="#1f1f1f" strokeWidth="1.5" />
              <line 
                x1="12" y1="0" x2="12" y2="48" 
                stroke="#6366f1" strokeWidth="1.5" 
                className="animate-line-flow" 
              />
            </svg>
          </div>

          {/* Node 2: FLEXBANK CORE GATEWAY */}
          <div className="w-64 p-4.5 rounded border border-indigo-500/20 bg-indigo-950/25 text-center shadow-xl relative group transition-colors hover:border-indigo-500/30">
            <span className="absolute inset-x-0 top-0 h-[1px] bg-gradient-to-r from-transparent via-indigo-400/30 to-transparent" />
            <Server className="mx-auto h-5 w-5 text-indigo-400 mb-2 group-hover:scale-105 transition-transform" />
            <h4 className="text-xs font-black text-white uppercase tracking-widest">FlexBank Engine</h4>
            <p className="text-[9px] text-indigo-300 font-bold font-mono uppercase tracking-wider mt-0.5">
              unified API gateway
            </p>
          </div>

          {/* Connection Line 2: FlexBank -> Ledger Core Blocks */}
          <div className="w-6 h-12">
            <svg className="w-full h-full overflow-visible" fill="none">
              <line x1="12" y1="0" x2="12" y2="48" stroke="#1f1f1f" strokeWidth="1.5" />
              <line 
                x1="12" y1="0" x2="12" y2="48" 
                stroke="#6366f1" strokeWidth="1.5" 
                className="animate-line-flow" 
              />
            </svg>
          </div>

          {/* Node 3: UNIFIED INFRASTRUCTURE PRIMITIVES BOX */}
          <div className="w-72 rounded-md border border-neutral-900 bg-neutral-950 shadow-2xl overflow-hidden divide-y divide-neutral-900 select-text">
            
            {/* Header tag */}
            <div className="bg-neutral-950/90 h-9 flex items-center justify-between px-4 select-none">
              <span className="text-[8px] font-black uppercase tracking-widest text-neutral-500 font-mono">
                unified ledger primitives
              </span>
              <div className="flex items-center space-x-1">
                <span className="h-1.5 w-1.5 rounded-full bg-indigo-500" />
                <span className="text-[9px] text-neutral-600 font-bold uppercase font-mono">OK</span>
              </div>
            </div>

            {/* List Blocks */}
            {blocks.map((block) => (
              <div 
                key={block.label} 
                className="px-5 py-3 flex items-center justify-between transition-colors hover:bg-neutral-900/40"
              >
                <span className="text-xs font-bold text-neutral-200 tracking-wide font-mono uppercase">
                  {block.label}
                </span>
                <span className="text-[9px] text-neutral-500 font-bold font-mono">
                  {block.desc}
                </span>
              </div>
            ))}

          </div>

        </div>

      </div>
    </section>
  );
};

export default ProductIntro;
