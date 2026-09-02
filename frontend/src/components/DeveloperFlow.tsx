import React, { useState } from "react";
import { Link } from "react-router-dom";
import { useApp } from "../context/AppContext";
import { Terminal, Key, Users, Code, Activity, ArrowRight, BookOpen } from "lucide-react";

interface FlowStep {
  num: string;
  title: string;
  desc: string;
  icon: any;
  visual: string;
}

export const DeveloperFlow: React.FC = () => {
  const { token } = useApp();
  const [activeStep, setActiveStep] = useState(0);

  const steps: FlowStep[] = [
    {
      num: "01",
      title: "Create a Ricarut project",
      desc: "Instantly spin up a sandboxed double-entry project console from the dashboard. No vendor setup required.",
      icon: Terminal,
      visual: "agy init --project=my-digital-wallet",
    },
    {
      num: "02",
      title: "Get your API key",
      desc: "Hydrate secure Bearer API key credentials to authorize your HTTP integrations in test mode.",
      icon: Key,
      visual: "export RICARUT_API_KEY=\"rc_test_82ef10b9bc018a...\"",
    },
    {
      num: "03",
      title: "Create customers and accounts",
      desc: "Map your customer identities and provision multi-currency virtual accounts via unified JSON POST endpoints.",
      icon: Users,
      visual: "POST /api/v1/customers && POST /api/v1/accounts",
    },
    {
      num: "04",
      title: "Build your financial flows",
      desc: "Use double-entry transfer primitives to safely route money and manage user-facing balances easily.",
      icon: Code,
      visual: "POST /api/v1/transfers --data '{\"amount\": 10000}'",
    },
    {
      num: "05",
      title: "Test everything in the sandbox",
      desc: "Validate balanced ledger books, trace webhooks callbacks, and confirm system status before production.",
      icon: Activity,
      visual: "GET /api/v1/accounts/acc_01/transactions",
    },
  ];

  return (
    <section className="py-24 bg-[#030303] border-b border-neutral-900 px-6 lg:px-12 select-none relative">
      <div className="absolute inset-0 bg-dot-pattern opacity-10 pointer-events-none" />

      <div className="max-w-7xl mx-auto space-y-16">
        
        {/* Header copy precisely matching Section 8 prompt */}
        <div className="text-left space-y-4 max-w-2xl">
          <p className="text-xs font-bold text-indigo-400 uppercase tracking-widest font-mono">
            Integration Path
          </p>
          <h2 className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight">
            From idea to financial product.
          </h2>
          <p className="text-xs sm:text-sm text-neutral-400 leading-relaxed">
            Five modular steps to go from zero project configuration to a fully sandboxed ledger environment.
          </p>
        </div>

        {/* Timeline Grid layout */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
          
          {/* Timeline side (col-span-5) */}
          <div className="lg:col-span-5 space-y-3.5 text-left select-none">
            {steps.map((st, idx) => {
              const IconComponent = st.icon;
              return (
                <button
                  key={st.num}
                  onClick={() => setActiveStep(idx)}
                  className={`w-full p-4 rounded border text-left outline-none transition-all duration-300 flex items-center space-x-4 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2 focus-visible:ring-offset-[#030303] ${
                    idx === activeStep
                      ? "bg-neutral-950 border-neutral-800 shadow-xl"
                      : "bg-transparent border-transparent text-neutral-500 hover:text-neutral-300"
                  }`}
                >
                  <div className={`text-xs font-mono font-black ${idx === activeStep ? "text-indigo-400" : "text-neutral-600"}`}>
                    {st.num}
                  </div>
                  
                  <div className="flex-1">
                    <h4 className="text-xs font-black uppercase tracking-wider text-white">
                      {st.title}
                    </h4>
                    {idx === activeStep && (
                      <p className="text-[10px] text-neutral-500 font-medium leading-relaxed mt-1 animate-fade-in select-text">
                        {st.desc}
                      </p>
                    )}
                  </div>

                  <div className={`p-1.5 rounded border ${
                    idx === activeStep ? "bg-neutral-900 border-neutral-800 text-indigo-400" : "bg-transparent border-transparent text-neutral-700"
                  }`}>
                    <IconComponent className="h-4 w-4" />
                  </div>
                </button>
              );
            })}
          </div>

          {/* Visual Code Box side (col-span-7) */}
          <div className="lg:col-span-7 w-full font-mono text-[11px] text-neutral-300 text-left">
            <div className="w-full rounded-md border border-neutral-900 bg-neutral-950 p-6 relative overflow-hidden shadow-2xl min-h-[140px] flex flex-col justify-between">
              
              <div className="space-y-4">
                <div className="flex items-center justify-between text-[8px] text-neutral-600 font-bold uppercase tracking-widest select-none">
                  <span>Interactive Terminal tracer</span>
                  <span>Step {steps[activeStep].num} active</span>
                </div>
                
                <div className="space-y-1.5 select-all">
                  <span className="text-neutral-600 select-none mr-2">$</span>
                  <span className="text-indigo-300 font-bold font-mono">
                    {steps[activeStep].visual}
                  </span>
                </div>
              </div>

              <div className="text-[9px] text-neutral-500 font-bold uppercase tracking-wider border-t border-neutral-900/60 pt-4 mt-4 select-none">
                // Click other steps to inspect integration codes.
              </div>

            </div>

            {/* CTAs Section Action Group */}
            <div className="flex flex-col sm:flex-row items-center gap-4 mt-8 pt-2 select-none">
              <Link
                to={token ? "/projects" : "/signup"}
                className="w-full sm:w-auto inline-flex items-center justify-center space-x-2 rounded bg-white hover:bg-neutral-200 px-5 py-3 text-xs font-bold text-black shadow-md shadow-white/5 transition-colors cursor-pointer"
              >
                <span>Start building</span>
                <ArrowRight className="h-3.5 w-3.5" />
              </Link>
              
              <Link
                to="/docs"
                className="w-full sm:w-auto inline-flex items-center justify-center space-x-2 rounded border border-neutral-900 bg-neutral-950/40 hover:bg-neutral-900 hover:text-white px-5 py-3 text-xs font-bold text-neutral-400 transition-colors"
              >
                <BookOpen className="h-3.5 w-3.5 text-neutral-500" />
                <span>Read documentation</span>
              </Link>
            </div>

          </div>

        </div>

      </div>
    </section>
  );
};

export default DeveloperFlow;
