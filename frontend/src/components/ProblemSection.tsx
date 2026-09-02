import React, { useEffect, useRef, useState } from "react";
import { X, Check, ShieldAlert, Cpu, ArrowDown } from "lucide-react";

export const ProblemSection: React.FC = () => {
  const [isVisible, setIsVisible] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true);
          observer.disconnect(); // Trigger once
        }
      },
      { threshold: 0.1 }
    );

    if (containerRef.current) {
      observer.observe(containerRef.current);
    }

    return () => observer.disconnect();
  }, []);

  const diffs = [
    "APIs & Schema Formats",
    "Authentication (HMAC vs Bearer)",
    "Asynchronous Webhook Signatures",
    "Error Payload Specifications",
    "Underlying Transaction Models",
    "Scattered Documentation Gates",
  ];

  return (
    <section 
      ref={containerRef}
      className="py-24 bg-[#030303] border-b border-neutral-900 px-6 lg:px-12 select-none overflow-hidden relative"
    >
      <div className="absolute inset-0 bg-grid-pattern opacity-10 pointer-events-none" />

      <div className="max-w-7xl mx-auto space-y-16 relative z-10 text-center">
        
        {/* Header precisely matching Section 5 prompt specs */}
        <div className="space-y-4 max-w-2xl mx-auto">
          <p className="text-xs font-bold text-rose-500 uppercase tracking-widest font-mono">
            Architectural Pain vs Speed
          </p>
          <h2 className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight leading-tight">
            Stop managing five different integrations.
          </h2>
          <p className="text-xs sm:text-sm text-neutral-400 leading-relaxed max-w-lg mx-auto">
            Stitching different legacy systems manually introduces massive operational liabilities and synchronization risks.
          </p>
        </div>

        {/* Comparative Grid with animated transition on entry */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 sm:gap-16 max-w-6xl mx-auto">
          
          {/* LEFT: WITHOUT RICARUT */}
          <div 
            className={`scroll-fade-initial space-y-6 ${
              isVisible ? "scroll-fade-active" : ""
            }`}
            style={{ transitionDelay: "100ms" }}
          >
            <div className="rounded-lg border border-neutral-900/60 bg-red-950/5 p-6 sm:p-8 space-y-6 text-left relative overflow-hidden min-h-[440px] flex flex-col justify-between hover:-translate-y-0.5 hover:border-neutral-850 hover:shadow-xl hover:shadow-rose-500/[0.005] transition-all duration-300">
              <div className="absolute top-0 left-0 w-[2px] h-full bg-rose-500/20" />
              
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-black uppercase tracking-widest text-rose-500 font-mono">
                    WITHOUT RICARUT
                  </span>
                  <div className="flex items-center space-x-1 font-mono text-[9px] text-rose-500 font-bold uppercase select-none">
                    <X className="h-3.5 w-3.5" />
                    <span>Fragmentation</span>
                  </div>
                </div>

                <h3 className="text-lg font-black text-neutral-100 uppercase tracking-wider">
                  The Stitching Trap
                </h3>
                <p className="text-xs text-neutral-500 leading-relaxed font-medium">
                  Manually interfacing your application code against multiple fragmented platforms:
                </p>

                {/* Split list */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 pt-2 select-text font-mono text-[10px]">
                  {diffs.map((diff) => (
                    <div key={diff} className="flex items-center space-x-2 text-neutral-500 font-semibold">
                      <X className="h-3 w-3 text-rose-500 shrink-0" />
                      <span>{diff}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Provider connection graph mockup */}
              <div className="border-t border-neutral-900/60 pt-6 space-y-3.5 font-mono select-none">
                <div className="flex items-center justify-center space-x-2.5">
                  <span className="px-2.5 py-1 rounded bg-neutral-950 border border-neutral-900 text-[9px] text-neutral-400 font-bold uppercase tracking-wider">
                    Your Application
                  </span>
                  <ArrowDown className="h-3.5 w-3.5 text-neutral-700 -rotate-90" />
                  <div className="flex flex-wrap gap-1.5 justify-center max-w-sm">
                    <span className="px-2 py-0.5 rounded bg-neutral-900/50 border border-neutral-900/40 text-[8px] text-rose-400 font-bold uppercase">
                      Payment Provider
                    </span>
                    <span className="px-2 py-0.5 rounded bg-neutral-900/50 border border-neutral-900/40 text-[8px] text-rose-400 font-bold uppercase">
                      Banking Provider
                    </span>
                    <span className="px-2 py-0.5 rounded bg-neutral-900/50 border border-neutral-900/40 text-[8px] text-rose-400 font-bold uppercase">
                      KYC Provider
                    </span>
                    <span className="px-2 py-0.5 rounded bg-neutral-900/50 border border-neutral-900/40 text-[8px] text-rose-400 font-bold uppercase">
                      Transfer Provider
                    </span>
                  </div>
                </div>
              </div>

            </div>
          </div>

          {/* RIGHT: WITH RICARUT */}
          <div 
            className={`scroll-fade-initial space-y-6 ${
              isVisible ? "scroll-fade-active" : ""
            }`}
            style={{ transitionDelay: "300ms" }}
          >
            <div className="rounded-lg border border-neutral-900/60 bg-indigo-950/5 p-6 sm:p-8 space-y-6 text-left relative overflow-hidden min-h-[440px] flex flex-col justify-between hover:-translate-y-0.5 hover:border-neutral-850 hover:shadow-xl hover:shadow-indigo-500/[0.005] transition-all duration-300">
              <div className="absolute top-0 left-0 w-[2px] h-full bg-indigo-500/20" />

              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-black uppercase tracking-widest text-indigo-400 font-mono">
                    WITH RICARUT
                  </span>
                  <div className="flex items-center space-x-1 font-mono text-[9px] text-indigo-400 font-bold uppercase select-none">
                    <Check className="h-3.5 w-3.5" />
                    <span>Consolidation</span>
                  </div>
                </div>

                <h3 className="text-lg font-black text-neutral-100 uppercase tracking-wider">
                  The Unified Ledger Standard
                </h3>
                <p className="text-xs text-neutral-500 leading-relaxed font-medium">
                  Directly interface with a single integrated double-entry ledger database. We maintain the provider networks under the hood.
                </p>

                {/* Consolidated values list */}
                <div className="space-y-2.5 pt-2 font-mono text-[10px]">
                  <div className="flex items-start space-x-2.5 text-neutral-400 font-semibold select-text">
                    <Check className="h-3.5 w-3.5 text-indigo-400 shrink-0 mt-0.5" />
                    <span>Unified JSON contracts with standardized payload shapes</span>
                  </div>
                  <div className="flex items-start space-x-2.5 text-neutral-400 font-semibold select-text">
                    <Check className="h-3.5 w-3.5 text-indigo-400 shrink-0 mt-0.5" />
                    <span>Symmetrical API structures and secure Bearer JWT scopes</span>
                  </div>
                  <div className="flex items-start space-x-2.5 text-neutral-400 font-semibold select-text">
                    <Check className="h-3.5 w-3.5 text-indigo-400 shrink-0 mt-0.5" />
                    <span>HMAC SHA-256 secure signed webhook callback triggers</span>
                  </div>
                </div>
              </div>

              {/* Ricarut consolidation graph */}
              <div className="border-t border-neutral-900/60 pt-6 space-y-3.5 font-mono select-none">
                <div className="flex items-center justify-center space-x-3">
                   <span className="px-2.5 py-1 rounded bg-neutral-950 border border-neutral-900 text-[9px] text-neutral-400 font-bold uppercase tracking-wider">
                     Your Application
                   </span>
                   <ArrowDown className="h-3.5 w-3.5 text-indigo-500 -rotate-90" />
                   <span className="px-2.5 py-1 rounded bg-indigo-950/40 border border-indigo-500/20 text-[9px] text-white font-black uppercase tracking-widest shadow-lg shadow-indigo-500/5">
                     RICARUT
                   </span>
                  <ArrowDown className="h-3.5 w-3.5 text-indigo-500 -rotate-90" />
                  <span className="px-2.5 py-1 rounded bg-neutral-950 border border-neutral-900 text-[9px] text-neutral-400 font-bold uppercase tracking-wider font-mono">
                    Unified API
                  </span>
                </div>
              </div>

            </div>
          </div>

        </div>

      </div>
    </section>
  );
};

export default ProblemSection;
