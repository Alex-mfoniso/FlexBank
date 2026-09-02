import React from "react";
import { Cpu, Server, Wallet, ArrowLeftRight, Users, Layers, Webhook, Receipt } from "lucide-react";

export const ArchitectureSection: React.FC = () => {
  const blocks = [
    { title: "Accounts", desc: "Digital book ledgers", icon: Wallet, color: "text-blue-400" },
    { title: "Transfers", desc: "Settlement pipelines", icon: ArrowLeftRight, color: "text-violet-400" },
    { title: "Customers", desc: "Legal entity ledgers", icon: Users, color: "text-sky-400" },
    { title: "Ledger", desc: "Double-entry cores", icon: Layers, color: "text-emerald-400" },
    { title: "Webhooks", desc: "Real-time callback channels", icon: Webhook, color: "text-amber-400" },
    { title: "Transactions", desc: "Trace states & contexts", icon: Receipt, color: "text-rose-400" },
  ];

  return (
    <section className="py-20 bg-[#030303] border-b border-neutral-900 px-6 lg:px-12 select-none relative overflow-hidden">
      
      {/* Background decoration grid */}
      <div className="absolute inset-0 bg-grid-pattern opacity-10 pointer-events-none" />

      <div className="max-w-5xl mx-auto space-y-12 relative z-10">
        
        {/* Header Title */}
        <div className="text-center max-w-2xl mx-auto space-y-4">
          <h2 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight leading-tight">
            Comprehensive Product Architecture
          </h2>
          <p className="text-xs sm:text-sm text-neutral-400 leading-relaxed max-w-xl mx-auto">
            Review the structural data movement. Your business requests enter the core engine once, settlement is verified against the double-entry database, and webhooks push events in real time.
          </p>
        </div>

        {/* Technical Architecture Canvas */}
        <div className="flex flex-col items-center">
          
          {/* Node 1: YOUR APPLICATION */}
          <div className="w-56 p-4 rounded border border-neutral-900 bg-neutral-950 text-center shadow-lg relative group transition-colors hover:border-neutral-800">
            <Cpu className="mx-auto h-5 w-5 text-neutral-400 mb-2 group-hover:text-white transition-colors" />
            <h4 className="text-xs font-bold text-white uppercase tracking-wider">Your Application</h4>
            <p className="text-[10px] text-neutral-500 font-medium mt-1 font-mono">https://your-platform.com</p>
          </div>

          {/* SVG Animated Connection Line down to Ricarut */}
          <div className="w-full h-12 flex justify-center">
            <svg className="w-6 h-full overflow-visible" fill="none">
              <line x1="12" y1="0" x2="12" y2="48" stroke="#1f1f1f" strokeWidth="1.5" />
              <line 
                x1="12" y1="0" x2="12" y2="48" 
                stroke="#6366f1" strokeWidth="1.5" 
                className="animate-line-flow" 
              />
            </svg>
          </div>

          {/* Node 2: RICARUT API GATEWAY */}
          <div className="w-72 p-5 rounded border border-indigo-500/20 bg-indigo-950/20 text-center shadow-xl relative group transition-colors hover:border-indigo-500/30">
            {/* Top highlight glow */}
            <span className="absolute inset-x-0 top-0 h-[1px] bg-gradient-to-r from-transparent via-indigo-400/30 to-transparent" />
            
            <Server className="mx-auto h-6 w-6 text-indigo-400 mb-2.5 group-hover:scale-105 transition-transform" />
            <h4 className="text-xs font-black text-white uppercase tracking-widest">Ricarut API Core</h4>
            <p className="text-[9px] text-indigo-300 font-bold mt-1 font-mono uppercase tracking-wider">
              double-entry ledger settlement
            </p>
          </div>

          {/* Responsive SVG Branching lines to capabilities */}
          {/* For large screens, we show a clean horizontal branching line network. On smaller viewports, we stack. */}
          <div className="hidden md:block w-full h-16">
            <svg className="w-full h-full overflow-visible" fill="none">
              {/* Central anchor node */}
              <line x1="50%" y1="0" x2="50%" y2="24" stroke="#1f1f1f" strokeWidth="1.5" />
              <line x1="50%" y1="0" x2="50%" y2="24" stroke="#6366f1" strokeWidth="1.5" className="animate-line-flow" />

              {/* Horizontal bridge crossing */}
              <line x1="12%" y1="24" x2="88%" y2="24" stroke="#1f1f1f" strokeWidth="1.5" />
              
              {/* Branching outputs down */}
              <line x1="12%" y1="24" x2="12%" y2="64" stroke="#1f1f1f" strokeWidth="1.5" />
              <line x1="27.2%" y1="24" x2="27.2%" y2="64" stroke="#1f1f1f" strokeWidth="1.5" />
              <line x1="42.4%" y1="24" x2="42.4%" y2="64" stroke="#1f1f1f" strokeWidth="1.5" />
              <line x1="57.6%" y1="24" x2="57.6%" y2="64" stroke="#1f1f1f" strokeWidth="1.5" />
              <line x1="72.8%" y1="24" x2="72.8%" y2="64" stroke="#1f1f1f" strokeWidth="1.5" />
              <line x1="88%" y1="24" x2="88%" y2="64" stroke="#1f1f1f" strokeWidth="1.5" />

              {/* Flow dashes overlays */}
              <path d="M 50% 0 L 50% 24 L 12% 24 L 12% 64" stroke="#6366f1" strokeWidth="1.2" className="animate-line-flow" />
              <path d="M 50% 0 L 50% 24 L 27.2% 24 L 27.2% 64" stroke="#6366f1" strokeWidth="1.2" className="animate-line-flow" />
              <path d="M 50% 0 L 50% 24 L 42.4% 24 L 42.4% 64" stroke="#6366f1" strokeWidth="1.2" className="animate-line-flow" />
              <path d="M 50% 0 L 50% 24 L 57.6% 24 L 57.6% 64" stroke="#6366f1" strokeWidth="1.2" className="animate-line-flow" />
              <path d="M 50% 0 L 50% 24 L 72.8% 24 L 72.8% 64" stroke="#6366f1" strokeWidth="1.2" className="animate-line-flow" />
              <path d="M 50% 0 L 50% 24 L 88% 24 L 88% 64" stroke="#6366f1" strokeWidth="1.2" className="animate-line-flow" />
            </svg>
          </div>

          <div className="md:hidden w-6 h-10">
            <svg className="w-full h-full overflow-visible" fill="none">
              <line x1="12" y1="0" x2="12" y2="40" stroke="#1f1f1f" strokeWidth="1.5" />
              <line x1="12" y1="0" x2="12" y2="40" stroke="#6366f1" strokeWidth="1.5" className="animate-line-flow" />
            </svg>
          </div>

          {/* Node 3 Array: THE 6 REGISTERED MODULES */}
          <div className="grid grid-cols-1 md:grid-cols-6 gap-4 w-full md:pt-0">
            {blocks.map((block) => {
              const Icon = block.icon;
              return (
                <div
                  key={block.title}
                  className="rounded border border-neutral-900 bg-neutral-950 p-4 text-center hover:border-neutral-800 transition-colors"
                >
                  <div className={`p-1.5 rounded bg-neutral-900 inline-block mb-2 ${block.color}`}>
                    <Icon className="h-4 w-4" />
                  </div>
                  <h5 className="text-[11px] font-bold text-white uppercase tracking-wider select-text">{block.title}</h5>
                  <p className="text-[9px] text-neutral-500 font-medium mt-1 leading-normal select-text">
                    {block.desc}
                  </p>
                </div>
              );
            })}
          </div>

        </div>

      </div>
    </section>
  );
};

export default ArchitectureSection;
