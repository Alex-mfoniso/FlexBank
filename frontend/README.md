# Ricarut Dashboard Frontend (Phase 6.5 Integration)

The Ricarut Dashboard is the developer and operations portal for the Ricarut Financial Infrastructure. In Phase 6.5, the frontend is directly connected to the live Ricarut backend, backed by the **Paystack TEST** mode financial rail via provider abstraction.

---

## 1. Core Architecture & Provider Isolation

The dashboard communicates **exclusively** with Ricarut's API endpoints. It never interacts with financial providers directly.

```
┌─────────────────────────────────┐
│        Ricarut Dashboard        │ (React 19 + TypeScript + Vite)
└────────────────┬────────────────┘
                 │ Authorization: Bearer <session_jwt>
                 │ x-project-id: <selected_project_id>
                 ▼
┌─────────────────────────────────┐
│         Ricarut API             │ (Express + Prisma Multi-tenant Engine)
└────────────────┬────────────────┘
                 │ Internal Provider Capability Interfaces
                 ▼
┌─────────────────────────────────┐
│       Provider Abstraction      │ (TransferProvider & AccountVerificationProvider)
└────────────────┬────────────────┘
                 │ Normalized HTTP Adapter
                 ▼
┌─────────────────────────────────┐
│       Paystack TEST Rail        │ (api.paystack.co TEST simulation)
└─────────────────────────────────┘
```

### Security & Invariant Guarantees
1. **Zero Secret Leakage**: `PAYSTACK_SECRET_KEY` and raw provider secrets are stored **strictly** on the backend server. The browser bundle contains **no** provider keys or raw payment tokens.
2. **Provider Normalization**: The UI surfaces all capabilities as native Ricarut features (`txn_ric_...`, `ref_trf_...`).
3. **Multi-Tenant Scoping**: All API requests pass the active project header `x-project-id`, and tenant isolation is enforced authoritatively on the backend.

---

## 2. Connected Endpoints

| Capability | Method | Endpoint | Description |
| :--- | :--- | :--- | :--- |
| **Account Resolution** | `GET` | `/api/v1/accounts/resolve?bank_code=...&account_number=...` | Verifies destination bank account and returns legal account name. |
| **Test Transfer Creation** | `POST` | `/api/v1/transfers` | Initiates transfer via Paystack TEST mode with `Idempotency-Key` header. |
| **Transfer Retrieval** | `GET` | `/api/v1/transfers/:id` | Returns normalized transfer record. |
| **Transfer Status Sync** | `GET` | `/api/v1/transfers/:id/status` | Reconciles transfer status directly with Paystack TEST rails. |
| **Transfer List** | `GET` | `/api/v1/transfers` | Lists all historical transfers for the active project. |
| **API Credentials** | `GET` / `POST` | `/api/v1/projects/:id/api-keys` | Displays project Ricarut developer API keys (`rk_test_...`). |
| **Developer Logs** | `GET` | `/api/v1/logs` | Displays inbound API requests, status codes, and execution latencies. |

---

## 3. Environment Variables Configuration

Create a `.env` file in `frontend/`:

```bash
# Target Ricarut Backend API URL
VITE_API_URL=http://localhost:3000
VITE_RICARUT_API_URL=https://flexbank.onrender.com

# Environment indicator (sandbox / live)
VITE_ENVIRONMENT=sandbox
```

> [!NOTE]
> `VITE_API_URL` defaults to `http://localhost:3000` during local development, falling back to `https://flexbank.onrender.com` in cloud deployments.

---

## 4. Running the Frontend Locally

```bash
# 1. Install dependencies
npm install

# 2. Start Vite development server
npm run dev

# 3. Build for production (TypeScript check + Vite bundle)
npm run build
```

---

## 5. Sandbox Test Instructions

### A. Testing Bank Account Resolution
1. Navigate to **Transfers** in the sidebar.
2. Click **Create Transfer**.
3. Under **Settlement Rail Type**, select **Nigerian Bank Payout**.
4. Select a bank (e.g., `Guaranty Trust Bank (GTBank) [058]` or `Test Bank [000]`).
5. Enter a 10-digit account number (e.g. `0123456789`).
6. The dashboard automatically triggers `/api/v1/accounts/resolve` or click **Verify**.
7. The verified account name will appear with a green verification badge (`✓ Account Verified: [ACCOUNT_NAME]`).
8. If an invalid bank code or invalid account number is provided, an inline error banner displays the normalized rejection reason.

### B. Creating a Real Test Transfer
1. Ensure the destination account is verified.
2. Enter the amount in NGN (e.g., `5000.00`).
3. Enter or customize the **Reference Key** (auto-populated by default).
4. Enter an optional **Narration / Reason**.
5. Click **Review Transfer →**.
6. The dashboard displays the confirmation overview, including the persistent `Idempotency Signature`.
7. Click **Authorize Transfer**. The submit button is disabled during submission to prevent duplicate clicks.
8. The drawer renders Step 3 with the outcome:
   - Green badge for `successful`
   - Amber badge for `pending` / `processing`
   - Red badge for `failed`
9. Click **Inspect Details** to navigate to `/projects/:projectId/transfers/:id`.

### C. Live Status Polling & Manual Synchronization
- **Automatic Polling**:
  - In both the **Transfers Table** and the **Transfer Details Page**, the client checks for non-terminal statuses (`pending` or `processing`).
  - Transfers in progress poll every 4–5 seconds until reaching a terminal state (`successful`, `failed`, or `reversed`).
  - Polling stops automatically once all transfers are terminal.
- **Manual Sync**:
  - Click **Sync** (in table) or **Refresh Status** (on details page) to trigger `/api/v1/transfers/:id/status`, which actively queries Paystack TEST rails and persists status updates.

---

## 6. Known Limitations & Scope Restrictions
- **Single Active Provider**: Only Paystack TEST mode is active in this phase (M-Pesa or alternative rails are excluded by Phase 6.5 scope).
- **Simulated Financial Movement**: All transactions in the sandbox operate under Paystack TEST simulation. No actual monetary funds move.
- **Stop Boundary**: All Phase 6.5 requirements are fully achieved. Further provider additions or production credentials are reserved for future phases.
