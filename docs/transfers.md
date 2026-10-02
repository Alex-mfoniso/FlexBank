# Ricarut — Outbound Transfers & Multi-Rail Payouts (Phases 4 & 7)

## Overview

Ricarut provides unified, developer-first financial infrastructure across Africa. The **Outbound Transfers** capability allows developers to initiate payouts and disbursements directly to both commercial bank accounts (Nigeria via Paystack) and mobile money wallets (Kenya via Safaricom M-Pesa B2C) through a single, consistent API.

Ricarut completely abstracts upstream financial rails. A developer simply specifies the destination (bank details or mobile phone number) and amount; Ricarut handles currency routing, beneficiary resolution, credential encryption, asynchronous dispatch, and lifecycle tracking under a normalized domain model.

---

## Architectural Flow

```text
   Developer Application
           │
           │ POST /v1/transfers
           │ Authorization: Bearer rc_test_...
           │ Idempotency-Key: idem_order_99182
           ▼
┌────────────────────────────────────────────────────────┐
│                      Ricarut API                       │
│  - Dual Auth: API Key (`rc_...`) or Session JWT        │
│  - Multi-Rail Request Validation (Zod Schema)          │
│  - Project-Scoped Idempotency Verification             │
└──────────────────────────┬─────────────────────────────┘
                           │
                           ▼
┌────────────────────────────────────────────────────────┐
│               RicarutTransferService                   │
│  - Decoupled Domain Service (Money Safety)             │
│  - Generates Normalized Ricarut IDs (`txn_ric_...`)   │
│  - Automatic Rail Routing (Paystack vs M-Pesa)        │
└──────────────────────────┬─────────────────────────────┘
                           │
                           ▼
┌────────────────────────────────────────────────────────┐
│               FinancialProvider Registry               │
│  - Provider abstraction & capability management        │
│  - Registered Providers: Paystack, Safaricom M-Pesa    │
└──────────────┬──────────────────────────┬──────────────┘
               │                          │
       Currency: NGN              Currency: KES
       Destination: Bank          Destination: Phone
               │                          │
               ▼                          ▼
┌─────────────────────────────┐ ┌─────────────────────────────┐
│       PaystackAdapter       │ │       MpesaB2CAdapter       │
│  - Bank recipient management│ │  - Phone normalization      │
│  - Paystack transfer dispatch│ │  - Daraja B2C payment       │
│  - Lifecycle normalization  │ │  - Asynchronous callbacks   │
└──────────────┬──────────────┘ └──────────────┬──────────────┘
               │                               │
               ▼                               ▼
┌─────────────────────────────┐ ┌─────────────────────────────┐
│       PaystackClient        │ │         MpesaClient         │
│  - Bearer token security    │ │  - OAuth token cache (3600s)│
│  - Connection pooling       │ │  - Daraja Sandbox endpoints │
└──────────────┬──────────────┘ └──────────────┬──────────────┘
               │                               │
               ▼                               ▼
┌─────────────────────────────┐ ┌─────────────────────────────┐
│      Paystack TEST API      │ │    Safaricom Daraja API     │
│       (Nigerian Banks)      │ │   (Kenyan M-Pesa Wallets)   │
└─────────────────────────────┘ └─────────────────────────────┘
```

---

## API Endpoints

Both canonical `/v1/...` and prefixed `/api/v1/...` paths are supported.

| Endpoint | Method | Description |
| :--- | :--- | :--- |
| `/v1/transfers` | `POST` | Initiate an outbound bank transfer |
| `/v1/transfers/:id` | `GET` | Retrieve transfer details and status by ID |
| `/api/v1/transfers` | `POST` | Canonical API prefix alias for initiating transfer |
| `/api/v1/transfers/:id`| `GET` | Canonical API prefix alias for retrieving transfer |

---

## Request Headers

| Header | Type | Required | Description |
| :--- | :--- | :--- | :--- |
| `Authorization` | `string` | **Yes** | Ricarut API Key (`Bearer rc_test_...` or `rc_live_...`) or JWT. |
| `X-API-Key` | `string` | Optional | Direct header alternative to Bearer authorization (`rc_test_...`). |
| `Idempotency-Key` | `string` | Recommended | Unique key to guarantee idempotency across network retries. Scoped per project. |
| `Content-Type` | `string` | **Yes** | `application/json` |

