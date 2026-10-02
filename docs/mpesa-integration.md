# Ricarut — Safaricom M-Pesa B2C Provider Integration (Phase 7)

## Overview

Ricarut provides unified, developer-first financial infrastructure across Africa. Phase 7 implements the second major financial rail: **Safaricom M-Pesa B2C through Daraja (SANDBOX/TEST ONLY)**.

With this implementation, Ricarut proves its capability to abstract fundamentally different financial rails—commercial bank transfers in Nigeria and mobile money disbursements in Kenya—behind one consistent, developer-friendly API.

---

## Multi-Rail Architecture

```text
                      Developer Application
                                │
                                │ POST /v1/transfers
                                │ Authorization: Bearer rc_test_...
                                │ Idempotency-Key: payout_ke_98124
                                ▼
              ┌───────────────────────────────────┐
              │            Ricarut API            │
              │  - Schema Validation (Zod)        │
              │  - Idempotency Guarantee          │
              │  - Tenant & Key Isolation         │
              └─────────────────┬─────────────────┘
                                │
                                ▼
              ┌───────────────────────────────────┐
              │      Provider Abstraction         │
              │  (TransferProvider Contract)      │
              │  - Dynamic Rail Detection         │
              │  - Lifecycle Normalization        │
              └────────┬─────────────────┬────────┘
                       │                 │
             Currency: NGN     Currency: KES
             Destination: Bank Destination: Phone
                       │                 │
                       ▼                 ▼
             ┌─────────────────┐ ┌─────────────────┐
             │ PaystackAdapter │ │ MpesaB2CAdapter │
             └────────┬────────┘ └────────┬────────┘
                      │                   │
                      ▼                   ▼
             ┌─────────────────┐ ┌─────────────────┐
             │ PaystackClient  │ │   MpesaClient   │
             │ (Bearer Auth)   │ │  (OAuth 2.0)    │
             └────────┬────────┘ └────────┬────────┘
                      │                   │
                      ▼                   ▼
             ┌─────────────────┐ ┌─────────────────┐
             │  Paystack TEST  │ │  Daraja Sandbox │
             │  API (Nigeria)  │ │   API (Kenya)   │
             └─────────────────┘ └─────────────────┘
```

---

## Core Principles & Guarantees

1. **No Vendor Leaks**:
   Developers never see Daraja concepts such as `PartyA`, `PartyB`, `CommandID`, `SecurityCredential`, `ConversationID`, or `OriginatorConversationID`.
2. **Normalized Request Schema**:
   Disbursements to Kenyan mobile numbers use standard Ricarut transfer structures with `currency: "KES"` and `phone_number`.
3. **Automatic Phone Normalization**:
   Accepts standard Kenyan phone formats (`0712345678`, `0112345678`, `254712345678`, `+254712345678`) and normalizes internally to Safaricom's required `2547XXXXXXXX` format.
4. **Idempotency & Double-Disbursement Protection**:
   Ricarut's transfer reference is strictly mapped to Daraja's `OriginatorConversationID`. Re-submitting with the same idempotency key returns the cached transfer rather than creating duplicate payouts.
5. **Asynchronous Lifecycle Normalization**:
   Daraja B2C initiation returns an acknowledgement receipt (`ResponseCode: "0"`). Ricarut transitions the transfer to `pending` / `processing`. When Safaricom dispatches the result to the Ricarut webhook endpoint (`/v1/webhooks/mpesa/b2c`), the status is settled to `successful` or `failed`.
6. **Strict Sandbox Containment**:
   All Daraja endpoints are locked to `https://sandbox.safaricom.co.ke`. Production URLs and real-money credentials are explicitly rejected by configuration guards.

---

## Server Configuration

The M-Pesa client configuration resides strictly server-side in `.env` and is validated via `src/config/mpesa.config.ts`:

