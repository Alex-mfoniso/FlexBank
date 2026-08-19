import React, { useEffect, useState } from "react";
import { api, playgroundApi } from "../lib/api";
import { useApp } from "../context/AppContext";
import { CodeBlock } from "../components/CodeBlock";
import {
  FileCode,
  Terminal,
  Activity,
  Coins,
  Users,
  Search,
  BookOpen,
  ArrowRight,
  ShieldAlert,
  Play,
  CheckCircle,
  Clock,
  Sparkles,
  HelpCircle,
  Copy,
  Check,
  ChevronRight,
  AlertCircle
} from "lucide-react";

// Types
interface DocItem {
  id: string;
  category: "GETTING STARTED" | "CORE RESOURCES" | "DEVELOPER TOOLS";
  title: string;
  endpoint?: string;
  method?: "GET" | "POST" | "PATCH" | "DELETE";
  description: string;
  details: string;
  defaultPayload?: string;
  playPath?: string;
  curlSnippet?: string;
}

export const Docs: React.FC = () => {
  const { selectedProjectId, environment } = useApp();
  const [searchQuery, setSearchQuery] = useState("");
  const [activeDocId, setActiveDocId] = useState("overview");
  const [apiKeyToken, setApiKeyToken] = useState("fb_test_xxxxxxxxxxxxxxxxxxxxxxxx");
  const [copiedKey, setCopiedKey] = useState(false);

  // Playground states
  const [customPayload, setCustomPayload] = useState("");
  const [playgroundLoading, setPlaygroundLoading] = useState(false);
  const [playgroundResponse, setPlaygroundResponse] = useState<any>(null);
  const [playgroundLatency, setPlaygroundLatency] = useState<number | null>(null);
  const [playgroundStatus, setPlaygroundStatus] = useState<number | null>(null);
  const [playgroundRequestId, setPlaygroundRequestId] = useState<string | null>(null);

  // Load active API Key from the backend
  useEffect(() => {
    const loadWorkspaceKeys = async () => {
      try {
        const response = await api.get(`/api/v1/projects/${selectedProjectId}/api-keys`);
        const keys = response.data.apiKeys || [];
        const activeKey = keys.find((k: any) => !k.revokedAt);
        if (activeKey) {
          setApiKeyToken(`${activeKey.keyPrefix}.yourPlaintextSecretSavedDuringKeyGeneration`);
        }
      } catch {
        setApiKeyToken("fb_test_d3c126d4be06.602c3ef3088b9be20d8291f09c6dfb4c");
      }
    };

    if (selectedProjectId) {
      loadWorkspaceKeys();
    }
  }, [selectedProjectId]);

  // Document Library Index
  const DOCS_LIBRARY: DocItem[] = [
    {
      id: "overview",
      category: "GETTING STARTED",
      title: "1. Overview Platform",
      description: "Welcome to FlexBank, the financial infrastructure API platform designed for developers and startups.",
      details: "FlexBank is a double-entry ledger database, digital banking wallet processor, and transaction simulator packaged under a clean REST JSON specification. Developers use FlexBank to build fintech products, digital wallets, double-entry systems, and platform payout engines without stitching multiple commercial providers together manually. This sandbox platform is fully operational and processes money, ledgers, transfers, and webhooks in minor currency units."
    },
    {
      id: "quickstart",
      category: "GETTING STARTED",
      title: "2. 7-Step Quickstart",
      description: "Understand the end-to-end integration lifecycle from project initialization to sandbox transfer settlements.",
      details: "To achieve active integration, complete the following 7 steps:\n\n1. **Sign Up**: Register your developer profile.\n2. **Create Project Workspace**: Initialize an isolated platform ledger.\n3. **Retrieve Credentials**: Generate an API Key under Developer Tools.\n4. **Verify Connectivity**: Fetch your project workspace metadata via `GET /api/v1/projects/:id`.\n5. **Register Customer**: Spawn individual or corporate ledgers via `POST /api/v1/customers`.\n6. **Issue Account**: Provision virtual currency accounts via `POST /api/v1/accounts`.\n7. **Simulate Funding**: Use sandbox controls to fund test wallets, then dispatch double-entry settlements using `POST /api/v1/transfers`."
    },
    {
      id: "authentication",
      category: "GETTING STARTED",
      title: "3. Authentication",
      description: "Secure REST channels using standard Bearer token authorization schemes.",
      details: "FlexBank authenticates REST requests using workspace API Keys. Pass your secret key inside the Authorization header. Private keys are environment-scoped: keys starting with `fb_test_` operate strictly in the Test Environment, and keys starting with `fb_live_` run live processes.\n\nExample Header:\n`Authorization: Bearer fb_test_7f92ac81bc0...`"
    },
    {
      id: "webhook-verification",
      category: "GETTING STARTED",
      title: "4. Webhook Signatures",
      description: "Validate digital event deliveries using cryptographic HMAC SHA256 signatures.",
      details: "To prevent spoofing or replay attacks, verify webhook bodies using the `x-flexbank-signature` header. FlexBank computes an HMAC hex signature of the raw JSON body using your webhook subscription's signing secret.\n\nPython Signature Validation Sample:\n```python\nimport hmac\nimport hashlib\n\ndef verify_signature(payload_body, header_sig, secret):\n    expected = hmac.new(\n        secret.encode(),\n        payload_body.encode(),\n        hashlib.sha256\n    ).hexdigest()\n    return hmac.compare_digest(expected, header_sig)\n```"
    },
    {
      id: "errors",
      category: "GETTING STARTED",
      title: "5. Error Handling",
      description: "Review HTTP error response schemas, parameter codes, and diagnostic formats.",
      details: "FlexBank returns standard HTTP status codes. Failures include a detailed diagnostic JSON envelope detailing parameter faults and validation violations:\n\n* **`400 Bad Request`**: Malformed payload, invalid types, or failed validations.\n* **`401 Unauthorized`**: Token missing, revoked, or invalid.\n* **`403 Forbidden`**: Access restricted to resources outside organization boundaries.\n* **`404 Not Found`**: Entity does not exist.\n* **`409 Conflict`**: Idempotency key collision or double-entry imbalance.\n* **`422 Unprocessable`**: Business logic constraints violated (e.g. frozen account, insufficient funds)."
    },
    {
      id: "create-customer",
      category: "CORE RESOURCES",
      title: "POST /customers",
      endpoint: "/api/v1/customers",
      method: "POST",
      description: "Provision a legal individual or business profile within your workspace ledger.",
      details: "Registers customers to track balances, audit ledgers, and associate accounts. Provide real email addresses to trigger transactional notifications.",
      defaultPayload: JSON.stringify({
        firstName: "Sarah",
        lastName: "Connor",
        email: "sarah.connor@cyberdyne.com",
        phone: "+2348123456789"
      }, null, 2),
      playPath: "/api/v1/customers",
      curlSnippet: `curl -X POST "http://localhost:4000/api/v1/customers" \\
  -H "Authorization: Bearer fb_test_xxxxxxxxxxxxxxxx" \\
  -H "Content-Type: application/json" \\
  -d '{
    "firstName": "Sarah",
    "lastName": "Connor",
    "email": "sarah.connor@cyberdyne.com",
    "phone": "+2348123456789"
  }'`
    },
    {
      id: "list-customers",
      category: "CORE RESOURCES",
      title: "GET /customers",
      endpoint: "/api/v1/customers",
      method: "GET",
      description: "Retrieve a paginated index of customer profiles registered in your active workspace.",
      details: "Fetches up to 50 customer profiles per page, ordered chronologically by creation timestamp.",
      playPath: "/api/v1/customers",
      curlSnippet: `curl -X GET "http://localhost:4000/api/v1/customers" \\
  -H "Authorization: Bearer fb_test_xxxxxxxxxxxxxxxx"`
    },
    {
      id: "create-account",
      category: "CORE RESOURCES",
      title: "POST /accounts",
      endpoint: "/api/v1/accounts",
      method: "POST",
      description: "Provision a multi-currency book account representing virtual or digital deposit ledgers.",
      details: "Establishes a double-entry accounting node. Denominate the ledger in NGN, USD, or EUR. Balance defaults to 0 and must be adjusted through transfers.",
      defaultPayload: JSON.stringify({
        customerId: "INSERT_CUSTOMER_ID_HERE",
        currency: "USD",
        name: "Acme Operating Wallet"
      }, null, 2),
      playPath: "/api/v1/accounts",
      curlSnippet: `curl -X POST "http://localhost:4000/api/v1/accounts" \\
  -H "Authorization: Bearer fb_test_xxxxxxxxxxxxxxxx" \\
  -H "Content-Type: application/json" \\
  -d '{
    "customerId": "cust_xxxxxxxx",
    "currency": "USD",
    "name": "Acme Operating Wallet"
  }'`
    },
    {
      id: "list-accounts",
      category: "CORE RESOURCES",
      title: "GET /accounts",
      endpoint: "/api/v1/accounts",
      method: "GET",
      description: "Query and view the complete ledger account registry inside your project context.",
      details: "Lists all digital accounts, displaying active balances, minor currencies, and current compliance freeze states.",
      playPath: "/api/v1/accounts",
      curlSnippet: `curl -X GET "http://localhost:4000/api/v1/accounts" \\
  -H "Authorization: Bearer fb_test_xxxxxxxxxxxxxxxx"`
    },
    {
      id: "execute-transfer",
      category: "CORE RESOURCES",
      title: "POST /transfers",
      endpoint: "/api/v1/transfers",
      method: "POST",
      description: "Settle and record financial double-entry ledger settlements.",
      details: "Transfers require minor units money specifications (e.g. 500000 equals ₦5,000.00). Settle money instantly across workspace accounts with complete audit trails.",
      defaultPayload: JSON.stringify({
        sourceAccountId: "INSERT_SOURCE_ACCOUNT_ID",
        destinationAccountId: "INSERT_DEST_ACCOUNT_ID",
        amount: 25000,
        description: "Integration sandbox test payment"
      }, null, 2),
      playPath: "/api/v1/transfers",
      curlSnippet: `curl -X POST "http://localhost:4000/api/v1/transfers" \\
  -H "Authorization: Bearer fb_test_xxxxxxxxxxxxxxxx" \\
  -H "Content-Type: application/json" \\
  -d '{
    "sourceAccountId": "acc_xxxxxxxx",
    "destinationAccountId": "acc_yyyyyyyy",
    "amount": 25000,
    "description": "Integration sandbox test payment"
  }'`
    },
    {
      id: "simulate-funding",
      category: "DEVELOPER TOOLS",
      title: "POST /sandbox/fund",
      endpoint: "/api/v1/sandbox/fund",
      method: "POST",
      description: "Deposit mock assets directly into a target sandbox wallet account.",
      details: "Credits a specified test account by routing a ledger credit directly from the platform's sandbox clearing house node. (Restricted to test mode).",
      defaultPayload: JSON.stringify({
        accountId: "INSERT_ACCOUNT_ID_HERE",
        amount: 1000000
      }, null, 2),
      playPath: "/api/v1/sandbox/fund",
      curlSnippet: `curl -X POST "http://localhost:4000/api/v1/sandbox/fund" \\
  -H "Authorization: Bearer fb_test_xxxxxxxxxxxxxxxx" \\
  -H "Content-Type: application/json" \\
  -d '{
    "accountId": "acc_xxxxxxxx",
    "amount": 1000000
  }'`
    }
  ];

  // Filter sections by search text
  const filteredDocs = DOCS_LIBRARY.filter(
    (item) =>
      item.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.category.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.description.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const activeDoc = DOCS_LIBRARY.find((d) => d.id === activeDocId) || DOCS_LIBRARY[0];

  // Initialize custom playground payload on section toggle
  useEffect(() => {
    if (activeDoc && activeDoc.defaultPayload) {
      setCustomPayload(activeDoc.defaultPayload);
    } else {
      setCustomPayload("");
    }
    // Reset responses on doc switch
    setPlaygroundResponse(null);
    setPlaygroundStatus(null);
    setPlaygroundLatency(null);
    setPlaygroundRequestId(null);
  }, [activeDocId]);

  // Execute actual endpoint request in Try It Playground
  const handleExecutePlayground = async () => {
    if (!activeDoc.playPath || !activeDoc.method) return;

    setPlaygroundLoading(true);
    setPlaygroundResponse(null);
    setPlaygroundStatus(null);
    setPlaygroundLatency(null);
    setPlaygroundRequestId(null);

    const startTime = performance.now();
    try {
      let response;
      if (activeDoc.method === "POST") {
        let parsedBody = {};
        if (customPayload) {
          try {
            parsedBody = JSON.parse(customPayload);
          } catch (e: any) {
            alert("Invalid JSON format in Request Body payload.");
            setPlaygroundLoading(false);
            return;
          }
        }
        response = await playgroundApi.post(activeDoc.playPath, parsedBody);
      } else if (activeDoc.method === "GET") {
        response = await playgroundApi.get(activeDoc.playPath);
      } else if (activeDoc.method === "PATCH") {
        response = await playgroundApi.patch(activeDoc.playPath, {});
      } else {
        response = await playgroundApi.delete(activeDoc.playPath);
      }

      const endTime = performance.now();
      setPlaygroundLatency(Math.round(endTime - startTime));
      setPlaygroundStatus(response.status);
      setPlaygroundResponse(response.data);
      setPlaygroundRequestId(response.headers["x-request-id"] || "req_tx_" + Math.random().toString(36).substr(2, 9));
    } catch (err: any) {
      const endTime = performance.now();
      setPlaygroundLatency(Math.round(endTime - startTime));
      setPlaygroundStatus(err.response?.status || 500);
      setPlaygroundResponse(err.response?.data || { message: err.message });
      setPlaygroundRequestId(err.response?.headers?.["x-request-id"] || "req_err_" + Math.random().toString(36).substr(2, 9));
    } finally {
      setPlaygroundLoading(false);
    }
  };

  const handleCopyKey = () => {
    navigator.clipboard.writeText(apiKeyToken);
    setCopiedKey(true);
    setTimeout(() => setCopiedKey(false), 2000);
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      
      {/* Page Header toolbar */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center pb-5 border-b border-slate-200 gap-4">
        <div>
          <h1 className="text-2xl font-black tracking-tight text-slate-900 flex items-center space-x-2">
            <BookOpen className="h-6 w-6 text-indigo-600 shrink-0" />
            <span>Developer Reference Platform</span>
          </h1>
          <p className="text-xs text-slate-500 font-semibold mt-1 leading-relaxed">
            Query sandbox nodes, inspect REST request/response schemas, and settle operations directly inside the interactive console.
          </p>
        </div>

        {/* Dynamic active key preview card */}
        <div className="flex items-center space-x-2 bg-slate-900 text-slate-300 rounded-lg border border-slate-800 p-2 text-xs font-mono w-full md:w-auto max-w-md shrink-0">
          <Terminal className="h-4 w-4 text-slate-500 shrink-0" />
          <span className="truncate flex-1 select-all" title="Click to copy active project API Key">
            {apiKeyToken.substring(0, 15)}...{apiKeyToken.slice(-6)}
          </span>
          <button
            onClick={handleCopyKey}
            className="text-slate-400 hover:text-white p-1 rounded hover:bg-slate-800 focus:outline-none transition-all"
            title="Copy API Key prefix"
          >
            {copiedKey ? (
              <Check className="h-3.5 w-3.5 text-emerald-400" />
            ) : (
              <Copy className="h-3.5 w-3.5" />
            )}
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        
        {/* Left Column: Nav Sidebar (col-span-3) */}
        <div className="lg:col-span-3 space-y-4">
          
          {/* Real-time search filter */}
          <div className="relative">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
            <input
              type="text"
              placeholder="Filter endpoints, enums..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full rounded-lg border border-slate-200 bg-white pl-9 pr-4 py-2 text-xs font-semibold text-slate-700 placeholder-slate-400 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none transition-all shadow-xs"
            />
          </div>

          {/* Navigation Items Categories */}
          <div className="space-y-6">
            {(["GETTING STARTED", "CORE RESOURCES", "DEVELOPER TOOLS"] as const).map((cat) => {
              const catDocs = filteredDocs.filter((d) => d.category === cat);
              if (catDocs.length === 0) return null;

              return (
                <div key={cat} className="space-y-1.5">
                  <h4 className="text-[10px] font-black uppercase tracking-wider text-slate-400 font-mono px-3">
                    {cat}
                  </h4>
                  <nav className="flex flex-col space-y-0.5">
                    {catDocs.map((doc) => {
                      const isActive = doc.id === activeDocId;
                      return (
                        <button
                          key={doc.id}
                          onClick={() => setActiveDocId(doc.id)}
                          className={`flex items-center justify-between rounded-lg px-3 py-2 text-xs font-semibold tracking-tight text-left transition-all ${
                            isActive
                              ? "bg-indigo-50 text-indigo-700 border border-indigo-100"
                              : "text-slate-600 hover:bg-slate-100/60"
                          }`}
                        >
                          <span className="truncate pr-2">{doc.title}</span>
                          {doc.method && (
                            <span className={`text-[8px] px-1 py-0.5 rounded font-black font-mono shrink-0 ${
                              doc.method === "POST" 
                                ? "bg-emerald-50 text-emerald-700 border border-emerald-100" 
                                : "bg-sky-50 text-sky-700 border border-sky-100"
                            }`}>
                              {doc.method}
                            </span>
                          )}
                        </button>
                      );
                    })}
                  </nav>
                </div>
              );
            })}
          </div>
        </div>

        {/* Middle and Right Column Content (col-span-9) */}
        <div className="lg:col-span-9 grid grid-cols-1 xl:grid-cols-12 gap-8 items-start">
          
          {/* Middle: Content documentation card (xl:col-span-7) */}
          <div className="xl:col-span-7 space-y-6 text-left">
            <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-xs space-y-4">
              <div className="flex flex-wrap items-start justify-between gap-4 border-b border-slate-100 pb-4">
                <div>
                  <h2 className="text-lg font-black text-slate-900 tracking-tight">{activeDoc.title}</h2>
                  {activeDoc.endpoint && (
                    <div className="flex items-center space-x-2 mt-2">
                      <span className={`text-[9px] font-black font-mono px-2 py-0.5 rounded tracking-wide uppercase border ${
                        activeDoc.method === "POST" 
                          ? "bg-emerald-500/10 text-emerald-700 border-emerald-500/20" 
                          : "bg-sky-500/10 text-sky-700 border-sky-500/20"
                      }`}>
                        {activeDoc.method}
                      </span>
                      <code className="font-mono text-[10px] font-bold text-slate-500 bg-slate-50 px-2 py-0.5 rounded border border-slate-200 break-all select-all">
                        {activeDoc.endpoint}
                      </code>
                    </div>
                  )}
                </div>
              </div>

              <div className="text-xs text-slate-600 leading-relaxed font-medium whitespace-pre-line space-y-3">
                {activeDoc.details}
              </div>
            </div>

            {/* Static cURL reference code snippet */}
            {activeDoc.curlSnippet && (
              <div className="space-y-2">
                <h4 className="text-[10px] font-black uppercase tracking-wider text-slate-400 font-mono flex items-center space-x-1">
                  <Terminal className="h-3.5 w-3.5 text-slate-500" />
                  <span>cURL Integration Sample</span>
                </h4>
                <CodeBlock 
                  code={activeDoc.curlSnippet.replace(/fb_test_[a-zA-Z0-9_]+/g, apiKeyToken)} 
                  language="bash" 
                  copyable={true} 
                />
              </div>
            )}
          </div>

          {/* Right: API Reference Try It playground panel (xl:col-span-5) */}
          <div className="xl:col-span-5 space-y-4 text-left">
            {activeDoc.playPath ? (
              <div className="rounded-xl border border-slate-200 bg-slate-50 p-5 shadow-xs flex flex-col space-y-4 relative">
                
                {/* Header title */}
                <div className="flex items-center justify-between border-b border-slate-200 pb-3">
                  <div className="flex items-center space-x-1.5 text-xs font-black text-slate-800 uppercase tracking-tight">
                    <Sparkles className="h-4 w-4 text-indigo-600 shrink-0" />
                    <span>Interactive Playground</span>
                  </div>
                  <span className="text-[9px] bg-amber-500/10 text-amber-700 border border-amber-500/20 px-1.5 py-0.5 rounded font-black uppercase tracking-wide">
                    {environment} mode
                  </span>
                </div>

                {/* Path query parameters explanation */}
                <p className="text-[10px] text-slate-500 leading-normal font-semibold">
                  Modify the JSON request payload directly below and run operations against your operational database.
                </p>

                {/* Payload JSON TextArea or ReadOnly message */}
                {activeDoc.method === "GET" ? (
                  <div className="rounded-lg border border-slate-200 bg-white p-4 text-center text-xs font-semibold text-slate-500">
                    GET requests require no request body payload parameters. Click "Execute Request" below to pull records.
                  </div>
                ) : (
                  <div className="space-y-1.5">
                    <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider font-mono">
                      Request Body JSON
                    </span>
                    <textarea
                      value={customPayload}
                      onChange={(e) => setCustomPayload(e.target.value)}
                      rows={6}
                      className="w-full rounded-lg border border-slate-200 bg-white p-3 font-mono text-xs text-slate-700 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none transition-all shadow-xs"
                      placeholder="{}"
                    />
                  </div>
                )}

                {/* Run Execute button */}
                <button
                  onClick={handleExecutePlayground}
                  disabled={playgroundLoading}
                  className="w-full flex items-center justify-center space-x-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 px-4 py-2.5 text-xs font-bold text-white shadow-md shadow-indigo-600/10 transition-all disabled:opacity-50 disabled:cursor-not-allowed focus:outline-none"
                >
                  {playgroundLoading ? (
                    <>
                      <div className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-white/20 border-t-white" />
                      <span>Executing Sandbox Request...</span>
                    </>
                  ) : (
                    <>
                      <Play className="h-3.5 w-3.5 fill-current" />
                      <span>Execute REST Request</span>
                    </>
                  )}
                </button>

                {/* Response outputs card */}
                {playgroundStatus !== null && (
                  <div className="border-t border-slate-200 pt-4 space-y-3">
                    
                    {/* Status metrics bar */}
                    <div className="flex items-center justify-between text-[10px] font-mono font-bold text-slate-500 bg-white border border-slate-200 rounded-lg px-3 py-1.5">
                      <div className="flex items-center space-x-1.5">
                        <Clock className="h-3.5 w-3.5 text-slate-400" />
                        <span>{playgroundLatency}ms</span>
                      </div>
                      <div className="flex items-center space-x-1.5">
                        <span className={`h-1.5 w-1.5 rounded-full ${playgroundStatus >= 200 && playgroundStatus < 300 ? "bg-emerald-500" : "bg-rose-500"}`} />
                        <span className={playgroundStatus >= 200 && playgroundStatus < 300 ? "text-emerald-600" : "text-rose-600"}>
                          STATUS: {playgroundStatus}
                        </span>
                      </div>
                    </div>

                    {/* Tracing request id details */}
                    <div className="text-[9px] text-slate-400 font-mono truncate select-all flex items-center space-x-1 leading-none">
                      <span className="text-slate-300 font-bold uppercase shrink-0">x-request-id:</span>
                      <span className="truncate">{playgroundRequestId}</span>
                    </div>

                    {/* Actual response JSON body */}
                    <div className="space-y-1.5">
                      <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider font-mono block">
                        Response Payload
                      </span>
                      <CodeBlock 
                        code={JSON.stringify(playgroundResponse, null, 2)} 
                        language="json" 
                        copyable={true} 
                        expandable={true}
                        maxLines={10}
                      />
                    </div>
                  </div>
                )}

              </div>
            ) : (
              <div className="rounded-xl border border-dashed border-slate-200 p-6 text-center text-xs font-semibold text-slate-500 leading-normal flex flex-col items-center space-y-2 bg-slate-50/50">
                <HelpCircle className="h-8 w-8 text-slate-300" />
                <p>Select an API Resource endpoint from the Core Resources sidebar index to launch the interactive sandbox playground console.</p>
              </div>
            )}
          </div>

        </div>
      </div>

    </div>
  );
};
export default Docs;
