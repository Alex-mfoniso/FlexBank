# Ricarut Developer API Reference & Integration Guide

Welcome to the **Ricarut Developer API**. Ricarut is a unified financial infrastructure platform designed for developers building payment products, wallets, and disbursement pipelines across Africa.

---

## Architecture & Provider Abstraction

Ricarut provides a unified, vendor-agnostic abstraction layer. Developers integrate exclusively with Ricarut's normalized domain model.

```
┌─────────────────────────────────────────┐
│        Developer / Client App           │
│        (e.g., Frontend, Server)         │
└────────────────────┬────────────────────┘
                     │ Authenticated via RICARUT_API_KEY
                     │ (Headers: Authorization: Bearer rc_test_... or X-API-Key)
                     ▼
┌─────────────────────────────────────────┐
│               Ricarut API               │
│     - Versioned routes: /v1/*           │
│     - Normalized requests & responses   │
│     - Project-scoped tenant isolation   │
│     - Distributed idempotency engine    │
└────────────────────┬────────────────────┘
                     │ Internal Provider Abstraction
                     │ (FinancialProvider & TransferProvider Contracts)
                     ▼
┌─────────────────────────────────────────┐
│       Paystack Provider Adapter         │
│     (Uses internal PAYSTACK_SECRET_KEY) │
└────────────────────┬────────────────────┘
                     │ Upstream Financial Rails
                     ▼
┌─────────────────────────────────────────┐
│       Settlement Banks & Switches       │
│     (NIP, Central Bank of Nigeria)      │
└─────────────────────────────────────────┘
```

> [!IMPORTANT]
> **Key Security Rule**:
> - Developers only ever need and receive a **Ricarut API Key** (`rc_test_...` or `rc_live_...`).
> - Upstream provider credentials (`PAYSTACK_SECRET_KEY`) are managed strictly internally by Ricarut and are never exposed to clients, logs, or response payloads.
> - Client applications (such as web dashboards or mobile apps) must never call upstream providers directly for Ricarut operations.

---

## Environments & Base URLs

Ricarut operates distinct sandbox and production environments. In the sandbox environment, all operations run against test settlement rails; **no real money moves**.

| Environment | Base URL (Canonical) | Base URL (Prefixed Alias) | Credentials Prefix |
| :--- | :--- | :--- | :--- |
| **Hosted Sandbox** | `https://flexbank.onrender.com/v1` | `https://flexbank.onrender.com/api/v1` | `rc_test_...` |
| **Local Development** | `http://localhost:3000/v1` | `http://localhost:3000/api/v1` | `rc_test_...` |
| **Production** | Defined upon live provisioning | Defined upon live provisioning | `rc_live_...` |

> [!NOTE]
> Both `/v1/...` and `/api/v1/...` routes are identical and fully supported.

---

## Authentication

All developer API endpoints require an API key associated with your project.

### Obtaining an API Key

1. Create or log in to your developer account: `POST /v1/auth/login`.
2. Retrieve or create a project: `POST /v1/projects`.
3. Generate a project API key: `POST /v1/projects/:projectId/api-keys`.

### Passing the API Key

You can authenticate requests using either standard HTTP header format:

**Option A (Recommended — Bearer Authorization):**
```http
Authorization: Bearer rc_test_d40af613c299.8d1720d20d43f0535e5a254247501a5b
```

**Option B (Header Alias):**
```http
X-API-Key: rc_test_d40af613c299.8d1720d20d43f0535e5a254247501a5b
```

---

## Standard Response Envelope

All endpoints adhere to a predictable, consistent envelope format.

### Success Response (`200 OK`, `201 Created`)

```json
{
  "data": { ... },
  "requestId": "req_80e77232-54a4-483a-9098-9845c51d1317"
}
```

### Error Response (`4xx`, `5xx`)

```json
{
  "error": {
    "code": "INVALID_ACCOUNT",
    "message": "The destination bank account could not be resolved or is invalid",
    "requestId": "req_80e77232-54a4-483a-9098-9845c51d1317",
    "fields": [ ... ]
  }
}
```

Every response includes a `requestId` (`req_...`) for audit traceability.

---

