import React from "react";
import { Link } from "react-router-dom";
import { useApp } from "../context/AppContext";
import { ArrowRight, BookOpen } from "lucide-react";

export const FinalCTA: React.FC = () => {
  const { token } = useApp();

  return (
    <section className="py-24 bg-[#030303] border-b border-neutral-900 px-6 lg:px-12 select-none relative overflow-hidden text-center">
      
      {/* Background grids and glowing spots */}
      <div className="absolute inset-0 bg-grid-pattern opacity-10 pointer-events-none" />
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[250px] bg-gradient-to-r from-indigo-500/5 to-violet-500/5 rounded-full blur-[100px] pointer-events-none" />

      <div className="max-w-3xl mx-auto space-y-8 relative z-10">
        
        {/* Core Headline matching Phase 3 Section 4 precisely */}
        <h2 className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight leading-tight uppercase font-sans">
          Build your financial product on Ricarut.
        </h2>

        {/* Supporting Copy */}
        <p className="text-xs sm:text-sm text-neutral-400 leading-relaxed max-w-lg mx-auto font-medium">
          Start in the sandbox. Build with the API. Move to production when you're ready.
        </p>

        {/* Buttons Action Group */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-4 max-w-sm mx-auto pt-2 w-full sm:w-auto select-none">
          <Link
            to={token ? "/projects" : "/signup"}
            className="w-full sm:w-auto inline-flex items-center justify-center space-x-2 rounded bg-white hover:bg-neutral-200 px-6 py-3.5 text-xs font-bold text-black active:scale-[0.98] transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2 focus-visible:ring-offset-[#030303] text-center"
          >
            <span>Start building</span>
            <ArrowRight className="h-4 w-4" />
          </Link>
          
          <Link
            to="/docs"
            className="w-full sm:w-auto inline-flex items-center justify-center space-x-2 rounded border border-neutral-900 bg-neutral-950/40 hover:bg-neutral-900 hover:text-white px-6 py-3.5 text-xs font-bold text-neutral-400 active:scale-[0.98] transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2 focus-visible:ring-offset-[#030303] text-center"
          >
            <BookOpen className="h-4 w-4 text-neutral-500" />
            <span>Read the documentation</span>
          </Link>
        </div>

        {/* Explicit sandbox status tag */}
        <div className="flex items-center justify-center space-x-2 pt-4">
          <span className="text-[9px] font-black uppercase tracking-wide bg-amber-500/10 border border-amber-500/20 px-2 py-0.5 rounded text-amber-400">
            TEST MODE
          </span>
          <p className="text-[10px] text-neutral-500 font-bold uppercase tracking-wider font-mono">
            No real money involved.
          </p>
        </div>

      </div>
    </section>
  );
};

export default FinalCTA;
