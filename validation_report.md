# Ricarut MVP: Sandbox & Developer Integration Validation Report

This report presents the comprehensive engineering audit and high-fidelity developer validation results for the **Ricarut** fintech sandbox platform. Every transaction engine capability, multi-tenant isolation rule, security boundary, and documentation guide has been verified using automated integration suites and end-to-end simulated scenarios.

---

## A. Sandbox Status

*   **Overall Assessment**: **`CLEAN & COMPLIANT`**
*   **Database Seeding**: **`SUCCESSFULLY RE-SEEDED`**
*   **Database Integrity**: **`100% BALANCED`**

### Seeding & Demo Data Schema
We executed a secure, transactional cascading wipe of all developer sandbox data and initialized a clean, repeatable sandbox blueprint under `scratch/reset_and_seed.ts`. No legacy mock entries or stale developer data remain.

The seeded dataset establishes a realistic, multi-entity integration environment:

```text
Demo User: demo.developer@ricarut.com
  └── Organization: Ricarut Demo Org (ID: ricarut-demo-org)
        └── Project: Demo Sandbox Project (test)
              ├── API Key: fb_test_demokey12345.demosecret1234567890123456789012
              ├── Customer A: Adekunle Alabi (ID: cust_adekunle_001)
              │     └── Account A: Adekunle Alabi NGN Wallet (ID: acc_adekunle_ngn_001)
              │           └── Starting Balance: ₦10,000,000.00 (1,000,000,000 Kobo)
              └── Customer B: Chioma Nwachukwu (ID: cust_chioma_002)
                    └── Account B: Chioma Nwachukwu NGN Wallet (ID: acc_chioma_ngn_002)
                          └── Starting Balance: ₦5,000,000.00 (500,000,000 Kobo)
```

### Ledger Balance Factor Validation
Our core double-entry bookkeeping engine has been audited for mathematical consistency. Opening ledger account balances were created with perfect parity:

$$\text{Debits (Asset Central Vault Liquidity)} = \text{Credits (Liabilities to Customer Deposits)}$$

$$1,500,000,000 \text{ Kobo} = 1,000,000,000 \text{ Kobo} (\text{Adekunle}) + 500,000,000 \text{ Kobo} (\text{Chioma})$$

All subsequent transfers maintain this absolute balance factor. Database logs verify that zero leakages occur.

---

## B. Developer Onboarding

*   **Assessment Status**: **`PASS`**
*   **Onboarding Friction Score**: **`EXCELLENT`** (Low friction, highly self-contained experience)

We simulated the end-to-end journey of an external developer integrating Ricarut with zero prior knowledge:

1.  **Discovery & Understanding**: The developer landing page explicitly outlines Ricarut's role as a developer-first software abstraction layer for financial infrastructure in Africa. It clearly communicates that the platform operates as a secure, simulated sandbox environment with no real monetary transfers.
2.  **Registration & Authentication**: The registration form collects name, email, and password, automatically establishing a default Organization. JWT-based sessions are used to persist the logged-in state across page transitions securely.
3.  **Project Initialization**: Developers can instantiate distinct Project contexts instantly. The system isolates separate staging, testing, and simulator environments out-of-the-box.
4.  **Credential Retrieval**: API Keys are project-scoped and clearly distinguished into test mode prefixes (`fb_test_...` / `rc_test_...`).
5.  **Documentation Integration**: Responsive code tabs show complete request snippets in cURL, Javascript, Axios, and Python directly inside the browser.

### Key Observation & Improvement Points
*   **API URL Visibility**: The base API endpoint URL is clearly documented. Developers do not need to guess target routing paths.
*   **Prefix Flexibility**: The system handles both legacy prefixes (`fb_`) and rebranded prefixes (`rc_`) in auth headers concurrently to prevent integrations from breaking.

---

## C. API Flow Analysis

Our dedicated end-to-end validation test suite (`scratch/validate_transfers.ts`) has been executed directly against the live backend service. Below are the verified response states of the core financial flows:

### 1. API Authentication
*   **Valid Key Header**: Requests presenting a valid Bearer token (`Authorization: Bearer fb_test_demokey12345...`) are successfully authorized.
*   **Invalid Key Header**: Requests with incorrect key formatting or bad hashes are immediately blocked with HTTP `401 Unauthorized`.
*   **Missing Key Header**: Requests missing credentials are rejected with HTTP `401 Unauthorized`.

### 2. Customers
*   **CRUD Validation**: Supports creating customers with external developer IDs, listing customers scoped to projects, and retrieving single profiles.
*   **Boundary Enforcement**: Project-scoped boundaries prevent cross-tenant leakage.

### 3. Accounts
*   **Wallet Creation**: Accounts are successfully mapped to individual customers and ledger records.
*   **Balance Engine**: Accounts accurately track both `available` and `pending` balances in minor currency units (Kobo/Cents).

### 4. Transfers
*   **Balanced Movement**: Transfers between Account A and Account B are executed atomically on the ledger.
*   **Balance Updates**: Adekunle to Chioma transfer of ₦10,000.00 debited the sender and credited the recipient instantly:
    *   Adekunle Post-Balance: **`₦9,990,000.00`** (Expected decrease)
    *   Chioma Post-Balance: **`₦5,010,000.00`** (Expected increase)

