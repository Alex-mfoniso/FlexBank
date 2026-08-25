import React, { useState } from "react";
import { Link } from "react-router-dom";
import { CodeBlock } from "./CodeBlock";
import { FileCode, ArrowRight, Terminal } from "lucide-react";

interface TabCode {
  label: string;
  lang: string;
  code: string;
}

export const CodeExample: React.FC = () => {
  const [activeTab, setActiveTab] = useState(0);

  const tabs: TabCode[] = [
    {
      label: "cURL",
      lang: "bash",
      code: `curl -X POST "https://api.flexbank.dev/v1/transfers" \\
  -H "Authorization: Bearer fb_test_7f92ac81bc0" \\
  -H "Content-Type: application/json" \\
  -d '{
    "type": "internal",
    "sourceAccountId": "acc_881cf712",
    "destinationAccountId": "acc_102fba99",
    "amount": 25000,
    "currency": "NGN",
    "reference": "LEDG_002a99bf3"
  }'`,
    },
    {
      label: "JavaScript",
      lang: "javascript",
      code: `// Initiate double-entry ledger settlement in the client
const response = await fetch("https://api.flexbank.dev/v1/transfers", {
  method: "POST",
  headers: {
    "Authorization": "Bearer fb_test_7f92ac81bc0",
    "Content-Type": "application/json"
  },
  body: JSON.stringify({
    type: "internal",
    sourceAccountId: "acc_881cf712",
    destinationAccountId: "acc_102fba99",
    amount: 25000,
    currency: "NGN",
    reference: "LEDG_002a99bf3"
  })
});

const data = await response.json();
console.log("Settle success ID:", data.id);`,
    },
    {
      label: "Node.js (Axios)",
      lang: "node",
      code: `// Settle a transfer via server-side Axios integration
const axios = require('axios');

async function executeTransfer() {
  try {
    const response = await axios.post(
      'https://api.flexbank.dev/v1/transfers',
      {
        type: 'internal',
        sourceAccountId: 'acc_881cf712',
        destinationAccountId: 'acc_102fba99',
        amount: 25000,
        currency: 'NGN',
        reference: 'LEDG_002a99bf3'
      },
      {
        headers: {
          'Authorization': 'Bearer fb_test_7f92ac81bc0',
          'Content-Type': 'application/json'
        }
      }
    );
    console.log('Status: COMPLETED', response.data.id);
  } catch (err) {
    console.error('Settle failed:', err.response?.data || err.message);
  }
}

executeTransfer();`,
    },
  ];

  return (
    <section className="py-24 bg-[#030303] border-b border-neutral-900 px-6 lg:px-12 select-none">
      <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-16 items-center">
        
        {/* Left Column Copy (col-span-5) */}
        <div className="lg:col-span-5 space-y-6 text-left">
          <div className="inline-flex items-center space-x-1.5 rounded-full border border-indigo-500/10 bg-indigo-500/5 px-3 py-1 text-[10px] font-bold text-indigo-400 uppercase tracking-wider font-mono">
            <Terminal className="h-3 w-3" />
            <span>Developer Reference Reference</span>
          </div>

          <h2 className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight leading-tight">
            Simple APIs. <br />
            Powerful products.
          </h2>

          <p className="text-xs sm:text-sm text-neutral-400 leading-relaxed max-w-xl">
            Integrate FlexBank's REST gateway using standard HTTP headers and JSON bodies. 
            All responses return transparent standard HTTP status codes, explicit error messages, and auditable parameter trace IDs.
          </p>

          <div className="space-y-3.5 text-xs text-neutral-400">
            <div className="flex items-center space-x-2.5">
              <span className="h-1.5 w-1.5 rounded-full bg-indigo-500" />
              <span>Standard Bearer token authorization structures</span>
            </div>
            <div className="flex items-center space-x-2.5">
              <span className="h-1.5 w-1.5 rounded-full bg-indigo-500" />
              <span>Transparent error message parameter contexts</span>
            </div>
            <div className="flex items-center space-x-2.5">
              <span className="h-1.5 w-1.5 rounded-full bg-indigo-500" />
              <span>Symmetrical REST responses and schemas</span>
            </div>
          </div>

          <div className="pt-4">
            <Link
              to="/docs"
              className="inline-flex items-center space-x-2 text-xs font-bold text-indigo-400 hover:text-indigo-300 transition-colors"
            >
              <FileCode className="h-4 w-4" />
              <span>View full API documentation</span>
              <ArrowRight className="h-3 w-3" />
            </Link>
          </div>
        </div>

        {/* Right Column Code Viewer (col-span-7) */}
        <div className="lg:col-span-7 space-y-4">
          
          {/* Tab Button Toggles */}
          <div className="flex space-x-1 bg-neutral-950 border border-neutral-900 p-1 rounded max-w-xs select-none">
            {tabs.map((tab, idx) => {
              const isActive = idx === activeTab;
              return (
                <button
                  key={tab.label}
                  onClick={() => setActiveTab(idx)}
                  className={`flex-1 text-center py-1.5 rounded text-[10px] font-bold uppercase tracking-wider font-mono transition-colors outline-none cursor-pointer ${
                    isActive ? "bg-neutral-900 text-white" : "text-neutral-500 hover:text-neutral-300"
                  }`}
                >
                  {tab.label}
                </button>
              );
            })}
          </div>

          {/* Render target active tab code block */}
          <div className="rounded-lg shadow-2xl overflow-hidden text-left bg-neutral-950/40 relative">
            <CodeBlock
              code={tabs[activeTab].code}
              language={tabs[activeTab].lang}
              copyable={true}
              expandable={false}
            />
          </div>
        </div>

      </div>
    </section>
  );
};

export default CodeExample;
