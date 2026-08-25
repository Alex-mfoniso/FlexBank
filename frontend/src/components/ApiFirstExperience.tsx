import React, { useState } from "react";
import { Link } from "react-router-dom";
import { useApp } from "../context/AppContext";
import { CodeBlock } from "./CodeBlock";
import { UserPlus, Wallet, ArrowLeftRight, Activity, BellRing, Copy, Check, ArrowRight } from "lucide-react";

interface ApiTab {
  id: string;
  name: string;
  endpoint: string;
  method: string;
  desc: string;
  requestBody: string;
  responseStatus: string;
  responseBody: string;
}

export const ApiFirstExperience: React.FC = () => {
  const { token } = useApp();
  const [activeTabIndex, setActiveTab] = useState(0);
  const [copiedIndex, setCopiedIndex] = useState<"req" | "res" | null>(null);

  const tabs: ApiTab[] = [
    {
      id: "customers",
      name: "Customers",
      endpoint: "/api/v1/customers",
      method: "POST",
      desc: "Register a legal customer identity profile to start virtual ledger allocations.",
      requestBody: `{
  "firstName": "Alexander",
  "lastName": "Mfoniso",
  "email": "alex.m@example.com",
  "phone": "+2348012345678"
}`,
      responseStatus: "201 Created",
      responseBody: `{
  "id": "cust_82f1bc09",
  "firstName": "Alexander",
  "lastName": "Mfoniso",
  "email": "alex.m@example.com",
  "phone": "+2348012345678",
  "status": "ACTIVE",
  "createdAt": "2026-08-25T20:45:00Z"
}`,
    },
    {
      id: "accounts",
      name: "Accounts",
      endpoint: "/api/v1/accounts",
      method: "POST",
      desc: "Instantly allocate multi-currency virtual accounts for active customers.",
      requestBody: `{
  "customerId": "cust_82f1bc09",
  "currency": "NGN",
  "name": "Alex Primary Ledger Wallet"
}`,
      responseStatus: "201 Created",
      responseBody: `{
  "id": "acc_82ef10b9",
  "customerId": "cust_82f1bc09",
  "currency": "NGN",
  "name": "Alex Primary Ledger Wallet",
  "balance": 0,
  "status": "ACTIVE",
  "createdAt": "2026-08-25T20:46:12Z"
}`,
    },
    {
      id: "transfers",
      name: "Transfers",
      endpoint: "/api/v1/transfers",
      method: "POST",
      desc: "Settle double-entry transfers between digital ledgers safely in 14 milliseconds.",
      requestBody: `{
  "type": "internal",
  "sourceAccountId": "acc_82ef10b9",
  "destinationAccountId": "acc_91ab45f2",
  "amount": 10000,
  "currency": "NGN",
  "reference": "tx_first_settle_01"
}`,
      responseStatus: "201 Created",
      responseBody: `{
  "id": "tx_220ffc15",
  "sourceAccountId": "acc_82ef10b9",
  "destinationAccountId": "acc_91ab45f2",
  "amount": 10000,
  "currency": "NGN",
  "status": "COMPLETED",
  "createdAt": "2026-08-25T20:47:30Z"
}`,
    },
    {
      id: "transactions",
      name: "Transactions",
      endpoint: "/api/v1/accounts/acc_82ef10b9/transactions",
      method: "GET",
      desc: "Query transparent transaction journals to audit compliance status traces.",
      requestBody: `null (GET Request has no body parameters)`,
      responseStatus: "200 OK",
      responseBody: `[
  {
    "id": "tx_220ffc15",
    "accountId": "acc_82ef10b9",
    "type": "DEBIT",
    "amount": 10000,
    "currency": "NGN",
    "reference": "tx_first_settle_01",
    "status": "COMPLETED",
    "createdAt": "2026-08-25T20:47:30Z"
  }
]`,
    },
  ];

  const activeTab = tabs[activeTabIndex];

  const handleCopy = (text: string, type: "req" | "res") => {
    navigator.clipboard.writeText(text);
    setCopiedIndex(type);
    setTimeout(() => {
      setCopiedIndex(null);
    }, 2000);
  };

  return (
    <section id="developers" className="py-24 bg-[#030303] border-b border-neutral-900 px-6 lg:px-12 select-none relative">
      <div className="absolute inset-0 bg-dot-pattern opacity-10 pointer-events-none" />

      <div className="max-w-7xl mx-auto space-y-16">
        
        {/* Title */}
        <div className="text-left space-y-4 max-w-2xl">
          <p className="text-xs font-bold text-indigo-400 uppercase tracking-widest font-mono">
            API-FIRST ENGINE
          </p>
          <h2 className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight">
            Build with APIs, not integrations.
          </h2>
          <p className="text-xs sm:text-sm text-neutral-400 leading-relaxed">
            Consolidate multiple legacy core networks into standard JSON payloads. Switch the steps below to inspect exact API structures.
          </p>
        </div>

        {/* Large split-screen section */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-16 items-start">
          
          {/* LEFT: Explanatory text triggers */}
          <div className="lg:col-span-4 flex flex-col space-y-4 text-left">
            
            {/* Create Customers Trigger */}
            <button
              onClick={() => setActiveTab(0)}
              className={`p-4 rounded border text-left outline-none transition-all duration-300 flex items-start space-x-4 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2 focus-visible:ring-offset-[#030303] ${
                activeTabIndex === 0
                  ? "bg-neutral-950 border-neutral-800 shadow-lg text-white"
                  : "bg-transparent border-transparent text-neutral-500 hover:text-neutral-300"
              }`}
            >
              <UserPlus className={`h-5 w-5 shrink-0 ${activeTabIndex === 0 ? "text-indigo-400" : "text-neutral-600"}`} />
              <div>
                <h4 className="text-xs font-bold uppercase tracking-wider">Create customers.</h4>
                <p className="text-[10px] text-neutral-500 font-medium leading-relaxed mt-1">
                  Bind KYC-compliant personal profiles to establish individual ledger scopes.
                </p>
              </div>
            </button>

            {/* Create Accounts Trigger */}
            <button
              onClick={() => setActiveTab(1)}
              className={`p-4 rounded border text-left outline-none transition-all duration-300 flex items-start space-x-4 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2 focus-visible:ring-offset-[#030303] ${
                activeTabIndex === 1
                  ? "bg-neutral-950 border-neutral-800 shadow-lg text-white"
                  : "bg-transparent border-transparent text-neutral-500 hover:text-neutral-300"
              }`}
            >
              <Wallet className={`h-5 w-5 shrink-0 ${activeTabIndex === 1 ? "text-indigo-400" : "text-neutral-600"}`} />
              <div>
                <h4 className="text-xs font-bold uppercase tracking-wider">Create accounts.</h4>
                <p className="text-[10px] text-neutral-500 font-medium leading-relaxed mt-1">
                  Provision digital multi-currency account numbers instantly.
                </p>
              </div>
            </button>

            {/* Move Money Trigger */}
            <button
              onClick={() => setActiveTab(2)}
              className={`p-4 rounded border text-left outline-none transition-all duration-300 flex items-start space-x-4 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2 focus-visible:ring-offset-[#030303] ${
                activeTabIndex === 2
                  ? "bg-neutral-950 border-neutral-800 shadow-lg text-white"
                  : "bg-transparent border-transparent text-neutral-500 hover:text-neutral-300"
              }`}
            >
              <ArrowLeftRight className={`h-5 w-5 shrink-0 ${activeTabIndex === 2 ? "text-indigo-400" : "text-neutral-600"}`} />
              <div>
                <h4 className="text-xs font-bold uppercase tracking-wider">Move money.</h4>
                <p className="text-[10px] text-neutral-500 font-medium leading-relaxed mt-1">
                  Instruct real-time transactional double-entry transfers between internal nodes.
                </p>
              </div>
            </button>

            {/* Track Transactions Trigger */}
            <button
              onClick={() => setActiveTab(3)}
              className={`p-4 rounded border text-left outline-none transition-all duration-300 flex items-start space-x-4 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2 focus-visible:ring-offset-[#030303] ${
                activeTabIndex === 3
                  ? "bg-neutral-950 border-neutral-800 shadow-lg text-white"
                  : "bg-transparent border-transparent text-neutral-500 hover:text-neutral-300"
              }`}
            >
              <Activity className={`h-5 w-5 shrink-0 ${activeTabIndex === 3 ? "text-indigo-400" : "text-neutral-600"}`} />
              <div>
                <h4 className="text-xs font-bold uppercase tracking-wider">Track transactions.</h4>
                <p className="text-[10px] text-neutral-500 font-medium leading-relaxed mt-1">
                  Query detailed, chronological ledger balance tracers with transparent audit reports.
                </p>
              </div>
            </button>

            {/* Listen for Events Trigger */}
            <button
              onClick={() => setActiveTab(3)}
              className="p-4 rounded border border-transparent text-left outline-none text-neutral-500 hover:text-neutral-300 flex items-start space-x-4 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2"
            >
              <BellRing className="h-5 w-5 shrink-0 text-neutral-600" />
              <div>
                <h4 className="text-xs font-bold uppercase tracking-wider">Listen for events.</h4>
                <p className="text-[10px] text-neutral-500 font-medium leading-relaxed mt-1">
                  Hook up HMAC-signed JSON webhooks to capture transactional settlements asynchronously.
                </p>
              </div>
            </button>

          </div>

          {/* RIGHT: Interactive API Code Panel (col-span-8) */}
          <div className="lg:col-span-8 w-full">
            
            {/* Editor Container */}
            <div className="w-full rounded-md border border-neutral-900 bg-neutral-950/80 shadow-2xl overflow-hidden font-mono text-[11px] text-neutral-300 text-left relative flex flex-col min-h-[460px]">
              
              {/* Tab button rows */}
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between border-b border-neutral-900 bg-neutral-950 px-4 py-2 sm:py-0 sm:h-11 select-none gap-2">
                
                {/* Right Tab triggers */}
                <div className="flex space-x-1.5 overflow-x-auto scrollbar-hide py-1">
                  {tabs.map((tab, idx) => (
                    <button
                      key={tab.id}
                      onClick={() => setActiveTab(idx)}
                      className={`px-3 py-1.5 rounded text-[10px] font-black uppercase tracking-wider font-mono transition-colors outline-none cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 ${
                        idx === activeTabIndex
                          ? "bg-neutral-900 text-white border border-neutral-800"
                          : "text-neutral-500 hover:text-neutral-300 border border-transparent"
                      }`}
                    >
                      {tab.name}
                    </button>
                  ))}
                </div>

                {/* Left Active Method Indicators */}
                <div className="flex items-center space-x-2 self-start sm:self-center font-mono select-none">
                  <span className={`text-[8px] px-1.5 py-0.5 rounded font-black border uppercase tracking-wider ${
                    activeTab.method === "POST" ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/10" : "bg-sky-500/10 text-sky-400 border-sky-500/10"
                  }`}>
                    {activeTab.method}
                  </span>
                  <span className="text-[10px] text-neutral-500 font-bold tracking-tight">
                    {activeTab.endpoint}
                  </span>
                </div>

                <div className="hidden sm:flex items-center space-x-2">
                  <span className="h-1.5 w-1.5 rounded-full bg-indigo-500" />
                  <span className="text-[8px] font-bold text-neutral-600 uppercase tracking-widest font-mono">
                    TEST GATEWAY
                  </span>
                </div>
              </div>

              {/* Viewport splits: Request and Response side-by-side on large width, Stacked on narrow */}
              <div className="grid grid-cols-1 md:grid-cols-2 divide-y md:divide-y-0 md:divide-x divide-neutral-900 flex-1">
                
                {/* 1. Request Column */}
                <div className="p-4 flex flex-col justify-between min-h-[180px]">
                  <div className="space-y-1">
                    <div className="flex items-center justify-between text-[9px] text-neutral-500 font-bold uppercase tracking-wider select-none mb-1">
                      <span>Request Payload Header</span>
                      {activeTab.method === "POST" && (
                        <button
                          onClick={() => handleCopy(activeTab.requestBody, "req")}
                          className="text-neutral-600 hover:text-neutral-400 flex items-center space-x-1 outline-none transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-indigo-500"
                        >
                          {copiedIndex === "req" ? (
                            <>
                              <Check className="h-3 w-3 text-emerald-400" />
                              <span className="text-emerald-400">Copied</span>
                            </>
                          ) : (
                            <>
                              <Copy className="h-3 w-3" />
                              <span>[ Copy ]</span>
                            </>
                          )}
                        </button>
                      )}
                    </div>

                    <div className="select-text">
                      <CodeBlock
                        code={activeTab.requestBody}
                        language="json"
                        copyable={false}
                        expandable={false}
                      />
                    </div>
                  </div>
                </div>

                {/* 2. Response Column */}
                <div className="p-4 flex flex-col justify-between min-h-[220px] bg-neutral-950/25">
                  <div className="space-y-1">
                    <div className="flex items-center justify-between text-[9px] text-neutral-500 font-bold uppercase tracking-wider select-none mb-1">
                      <span>Response {activeTab.responseStatus}</span>
                      <button
                        onClick={() => handleCopy(activeTab.responseBody, "res")}
                        className="text-neutral-600 hover:text-neutral-400 flex items-center space-x-1 outline-none transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-indigo-500"
                      >
                        {copiedIndex === "res" ? (
                          <>
                            <Check className="h-3 w-3 text-emerald-400" />
                            <span className="text-emerald-400">Copied</span>
                          </>
                        ) : (
                          <>
                            <Copy className="h-3 w-3" />
                            <span>[ Copy ]</span>
                          </>
                        )}
                      </button>
                    </div>

                    <div className="select-text">
                      <CodeBlock
                        code={activeTab.responseBody}
                        language="json"
                        copyable={false}
                        expandable={false}
                      />
                    </div>
                  </div>
                </div>

              </div>

              {/* Code Panel Footer */}
              <div className="h-8 border-t border-neutral-900 bg-neutral-950 px-4 flex items-center justify-between select-none">
                <span className="text-[9px] text-neutral-600 font-bold uppercase tracking-wider font-mono">
                  Bearer Token active: fb_test_xxxx
                </span>
                <span className="text-[9px] text-neutral-600 font-bold uppercase tracking-wider font-mono">
                  Schema version: v1
                </span>
              </div>

            </div>

          </div>

        </div>

        {/* Section 5: Developer Quickstart CTA conversion card */}
        <div className="rounded-lg border border-neutral-900 bg-neutral-950/40 p-6 sm:p-8 flex flex-col md:flex-row md:items-center justify-between gap-6 relative overflow-hidden text-left hover:-translate-y-0.5 hover:border-neutral-850 hover:shadow-xl hover:shadow-indigo-500/[0.01] transition-all duration-300">
          <div className="absolute top-0 left-0 w-[2px] h-full bg-indigo-500/20" />
          
          <div className="space-y-2 max-w-xl">
            <span className="text-[9px] font-black uppercase tracking-widest text-indigo-400 font-mono">
              Ready to Build?
            </span>
            <h3 className="text-base sm:text-lg font-extrabold text-white tracking-tight uppercase font-mono">
              Create a project. Get your API key. Make your first API request.
            </h3>
            <p className="text-[10px] text-neutral-500 font-medium leading-relaxed">
              Zero physical contract friction. Provision sandboxed ledger environments in seconds.
            </p>
          </div>

          <div className="shrink-0 select-none">
            <Link
              to={token ? "/projects" : "/signup"}
              className="w-full sm:w-auto inline-flex items-center justify-center space-x-2 rounded bg-white hover:bg-neutral-200 px-5 py-3 text-xs font-bold text-black active:scale-[0.98] transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2 focus-visible:ring-offset-[#030303] cursor-pointer"
            >
              <span>Create your first project</span>
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </div>

      </div>
    </section>
  );
};

export default ApiFirstExperience;
