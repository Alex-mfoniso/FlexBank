import React, { useState } from "react";
import { Link } from "react-router-dom";
import { 
  ArrowRight, 
  Terminal, 
  Activity, 
  Database, 
  ShieldCheck, 
  Coins, 
  Users, 
  Shuffle, 
  Cpu,
  FolderKanban,
  FileCode,
  Lock
} from "lucide-react";
import { CodeBlock } from "../components/CodeBlock";

// Interactive Steps Data for API Sandbox
const STEPS = [
  {
    id: "auth",
    title: "1. Authenticate",
    desc: "Pass your secret API key inside the bearer Authorization header on every request.",
    reqLang: "bash",
    reqCode: `curl -X GET https://api.flexbank.dev/v1/projects/active \\
  -H "Authorization: Bearer fb_test_7f92ac81bc0"`,
    resLang: "json",
    resCode: `{
  "status": "success",
  "project": {
    "id": "proj_ba2cc745",
    "name": "Acme fintech",
    "environment": "TEST"
  }
}`
  },
  {
    id: "customer",
    title: "2. Create Customer",
    desc: "Register individuals or corporate entities to open legal ledgers.",
    reqLang: "bash",
    reqCode: `curl -X POST https://api.flexbank.dev/v1/customers \\
  -H "Authorization: Bearer fb_test_7f92ac81bc0" \\
  -H "Content-Type: application/json" \\
  -d '{
    "firstName": "Sarah",
    "lastName": "Connor",
    "email": "sarah.connor@cyberdyne.com"
  }'`,
    resLang: "json",
    resCode: `{
  "id": "cust_901a82bc",
  "firstName": "Sarah",
  "lastName": "Connor",
  "email": "sarah.connor@cyberdyne.com",
  "status": "ACTIVE",
  "createdAt": "2026-08-18T17:55:00Z"
}`
  },
  {
    id: "account",
    title: "3. Open Account",
    desc: "Provision instantly funded virtual or operational digital bank ledgers in major currencies.",
    reqLang: "bash",
    reqCode: `curl -X POST https://api.flexbank.dev/v1/accounts \\
  -H "Authorization: Bearer fb_test_7f92ac81bc0" \\
  -H "Content-Type: application/json" \\
  -d '{
    "customerId": "cust_901a82bc",
    "currency": "USD",
    "type": "SAVINGS"
  }'`,
    resLang: "json",
    resCode: `{
  "id": "acc_881cf712",
  "customerId": "cust_901a82bc",
  "accountNumber": "9021831123",
  "currency": "USD",
  "balance": 0,
  "status": "ACTIVE"
}`
  },
  {
    id: "transfer",
    title: "4. Execute Transfer",
    desc: "Orchestrate instant double-entry financial settlements with real-time audit logs.",
    reqLang: "bash",
    reqCode: `curl -X POST https://api.flexbank.dev/v1/transfers \\
  -H "Authorization: Bearer fb_test_7f92ac81bc0" \\
  -H "Content-Type: application/json" \\
  -d '{
    "sourceAccountId": "acc_881cf712",
    "destinationAccountId": "acc_102fba99",
    "amount": 25000,
    "description": "API Integration Sandbox funding"
  }'`,
    resLang: "json",
    resCode: `{
  "id": "tx_220ffc15",
  "sourceAccountId": "acc_881cf712",
  "destinationAccountId": "acc_102fba99",
  "amount": 25000,
  "status": "COMPLETED",
  "reference": "LEDG_002a99bf3",
  "createdAt": "2026-08-18T17:56:10Z"
}`
  }
];

