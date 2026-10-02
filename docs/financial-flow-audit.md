# Ricarut — Complete Financial Flow & Resilience Audit (Phase 8)

## 1. Executive Summary

This document traces the complete end-to-end lifecycle of financial transfers within Ricarut, mapping every transition from client request to final settlement. It details all potential failure modes, network timeouts, duplicate deliveries, database boundaries, and recovery mechanisms across both supported rails:
* **Nigerian Commercial Banks** via Paystack
* **Kenyan Mobile Money Wallets** via Safaricom M-Pesa B2C

---

## 2. End-to-End Transfer Lifecycle Trace

```text
[1] Client Request
       │  POST /v1/transfers
       │  Headers: Authorization, Idempotency-Key
       ▼
[2] Authentication & Security Boundary
       │  Validates API Key (HMAC-SHA256), Expiry, Scoping
       │  Attaches Project Context (req.projectId)
       ▼
[3] Request Validation (Zod)
       │  Validates Amount (positive integer minor units)
       │  Validates Currency (NGN | KES) & Destination Details
       ▼
[4] Idempotency Verification
       │  Checks prisma.idempotencyRecord (projectId + key)
       │  Verifies SHA-256 payload hash matching
       ▼
[5] Database Pre-Persist
       │  Verifies developer reference uniqueness
       │  Generates Ricarut Transfer ID (txn_ric_...)
       │  Persists Transfer record with status: "pending"
       ▼
[6] Centralized Provider Routing
       │  Routing Engine resolves provider capability:
       │  - NGN + bank_account → PaystackAdapter
       │  - KES + mobile_money → MpesaB2CAdapter
       ▼
[7] Provider Request Execution
       │  Paystack: Token reuse + Transfer initiation
       │  M-Pesa: OAuth 2.0 token + B2C payment request
       ▼
[8] Provider Acknowledgement & DB State Capture
       │  Captures Provider Reference (transfer_code / ConversationID)
       │  Updates Transfer status: "pending" / "processing"
       │  Marks IdempotencyRecord: "completed" with response cache
       ▼
[9] Upstream Asynchronous Processing
       │  Interbank clearing (NIBSS) or Safaricom M-Pesa core engine
       ▼
[10] Webhook Receipt & Deduplication
       │  POST /v1/webhooks/{provider}
       │  Cryptographic signature verification
       │  Records event in ProviderEvent store (dedupe)
       ▼
[11] State Machine Enforcement
       │  Validates allowed transition (e.g. processing → successful)
       │  Terminal state protection (blocks successful → pending)
       │  Atomic database update
       ▼
[12] Reconciliation (Safety Net)
       │  Scheduled / on-demand query for orphaned or delayed transfers
       │  Paystack: GET /transfer/verify/:reference
       │  M-Pesa: POST /mpesa/transactionstatus/v1/query
       │  Audit logged in ReconciliationRecord
       ▼
[13] Terminal State & Developer Notification
       │  Transfer reaches terminal state (successful | failed | reversed)
       │  Dispatches downstream webhook event to developer endpoint
```

---

## 3. Failure Mode Matrix & Resilience Strategies

| Lifecycle Stage | Potential Failure / Risk | Current Behavior | Phase 8 Hardening Mechanism |
| :--- | :--- | :--- | :--- |
| **API Request** | Client sends > 1MB payload or invalid JSON | Rejected by Express middleware (`413` / `400`) | Standardized error envelope (`INVALID_REQUEST_BODY`) |
| **Authentication** | Revoked key, expired key, or cross-tenant key access | `401 Unauthorized` / `403 Forbidden` | Constant-time HMAC comparison, explicit project isolation |
| **Validation** | Unsupported currency or malformed account/phone number | Zod schema rejection (`400 Bad Request`) | Multi-rail schema rejection with actionable field paths |
| **Idempotency** | Concurrent identical requests submitted in parallel | Second request catches `pending` idempotency record | Returns `409 Conflict` (`OPERATION_IN_PROGRESS`) |
| **Idempotency** | Same key reused with altered payload (e.g., modified amount) | Hash mismatch detected against stored `requestHash` | Returns `400 Bad Request` (`IDEMPOTENCY_KEY_REUSED`) |
| **Idempotency** | Request sent $\to$ Provider executes $\to$ Client network drops $\to$ Client retries | Key lookup finds `completed` record with cached response | Returns cached transfer response; zero duplicate financial transactions |
| **Database Failure** | Database goes down during transfer pre-persist | Express throws error before provider call | Transfer never dispatched upstream; client receives `500` and can safely retry |
| **Provider Timeout** | Upstream provider takes > 10s or network drops | Catch block sets transfer status to `processing` | Transfer retained in `processing`; never marked `failed` blindly; resolved via webhook or reconciliation |
| **Provider 4xx/5xx** | Upstream provider returns authentication failure or account blocked | Error caught; normalized into Ricarut error | Mapped to `PROVIDER_UNAVAILABLE` or `PROVIDER_REJECTED`; never exposes raw provider stack trace |
| **Webhook Delivery** | Provider delivers identical webhook multiple times | Looked up in `ProviderEvent` / `WebhookEvent` table | Duplicate recognized immediately; returns HTTP 200 with `{ status: "ignored" }` |
| **Webhook Delayed** | Webhook is delayed by hours due to provider backlog | Transfer remains in `processing` indefinitely | Background Reconciliation Engine queries provider status and resolves transfer |
| **Webhook Out of Order** | `reversed` arrives before `successful` or concurrent callbacks | State machine checks `isValidTransferTransition` | Prevents illegal transition; rejects regressions from terminal states |
| **Database Failure** | Database fails during webhook processing | Webhook endpoint returns `500` | Provider will retry webhook delivery according to its exponential backoff policy |
| **Server Crash** | Node.js process crashes during transfer execution | Idempotency record is persisted in Postgres, not in memory | Persisted records survive process restarts; state remains consistent |

---

## 4. Terminal State Protection Rules

The state machine enforces these strict transition invariants:

1. **Terminal Immutability**:
   * `successful` $\to$ may **only** transition to `reversed`. It can **never** transition to `pending`, `processing`, or `failed`.
   * `failed` $\to$ terminal state. No transitions allowed.
   * `reversed` $\to$ terminal state. No transitions allowed.
   * `cancelled` $\to$ terminal state. No transitions allowed.
2. **Safe Pre-Settlement Transitions**:
   * `created` $\to$ `pending`, `processing`, `failed`, `cancelled`.
   * `pending` $\to$ `processing`, `successful`, `failed`, `cancelled`.
   * `processing` $\to$ `successful`, `failed`, `reversed`.
3. **Identity Transitions**:
   * Any state $\to$ itself is treated as an idempotent no-op (`200 OK`).

---

## 5. Audit Conclusions

Ricarut's architecture has established strong foundations (idempotency hashing, normalized IDs, provider contracts). Phase 8 addresses the remaining reliability requirements:
1. **Centralized Transaction State Machine Service**: Encapsulating all status updates inside transactional boundaries.
2. **Centralized Provider Routing Engine**: Decoupling routing logic from controllers.
3. **Explicit Provider Capability Matrix**: Explicitly checking capability flags before dispatching.
4. **Reconciliation Engine & Persistence**: Automatically querying upstream providers for stuck transactions and logging audit records.
5. **Webhook Event Store**: Dedicated table tracking all incoming provider payloads.
6. **API Rate Limiting**: Protecting auth and transfer endpoints without throttling webhooks.