## 1. Bank Account Resolution

Verifies bank account validity and resolves the registered account holder name before initiating a transfer.

### Endpoint

```http
GET /v1/accounts/resolve
```

### Query Parameters

| Parameter | Type | Required | Description |
| :--- | :--- | :--- | :--- |
| `bank_code` | `string` | **Yes** | 3-to-6 digit CBN bank code (e.g. `058` for GTBank, `044` for Access Bank, `011` for First Bank). Alias: `bankCode`. |
| `account_number` | `string` | **Yes** | 10-digit NUBAN account number. Alias: `accountNumber`. |

### Request Example (cURL)

```bash
curl -X GET "https://flexbank.onrender.com/v1/accounts/resolve?bank_code=058&account_number=0123456789" \
  -H "Authorization: Bearer rc_test_d40af613c299.8d1720d20d43f0535e5a254247501a5b"
```

### Request Example (JavaScript / Fetch)

```javascript
const response = await fetch("https://flexbank.onrender.com/v1/accounts/resolve?bank_code=058&account_number=0123456789", {
  headers: {
    "Authorization": "Bearer rc_test_d40af613c299.8d1720d20d43f0535e5a254247501a5b"
  }
});
const { data } = await response.json();
console.log(data.account_name); // "ALEXANDER TEST"
```

### Response Example (`200 OK`)

```json
{
  "data": {
    "account_number": "0123456789",
    "account_name": "ALEXANDER TEST",
    "bank_code": "058",
    "provider": "paystack"
  },
  "requestId": "req_74c01ab7-3749-42c4-b3e6-4f1057cfb5b8"
}
```

---

## 2. Initiate Outbound Transfer

Dispatches a funds disbursement to a destination bank account.

### Endpoint

```http
POST /v1/transfers
```

### Headers

| Header | Type | Required | Description |
| :--- | :--- | :--- | :--- |
| `Authorization` | `string` | **Yes** | `Bearer rc_test_...` or `X-API-Key: rc_test_...` |
| `Idempotency-Key` | `string` | Recommended | Unique string identifying this disbursement to ensure safe retries. |
| `Content-Type` | `string` | **Yes** | `application/json` |

### Request Body Parameters

| Field | Type | Required | Description |
| :--- | :--- | :--- | :--- |
| `amount` | `integer` | **Yes** | Amount in integer minor currency units (e.g. `500000` = ₦5,000.00). Must be $\ge 100$. Floats and decimals are rejected. |
| `currency` | `string` | **Yes** | 3-letter currency code: `"NGN"`. |
| `bank_code` | `string` | **Yes** | 3-to-6 digit CBN bank code (e.g. `058`). Alias: `bankCode`. |
| `account_number` | `string` | **Yes** | 10-digit NUBAN destination account number. Alias: `accountNumber`. |
| `reference` | `string` | **Yes** | Unique merchant transaction reference (e.g. `payout_order_9981`). |
| `reason` | `string` | No | Optional transfer narrative / description (max 255 chars). |
| `account_name` | `string` | No | Verified account holder name if already resolved. Alias: `accountName`. |

### Request Example (cURL)

```bash
curl -X POST "https://flexbank.onrender.com/v1/transfers" \
  -H "Authorization: Bearer rc_test_d40af613c299.8d1720d20d43f0535e5a254247501a5b" \
  -H "Content-Type: application/json" \
  -H "Idempotency-Key: idem_payout_order_9981" \
  -d '{
    "amount": 500000,
    "currency": "NGN",
    "bank_code": "058",
    "account_number": "0123456789",
    "reference": "payout_order_9981",
    "reason": "Payment for contractor invoice #1042"
  }'
```

### Request Example (TypeScript / Node.js)

```typescript
import axios from "axios";

const client = axios.create({
  baseURL: "https://flexbank.onrender.com/v1",
  headers: {
    "Authorization": `Bearer ${process.env.RICARUT_API_KEY}`,
    "Content-Type": "application/json"
  }
});

async function sendPayout() {
  const { data } = await client.post(
    "/transfers",
    {
      amount: 500000, // ₦5,000.00
      currency: "NGN",
      bank_code: "058",
      account_number: "0123456789",
      reference: `payout_${Date.now()}`,
      reason: "Contractor payment"
    },
    {
      headers: {
        "Idempotency-Key": `idem_${Date.now()}`
      }
    }
  );

  console.log("Transfer Initiated:", data.data.id, data.data.status);
}
```

