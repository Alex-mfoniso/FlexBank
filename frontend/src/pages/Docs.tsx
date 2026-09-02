import React, { useEffect, useState } from "react";
import { Link, useParams, useNavigate } from "react-router-dom";
import { api, playgroundApi, FLEXBANK_API_URL } from "../lib/api";
import { useApp } from "../context/AppContext";
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
  CheckCircle2,
  Clock,
  Sparkles,
  HelpCircle,
  Copy,
  Check,
  ChevronRight,
  AlertCircle,
  Menu,
  X,
  Database,
  RefreshCw,
  Key,
  Landmark,
  ShieldCheck,
  Code2
} from "lucide-react";

// Types
interface ParameterItem {
  name: string;
  type: string;
  required: boolean;
  description: string;
}

interface EndpointDoc {
  id: string;
  name: string;
  method: "GET" | "POST" | "PATCH" | "DELETE";
  path: string;
  description: string;
  parameters?: ParameterItem[];
  defaultPayload?: string;
  playPath: string;
  responseSample: string;
}

interface DocItem {
  id: string;
  category: "GETTING STARTED" | "CORE RESOURCES" | "DEVELOPER TOOLS";
  title: string;
  description: string;
  details: string;
  endpoints?: EndpointDoc[];
}

export const Docs: React.FC = () => {
  const { selectedProjectId, token, environment } = useApp();
  const { docId: routeDocId, projectId: routeProjectId } = useParams<{ docId?: string; projectId?: string }>();
  const navigate = useNavigate();

  const isPublicView = !token;
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [activeDocId, setActiveDocId] = useState("overview");
  const [apiKeyToken, setApiKeyToken] = useState("fb_test_xxxxxxxxxxxxxxxxxxxxxxxx");
  const [copiedKey, setCopiedKey] = useState(false);
  const [snippetLang, setSnippetLang] = useState<"curl" | "js" | "node" | "python">("curl");
  const [activeProjectName, setActiveProjectName] = useState<string | null>(null);

  // Playground states
  const [customPayloads, setCustomPayloads] = useState<Record<string, string>>({});
  const [playgroundLoading, setPlaygroundLoading] = useState<Record<string, boolean>>({});
  const [playgroundResponse, setPlaygroundResponse] = useState<Record<string, any>>({});
  const [playgroundLatency, setPlaygroundLatency] = useState<Record<string, number | null>>({});
  const [playgroundStatus, setPlaygroundStatus] = useState<Record<string, number | null>>({});
  const [playgroundRequestId, setPlaygroundRequestId] = useState<Record<string, string | null>>({});

  // Code Block Copy triggers
  const [copiedSnippetId, setCopiedSnippetId] = useState<string | null>(null);

  // Sync route param with active document id
  useEffect(() => {
    if (routeDocId) {
      setActiveDocId(routeDocId);
    } else {
      setActiveDocId("overview");
    }
  }, [routeDocId]);

  // Load active API Key & Project details from the backend
  useEffect(() => {
    const loadWorkspaceMetadata = async () => {
      if (!selectedProjectId) return;
      try {
        const [keysRes, projectRes] = await Promise.all([
          api.get(`/api/v1/projects/${selectedProjectId}/api-keys`),
          api.get(`/api/v1/projects/${selectedProjectId}`)
        ]);

        const keys = keysRes.data.apiKeys || [];
        const activeKey = keys.find((k: any) => !k.revokedAt);
        if (activeKey) {
          setApiKeyToken(`${activeKey.keyPrefix}.yourPlaintextSecretSavedDuringKeyGeneration`);
        }
        
        const proj = projectRes.data.project;
        if (proj) {
          setActiveProjectName(proj.name);
        }
      } catch {
        setApiKeyToken("fb_test_d3c126d4be06.602c3ef3088b9be20d8291f09c6dfb4c");
        setActiveProjectName("My Sandbox Project");
      }
    };

    if (token && selectedProjectId) {
      loadWorkspaceMetadata();
    }
  }, [selectedProjectId, token]);

  // Navigate utility supporting both workspace & public routing paths
  const handleDocClick = (id: string) => {
    setActiveDocId(id);
    setIsMobileMenuOpen(false);
    if (token && selectedProjectId) {
      navigate(`/projects/${selectedProjectId}/docs/${id}`);
    } else {
      navigate(`/docs/${id}`);
    }
  };

  const handleCopyText = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedSnippetId(id);
    setTimeout(() => setCopiedSnippetId(null), 2000);
  };

  // Scroll anchor helper
  const scrollToAnchor = (id: string) => {
    const element = document.getElementById(id);
    if (element) {
      element.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  };

  // Document Library Index (Strictly mapping ACTUAL backend capabilities only)
  const DOCS_LIBRARY: DocItem[] = [
    {
      id: "overview",
      category: "GETTING STARTED",
      title: "Introduction",
      description: "Build financial products with Ricarut",
      details: `Welcome to Ricarut, the financial infrastructure API platform designed for developers and startups.

Ricarut is a double-entry ledger database, digital banking wallet processor, and transfer simulator packaged under a clean REST JSON specification. Developers use Ricarut to build fintech products, digital wallets, double-entry systems, and platform payout engines without stitching multiple commercial providers together manually.

> [!IMPORTANT]
> **SANDBOX MODE BOUNDARY**
> All ledger operations, test wallets, and transfer settlements operated under API keys starting with \`rc_test_\` (or legacy \`fb_test_\`) run in a mock sandbox clearing house. No real money or live financial rails are involved. Live production rails are currently setup-pending/inactive.`,
    },
    {
      id: "quickstart",
      category: "GETTING STARTED",
      title: "7-Step Quickstart",
      description: "Make your first Ricarut API request in minutes",
      details: `Follow this 7-step guide to configure your project, authenticate your API channels, and run ledger transactions.

---

### Step 1: Create a Project Workspace
Initialize an isolated workspace in your [Dashboard](/projects) to manage accounts and customers.

### Step 2: Generate your Sandbox API Key
Navigate to the [API Keys page](/projects/${selectedProjectId || "your-project-id"}/api-keys) and click **Create API Key**. Copy the plaintext secret key returned.

### Step 3: Establish environment variables
Declare the gateway host and credentials inside your server-side environments:
\`\`\`bash
RICARUT_API_URL="${FLEXBANK_API_URL}"
RICARUT_API_KEY="your_copied_secret_api_key"
\`\`\`

### Step 4: Make your first API request
Validate credentials and fetch connection context by making a call to the \`GET /api/v1/auth/test-key\` endpoint:
\`\`\`bash
curl -X GET "${FLEXBANK_API_URL}/api/v1/auth/test-key" \\
  -H "Authorization: Bearer rc_test_xxxxxxxx"
\`\`\`

### Step 5: Provision a Customer
Create a ledger holder representing a legal business or individual using \`POST /api/v1/customers\`:
\`\`\`bash
curl -X POST "${FLEXBANK_API_URL}/api/v1/customers" \\
  -H "Authorization: Bearer rc_test_xxxxxxxx" \\
  -H "Content-Type: application/json" \\
  -d '{
    "externalId": "ext_cust_001",
    "firstName": "Sarah",
    "lastName": "Connor",
    "email": "sarah.connor@cyberdyne.com"
  }'
\`\`\`

### Step 6: Create an Account
Issue a virtual multi-currency ledger wallet associated with the customer using \`POST /api/v1/accounts\`:
\`\`\`bash
curl -X POST "${FLEXBANK_API_URL}/api/v1/accounts" \\
  -H "Authorization: Bearer rc_test_xxxxxxxx" \\
  -H "Content-Type: application/json" \\
  -d '{
    "customerId": "cust_xxxxxx",
    "currency": "USD",
    "name": "Acme Operating Wallet"
  }'
\`\`\`

### Step 7: Simulate funding & Settle Transfers
Fund the sandbox wallet using \`POST /api/v1/test/accounts/:accountId/fund\`, then initiate double-entry settlements using \`POST /api/v1/transfers\`. You can trace request headers, payloads, and response status in real-time under [API Logs](/projects/${selectedProjectId || "your-project-id"}/logs).`
    },
    {
      id: "authentication",
      category: "GETTING STARTED",
      title: "Authentication",
      description: "Secure REST channels using standard Bearer tokens",
      details: `Ricarut authenticates REST requests using workspace API Keys. Pass your secret key inside the Authorization header. Private keys are environment-scoped: keys starting with \`rc_test_\` (or legacy \`fb_test_\`) operate strictly in the Test Environment, and keys starting with \`rc_live_\` (or legacy \`fb_live_\`) run live processes (setup pending).

Example Authorization Header:
\`\`\`http
Authorization: Bearer rc_test_7f92ac81bc09e9921c5f8df6a3e1a0b3
\`\`\`

> [!WARNING]
> **SERVER-SIDE IMPLEMENTATION ONLY**
> Secret API keys carry full read/write administrative access. To prevent unauthorized credentials leaks, always store and invoke API keys on secure backend/server-side code. Never place credentials in React/Vite client javascript code, public GitHub repositories, or mobile bundles.`
    },
    {
      id: "webhook-signatures",
      category: "GETTING STARTED",
      title: "Webhook Signatures",
      description: "Validate digital event deliveries cryptographic HMAC",
      details: `To prevent spoofing or replay attacks, verify incoming webhook bodies using the \`x-ricarut-signature\` (or legacy \`x-flexbank-signature\`) header. Ricarut computes an HMAC hex signature of the raw JSON body using your webhook endpoint's secure signing secret (returned once during creation).

### Python Signature Verification Sample:
\`\`\`python
import hmac
import hashlib

def verify_signature(payload_body, header_sig, secret):
    expected = hmac.new(
        secret.encode(),
        payload_body.encode(),
        hashlib.sha256
    ).hexdigest()
    return hmac.compare_digest(expected, header_sig)
\`\`\`

### Node.js Signature Verification Sample:
\`\`\`javascript
const crypto = require("crypto");

function verifySignature(payloadBody, headerSig, secret) {
  const expected = crypto
    .createHmac("sha256", secret)
    .update(payloadBody)
    .digest("hex");
  return crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(headerSig));
}
\`\`\``
    },
    {
      id: "errors",
      category: "GETTING STARTED",
      title: "Error Handling",
      description: "Review HTTP error responses, code structures, and envelopes",
      details: `FlexBank returns standard HTTP status codes. Failures include a detailed diagnostic JSON envelope explaining parameter faults and business validation violations:

\`\`\`json
{
  "error": {
    "code": "INSUFFICIENT_FUNDS",
    "message": "Insufficient available balance to complete this transfer operation.",
    "details": {
      "availableBalance": 500,
      "requestedAmount": 25000
    }
  }
}
\`\`\`

### HTTP Diagnostic Codes:
* **\`400 Bad Request\`**: Malformed payload, invalid JSON format, or type mismatches.
* **\`401 Unauthorized\`**: API token missing, expired, or invalid.
* **\`403 Forbidden\`**: Restricting requests from accessing resources outside your project organization.
* **\`404 Not Found\`**: Entity (customer, account, transfer) does not exist.
* **\`409 Conflict\`**: Idempotency Key collision or duplicate reference.
* **\`422 Unprocessable\`**: Business logical constraints violated (e.g. frozen account, insufficient funds).`
    },
    {
      id: "customers",
      category: "CORE RESOURCES",
      title: "Customers API",
      description: "Provision and query individual or business profile ledgers",
      details: "Customers form the identity layer of your FlexBank project ledger. Associate customer records with multi-currency accounts to trace compliance, track assets, and route transactional notifications.",
      endpoints: [
        {
          id: "post-customers",
          name: "Create Customer",
          method: "POST",
          path: "/api/v1/customers",
          description: "Provision a legal individual or business profile within your workspace ledger.",
          parameters: [
            { name: "externalId", type: "string", required: true, description: "A unique identifier from your own system (e.g., usr_94812)." },
            { name: "firstName", type: "string", required: true, description: "Customer legal first name." },
            { name: "lastName", type: "string", required: true, description: "Customer legal last name." },
            { name: "email", type: "string", required: true, description: "Valid email address to receive transaction notices." },
            { name: "phone", type: "string", required: false, description: "Customer mobile number (with country prefix)." }
          ],
          defaultPayload: JSON.stringify({
            externalId: "ext_cust_101",
            firstName: "Sarah",
            lastName: "Connor",
            email: "sarah.connor@cyberdyne.com",
            phone: "+2348123456789"
          }, null, 2),
          playPath: "/api/v1/customers",
          responseSample: JSON.stringify({
            customer: {
              id: "cust_3af00b8bc1e2",
              projectId: "proj_9f48ac81",
              externalId: "ext_cust_101",
              firstName: "Sarah",
              lastName: "Connor",
              email: "sarah.connor@cyberdyne.com",
              phone: "+2348123456789",
              status: "active",
              createdAt: "2026-08-26T15:20:00.000Z"
            }
          }, null, 2)
        },
        {
          id: "get-customers",
          name: "List Customers",
          method: "GET",
          path: "/api/v1/customers",
          description: "Retrieve a paginated index of customer profiles registered in your active workspace.",
          parameters: [
            { name: "limit", type: "integer", required: false, description: "Number of records to fetch. Max 100, defaults to 50." },
            { name: "cursor", type: "string", required: false, description: "Cursor token for next-page pagination." }
          ],
          playPath: "/api/v1/customers",
          responseSample: JSON.stringify({
            customers: [
              {
                id: "cust_3af00b8bc1e2",
                externalId: "ext_cust_101",
                firstName: "Sarah",
                lastName: "Connor",
                email: "sarah.connor@cyberdyne.com",
                status: "active"
              }
            ]
          }, null, 2)
        },
        {
          id: "get-customer-id",
          name: "Retrieve Customer",
          method: "GET",
          path: "/api/v1/customers/:id",
          description: "Fetch comprehensive profile details for a specific customer ID.",
          playPath: "/api/v1/customers/:id",
          responseSample: JSON.stringify({
            customer: {
              id: "cust_3af00b8bc1e2",
              externalId: "ext_cust_101",
              firstName: "Sarah",
              lastName: "Connor",
              email: "sarah.connor@cyberdyne.com",
              status: "active",
              createdAt: "2026-08-26T15:20:00.000Z"
            }
          }, null, 2)
        },
        {
          id: "patch-customer-id",
          name: "Update Customer",
          method: "PATCH",
          path: "/api/v1/customers/:id",
          description: "Update fields on a customer profile, such as email, phone, or compliance status.",
          parameters: [
            { name: "firstName", type: "string", required: false, description: "Updated legal first name." },
            { name: "lastName", type: "string", required: false, description: "Updated legal last name." },
            { name: "email", type: "string", required: false, description: "Updated email address." },
            { name: "phone", type: "string", required: false, description: "Updated mobile number." },
            { name: "status", type: "string", required: false, description: "Active or suspended status (e.g., active, suspended)." }
          ],
          defaultPayload: JSON.stringify({
            firstName: "Sarah Jane",
            email: "sarah.connor.updated@cyberdyne.com"
          }, null, 2),
          playPath: "/api/v1/customers/:id",
          responseSample: JSON.stringify({
            customer: {
              id: "cust_3af00b8bc1e2",
              firstName: "Sarah Jane",
              lastName: "Connor",
              email: "sarah.connor.updated@cyberdyne.com",
              status: "active"
            }
          }, null, 2)
        }
      ]
    },
    {
      id: "accounts",
      category: "CORE RESOURCES",
      title: "Accounts API",
      description: "Provision multi-currency ledger nodes representing digital deposit assets",
      details: "Accounts operate as nodes in your project's double-entry accounting tree. Accounts support multiple major currencies and preserve distinct available, booked, and pending balance registers.",
      endpoints: [
        {
          id: "post-accounts",
          name: "Create Account",
          method: "POST",
          path: "/api/v1/accounts",
          description: "Provision a multi-currency book account representing virtual or digital deposit ledgers.",
          parameters: [
            { name: "customerId", type: "string", required: true, description: "ID of the customer who owns this virtual wallet (e.g. cust_3af00b8bc1e2)." },
            { name: "currency", type: "string", required: true, description: "ISO 3-letter currency code (e.g. NGN, USD, EUR)." },
            { name: "name", type: "string", required: true, description: "Label for the virtual account (e.g., USD Operating Wallet)." }
          ],
          defaultPayload: JSON.stringify({
            customerId: "cust_xxxxxxxx",
            currency: "USD",
            name: "USD Operating Wallet"
          }, null, 2),
          playPath: "/api/v1/accounts",
          responseSample: JSON.stringify({
            account: {
              id: "acc_4b9101c5f8df",
              projectId: "proj_9f48ac81",
              customerId: "cust_3af00b8bc1e2",
              name: "USD Operating Wallet",
              currency: "USD",
              balance: 0,
              availableBalance: 0,
              status: "active",
              createdAt: "2026-08-26T15:22:00.000Z"
            }
          }, null, 2)
        },
        {
          id: "get-accounts",
          name: "List Accounts",
          method: "GET",
          path: "/api/v1/accounts",
          description: "Query and view the complete ledger account registry inside your project context.",
          parameters: [
            { name: "limit", type: "integer", required: false, description: "Number of records to fetch. Max 100, defaults to 50." },
            { name: "cursor", type: "string", required: false, description: "Cursor token for next-page pagination." }
          ],
          playPath: "/api/v1/accounts",
          responseSample: JSON.stringify({
            accounts: [
              {
                id: "acc_4b9101c5f8df",
                customerId: "cust_3af00b8bc1e2",
                name: "USD Operating Wallet",
                currency: "USD",
                balance: 1000000,
                status: "active"
              }
            ]
          }, null, 2)
        },
        {
          id: "get-account-id",
          name: "Retrieve Account",
          method: "GET",
          path: "/api/v1/accounts/:id",
          description: "Fetch comprehensive balance, status, and metadata information for a specific virtual account.",
          playPath: "/api/v1/accounts/:id",
          responseSample: JSON.stringify({
            account: {
              id: "acc_4b9101c5f8df",
              customerId: "cust_3af00b8bc1e2",
              name: "USD Operating Wallet",
              currency: "USD",
              balance: 1000000,
              availableBalance: 1000000,
              status: "active",
              createdAt: "2026-08-26T15:22:00.000Z"
            }
          }, null, 2)
        },
        {
          id: "patch-account-id",
          name: "Update Account",
          method: "PATCH",
          path: "/api/v1/accounts/:id",
          description: "Update virtual wallet settings, rename, or freeze/suspend operations.",
          parameters: [
            { name: "name", type: "string", required: false, description: "Updated label for the virtual account." },
            { name: "status", type: "string", required: false, description: "Account status (e.g. active, frozen, closed)." }
          ],
          defaultPayload: JSON.stringify({
            name: "Updated Wallet Name",
            status: "frozen"
          }, null, 2),
          playPath: "/api/v1/accounts/:id",
          responseSample: JSON.stringify({
            account: {
              id: "acc_4b9101c5f8df",
              name: "Updated Wallet Name",
              status: "frozen"
            }
          }, null, 2)
        }
      ]
    },
    {
      id: "transfers",
      category: "CORE RESOURCES",
      title: "Transfers API",
      description: "Initiate digital double-entry book payments instantly across account balances",
      details: "Transfers register immediate ledger entries. They require minor currency units specifications (e.g., 50000 represents $500.00 or ₦500.00 depending on the account's currency node).",
      endpoints: [
        {
          id: "post-transfers",
          name: "Initiate Transfer",
          method: "POST",
          path: "/api/v1/transfers",
          description: "Settle and record financial double-entry ledger settlements instantly.",
          parameters: [
            { name: "type", type: "string", required: true, description: "Type of transfer: 'internal' or 'external'." },
            { name: "sourceAccountId", type: "string", required: true, description: "Account ID to pull funds from." },
            { name: "destinationAccountId", type: "string", required: false, description: "Account ID to push funds to (required for internal type)." },
            { name: "amount", type: "integer", required: true, description: "Positive integer amount in minor units (e.g. 25000 = $250.00)." },
            { name: "currency", type: "string", required: true, description: "3-letter ISO code matching source/destination accounts." },
            { name: "reference", type: "string", required: true, description: "Unique external payment reference to prevent double-charging." },
            { name: "beneficiary", type: "object", required: false, description: "Required for external transfers: { type: 'bank_account', bankCode: '011', accountNumber: '1234567890' }" }
          ],
          defaultPayload: JSON.stringify({
            type: "internal",
            sourceAccountId: "acc_xxxxxxxx",
            destinationAccountId: "acc_yyyyyyyy",
            amount: 25000,
            currency: "USD",
            reference: "pay_sandbox_tx_102"
          }, null, 2),
          playPath: "/api/v1/transfers",
          responseSample: JSON.stringify({
            status: "success",
            transfer: {
              id: "trsf_7a8101c23abc",
              projectId: "proj_9f48ac81",
              type: "internal",
              sourceAccountId: "acc_xxxxxxxx",
              destinationAccountId: "acc_yyyyyyyy",
              amount: 25000,
              currency: "USD",
              reference: "pay_sandbox_tx_102",
              status: "successful",
              createdAt: "2026-08-26T15:24:00.000Z"
            }
          }, null, 2)
        },
        {
          id: "get-transfers",
          name: "List Transfers",
          method: "GET",
          path: "/api/v1/transfers",
          description: "Query and list transfer items inside your project, supporting status filtering.",
          parameters: [
            { name: "status", type: "string", required: false, description: "Filter by status: created, pending, successful, failed." },
            { name: "limit", type: "integer", required: false, description: "Max 100, defaults to 50." }
          ],
          playPath: "/api/v1/transfers",
          responseSample: JSON.stringify({
            status: "success",
            data: [
              {
                id: "trsf_7a8101c23abc",
                type: "internal",
                amount: 25000,
                status: "successful"
              }
            ]
          }, null, 2)
        },
        {
          id: "get-transfer-id",
          name: "Retrieve Transfer",
          method: "GET",
          path: "/api/v1/transfers/:id",
          description: "Retrieve complete double-entry detail and network settlement status for a specific transfer ID.",
          playPath: "/api/v1/transfers/:id",
          responseSample: JSON.stringify({
            status: "success",
            transfer: {
              id: "trsf_7a8101c23abc",
              sourceAccountId: "acc_xxxxxxxx",
              destinationAccountId: "acc_yyyyyyyy",
              amount: 25000,
              currency: "USD",
              status: "successful"
            }
          }, null, 2)
        },
        {
          id: "post-transfer-sync",
          name: "Sync Transfer Status",
          method: "POST",
          path: "/api/v1/transfers/:transferId/sync",
          description: "Force status reconciliation against clearing provider logs.",
          playPath: "/api/v1/transfers/:id/sync",
          responseSample: JSON.stringify({
            status: "success",
            transfer: {
              id: "trsf_7a8101c23abc",
              status: "successful"
            }
          }, null, 2)
        }
      ]
    },
    {
      id: "transactions",
      category: "CORE RESOURCES",
      title: "Transactions API",
      description: "Inspect immutable audit journal entries generated by transfer executions",
      details: "Whenever a transfer completes, FlexBank writes ledger transactions. Transactions operate as read-only journals detailing exact credits and debits recorded on account nodes.",
      endpoints: [
        {
          id: "get-transactions",
          name: "List Transactions",
          method: "GET",
          path: "/api/v1/transactions",
          description: "Query and view the complete audit trail of transaction movements in your project.",
          playPath: "/api/v1/transactions",
          responseSample: JSON.stringify({
            transactions: [
              {
                id: "tx_d3a8e9921c5f",
                projectId: "proj_9f48ac81",
                transferId: "trsf_7a8101c23abc",
                accountId: "acc_xxxxxxxx",
                type: "debit",
                amount: 25000,
                currency: "USD",
                createdAt: "2026-08-26T15:24:00.000Z"
              }
            ]
          }, null, 2)
        },
        {
          id: "get-transaction-id",
          name: "Retrieve Transaction",
          method: "GET",
          path: "/api/v1/transactions/:id",
          description: "Fetch comprehensive debit/credit audit specifications for a unique transaction ID.",
          playPath: "/api/v1/transactions/:id",
          responseSample: JSON.stringify({
            transaction: {
              id: "tx_d3a8e9921c5f",
              transferId: "trsf_7a8101c23abc",
              accountId: "acc_xxxxxxxx",
              type: "debit",
              amount: 25000,
              currency: "USD",
              createdAt: "2026-08-26T15:24:00.000Z"
            }
          }, null, 2)
        }
      ]
    },
    {
      id: "webhooks",
      category: "CORE RESOURCES",
      title: "Webhooks API",
      description: "Manage subscription listener channels to receive immediate event alerts",
      details: "Set up Webhooks to respond to system activity in real-time, such as customer creations, account funding, transfer completions, and status changes.",
      endpoints: [
        {
          id: "post-endpoints",
          name: "Create Webhook Endpoint",
          method: "POST",
          path: "/api/v1/webhooks/endpoints",
          description: "Registers a new project-level webhook receiver. Returns the signing secret EXACTLY once.",
          parameters: [
            { name: "url", type: "string", required: true, description: "Your secure listener HTTPS URL (e.g., https://yourserver.com/webhooks)." }
          ],
          defaultPayload: JSON.stringify({
            url: "https://yourserver.com/webhooks/flexbank"
          }, null, 2),
          playPath: "/api/v1/webhooks/endpoints",
          responseSample: JSON.stringify({
            id: "whe_38fa0992a7e1c",
            url: "https://yourserver.com/webhooks/flexbank",
            status: "active",
            secret: "whsec_bfb5e7d4be12cd4e06...",
            createdAt: "2026-08-26T15:28:00.000Z"
          }, null, 2)
        },
        {
          id: "get-endpoints",
          name: "List Webhook Endpoints",
          method: "GET",
          path: "/api/v1/webhooks/endpoints",
          description: "Lists all registered webhook endpoints for your project. Secure signing secrets are redacted.",
          playPath: "/api/v1/webhooks/endpoints",
          responseSample: JSON.stringify({
            data: [
              {
                id: "whe_38fa0992a7e1c",
                url: "https://yourserver.com/webhooks/flexbank",
                status: "active",
                createdAt: "2026-08-26T15:28:00.000Z"
              }
            ]
          }, null, 2)
        },
        {
          id: "patch-endpoint-id",
          name: "Update Webhook Endpoint",
          method: "PATCH",
          path: "/api/v1/webhooks/endpoints/:id",
          description: "Modify the URL or disable the target webhook endpoint.",
          parameters: [
            { name: "url", type: "string", required: false, description: "Updated HTTPS listener URL." },
            { name: "status", type: "string", required: false, description: "Enable or disable endpoint ('active' | 'disabled')." }
          ],
          defaultPayload: JSON.stringify({
            status: "disabled"
          }, null, 2),
          playPath: "/api/v1/webhooks/endpoints/:id",
          responseSample: JSON.stringify({
            data: {
              id: "whe_38fa0992a7e1c",
              url: "https://yourserver.com/webhooks/flexbank",
              status: "disabled",
              createdAt: "2026-08-26T15:28:00.000Z"
            }
          }, null, 2)
        },
        {
          id: "delete-endpoint-id",
          name: "Disable Webhook Endpoint",
          method: "DELETE",
          path: "/api/v1/webhooks/endpoints/:id",
          description: "Soft-deletes (disables) a webhook endpoint to preserve delivery history logs.",
          playPath: "/api/v1/webhooks/endpoints/:id",
          responseSample: JSON.stringify({
            success: true,
            message: "Webhook endpoint successfully disabled"
          }, null, 2)
        },
        {
          id: "get-endpoint-deliveries",
          name: "List Delivery Logs",
          method: "GET",
          path: "/api/v1/webhooks/endpoints/:id/deliveries",
          description: "Retrieve a complete audit index of event delivery signals and response statuses.",
          playPath: "/api/v1/webhooks/endpoints/:id/deliveries",
          responseSample: JSON.stringify({
            data: [
              {
                id: "whd_483ac8d9",
                webhookEndpointId: "whe_38fa0992a7e1c",
                eventType: "transfer.successful",
                payload: "{}",
                statusCode: 200,
                duration: 45,
                createdAt: "2026-08-26T15:25:00.000Z"
              }
            ]
          }, null, 2)
        },
        {
          id: "post-endpoint-test",
          name: "Simulate Webhook Event",
          method: "POST",
          path: "/api/v1/webhooks/endpoints/:id/test-event",
          description: "Dispatches a simulated webhook event payload to your endpoint to test parsing.",
          parameters: [
            { name: "eventType", type: "string", required: true, description: "Type of mock event to trigger (e.g., 'customer.created', 'transfer.successful')." }
          ],
          defaultPayload: JSON.stringify({
            eventType: "transfer.successful"
          }, null, 2),
          playPath: "/api/v1/webhooks/endpoints/:id/test-event",
          responseSample: JSON.stringify({
            status: "success",
            message: "Test webhook event initiated",
            deliveryId: "whd_98fa31ca"
          }, null, 2)
        }
      ]
    },
    {
      id: "sandbox-tools",
      category: "DEVELOPER TOOLS",
      title: "Sandbox Simulator",
      description: "Directly fund accounts and simulate payment outcomes within test mode",
      details: "FlexBank exposes dedicated test-mode-only helper endpoints. These tools let developers simulate credit actions, settle transfers, trigger webhook alerts, or completely wipe test databases.",
      endpoints: [
        {
          id: "post-fund",
          name: "Fund Test Account",
          method: "POST",
          path: "/api/v1/test/accounts/:accountId/fund",
          description: "Deposit sandbox currency into an account node via automated clearing clearing adjustment.",
          parameters: [
            { name: "amount", type: "integer", required: true, description: "Positive integer amount in minor currency units." }
          ],
          defaultPayload: JSON.stringify({
            amount: 1000000
          }, null, 2),
          playPath: "/api/v1/test/accounts/:accountId/fund",
          responseSample: JSON.stringify({
            status: "success",
            message: "Sandbox test account successfully funded",
            data: {
              id: "acc_4b9101c5f8df",
              balance: 1000000,
              availableBalance: 1000000
            }
          }, null, 2)
        },
        {
          id: "post-simulate",
          name: "Simulate Transfer Outcome",
          method: "POST",
          path: "/api/v1/test/transfers/:transferId/simulate",
          description: "Forces a pending transfer to settle, fail, or timeout.",
          parameters: [
            { name: "scenario", type: "string", required: true, description: "Desired outcome scenario: 'settled', 'successful_transfer', 'provider_rejected', 'failed_transfer', 'provider_timeout'." }
          ],
          defaultPayload: JSON.stringify({
            scenario: "successful_transfer"
          }, null, 2),
          playPath: "/api/v1/test/transfers/:transferId/simulate",
          responseSample: JSON.stringify({
            status: "success",
            message: "Simulated transfer outcome 'successful_transfer' successfully executed",
            data: {
              id: "trsf_7a8101c23abc",
              status: "successful"
            }
          }, null, 2)
        },
        {
          id: "post-reset",
          name: "Reset Sandbox Data",
          method: "POST",
          path: "/api/v1/test/reset",
          description: "Wipes all sandbox customers, accounts, webhooks, and transfers for the active project.",
          playPath: "/api/v1/test/reset",
          responseSample: JSON.stringify({
            status: "success",
            message: "Sandbox environment reset completely"
          }, null, 2)
        }
      ]
    }
  ];

  // Outline list generator based on active page anchors
  const getSectionOutline = (docId: string) => {
    const item = DOCS_LIBRARY.find((d) => d.id === docId);
    if (!item) return [];
    if (item.endpoints) {
      return item.endpoints.map((ep) => ({ id: ep.id, label: `${ep.method} ${ep.path}` }));
    }
    // Static markdown sub-sections
    if (docId === "overview") {
      return [
        { id: "platform-overview", label: "Platform Overview" },
        { id: "sandbox-boundaries", label: "Sandbox Mode boundaries" },
        { id: "core-capabilities", label: "What is FlexBank?" }
      ];
    }
    if (docId === "quickstart") {
      return [
        { id: "steps", label: "Interactive 7 steps" }
      ];
    }
    if (docId === "authentication") {
      return [
        { id: "bearer-auth", label: "Bearer Authorization" },
        { id: "security-warnings", label: "Developer safety warnings" }
      ];
    }
    if (docId === "webhook-signatures") {
      return [
        { id: "signature-verification", label: "HMAC cryptography" },
        { id: "python-verify", label: "Python implementation" },
        { id: "node-verify", label: "Node.js implementation" }
      ];
    }
    if (docId === "errors") {
      return [
        { id: "error-envelope", label: "JSON Error envelope" },
        { id: "http-diagnostic-codes", label: "HTTP Diagnostic codes" }
      ];
    }
    return [];
  };

  const filteredDocs = DOCS_LIBRARY.filter((item) => {
    const term = searchQuery.toLowerCase().trim();
    if (!term) return true;
    return (
      item.title.toLowerCase().includes(term) ||
      item.description.toLowerCase().includes(term) ||
      item.category.toLowerCase().includes(term) ||
      (item.endpoints && item.endpoints.some((ep) => ep.path.toLowerCase().includes(term) || ep.name.toLowerCase().includes(term)))
    );
  });

  const activeDoc = DOCS_LIBRARY.find((d) => d.id === activeDocId) || DOCS_LIBRARY[0];
  const outline = getSectionOutline(activeDoc.id);

  // Pagination navigation selectors (Section 26)
  const currentIndex = DOCS_LIBRARY.findIndex((d) => d.id === activeDoc.id);
  const prevDoc = currentIndex > 0 ? DOCS_LIBRARY[currentIndex - 1] : null;
  const nextDoc = currentIndex < DOCS_LIBRARY.length - 1 ? DOCS_LIBRARY[currentIndex + 1] : null;

  // Initialize payload records on mount
  useEffect(() => {
    if (activeDoc.endpoints) {
      const payloads: Record<string, string> = {};
      activeDoc.endpoints.forEach((ep) => {
        if (ep.defaultPayload) {
          payloads[ep.id] = ep.defaultPayload;
        }
      });
      setCustomPayloads((prev) => ({ ...prev, ...payloads }));
    }
  }, [activeDocId]);

  // Execute actual playground API operations securely using user administrative session (Section 20)
  const handleExecutePlayground = async (ep: EndpointDoc) => {
    const epId = ep.id;
    setPlaygroundLoading((prev) => ({ ...prev, [epId]: true }));
    setPlaygroundResponse((prev) => ({ ...prev, [epId]: null }));
    setPlaygroundStatus((prev) => ({ ...prev, [epId]: null }));
    setPlaygroundLatency((prev) => ({ ...prev, [epId]: null }));
    setPlaygroundRequestId((prev) => ({ ...prev, [epId]: null }));

    // Evaluate parameterized variables (like accountId or transferId) from target payload or inject random defaults
    let finalPath = ep.playPath;
    let payloadParsed = {};

    if (ep.method === "POST" || ep.method === "PATCH") {
      const pText = customPayloads[epId] || "{}";
      try {
        payloadParsed = JSON.parse(pText);
      } catch (err) {
        alert(`Invalid JSON format in the request body textarea for ${ep.name}`);
        setPlaygroundLoading((prev) => ({ ...prev, [epId]: false }));
        return;
      }
    }

    // Replace param placeholders recursively inside endpoint paths (e.g. :id or :accountId)
    if (finalPath.includes("/:id")) {
      const matchId = (payloadParsed as any).customerId || (payloadParsed as any).accountId || (payloadParsed as any).id || "entity_xxxxx";
      finalPath = finalPath.replace("/:id", `/${matchId}`);
    }
    if (finalPath.includes("/:accountId")) {
      const matchId = (payloadParsed as any).accountId || "acc_xxxxxxxx";
      finalPath = finalPath.replace("/:accountId", `/${matchId}`);
    }
    if (finalPath.includes("/:transferId")) {
      const matchId = (payloadParsed as any).transferId || "trsf_xxxxxxxx";
      finalPath = finalPath.replace("/:transferId", `/${matchId}`);
    }

    const startTime = performance.now();
    try {
      let response;
      if (ep.method === "POST") {
        response = await playgroundApi.post(finalPath, payloadParsed);
      } else if (ep.method === "GET") {
        response = await playgroundApi.get(finalPath);
      } else if (ep.method === "PATCH") {
        response = await playgroundApi.patch(finalPath, payloadParsed);
      } else {
        response = await playgroundApi.delete(finalPath);
      }

      const endTime = performance.now();
      setPlaygroundLatency((prev) => ({ ...prev, [epId]: Math.round(endTime - startTime) }));
      setPlaygroundStatus((prev) => ({ ...prev, [epId]: response.status }));
      setPlaygroundResponse((prev) => ({ ...prev, [epId]: response.data }));
      setPlaygroundRequestId((prev) => ({ ...prev, [epId]: response.headers["x-request-id"] || "req_sim_" + Math.random().toString(36).substr(2, 9) }));
    } catch (err: any) {
      const endTime = performance.now();
      setPlaygroundLatency((prev) => ({ ...prev, [epId]: Math.round(endTime - startTime) }));
      setPlaygroundStatus((prev) => ({ ...prev, [epId]: err.response?.status || 500 }));
      setPlaygroundResponse((prev) => ({ ...prev, [epId]: err.response?.data || { message: err.message } }));
      setPlaygroundRequestId((prev) => ({ ...prev, [epId]: err.response?.headers?.["x-request-id"] || "req_err_" + Math.random().toString(36).substr(2, 9) }));
    } finally {
      setPlaygroundLoading((prev) => ({ ...prev, [epId]: false }));
    }
  };

  const handleCopyKey = () => {
    navigator.clipboard.writeText(apiKeyToken);
    setCopiedKey(true);
    setTimeout(() => setCopiedKey(false), 2000);
  };

  // Code Snippets Text Composer
  const generateSnippet = (ep: EndpointDoc, lang: "curl" | "js" | "node" | "python") => {
    const formattedUrl = `${FLEXBANK_API_URL}${ep.path}`;
    const cleanPayload = customPayloads[ep.id] || ep.defaultPayload || "{}";

    switch (lang) {
      case "curl":
        return `curl -X ${ep.method} "${formattedUrl}" \\
  -H "Authorization: Bearer ${apiKeyToken}" \\
  -H "Content-Type: application/json" \\
  -H "x-project-id: ${selectedProjectId || "your_project_id"}" ${ep.method !== "GET" && ep.method !== "DELETE" ? `\\
  -d '${cleanPayload}'` : ""}`;
      case "js":
        return `fetch("${formattedUrl}", {
  method: "${ep.method}",
  headers: {
    "Authorization": "Bearer ${apiKeyToken}",
    "Content-Type": "application/json",
    "x-project-id": "${selectedProjectId || "your_project_id"}"
  }${ep.method !== "GET" && ep.method !== "DELETE" ? `,
  body: JSON.stringify(${cleanPayload.replace(/\n/g, "\n  ")})` : ""}
})
.then(res => res.json())
.then(data => console.log(data));`;
      case "node":
        return `const axios = require('axios');

axios({
  method: "${ep.method.toLowerCase()}",
  url: "${formattedUrl}",
  headers: {
    "Authorization": "Bearer ${apiKeyToken}",
    "x-project-id": "${selectedProjectId || "your_project_id"}"
  }${ep.method !== "GET" && ep.method !== "DELETE" ? `,
  data: ${cleanPayload.replace(/\n/g, "\n  ")}` : ""}
})
.then(response => console.log(response.data))
.catch(error => console.error(error));`;
      case "python":
        return `import requests

headers = {
    "Authorization": "Bearer ${apiKeyToken}",
    "Content-Type": "application/json",
    "x-project-id": "${selectedProjectId || "your_project_id"}"
}
${ep.method !== "GET" && ep.method !== "DELETE" ? `
payload = ${cleanPayload.replace(/\n/g, "\n  ")}

response = requests.${ep.method.toLowerCase()}(
    "${formattedUrl}",
    headers=headers,
    json=payload
)` : `
response = requests.${ep.method.toLowerCase()}(
    "${formattedUrl}",
    headers=headers
)`}

print(response.json())`;
      default:
        return "";
    }
  };

  return (
    <div className={`text-left font-mono select-none bg-[#030303] text-neutral-300 min-h-screen ${isPublicView ? "py-8 px-4 sm:px-6 lg:px-8" : ""}`}>
      
      {/* 1. standalone Landing Navigation Header */}
      {isPublicView && (
        <div className="max-w-7xl mx-auto flex items-center justify-between pb-6 border-b border-neutral-900 mb-8">
          <Link to="/" className="flex items-center space-x-3 group">
            <div className="flex h-9 w-9 items-center justify-center rounded bg-indigo-600 font-bold text-white text-lg hover:scale-105 transition-all">
              F
            </div>
            <div>
              <span className="text-sm font-black text-white tracking-wider block leading-none">FLEXBANK</span>
              <span className="text-[9px] text-neutral-500 font-bold uppercase tracking-widest font-mono block mt-0.5">Sandbox registry</span>
            </div>
          </Link>
          <div className="flex items-center space-x-3">
            <Link to="/login" className="text-xs font-bold text-neutral-400 hover:text-white px-3 py-1.5 rounded transition-colors uppercase">
              [ Sign In ]
            </Link>
            <Link to="/signup" className="text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-500 px-4 py-2 rounded transition-all uppercase">
              Create Sandbox
            </Link>
          </div>
        </div>
      )}

      <div className="max-w-7xl mx-auto space-y-6">
        
        {/* 2. Top Header Widget Banner */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center pb-5 border-b border-neutral-900 gap-4">
          <div>
            <h1 className="text-xl font-black text-white uppercase tracking-tight flex items-center space-x-2">
              <BookOpen className="h-5.5 w-5.5 text-indigo-500 shrink-0" />
              <span>Developer Reference Registry</span>
            </h1>
            <p className="text-[10px] text-neutral-500 font-semibold mt-1">
              Explore REST endpoints, configure signatures, and simulate clearing house settlements in real-time.
            </p>
          </div>

          {/* Connected environment meta block (Section 21) */}
          <div className="flex flex-col sm:flex-row gap-3 w-full md:w-auto items-stretch sm:items-center shrink-0">
            {token && (
              <div className="rounded border border-neutral-900 bg-neutral-950/40 p-2.5 px-3.5 text-[10px] space-y-0.5 text-neutral-400">
                <div className="flex items-center space-x-1">
                  <ShieldCheck className="h-3.5 w-3.5 text-emerald-500 shrink-0" />
                  <span className="font-bold text-white truncate max-w-[150px]">{activeProjectName || "My Sandbox Project"}</span>
                </div>
                <div className="text-[8.5px] uppercase text-neutral-500">PROJECT SCOPE • <span className="text-amber-500 font-bold">TEST MODE</span></div>
              </div>
            )}

            <div className="flex items-center space-x-2 bg-neutral-950 text-neutral-400 rounded border border-neutral-900 p-2.5 px-3.5 text-[10.5px] font-mono select-all shrink-0">
              <Terminal className="h-4 w-4 text-neutral-600 shrink-0" />
              <span className="truncate max-w-[160px]" title="Click to copy active project API Key">
                {apiKeyToken.substring(0, 15)}...{apiKeyToken.slice(-6)}
              </span>
              <button
                onClick={handleCopyKey}
                className="text-neutral-500 hover:text-white p-0.5 rounded transition-colors"
                title="Copy Key Payload"
              >
                {copiedKey ? (
                  <Check className="h-3.5 w-3.5 text-emerald-500" />
                ) : (
                  <Copy className="h-3.5 w-3.5" />
                )}
              </button>
            </div>
          </div>
        </div>

        {/* 3. Three-Column Grid Setup (Section 25 / 26) */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          
          {/* COLUMN 1: Sidebar Index Navigation (col-span-3) */}
          <div className="lg:col-span-3 space-y-5">
            
            {/* Real-time search panel */}
            <div className="relative">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-neutral-600" />
              <input
                type="text"
                placeholder="Search topics, paths..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full rounded border border-neutral-900 bg-neutral-950 pl-9 pr-4 py-2 text-xs font-semibold text-white placeholder-neutral-700 focus:border-indigo-500 focus:outline-none transition-all"
              />
            </div>

            {/* Topics Navigator */}
            <div className="space-y-6">
              {(["GETTING STARTED", "CORE RESOURCES", "DEVELOPER TOOLS"] as const).map((cat) => {
                const catDocs = filteredDocs.filter((d) => d.category === cat);
                if (catDocs.length === 0) return null;

                return (
                  <div key={cat} className="space-y-2">
                    <h4 className="text-[9px] font-black uppercase tracking-widest text-neutral-600 px-2 font-mono">
                      {cat}
                    </h4>
                    <nav className="flex flex-col space-y-0.5">
                      {catDocs.map((doc) => {
                        const isActive = doc.id === activeDocId;
                        return (
                          <button
                            key={doc.id}
                            onClick={() => handleDocClick(doc.id)}
                            className={`flex items-center justify-between rounded px-2.5 py-1.5 text-xs font-semibold text-left transition-all ${
                              isActive
                                ? "bg-indigo-950/20 border border-indigo-900/40 text-indigo-400 font-bold"
                                : "text-neutral-500 hover:bg-neutral-950 hover:text-neutral-300"
                            }`}
                          >
                            <span className="truncate pr-2">{doc.title}</span>
                            {doc.endpoints && (
                              <span className="text-[8px] bg-neutral-900 text-neutral-500 border border-neutral-800 px-1 py-0.2 rounded shrink-0 font-bold font-mono">
                                {doc.endpoints.length} APIs
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

          {/* COLUMN 2: Primary Markdown / Content Column (col-span-7) */}
          <div className="lg:col-span-7 space-y-8 text-left">
            
            {/* Root Description Container */}
            <div className="rounded-lg border border-neutral-900 bg-neutral-950/20 p-6 space-y-4">
              <div className="border-b border-neutral-900 pb-4">
                <span className="text-[9px] font-bold text-neutral-500 uppercase tracking-widest block font-mono">
                  {activeDoc.category}
                </span>
                <h2 className="text-xl font-black text-white uppercase tracking-tight mt-1">
                  {activeDoc.title}
                </h2>
                <p className="text-xs text-neutral-400 mt-1 font-semibold">
                  {activeDoc.description}
                </p>
              </div>

              {/* Render alert block formatting & custom content cleanly */}
              <div className="text-xs text-neutral-400 leading-relaxed font-semibold space-y-4 font-sans whitespace-pre-line">
                {activeDoc.details
                  .split("\n\n")
                  .map((paragraph, index) => {
                    if (paragraph.startsWith("> [!IMPORTANT]") || paragraph.startsWith("> [!WARNING]") || paragraph.startsWith("> [!NOTE]")) {
                      const lines = paragraph.split("\n");
                      const title = lines[0].replace("> [!", "").replace("]", "").trim();
                      const body = lines.slice(1).map(l => l.replace(/^>\s?/, "")).join("\n");
                      const isWarning = title === "WARNING" || title === "CAUTION";
                      return (
                        <div
                          key={index}
                          className={`rounded border p-4 font-mono text-[10.5px] uppercase tracking-wide leading-normal ${
                            isWarning 
                              ? "bg-rose-950/5 border-rose-950/40 text-rose-500" 
                              : "bg-indigo-950/5 border-indigo-950/30 text-indigo-400"
                          }`}
                        >
                          <span className="font-bold block mb-1">⚠️ {title}</span>
                          <span>{body}</span>
                        </div>
                      );
                    }

                    if (paragraph.startsWith("### ")) {
                      return (
                        <h3 key={index} className="text-sm font-black text-white uppercase tracking-wider pt-2 border-b border-neutral-900/60 pb-1 font-mono">
                          {paragraph.replace("### ", "")}
                        </h3>
                      );
                    }

                    if (paragraph.startsWith("## ")) {
                      return (
                        <h2 key={index} className="text-base font-black text-white uppercase tracking-wider pt-4 border-b border-neutral-900 pb-1.5 font-mono">
                          {paragraph.replace("## ", "")}
                        </h2>
                      );
                    }

                    // Treat markdown list blocks
                    if (paragraph.startsWith("* ") || paragraph.startsWith("- ")) {
                      return (
                        <ul key={index} className="list-disc pl-5 space-y-1.5 font-mono text-[11px] text-neutral-400 uppercase">
                          {paragraph.split("\n").map((li, i) => (
                            <li key={i}>{li.replace(/^[\*\-\s]+/, "")}</li>
                          ))}
                        </ul>
                      );
                    }

                    return (
                      <p key={index} className="leading-relaxed text-neutral-400 font-sans text-xs">
                        {paragraph}
                      </p>
                    );
                  })}
              </div>
            </div>

            {/* Loop & Render Endpoints list sequentially (Stripe-like Reference) */}
            {activeDoc.endpoints && (
              <div className="space-y-10">
                {activeDoc.endpoints.map((ep) => {
                  const epId = ep.id;
                  const isPost = ep.method === "POST";
                  const isPatch = ep.method === "PATCH";
                  const isDelete = ep.method === "DELETE";

                  const methodColor = isPost 
                    ? "bg-emerald-950/20 text-emerald-500 border-emerald-900/40" 
                    : isPatch 
                      ? "bg-amber-950/20 text-amber-500 border-amber-900/40"
                      : isDelete 
                        ? "bg-rose-950/20 text-rose-500 border-rose-950/40"
                        : "bg-sky-950/20 text-sky-500 border-sky-900/40";

                  return (
                    <div key={epId} id={epId} className="rounded-lg border border-neutral-900 bg-neutral-950/10 p-6 space-y-6 relative scroll-mt-6">
                      
                      {/* Anchor title */}
                      <div className="border-b border-neutral-900 pb-4 flex flex-wrap justify-between items-start gap-3">
                        <div className="space-y-1">
                          <h3 className="text-sm font-black text-white uppercase tracking-widest flex items-center space-x-2">
                            <span>{ep.name}</span>
                          </h3>
                          <div className="flex items-center space-x-2 mt-1.5">
                            <span className={`text-[8.5px] font-black font-mono px-2 py-0.5 rounded border uppercase tracking-wider ${methodColor}`}>
                              {ep.method}
                            </span>
                            <code className="font-mono text-[10px] font-bold text-neutral-400 bg-neutral-950 px-2 py-0.5 rounded border border-neutral-900 select-all">
                              {ep.path}
                            </code>
                          </div>
                        </div>
                      </div>

                      <p className="text-xs text-neutral-400 font-semibold leading-relaxed">
                        {ep.description}
                      </p>

                      {/* Request Parameters tables */}
                      {ep.parameters && (
                        <div className="space-y-2">
                          <span className="text-[8.5px] font-black uppercase tracking-widest text-neutral-600 block font-mono">
                            Request Parameters
                          </span>
                          <div className="rounded border border-neutral-900 bg-neutral-950/30 overflow-hidden font-mono">
                            <table className="w-full text-left border-collapse">
                              <thead>
                                <tr className="border-b border-neutral-900 bg-neutral-950 text-[8px] text-neutral-500 uppercase tracking-widest font-black">
                                  <th className="py-2.5 px-3">Field</th>
                                  <th className="py-2.5 px-3">Type</th>
                                  <th className="py-2.5 px-3">Requirement</th>
                                  <th className="py-2.5 px-3">Description</th>
                                </tr>
                              </thead>
                              <tbody className="divide-y divide-neutral-900/50 text-[9.5px]">
                                {ep.parameters.map((param) => (
                                  <tr key={param.name} className="hover:bg-neutral-950/30 text-neutral-400">
                                    <td className="py-2.5 px-3 font-bold text-neutral-200">{param.name}</td>
                                    <td className="py-2.5 px-3 text-neutral-500 font-semibold uppercase">{param.type}</td>
                                    <td className="py-2.5 px-3">
                                      <span className={param.required ? "text-rose-500 font-bold uppercase text-[8px]" : "text-neutral-600 font-medium uppercase text-[8px]"}>
                                        {param.required ? "Required" : "Optional"}
                                      </span>
                                    </td>
                                    <td className="py-2.5 px-3 text-neutral-500 leading-normal pr-4">{param.description}</td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        </div>
                      )}

                      {/* Dynamic Code blocks with Languages tabs */}
                      <div className="space-y-2.5">
                        <div className="flex justify-between items-center border-b border-neutral-900 pb-1.5">
                          <span className="text-[8.5px] font-black uppercase tracking-widest text-neutral-600 block font-mono">
                            Integration Code Samples
                          </span>
                          <div className="flex space-x-1 border border-neutral-900 bg-neutral-950 rounded p-0.5 text-[8.5px] font-bold font-mono uppercase">
                            {(["curl", "js", "node", "python"] as const).map((lang) => (
                              <button
                                key={lang}
                                onClick={() => setSnippetLang(lang)}
                                className={`px-1.5 py-0.5 rounded transition-all cursor-pointer ${
                                  snippetLang === lang 
                                    ? "bg-neutral-900 text-white border border-neutral-800" 
                                    : "text-neutral-500 hover:text-neutral-300"
                                }`}
                              >
                                {lang === "js" ? "JS fetch" : lang}
                              </button>
                            ))}
                          </div>
                        </div>

                        {/* Snippet container */}
                        <div className="relative group rounded-lg border border-neutral-900 bg-black overflow-hidden p-4">
                          <button
                            onClick={() => handleCopyText(generateSnippet(ep, snippetLang), `${epId}-${snippetLang}`)}
                            className="absolute right-3 top-3 bg-neutral-950/80 hover:bg-neutral-900 text-neutral-500 hover:text-white p-1 rounded border border-neutral-900/60 opacity-0 group-hover:opacity-100 transition-opacity focus:outline-none"
                            title="Copy snippet"
                          >
                            {copiedSnippetId === `${epId}-${snippetLang}` ? (
                              <Check className="h-3.5 w-3.5 text-emerald-500" />
                            ) : (
                              <Copy className="h-3.5 w-3.5" />
                            )}
                          </button>
                          <pre className="text-[10px] font-mono leading-relaxed overflow-x-auto text-neutral-400 select-text whitespace-pre scrollbar-thin">
                            {generateSnippet(ep, snippetLang)}
                          </pre>
                        </div>
                      </div>

                      {/* Interactive "Try It" playground panel */}
                      <div className="border-t border-neutral-900 pt-5 space-y-4">
                        
                        {/* Play path header toggle */}
                        <details className="group border border-neutral-900 rounded-lg bg-neutral-950/20 overflow-hidden transition-all">
                          <summary className="flex items-center justify-between p-3.5 cursor-pointer font-bold text-[10.5px] uppercase tracking-wider text-neutral-400 hover:bg-neutral-950/50">
                            <div className="flex items-center space-x-2">
                              <Play className="h-3.5 w-3.5 text-indigo-500 fill-current shrink-0" />
                              <span>Console Sandbox Playground</span>
                            </div>
                            <span className="text-[8px] bg-indigo-950/40 border border-indigo-900/40 text-indigo-400 font-bold px-1.5 py-0.2 rounded uppercase tracking-wider transition-transform group-open:rotate-180">
                              EXPAND CONSOLE
                            </span>
                          </summary>

                          <div className="p-4 border-t border-neutral-900 bg-black/40 space-y-4">
                            
                            {/* Warning block if public user is locked out (Section 20 boundary check) */}
                            {isPublicView ? (
                              <div className="text-center py-4 space-y-3.5 flex flex-col items-center">
                                <span className="text-[9px] font-black bg-amber-500/10 text-amber-500 border border-amber-500/20 rounded px-2 py-0.5 tracking-wider uppercase font-mono">
                                  Playground Locked
                                </span>
                                <p className="text-[10px] text-neutral-500 leading-normal max-w-sm uppercase">
                                  Interactive sandboxing requires an active developer account. Create a project to issue virtual currencies and route transfers directly from the console.
                                </p>
                                <div className="flex space-x-3 w-full max-w-xs">
                                  <Link to="/signup" className="flex-1 text-center rounded bg-indigo-600 px-4 py-2.5 text-[10px] font-black text-white hover:bg-indigo-500 transition-colors uppercase">
                                    Sign Up
                                  </Link>
                                  <Link to="/login" className="flex-1 text-center rounded border border-neutral-900 bg-neutral-950 py-2.5 text-[10px] font-black text-neutral-400 hover:text-white transition-colors uppercase">
                                    Sign In
                                  </Link>
                                </div>
                              </div>
                            ) : (
                              <div className="space-y-4">
                                <p className="text-[9px] text-neutral-500 font-semibold uppercase leading-normal">
                                  Edit request payload body parameters below. All REST actions run against your active project sandbox DB.
                                </p>

                                {ep.method === "GET" || ep.method === "DELETE" ? (
                                  <div className="rounded border border-neutral-900 bg-neutral-950 p-4 text-center text-[10px] font-black text-neutral-600 uppercase">
                                    {ep.method} requests require no request payload parameters. Click dispatch below to pull live records.
                                  </div>
                                ) : (
                                  <div className="space-y-1.5">
                                    <span className="text-[8.5px] font-black text-neutral-600 uppercase tracking-widest font-mono block">
                                      Request Body Payload JSON
                                    </span>
                                    <textarea
                                      value={customPayloads[ep.id] || ""}
                                      onChange={(e) => {
                                        const text = e.target.value;
                                        setCustomPayloads((prev) => ({ ...prev, [ep.id]: text }));
                                      }}
                                      rows={5}
                                      className="w-full rounded border border-neutral-900 bg-black p-3 font-mono text-[10.5px] text-neutral-300 focus:border-indigo-500 focus:outline-none transition-all"
                                      placeholder="{}"
                                    />
                                  </div>
                                )}

                                {/* Trigger dispatch action button */}
                                <button
                                  onClick={() => handleExecutePlayground(ep)}
                                  disabled={playgroundLoading[ep.id]}
                                  className="w-full flex items-center justify-center space-x-2 rounded bg-indigo-600 hover:bg-indigo-500 px-4 py-2.5 text-[10px] font-black uppercase tracking-wider text-white disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer transition-colors"
                                >
                                  {playgroundLoading[ep.id] ? (
                                    <>
                                      <div className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-white/20 border-t-white" />
                                      <span>Dispatching REST Transaction...</span>
                                    </>
                                  ) : (
                                    <>
                                      <Play className="h-3.5 w-3.5 fill-current" />
                                      <span>Dispatch Console Request</span>
                                    </>
                                  )}
                                </button>

                                {/* Response logs segment */}
                                {playgroundStatus[ep.id] !== null && (
                                  <div className="border-t border-neutral-900 pt-4 space-y-3">
                                    <div className="flex items-center justify-between text-[9px] font-mono font-bold text-neutral-500 bg-neutral-950 border border-neutral-900 rounded p-2">
                                      <div className="flex items-center space-x-1.5">
                                        <Clock className="h-3.5 w-3.5 text-neutral-600" />
                                        <span>{playgroundLatency[ep.id]}ms</span>
                                      </div>
                                      <div className="flex items-center space-x-1.5">
                                        <span className={`h-1.5 w-1.5 rounded-full ${playgroundStatus[ep.id]! >= 200 && playgroundStatus[ep.id]! < 300 ? "bg-emerald-500 animate-pulse" : "bg-rose-500 animate-pulse"}`} />
                                        <span className={playgroundStatus[ep.id]! >= 200 && playgroundStatus[ep.id]! < 300 ? "text-emerald-500" : "text-rose-500"}>
                                          STATUS: {playgroundStatus[ep.id]}
                                        </span>
                                      </div>
                                    </div>

                                    {/* Request ID tracking info */}
                                    <div className="text-[8px] text-neutral-600 font-mono select-all truncate uppercase leading-none">
                                      x-request-id: <span className="text-neutral-400 font-bold">{playgroundRequestId[ep.id]}</span>
                                    </div>

                                    {/* Response json output */}
                                    <div className="space-y-1.5">
                                      <span className="text-[8.5px] font-black text-neutral-600 uppercase tracking-widest font-mono block">
                                        Response Envelope Payload
                                      </span>
                                      <div className="rounded-lg border border-neutral-900 bg-black p-4 overflow-hidden relative group/resp">
                                        <button
                                          onClick={() => handleCopyText(JSON.stringify(playgroundResponse[ep.id], null, 2), `${epId}-response`)}
                                          className="absolute right-3 top-3 bg-neutral-950/80 text-neutral-500 hover:text-white p-1 rounded border border-neutral-900/60 opacity-0 group-hover/resp:opacity-100 transition-opacity focus:outline-none"
                                        >
                                          {copiedSnippetId === `${epId}-response` ? (
                                            <Check className="h-3.5 w-3.5 text-emerald-500" />
                                          ) : (
                                            <Copy className="h-3.5 w-3.5" />
                                          )}
                                        </button>
                                        <pre className="text-[10px] font-mono leading-relaxed overflow-x-auto text-neutral-400 select-text whitespace-pre max-h-60 scrollbar-thin">
                                          {JSON.stringify(playgroundResponse[ep.id], null, 2)}
                                        </pre>
                                      </div>
                                    </div>
                                  </div>
                                )}
                              </div>
                            )}

                          </div>
                        </details>

                      </div>

                    </div>
                  );
                })}
              </div>
            )}

            {/* Sequential Previous/Next Navigation Controls (Section 26) */}
            <div className="border-t border-neutral-900 pt-6 flex justify-between items-center gap-4 text-[10px] uppercase font-black tracking-widest">
              {prevDoc ? (
                <button
                  onClick={() => handleDocClick(prevDoc.id)}
                  className="flex items-center space-x-1.5 text-neutral-500 hover:text-white group cursor-pointer transition-colors"
                >
                  <ChevronRight className="h-4 w-4 rotate-180 text-neutral-600 group-hover:text-white transition-transform" />
                  <span>PREV: {prevDoc.title}</span>
                </button>
              ) : (
                <div />
              )}

              {nextDoc ? (
                <button
                  onClick={() => handleDocClick(nextDoc.id)}
                  className="flex items-center space-x-1.5 text-neutral-500 hover:text-white group cursor-pointer transition-colors"
                >
                  <span>NEXT: {nextDoc.title}</span>
                  <ChevronRight className="h-4 w-4 text-neutral-600 group-hover:text-white transition-transform" />
                </button>
              ) : (
                <div />
              )}
            </div>

          </div>

          {/* COLUMN 3: Right Sidebar Anchor Outlines (col-span-2) */}
          <div className="hidden xl:block xl:col-span-2 sticky top-6 text-left border-l border-neutral-900/40 pl-4 space-y-4">
            <span className="text-[9px] font-black uppercase tracking-widest text-neutral-600 block font-mono">
              On This Page
            </span>
            {outline.length === 0 ? (
              <span className="text-[9.5px] text-neutral-700 font-semibold uppercase leading-normal block">
                No headers in this section
              </span>
            ) : (
              <nav className="flex flex-col space-y-2 text-[9.5px] font-black uppercase tracking-wider">
                {outline.map((item) => (
                  <button
                    key={item.id}
                    onClick={() => scrollToAnchor(item.id)}
                    className="text-left text-neutral-500 hover:text-indigo-400 transition-colors cursor-pointer truncate max-w-full leading-normal block"
                    title={item.label}
                  >
                    ● {item.label}
                  </button>
                ))}
              </nav>
            )}
          </div>

        </div>
      </div>
    </div>
  );
};

export default Docs;