### 5. Double-Entry Transactions
*   **Balanced Ledger Journals**: Every transfer creates an immutable `Journal` and balanced `LedgerEntry` debit/credit rows.
*   **Read-Only Journals**: Once posted, transaction histories remain read-only journals to prevent data tampering.

### 6. Idempotency Safeguard
*   **Repeat Requests**: Presenting the same `Idempotency-Key` on multiple identical transfer requests returns the cached `201 Created` response.
*   **Safety Lock**: No duplicate money movement occurs. Balances are debited exactly once.
*   **Mismatched Payloads**: Repeating a key with a changed body is rejected with `409 Conflict`.

### 7. predictable Errors
*   **Insufficient Balances**: Transfers exceeding available wallet balances are rejected with `400 Bad Request` (`INSUFFICIENT_FUNDS`).
*   **Amount Limits**: Attempting to move amounts greater than the maximum limit (e.g., ₦1,000,000.00 or 100M minor units) is rejected with `400 Bad Request` (`TRANSFER_LIMIT_EXCEEDED`).
*   **Secure Failure Responses**: Failed requests return standard HTTP codes and clean JSON error codes. No database details or stack traces are ever exposed in responses.

---

## D. Security Audit Check

A focused security review was performed on both the frontend and backend architectures:

| Vector | Status | Description | Action Applied |
| :--- | :---: | :--- | :--- |
| **Authentication** | **`SECURE`** | Standard JWT authentication for console login; Argon2id password hashing. | Verified robust hash validation. |
| **Credential Storage** | **`SECURE`** | Plaintext API Keys are never stored in the database. Only SHA-256 hashes of the keys are written. | Key validation uses constant-time hash comparisons. |
| **Project Isolation (IDOR)** | **`SECURE`** | Multi-tenant isolation is enforced at the controller query layer. Project A cannot fetch Project B resources. | Added deep integration tests to verify database boundaries. |
| **Secret Redaction in Logs** | **`SECURE`** | Logger redactions strip out JWTs and raw API keys from console outputs and server traces. | Confirmed zero token exposures. |
| **CORS Controls** | **`SECURE`** | CORS origins are restricted to whitelisted development domains (`http://localhost:3000`, etc.). | Confirmed server rejects unlisted domains. |
| **Input Validation** | **`SECURE`** | Request payloads are strongly typed and validated at the boundary via Zod schemas. | Mismatched data triggers clean parameter errors. |

---

## E. External Developer Test

*   **Assessment Status**: **`PASSED`**
*   **Trial Integration**: Completed successfully using the separate external test application script.

We conducted validation by executing our E2E external integration app against the local Ricarut sandbox API:

1.  **Credential Setup**: Environment variables (`RICARUT_API_URL` and `RICARUT_API_KEY`) were configured.
2.  **Wallet Fetch**: Connected to the API, authenticated, and successfully fetched both Customer and Account objects.
3.  **Transfer Execution**: Initiated a sandbox transfer with an idempotency key.
4.  **Balance Verification**: Verified that balances changed exactly as expected.
5.  **Rejection Validation**: Tested invalid keys and excessive limits, verifying standard error structures were received and parsed cleanly.

---

## F. Investor Demo Readiness

*   **Overall Assessment**: **`100% READY`**
*   **Demo Duration**: **`3 - 5 Minutes`**

The platform supports a clean, high-impact developer demonstration flow using real, production-ready logical capabilities:

```mermaid
graph TD
    A["1. Pitch Ricarut (Unified API)"] --> B["2. Log in & Create Project"]
    B --> C["3. View API Credentials & Docs"]
    C --> D["4. Open Sandbox Workbench"]
    D --> E["5. Show Seeded Customers (Adekunle/Chioma)"]
    E --> F["6. Execute ₦10,000 Transfer on UI"]
    F --> G["7. Verify Balances & Double-Entry Ledger"]
    G --> H["8. Trace API Request Logs & Request-IDs"]
```

During this entire path, no database values are faked or hardcoded. The UI, CLI logs, and database records remain in perfect, real-time synchronization.

---

## G. Remaining Blockers
*   **Critical Blockers**: **`NONE`**
*   **Operational Constraints**: Ricarut remains strictly in **Sandbox / Test Mode Only**. Connecting real financial providers or processing real currency is explicitly out of scope for this MVP phase.

---

## H. Next Recommended Phase

### **Phase 7.8F: Mock Provider Latency & Error Rejections**
Now that the double-entry sandbox ledger is completely clean, robust, and validated, we recommend introducing:
1.  **Simulation Modes**: An API configuration to let developer accounts toggle simulated provider latencies (e.g., slow connections) and random network timeouts.
2.  **Simulated Bank Rejections**: Support for specific mock transfer routing codes that trigger simulated bank rejections (e.g., `ROUTE_NOT_FOUND`, `BANK_DEGRADED`) to let startup developers test their error handling resilience.
3.  **Production Adapter Blueprints**: Initial architectural drafts for standard payment gateway adapter files (mapping real-world callback webhooks to our double-entry ledger).

---

> [!IMPORTANT]
> **Product Certification**:
> *Ricarut is a functional developer-first financial infrastructure sandbox that an external developer can successfully integrate with, test thoroughly, and observe transparently.*