---

## 1. Initiate Outbound Transfer

### Endpoint

```http
POST /v1/transfers
```

### Request Parameters

| Field | Type | Required | Description |
| :--- | :--- | :--- | :--- |
| `amount` | `integer` | **Yes** | Amount in integer minor currency units (e.g., `500000` = ₦5,000.00). Must be a positive integer $\ge 100$. Floats and decimals are rejected. |
| `currency` | `string` | **Yes** | ISO 4217 3-letter currency code (e.g., `"NGN"`). |
| `bank_code` | `string` | **Yes** | 3-to-6 digit official bank code (e.g., `"058"` for GTBank, `"057"` for Zenith Bank). *(Alias: `bankCode`)* |
| `account_number` | `string` | **Yes** | 10-digit NUBAN account number. *(Alias: `accountNumber`)* |
| `account_name` | `string` | No | Verified destination account holder name. If omitted, Ricarut resolves it automatically. *(Alias: `accountName`)* |
| `reason` | `string` | No | Transfer description or narrative visible to recipient. Max 255 chars. |
| `reference` | `string` | No | Developer-supplied business reference (e.g. `order_1001`). If omitted, Ricarut generates a unique reference. |

### Example Request

```json
{
  "amount": 500000,
  "currency": "NGN",
  "bank_code": "058",
  "account_number": "0123456789",
  "account_name": "ALEXANDER TEST",
  "reason": "Supplier payout for invoice #8812",
  "reference": "payout_inv_8812"
}
```

### Example Response (`HTTP 201 Created`)

```json
{
  "data": {
    "id": "txn_ric_9b2e04f1234567890123456789abcdef",
    "reference": "payout_inv_8812",
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
    "reason": "Supplier payout for invoice #8812",
    "provider": "paystack",
    "environment": "test",
    "created_at": "2026-10-01T21:45:00.000Z",
    "updated_at": "2026-10-01T21:45:00.000Z"
  },
  "requestId": "req_80e77232-54a4-483a-9098-9845c51d1317"
}
```

---

## 2. Retrieve Transfer by ID

### Endpoint

```http
GET /v1/transfers/:id
```

### Path Parameters

| Parameter | Type | Required | Description |
| :--- | :--- | :--- | :--- |
| `id` | `string` | **Yes** | Ricarut transfer identifier (e.g., `txn_ric_9b2e04f1234567890123456789abcdef`). |

### Example Response (`HTTP 200 OK`)

```json
{
  "data": {
    "id": "txn_ric_9b2e04f1234567890123456789abcdef",
    "reference": "payout_inv_8812",
    "amount": 500000,
    "currency": "NGN",
    "status": "successful",
    "bank_code": "058",
    "account_number": "0123456789",
    "account_name": "ALEXANDER TEST",
    "reason": "Supplier payout for invoice #8812",
    "provider": "paystack",
    "provider_reference": "TRF_9981a2f102b34c56",
    "created_at": "2026-09-30T10:45:00.000Z",
    "updated_at": "2026-09-30T10:46:12.000Z"
  },
  "requestId": "req_df421190-71aa-4c22-b918-62be1194ac10"
}
```

---

## Transfer Lifecycle

Newly initiated transfers are never assumed to be instantly successful. Ricarut uses a standard 5-state lifecycle:

| Status | Description |
| :--- | :--- |
| `pending` | The transfer request has been queued internally or accepted for processing. |
| `processing` | The transfer has been dispatched to the banking rail and is undergoing settlement with the destination bank. |
| `successful` | The destination bank has confirmed settlement of funds into the recipient's account. |
| `failed` | The transfer was rejected by the provider or destination switch (e.g. invalid account, insufficient balance, closed account). |
| `reversed` | The transfer was initially accepted but subsequently reversed by the banking switch. |

---

## Idempotency Guarantees

Network calls between servers can fail or time out. Ricarut provides safe retry mechanics via the `Idempotency-Key` HTTP header:

1. **Multi-Tenant Scoping**: Idempotency keys are scoped strictly to the authenticated `projectId`. A key used by one project will never collide with another project.
2. **Identical Retries**: If a developer sends the exact same request with the same `Idempotency-Key`, Ricarut immediately returns the original transfer record without calling the payment provider a second time.
3. **Payload Mismatch Detection**: If an identical `Idempotency-Key` is re-sent with different parameters (e.g. different amount or account), Ricarut rejects the request with HTTP 400 `IDEMPOTENCY_KEY_REUSED` to prevent accidental double disbursements.