### Response Example (`201 Created`)

```json
{
  "data": {
    "id": "txn_ric_9b2e04f1234567890123456789abcdef",
    "reference": "payout_order_9981",
    "amount": 500000,
    "currency": "NGN",
    "status": "processing",
    "destination": {
      "bank_code": "058",
      "account_number": "0123456789",
      "account_name": "ALEXANDER TEST"
    },
    "bank_code": "058",
    "account_number": "0123456789",
    "account_name": "ALEXANDER TEST",
    "reason": "Payment for contractor invoice #1042",
    "provider": "paystack",
    "environment": "test",
    "created_at": "2026-10-01T21:45:00.000Z",
    "updated_at": "2026-10-01T21:45:00.000Z"
  },
  "requestId": "req_cc708897-8739-46eb-b3ac-25cb73ac670b"
}
```

---

## 3. Retrieve Transfer by ID or Reference

Retrieves transfer details, current settlement status, and destination information.

### Endpoint

```http
GET /v1/transfers/:id
```

### Path Parameters

| Parameter | Type | Required | Description |
| :--- | :--- | :--- | :--- |
| `id` | `string` | **Yes** | Ricarut transfer ID (`txn_ric_...`) OR the developer `reference` used during initiation. |

### Request Example (cURL)

```bash
curl -X GET "https://flexbank.onrender.com/v1/transfers/txn_ric_9b2e04f1234567890123456789abcdef" \
  -H "Authorization: Bearer rc_test_d40af613c299.8d1720d20d43f0535e5a254247501a5b"
```

### Response Example (`200 OK`)

```json
{
  "data": {
    "id": "txn_ric_9b2e04f1234567890123456789abcdef",
    "reference": "payout_order_9981",
    "amount": 500000,
    "currency": "NGN",
    "status": "successful",
    "destination": {
      "bank_code": "058",
      "account_number": "0123456789",
      "account_name": "ALEXANDER TEST"
    },
    "bank_code": "058",
    "account_number": "0123456789",
    "account_name": "ALEXANDER TEST",
    "reason": "Payment for contractor invoice #1042",
    "provider": "paystack",
    "environment": "test",
    "created_at": "2026-10-01T21:45:00.000Z",
    "updated_at": "2026-10-01T21:46:12.000Z"
  },
  "requestId": "req_12662961-1128-4185-81e1-8d6240b2ae8a"
}
```

---

## 4. Synchronize Transfer Status

Forces a live reconciliation probe against the upstream banking rail to update the transfer record if webhooks were delayed.

### Endpoint

```http
GET /v1/transfers/:id/status
POST /v1/transfers/:id/verify
```

---

## Transfer Lifecycle & State Machine

Every outbound transfer transitions through a strictly validated, unidirectional state machine:

```
                  ┌─────────────┐
                  │   pending   │
                  └──────┬──────┘
                         │
                         ▼
                  ┌─────────────┐
                  │  processing │
                  └──────┬──────┘
                         │
            ┌────────────┴────────────┐
            ▼                         ▼
     ┌─────────────┐           ┌─────────────┐
     │  successful │ (Terminal)│   failed    │ (Terminal)
     └──────┬──────┘           └─────────────┘
            │
            ▼ (Banking reversal only)
     ┌─────────────┐
     │   reversed  │ (Terminal)
     └─────────────┘
```

### Status Descriptions

| Status | Terminal | Meaning |
| :--- | :---: | :--- |
| `pending` | No | Transfer accepted by Ricarut and queued for submission. |
| `processing` | No | Submitted to the settlement switch / destination bank; awaiting final clearance. |
| `successful` | Yes | Destination bank confirmed settlement into recipient account. |
| `failed` | Yes | Rejected by destination bank or switch (e.g., account closed, invalid NUBAN, limits exceeded). |
| `reversed` | Yes | Funds settled initially but subsequently returned by the destination bank switch. |