```env
MPESA_ENV=sandbox
MPESA_BASE_URL=https://sandbox.safaricom.co.ke
MPESA_CONSUMER_KEY=your_sandbox_consumer_key
MPESA_CONSUMER_SECRET=your_sandbox_consumer_secret
MPESA_INITIATOR_NAME=testapi
MPESA_INITIATOR_PASSWORD=your_initiator_password
MPESA_SECURITY_CREDENTIAL="your_encrypted_security_credential"
MPESA_SHORTCODE=600988
MPESA_RESULT_URL=https://api.ricarut.com/v1/webhooks/mpesa/b2c
MPESA_QUEUE_TIMEOUT_URL=https://api.ricarut.com/v1/webhooks/mpesa/b2c/timeout
```

> [!CAUTION]
> Secrets such as `MPESA_CONSUMER_SECRET`, `MPESA_INITIATOR_PASSWORD`, and `MPESA_SECURITY_CREDENTIAL` are never logged, never returned over HTTP, and never committed to version control.

---

## API Usage Examples

### 1. Initiating an M-Pesa B2C Payout (cURL)

```bash
curl -X POST "https://api.ricarut.com/v1/transfers" \
  -H "Authorization: Bearer rc_test_7f81a29c1234.90123456789012345678901234567890" \
  -H "Idempotency-Key: payout_ke_20261002" \
  -H "Content-Type: application/json" \
  -d '{
    "amount": 100000,
    "currency": "KES",
    "destination": {
      "type": "mobile_money",
      "country": "KE",
      "provider": "mpesa",
      "phone_number": "0712345678",
      "account_name": "Jane Wanjiku"
    },
    "reason": "Merchant settlement payout",
    "reference": "payout_ke_ref_001"
  }'
```

#### Normalized Response (`201 Created`):

```json
{
  "data": {
    "id": "txn_ric_4a8ef0d7099a4e8fa534b9b53d1af644",
    "reference": "payout_ke_ref_001",
    "amount": 100000,
    "currency": "KES",
    "status": "pending",
    "destination": {
      "type": "mobile_money",
      "country": "KE",
      "provider": "mpesa",
      "phone_number": "254712345678",
      "account_name": "Jane Wanjiku"
    },
    "reason": "Merchant settlement payout",
    "provider": "mpesa",
    "environment": "test",
    "created_at": "2026-10-02T09:00:00.000Z",
    "updated_at": "2026-10-02T09:00:00.000Z"
  }
}
```

---

### 2. Node.js / TypeScript Example

```typescript
import axios from "axios";

async function sendMpesaPayout() {
  const apiKey = process.env.RICARUT_SECRET_KEY!; // rc_test_...

  const response = await axios.post(
    "https://api.ricarut.com/v1/transfers",
    {
      amount: 150000, // KSh 1,500.00 (in minor units: 150000 cents)
      currency: "KES",
      phone_number: "254712345678",
      reason: "Freelancer compensation",
      reference: "disb_ke_88291",
    },
    {
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Idempotency-Key": "disb_ke_idem_88291",
        "Content-Type": "application/json",
      },
    }
  );

  console.log("Ricarut Transfer ID:", response.data.data.id);
  console.log("Status:", response.data.data.status); // "pending"
  console.log("Rail:", response.data.data.provider); // "mpesa"
}
```

---

## Webhook Synchronization

Safaricom posts completion results asynchronously to `/v1/webhooks/mpesa/b2c`.

### Success Callback:
```json
{
  "Result": {
    "ResultType": 0,
    "ResultCode": 0,
    "ResultDesc": "The service request is processed successfully.",
    "OriginatorConversationID": "payout_ke_ref_001",
    "ConversationID": "AG_20261002_000001",
    "TransactionID": "QK12345678",
    "ResultParameters": {
      "ResultParameter": [
        { "Key": "TransactionAmount", "Value": 1000 },
        { "Key": "TransactionReceipt", "Value": "QK12345678" },
        { "Key": "ReceiverPartyPublicName", "Value": "254712345678 - Jane Wanjiku" }
      ]
    }
  }
}
```

Upon receiving this callback, Ricarut:
1. Validates the webhook structure.
2. Identifies the transfer via `OriginatorConversationID`.
3. Settles the transfer status to `successful`.
4. Emits downstream webhook events to developer-configured webhooks.
