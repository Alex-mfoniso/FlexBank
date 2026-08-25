import React from "react";
import { Link } from "react-router-dom";
import { useApp } from "../context/AppContext";
import { ArrowRight, Terminal } from "lucide-react";

interface HeroProps {
  children?: React.ReactNode;
}

export const Hero: React.FC<HeroProps> = ({ children }) => {
  const { token } = useApp();

  return (
    <section className="relative min-h-[90vh] flex items-center justify-center pt-24 pb-16 px-6 lg:px-12 overflow-hidden bg-[#030303]">
      
      {/* Deep Technical Grid Background */}
      <div className="absolute inset-0 bg-grid-pattern pointer-events-none opacity-40" />
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[350px] bg-gradient-to-r from-indigo-500/10 via-violet-500/10 to-sky-500/5 rounded-full blur-[120px] pointer-events-none" />
      
      {/* Floating Technical Particle Elements (hidden if user prefers reduced motion) */}
      <div className="absolute top-1/3 left-1/4 w-1.5 h-1.5 rounded-full bg-indigo-500/20 pointer-events-none animate-particle-drift-1" />
      <div className="absolute bottom-1/4 right-1/4 w-2 h-2 rounded-full bg-sky-500/20 pointer-events-none animate-particle-drift-2" />

      {/* Main Grid: Responsive stacking */}
      <div className="relative z-10 max-w-7xl mx-auto w-full grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-16 items-center">
        
        {/* Left Column: Headline and CTAs (col-span-7) */}
        <div className="lg:col-span-7 space-y-6 text-left flex flex-col items-start">
          
          {/* Subtle Live Sandbox status */}
          <div className="inline-flex items-center space-x-2 rounded border border-neutral-900 bg-neutral-950 px-3 py-1 text-[10px] font-bold text-indigo-400 uppercase tracking-wider select-none">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
            <span>Developer Sandbox Operational</span>
          </div>

          {/* Confident Headings (optimized text size scaling for mobile) */}
          <h1 className="text-3xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight text-white leading-[1.15] sm:leading-[1.1] max-w-3xl">
            The financial <br className="hidden sm:inline" />
            infrastructure behind <br />
            <span className="bg-gradient-to-r from-indigo-400 via-violet-400 to-sky-400 bg-clip-text text-transparent">
              your next product
            </span>
            .
          </h1>

          {/* Readable supporting body */}
          <p className="text-xs sm:text-base text-neutral-400 leading-relaxed max-w-xl">
            Build accounts, wallets, transfers and payments through one developer-first API. 
            FlexBank provides core ledger primitives so you can scale without rebuilding the financial foundation underneath.
          </p>

          {/* Action CTAs Group: Stacked on mobile, side-by-side on desktop */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-4 pt-4 w-full sm:w-auto select-none">
            <Link
              to={token ? "/projects" : "/signup"}
              className="inline-flex items-center justify-center space-x-2 rounded bg-white hover:bg-neutral-200 px-6 py-3.5 text-xs font-bold text-black active:scale-[0.98] shadow-md shadow-white/5 transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2 focus-visible:ring-offset-[#030303] text-center"
            >
              <span>Start building</span>
              <ArrowRight className="h-4 w-4" />
            </Link>
            
            <Link
              to="/docs"
              className="inline-flex items-center justify-center space-x-2 rounded border border-neutral-900 bg-neutral-950/40 hover:bg-neutral-900 hover:text-white px-6 py-3.5 text-xs font-bold text-neutral-400 active:scale-[0.98] transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2 focus-visible:ring-offset-[#030303] text-center"
            >
              <Terminal className="h-4 w-4 text-neutral-500" />
              <span>Read the docs</span>
            </Link>
          </div>

          {/* Sandbox Indicator (Test Mode) */}
          <div className="flex items-center space-x-2 pt-4 border-t border-neutral-900/60 w-full max-w-md select-none">
            <div className="flex h-5 w-8 items-center justify-center rounded bg-amber-500/10 border border-amber-500/20 text-[9px] font-black text-amber-400 tracking-wide uppercase shrink-0">
              TEST
            </div>
            <p className="text-[10px] text-neutral-500 font-bold uppercase tracking-wider font-mono">
              No real money. Start building in the sandbox immediately.
            </p>
          </div>
        </div>

        {/* Right Column: Hero Interactive API Visual (col-span-5, stacked below on mobile) */}
        <div className="lg:col-span-5 w-full flex justify-center mt-6 lg:mt-0">
          {children}
        </div>

      </div>
    </section>
  );
};

export default Hero;