> [!NOTE]
> Once a transfer reaches a terminal state (`successful`, `failed`, or `reversed`), status regression is strictly blocked by Ricarut's state machine.

---

## Idempotency Engine

To prevent duplicate payouts caused by transient network timeouts or client retries, Ricarut implements strict header-based idempotency.

1. **Pass `Idempotency-Key`**: Provide a unique UUID or transaction reference in the `Idempotency-Key` header with every `POST /v1/transfers` request.
2. **Deterministic Replay**: If the same request is re-transmitted with the identical key:
   - Ricarut does **not** call the financial provider or initiate a second payment.
   - Ricarut immediately returns the existing transfer record with HTTP `200` or `201`.
3. **Collision / Payload Mismatch Detection**: If an identical `Idempotency-Key` is sent with different parameters (e.g., a different amount or different bank account), the request is rejected immediately with HTTP `400 IDEMPOTENCY_KEY_REUSED`.
4. **Tenant Isolation**: Idempotency keys are scoped strictly to the authenticated `projectId`. An idempotency key used in Project A never collides with Project B.

---

## Developer Error Codes

Ricarut normalizes all errors into predictable machine-readable error codes.

| HTTP Code | Error Code | Description | Developer Action |
| :--- | :--- | :--- | :--- |
| `401` | `UNAUTHORIZED` | API key is missing, malformed, expired, or revoked. | Check `Authorization: Bearer <KEY>` header and verify key in dashboard. |
| `403` | `FORBIDDEN` | The authenticated key does not have access to the requested project/resource. | Verify project membership and API key permissions. |
| `400` | `VALIDATION_ERROR` | Request body or query parameters failed schema validation. | Inspect `fields` in error payload to resolve invalid parameters. |
| `400` | `INVALID_ACCOUNT` | The destination bank account does not exist or bank code is invalid. | Verify `bank_code` and 10-digit NUBAN with customer. |
| `400` | `IDEMPOTENCY_KEY_REUSED`| The provided `Idempotency-Key` has already been used for a different payload. | Use a fresh, unique idempotency key for distinct transfers. |
| `409` | `CONFLICT_ERROR` | A transfer with this developer `reference` already exists. | Ensure unique merchant references per transfer. |
| `404` | `TRANSFER_NOT_FOUND` | Transfer ID or reference not found within the authenticated project. | Check the transfer ID or reference. Protects against cross-tenant IDOR. |
| `400` | `TRANSFER_FAILED` | Upstream provider or banking switch rejected the transfer initiation. | Review the error message for specific failure reasons. |
| `202` | `TRANSFER_PENDING` | Transfer is queued and pending provider acceptance. | Retry status check later or listen for webhook notifications. |
| `429` | `PROVIDER_RATE_LIMITED`| Upstream provider rate limits exceeded. | Implement exponential backoff before retrying. |
| `503` | `PROVIDER_UNAVAILABLE` | Financial rail or payment provider is temporarily unreachable. | Implement retry with backoff using same `Idempotency-Key`. |
| `504` | `PROVIDER_TIMEOUT` | Upstream provider request timed out. Transfer state is safely kept in `processing`. | Do **not** re-initiate with a new reference. Poll `GET /v1/transfers/:id` to check final outcome. |
| `500` | `INTERNAL_SERVER_ERROR`| Unhandled server error. | Contact Ricarut support with the `requestId`. |

---

## Frontend Contract & Integration Guidelines (Phase 6.5)

When integrating the frontend dashboard or client application:

1. **Credentials**:
   - The frontend application **only** needs the developer's `RICARUT_API_KEY` (or the user session JWT).
   - The frontend must **never** reference, request, or store `PAYSTACK_SECRET_KEY`.
2. **Endpoints**:
   - For beneficiary verification: `GET /v1/accounts/resolve?bank_code=...&account_number=...`
   - For payouts: `POST /v1/transfers`
   - For status / details: `GET /v1/transfers/:id`
3. **CORS**:
   - The Ricarut API supports standard CORS with credentials enabled for authorized origins (including `https://ricarut.vercel.app` and localhost).