---

## Money Safety & Input Rules

1. **Integer Minor Units**: All amounts are strictly expressed in minor units (kobo for NGN). For example:
   - `₦50.00` = `5000`
   - `₦1,000.00` = `100000`
   - `₦5,000.00` = `500000`
   Decimal values (such as `5000.50`) are rejected at schema validation to eliminate floating-point precision truncation.
2. **Account Number Masking**: Account numbers in application logs and trace contexts are automatically masked (`******6789`).
3. **Credential Redaction**: Authorization headers, Bearer tokens, and Paystack secret keys are automatically scrubbed from all logs, error stacks, and audit trails.
4. **Provider Recipient Encapsulation**: Upstream Paystack recipient codes (`RCP_...`) are strictly managed within the adapter and are never returned to the developer or exposed in error responses.

---

## Error Handling & Normalization

All provider errors are normalized to standard Ricarut error responses:

```json
{
  "error": {
    "code": "TRANSFER_FAILED",
    "message": "Transfer rejected by upstream banking rail",
    "details": {}
  },
  "requestId": "req_8819a-9921b"
}
```

### Error Normalization Table

| Upstream / System Condition | HTTP Status | Ricarut Error Code | Description |
| :--- | :--- | :--- | :--- |
| Missing or malformed parameters | `400` | `VALIDATION_ERROR` | Amount is not positive integer, bank code invalid, etc. |
| Idempotency payload mismatch | `400` | `IDEMPOTENCY_KEY_REUSED` | Same key re-sent with different parameters |
| Upstream payout disabled / rejected | `400` | `TRANSFER_FAILED` | Account restricted, third-party payout disabled |
| Insufficient balance with provider | `400` | `TRANSFER_FAILED` | Insufficient balance on provider float account |
| Missing or invalid API key | `401` | `UNAUTHORIZED` | Invalid or revoked Ricarut API key |
| Transfer ID does not exist | `404` | `TRANSFER_NOT_FOUND` | Transfer ID not found within project scope |
| Upstream rate limit reached | `429` | `PROVIDER_RATE_LIMITED` | Provider throttling requests |
| Upstream provider network down | `503` | `PAYMENT_PROVIDER_UNAVAILABLE` | Connection refused or network timeout |
| Upstream request timed out | `504` | `PROVIDER_TIMEOUT` | Provider took too long to answer; transfer state set to `processing` |
| Invalid upstream credentials | `500` | `PROVIDER_AUTHENTICATION_FAILED` | Upstream provider secret key rejected |

---

## Code Examples

### cURL

```bash
curl -X POST "https://api.ricarut.com/v1/transfers" \
  -H "Authorization: Bearer rc_test_7f81a29c1234.90123456789012345678901234567890" \
  -H "Idempotency-Key: payout_order_99120" \
  -H "Content-Type: application/json" \
  -d '{
    "amount": 250000,
    "currency": "NGN",
    "bank_code": "058",
    "account_number": "0123456789",
    "reason": "Referral bonus disbursement",
    "reference": "bonus_user_441"
  }'
```

### TypeScript (Node.js)

```typescript
import axios from "axios";

async function sendPayout() {
  const apiKey = process.env.RICARUT_SECRET_KEY!; // rc_test_...

  try {
    const response = await axios.post(
      "https://api.ricarut.com/v1/transfers",
      {
        amount: 250000, // ₦2,500.00
        currency: "NGN",
        bank_code: "058",
        account_number: "0123456789",
        reason: "Referral bonus disbursement",
        reference: "bonus_user_441",
      },
      {
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Idempotency-Key": "payout_order_99120",
          "Content-Type": "application/json",
        },
      }
    );

    console.log("Transfer Initiated:", response.data.data.id);
    console.log("Status:", response.data.data.status); // "processing"
  } catch (error: any) {
    if (error.response) {
      console.error("Ricarut Error:", error.response.data.error.code, error.response.data.error.message);
    } else {
      console.error("Network Error:", error.message);
    }
  }
}
```