export const Landing: React.FC = () => {
  const [activeStep, setActiveStep] = useState(STEPS[0]);

  const token = localStorage.getItem("token");

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col selection:bg-indigo-500/30 selection:text-indigo-200">
      
      {/* 1. Global Navigation Bar */}
      <header className="sticky top-0 z-50 border-b border-slate-900 bg-slate-950/80 backdrop-blur-md px-6 lg:px-12 h-16 flex items-center justify-between">
        <div className="flex items-center space-x-2.5">
          <div className="flex h-8 w-8 items-center justify-center rounded-md bg-indigo-500 font-bold text-white text-md shadow-md shadow-indigo-500/20">
            F
          </div>
          <span className="text-lg font-bold tracking-tight text-white">FlexBank</span>
          <span className="text-[9px] bg-slate-900 text-indigo-400 font-bold px-2 py-0.5 rounded border border-slate-800">
            PLATFORM
          </span>
        </div>

        <nav className="flex items-center space-x-4 lg:space-x-8">
          {token ? (
            <Link 
              to="/projects" 
              className="flex items-center space-x-1.5 text-xs font-bold text-indigo-400 hover:text-indigo-300 transition-all"
            >
              <FolderKanban className="h-4 w-4" />
              <span>Go to Console</span>
            </Link>
          ) : (
            <>
              <Link 
                to="/login" 
                className="text-xs font-bold text-slate-400 hover:text-slate-200 transition-colors"
              >
                Sign In
              </Link>
              <Link 
                to="/signup" 
                className="rounded-lg bg-indigo-600 hover:bg-indigo-500 px-3.5 py-1.5 text-xs font-bold text-white shadow-sm transition-all"
              >
                Create Account
              </Link>
            </>
          )}
        </nav>
      </header>

      {/* 2. Hero Section */}
      <section className="px-6 lg:px-12 py-16 lg:py-24 max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-16 items-center">
        
        {/* Left column Content */}
        <div className="space-y-6 text-left">
          <div className="inline-flex items-center space-x-2 rounded-full border border-slate-800 bg-slate-900/60 px-3 py-1 text-xs font-medium text-indigo-400 shadow-inner">
            <Activity className="h-3.5 w-3.5 animate-pulse" />
            <span>Operational developer sandbox fully live</span>
          </div>

          <h1 className="text-4xl lg:text-5xl font-black tracking-tight text-white leading-tight">
            Financial API <br />
            <span className="bg-gradient-to-r from-indigo-400 to-sky-400 bg-clip-text text-transparent">
              Infrastructure
            </span> for Platforms.
          </h1>

          <p className="text-sm lg:text-base text-slate-400 leading-relaxed max-w-xl">
            Provision digital ledger records, multi-currency customer accounts, secure double-entry ledgers, and execute real-time settlements through a single unified REST interface.
          </p>

          <div className="flex flex-col sm:flex-row items-stretch sm:items-center space-y-3 sm:space-y-0 sm:space-x-4 pt-4">
            <Link
              to={token ? "/projects" : "/signup"}
              className="flex items-center justify-center space-x-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 px-6 py-3.5 text-sm font-bold text-white shadow-md shadow-indigo-600/10 transition-all"
            >
              <span>Get Secret API Keys</span>
              <ArrowRight className="h-4 w-4" />
            </Link>
            <Link
              to="/login"
              className="flex items-center justify-center space-x-2 rounded-xl border border-slate-800 bg-slate-900/30 hover:bg-slate-900/60 hover:text-white px-6 py-3.5 text-sm font-bold text-slate-400 transition-all"
            >
              <Terminal className="h-4 w-4 text-slate-500" />
              <span>Read API docs</span>
            </Link>
          </div>

          <div className="grid grid-cols-3 gap-6 pt-8 border-t border-slate-900/80">
            <div>
              <p className="text-xl font-black text-white">100%</p>
              <p className="text-[10px] text-slate-500 uppercase font-bold tracking-wider mt-1">Double-Entry Audit</p>
            </div>
            <div>
              <p className="text-xl font-black text-white">&lt;50ms</p>
              <p className="text-[10px] text-slate-500 uppercase font-bold tracking-wider mt-1">Ledger Settlement</p>
            </div>
            <div>
              <p className="text-xl font-black text-white">REST</p>
              <p className="text-[10px] text-slate-500 uppercase font-bold tracking-wider mt-1">JSON Interface</p>
            </div>
          </div>
        </div>

        {/* Right column: Conceptual Architecture CSS/SVG Diagram */}
        <div className="relative rounded-2xl border border-slate-900 bg-slate-900/20 p-8 shadow-2xl flex flex-col justify-center overflow-hidden h-[420px]">
          <div className="absolute inset-0 bg-radial-gradient from-indigo-500/5 to-transparent pointer-events-none" />
          
          <div className="z-10 space-y-6">
            <div className="flex items-center justify-between border-b border-slate-900 pb-4">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Conceptual System Architecture</span>
              <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
            </div>

            <div className="grid grid-cols-3 items-center gap-4 relative">
              
              {/* Box 1: Platform App */}
              <div className="rounded-xl border border-slate-800 bg-slate-900/80 p-4 text-center shadow-md">
                <Cpu className="mx-auto h-6 w-6 text-indigo-400 mb-2" />
                <h4 className="text-[11px] font-bold text-white uppercase tracking-wider">Your App</h4>
                <p className="text-[9px] text-slate-500 mt-1">Platform Backend</p>
              </div>

              {/* Central Box: FlexBank API */}
              <div className="rounded-xl border border-indigo-500/20 bg-indigo-950/40 p-4 text-center shadow-md shadow-indigo-500/5 z-20 relative">
                <div className="absolute inset-x-0 top-0 h-[1px] bg-gradient-to-r from-transparent via-indigo-400/30 to-transparent" />
                <Coins className="mx-auto h-6 w-6 text-indigo-400 mb-2 animate-bounce" />
                <h4 className="text-[11px] font-bold text-white uppercase tracking-wider">FlexBank</h4>
                <p className="text-[9px] text-indigo-300 mt-1">Core API Engine</p>
              </div>

              {/* Connection Grid right column */}
              <div className="space-y-3">
                <div className="rounded-lg border border-slate-900 bg-slate-950/60 p-2 text-center text-[10px] font-mono text-slate-400">
                  <Database className="inline h-3.5 w-3.5 text-sky-400 mr-1.5" />
                  Ledger DB
                </div>
                <div className="rounded-lg border border-slate-900 bg-slate-950/60 p-2 text-center text-[10px] font-mono text-slate-400">
                  <Shuffle className="inline h-3.5 w-3.5 text-violet-400 mr-1.5" />
                  Providers
                </div>
                <div className="rounded-lg border border-slate-900 bg-slate-950/60 p-2 text-center text-[10px] font-mono text-slate-400">
                  <Activity className="inline h-3.5 w-3.5 text-amber-400 mr-1.5" />
                  Simulator
                </div>
              </div>

              {/* Connecting line overlays */}
              <div className="absolute top-1/2 left-[28%] w-[12%] h-[1px] bg-slate-800" />
              <div className="absolute top-1/2 left-[62%] w-[12%] h-[1px] bg-slate-800" />
            </div>

            {/* Explanation box */}
            <div className="rounded-xl border border-slate-900 bg-slate-950/40 p-4 text-xs text-slate-400 text-left leading-relaxed">
              Developers implement FlexBank once. When requests arrive, the system registers accounts, processes transactions through the double-entry database, or runs immediate compliance tests in the sandbox.
            </div>
          </div>
        </div>

      </section>

      {/* 3. Interactive Code Sandbox Slider Section */}
      <section className="border-t border-slate-900 bg-slate-900/10 px-6 lg:px-12 py-16 lg:py-24">
        <div className="max-w-7xl mx-auto">
          
          <div className="text-center max-w-2xl mx-auto space-y-4 mb-12">
            <h2 className="text-3xl font-extrabold text-white tracking-tight">
              One integration. Complete coverage.
            </h2>
            <p className="text-sm text-slate-400 leading-relaxed">
              Explore the lifecycle of building financial platforms. Toggle the checklist steps below to examine request payloads and REST JSON response schemas.
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-stretch">
            
            {/* Steps checklists buttons (col-span-4) */}
            <div className="lg:col-span-4 flex flex-col justify-center space-y-3">
              {STEPS.map((step) => {
                const isActive = step.id === activeStep.id;
                return (
                  <button
                    key={step.id}
                    onClick={() => setActiveStep(step)}
                    className={`flex flex-col text-left p-4 rounded-xl border transition-all ${
                      isActive
                        ? "bg-slate-900 border-indigo-500/20 shadow-md shadow-indigo-500/5 text-slate-100"
                        : "bg-slate-950/40 border-transparent text-slate-400 hover:bg-slate-900/40"
                    }`}
                  >
                    <span className="text-xs font-bold uppercase tracking-wider">{step.title}</span>
                    <span className="text-xs mt-1 text-slate-400 leading-relaxed">{step.desc}</span>
                  </button>
                );
              })}
            </div>

            {/* Code request/response columns (col-span-8) */}
            <div className="lg:col-span-8 grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block text-left">
                  Request Payload
                </span>
                <CodeBlock 
                  code={activeStep.reqCode} 
                  language={activeStep.reqLang} 
                  copyable={true} 
                />
              </div>

              <div className="space-y-2">
                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block text-left">
                  Response Schema (201 Created)
                </span>
                <CodeBlock 
                  code={activeStep.resCode} 
                  language={activeStep.resLang} 
                  copyable={true} 
                />
              </div>
            </div>

          </div>

        </div>
      </section>

      {/* 4. Technical Features Grid */}
      <section className="border-t border-slate-900 px-6 lg:px-12 py-16 lg:py-24 max-w-7xl mx-auto space-y-12">
        <div className="text-center max-w-2xl mx-auto space-y-4">
          <h2 className="text-2xl font-bold text-white">Built for technical product teams</h2>
          <p className="text-sm text-slate-400 leading-relaxed">
            Standardize banking primitives and compliance barriers under an infrastructure-as-code ledger stack.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="rounded-xl border border-slate-900 bg-slate-900/10 p-6 space-y-3 text-left">
            <ShieldCheck className="h-8 w-8 text-indigo-400" />
            <h4 className="text-sm font-bold text-white uppercase tracking-wider">HMAC Signature Webhooks</h4>
            <p className="text-xs text-slate-500 leading-relaxed">
              Verify security compliance. Every event delivered to your application backend includes cryptographic HMAC signatures for validation.
            </p>
          </div>

          <div className="rounded-xl border border-slate-900 bg-slate-900/10 p-6 space-y-3 text-left">
            <Coins className="h-8 w-8 text-sky-400" />
            <h4 className="text-sm font-bold text-white uppercase tracking-wider">Double-Entry Core</h4>
            <p className="text-xs text-slate-500 leading-relaxed">
              Maintain mathematically balanced financial ledgers. Assets, liabilities, equity, credits, and debits align on every transaction.
            </p>
          </div>

          <div className="rounded-xl border border-slate-900 bg-slate-900/10 p-6 space-y-3 text-left">
            <Terminal className="h-8 w-8 text-violet-400" />
            <h4 className="text-sm font-bold text-white uppercase tracking-wider">Observability Request Traces</h4>
            <p className="text-xs text-slate-500 leading-relaxed">
              Debug failures instantly using exact HTTP log trace histories, query parameters, status codes, and request-id parameters.
            </p>
          </div>
        </div>
      </section>

      {/* 5. Footer and CTAs */}
      <footer className="mt-auto border-t border-slate-900 bg-slate-950 py-8 text-center text-xs text-slate-500 space-y-4">
        <div className="flex items-center justify-center space-x-6 text-slate-400 font-semibold">
          <Link to="/docs" className="hover:text-white transition-colors">Documentation</Link>
          <span className="h-1 w-1 rounded-full bg-slate-800" />
          <Link to="/login" className="hover:text-white transition-colors">Sign In</Link>
          <span className="h-1 w-1 rounded-full bg-slate-800" />
          <Link to="/signup" className="hover:text-white transition-colors">API Keys</Link>
        </div>
        <p>© 2026 FlexBank Inc. Fintech Infrastructure & Platform Developer Services.</p>
      </footer>

    </div>
  );
};
export default Landing;
