# Ricarut — Bank Account Resolution (Phase 3)

## Overview

Ricarut provides developer-first financial infrastructure across Africa. The **Bank Account Resolution** capability enables developers to verify bank account ownership and retrieve official account names before initiating payouts, onboarding beneficiaries, or completing KYC verification.

Ricarut completely abstracts upstream financial providers (e.g. Paystack). Developers authenticate with **Ricarut API keys** and receive normalized, vendor-agnostic responses. At no point do developers interact with, or receive metadata leaked from, upstream providers.

---

## Architectural Flow

```
   Developer Application
           │
           │ GET /api/v1/accounts/resolve?bank_code=058&account_number=0123456789
           │ Authorization: Bearer rc_test_...
           ▼
┌────────────────────────────────────────────────────────┐
│                      Ricarut API                       │
│  - API Key Verification & Rate Limiting                │
│  - Request Parameter Validation (Zod)                  │
└──────────────────────────┬─────────────────────────────┘
                           │
                           ▼
┌────────────────────────────────────────────────────────┐
│             AccountResolutionService                   │
│  - Decoupled Domain Service                            │
│  - Resolves AccountVerificationProvider Capability     │
└──────────────────────────┬─────────────────────────────┘
                           │
                           ▼
┌────────────────────────────────────────────────────────┐
│               FinancialProvider Registry               │
│  - Capability-Based Provider Routing                   │
│  - Default Financial Provider: Paystack                │
└──────────────────────────┬─────────────────────────────┘
                           │
                           ▼
┌────────────────────────────────────────────────────────┐
│                   PaystackAdapter                      │
│  - Implements AccountVerificationProvider Contract     │
│  - Internalizes Upstream Metadata & Sanitizes Errors   │
└──────────────────────────┬─────────────────────────────┘
                           │
                           ▼
┌────────────────────────────────────────────────────────┐
│                    PaystackClient                      │
│  - Secure HTTP Client (Timeout, Retries, Redaction)    │
│  - Paystack Bearer Auth (Internal to Ricarut)          │
└──────────────────────────┬─────────────────────────────┘
                           │
                           ▼
┌────────────────────────────────────────────────────────┐
│                 Upstream Paystack API                  │
│  - GET /bank/resolve                                   │
└────────────────────────────────────────────────────────┘
```

---

## API Specification

### Endpoint

```http
GET /api/v1/accounts/resolve
GET /v1/accounts/resolve
```

### Headers

| Header | Type | Required | Description |
| :--- | :--- | :--- | :--- |
| `Authorization` | `string` | **Yes** | Ricarut Bearer API key (`Bearer rc_test_...` or `rc_live_...`) or session JWT. |
| `X-API-Key` | `string` | Optional | Direct header alternative to Bearer authorization (`rc_test_...`). |
| `Content-Type` | `string` | No | `application/json` |

> **Security Note:** Never use upstream provider keys (e.g., Paystack secret keys) in requests to Ricarut. Authenticate strictly using your Ricarut developer API key.

### Query Parameters

| Parameter | Type | Required | Description |
| :--- | :--- | :--- | :--- |
| `bank_code` | `string` | **Yes** | 3-to-6 digit official bank code (e.g., `058` for GTBank, `044` for Access Bank, `001` for Paystack Test Bank). |
| `account_number` | `string` | **Yes** | 10-digit NUBAN account number. |

*(Note: CamelCase parameters `bankCode` and `accountNumber` are also supported as fallback aliases).*

---

## Example Request

### cURL

```bash
curl -X GET "https://flexbank.onrender.com/v1/accounts/resolve?bank_code=058&account_number=0123456789" \
  -H "Authorization: Bearer rc_test_abc123def456.78901234567890123456789012345678"
```

### JavaScript / TypeScript

```typescript
const response = await fetch(
  "https://flexbank.onrender.com/v1/accounts/resolve?bank_code=058&account_number=0123456789",
  {
    headers: {
      "Authorization": `Bearer ${process.env.RICARUT_API_KEY}`,
    },
  }
);

const { data } = await response.json();
console.log(`Account Name: ${data.account_name}`);
```

---

## Response Structure

### Success Response (`HTTP 200 OK`)

All successful account resolutions return a normalized Ricarut payload inside the standard `data` envelope:

```json
{
  "data": {
    "account_number": "0123456789",
    "account_name": "CHUKWUDI EZE",
    "bank_code": "058",
    "provider": "paystack"
  },
  "requestId": "req_80e77232-54a4-483a-9098-9845c51d1317"
}
```

#### Fields

| Field | Type | Description |
| :--- | :--- | :--- |
| `account_number` | `string` | The resolved 10-digit account number. |
| `account_name` | `string` | Official account holder name returned by the banking network. |
| `bank_code` | `string` | The bank code queried. |
| `provider` | `string` | The underlying financial rail that executed the resolution (e.g., `paystack`). |
| `requestId` | `string` | Unique Ricarut correlation ID for debugging and audit logs. |

---

## Error Handling & Scenarios

Errors are normalized into standard Ricarut error envelopes. Upstream provider details and secrets are strictly sanitized.

### 1. Missing or Invalid Parameters (`HTTP 400 Bad Request`)

```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Invalid account resolution query parameters",
    "fields": {
      "bank_code": {
        "_errors": ["bank_code is required"]
      }
    },
    "requestId": "req_330f3e03-01bc-4931-b810-2f685097e087"
  }
}
```

### 2. Account Not Found / Unknown Bank Code (`HTTP 400 Bad Request`)

```json
{
  "error": {
    "code": "INVALID_ACCOUNT",
    "message": "Could not resolve account name. Check parameters or try again.",
    "requestId": "req_9903e0d1-6183-4998-9794-3ec5e1351ece"
  }
}
```

### 3. Missing or Invalid Authentication (`HTTP 401 Unauthorized`)

```json
{
  "error": {
    "code": "UNAUTHORIZED",
    "message": "Invalid API key credentials",
    "requestId": "req_2bb9d52e-e954-4de6-bd8d-c0a62284ab59"
  }
}
```

### 4. Provider Rate Limited (`HTTP 429 Too Many Requests`)

```json
{
  "error": {
    "code": "PROVIDER_RATE_LIMITED",
    "message": "Rate limit exceeded for provider 'paystack'",
    "requestId": "req_d5babffe-bb90-4e36-844f-fa185383b254"
  }
}
```

### 5. Provider Network Unavailable (`HTTP 503 Service Unavailable`)

```json
{
  "error": {
    "code": "PAYMENT_PROVIDER_UNAVAILABLE",
    "message": "Upstream financial provider is temporarily unreachable",
    "requestId": "req_aea59919-5d78-4019-b911-0f8ca141d54c"
  }
}
```

### 6. Provider Timeout (`HTTP 504 Gateway Timeout`)

```json
{
  "error": {
    "code": "PROVIDER_TIMEOUT",
    "message": "Upstream financial provider timed out after 5000ms",
    "requestId": "req_a6e95598-1a4a-4f6a-9e54-a530317c6f88"
  }
}
```

---

## Supported Banking Rails & Sandbox Testing

- **Supported Rails:** Nigerian NUBAN (10 digits) with Central Bank of Nigeria (CBN) bank codes.
- **Paystack Sandbox Testing:**
  - In Paystack test mode, live bank resolution is limited to 3 queries per day.
  - To test unlimited account resolutions in sandbox mode, use Paystack's official test bank code:
    - **Bank Code:** `001`
    - **Account Numbers:** `0001234567`, `0123456789`, `0000000000`, `1234567890`
    - Returns: `TEST ACCOUNT <account_number>` with status `200 OK`.
