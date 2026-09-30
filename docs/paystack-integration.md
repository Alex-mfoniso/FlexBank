# Ricarut — Paystack Financial Provider Integration (Phase 1)

## Overview

Ricarut is a developer-first financial infrastructure platform for Africa. This document details the Phase 1 implementation connecting the Ricarut backend securely to the Paystack TEST API and establishing the architectural provider boundary for future financial capabilities.

---

## Architecture & Provider Boundary

Ricarut adopts a decoupled provider abstraction layer. Paystack is treated strictly as an upstream financial provider, not as Ricarut's public identity or contract.

```
                  ┌─────────────────────────────────────────┐
                  │          Ricarut Public REST API        │
                  │   (/api/v1/accounts, /health, etc.)     │
                  └────────────────────┬────────────────────┘
                                       │
                                       ▼
                  ┌─────────────────────────────────────────┐
                  │        Provider Management Service      │
                  │   (src/modules/providers/provider.service)│
                  └────────────────────┬────────────────────┘
                                       │
                                       ▼
                  ┌─────────────────────────────────────────┐
                  │        FinancialProvider Interface      │
                  │  (src/modules/providers/financial-      │
                  │               provider.interface.ts)    │
                  └────────────────────┬────────────────────┘
                                       │
                    ┌──────────────────┴──────────────────┐
                    ▼                                     ▼
        ┌───────────────────────┐             ┌───────────────────────┐
        │    PaystackAdapter    │             │   [Future Providers]  │
        │  (src/modules/        │             │  (Flutterwave, Mono,  │
        │   providers/paystack/ │             │   Stitch, etc.)       │
        │   paystack.adapter)   │             └───────────────────────┘
        └───────────┬───────────┘
                    │
                    ▼
        ┌───────────────────────┐
        │    PaystackClient     │  HTTPS + Bearer Auth + Redaction
        │  (src/modules/        │  10s Timeout + AbortSignal
        │   providers/paystack/ │  JSON serialization & error handling
        │   paystack.client)    │
        └───────────┬───────────┘
                    │
                    ▼
        ┌───────────────────────┐
        │   Paystack TEST API   │
        │ (https://api.paystack.co)
        └───────────────────────┘
```

---

## Configuration & Environment Variables

Paystack credentials reside exclusively in the server/local environment (`.env`). They are validated at startup and access via `src/config/paystack.config.ts`.

### Required Variables

| Variable | Description | Example / Default |
| :--- | :--- | :--- |
| `PAYSTACK_SECRET_KEY` | Server-side secret key for authenticating API requests. Must remain confidential. | `sk_test_...` |
| `PAYSTACK_PUBLIC_KEY` | Public key for client-side or reference flows. | `pk_test_...` |
| `PAYSTACK_BASE_URL` | Base API endpoint for Paystack. Enforces HTTPS. | `https://api.paystack.co` |

### `.env.example` Template

```env
# Financial Provider - Paystack Configuration (Phase 1)
PAYSTACK_SECRET_KEY=
PAYSTACK_PUBLIC_KEY=
PAYSTACK_BASE_URL=https://api.paystack.co
```

---

## Security Invariants & Redaction Rules

1. **Environment Isolation**: The Paystack secret key exists ONLY in server environment variables (`.env`). It is never hardcoded, never committed to git, and never passed to frontend code.
2. **Zero Response Exposure**: No API response or health check output ever includes the secret key, public key, or raw upstream credential tokens.
3. **Pino Logger Redaction**: Pino log engine is configured to redact:
   - `PAYSTACK_SECRET_KEY`
   - `secretKey`
   - `paystackSecretKey`
   - `authorization` / `Authorization`
   - `headers.authorization` / `headers.Authorization`
4. **Error Sanitization**: `sanitizeProviderText` scrubs any string matching `sk_(test|live)_[a-zA-Z0-9]+`, `pk_(test|live)_[a-zA-Z0-9]+`, or `Bearer <token>` before returning error messages or logging exceptions.
5. **HTTPS Enforcement**: In `production` and `development`, `getPaystackConfig()` rejects non-HTTPS endpoints to prevent cleartext credential transmission over transit networks.

---

## Provider Health & Diagnostic Endpoints

Provider connectivity is integrated into Ricarut's existing health-check routing system (`src/routes/health.routes.ts`).

### 1. Check Specific Provider (`GET /health/providers/paystack`)

Mounted at:
- `http://localhost:4000/health/providers/paystack`
- `http://localhost:4000/api/v1/health/providers/paystack`

**Success Response (HTTP 200)**:
```json
{
  "provider": "paystack",
  "connected": true
}
```

**Failure Response (HTTP 503)**:
```json
{
  "provider": "paystack",
  "connected": false,
  "error": "Unable to reach Paystack API: Connection refused"
}
```

### 2. Check All Registered Providers (`GET /health/providers`)

Mounted at:
- `http://localhost:4000/health/providers`
- `http://localhost:4000/api/v1/health/providers`

**Success Response (HTTP 200)**:
```json
{
  "status": "ok",
  "providers": [
    {
      "provider": "paystack",
      "connected": true
    }
  ]
}
```

---

## Running Verification & Automated Tests

### 1. Run Automated Unit & Integration Tests (Mocked)
```bash
npm test
# Or specifically for Paystack:
npx vitest run tests/paystack.test.ts
```

### 2. Run Direct Live Paystack Diagnostic Script (Live Test Credentials)
```bash
npx tsx scratch/verify_paystack.ts
```

Output:
```
====================================================
🔍 Ricarut Paystack Provider Verification (Phase 1)
====================================================
[Config] Base URL:     https://api.paystack.co
[Config] Secret Key:   sk_test...19a4
[Config] Public Key:   pk_test_334f76f2e2b104123e66320753b83df130115db8
[Config] Timeout:      10000ms

[Test 1] Testing PaystackClient direct connectivity...
Result: {
  "provider": "paystack",
  "connected": true,
  "latencyMs": 767
}

[Test 2] Testing ProviderService boundary resolution...
Result: {
  "provider": "paystack",
  "connected": true,
  "latencyMs": 251
}

[Test 3] Testing ProviderService.verifyAllProviders()...
All Providers: [
  {
    "provider": "paystack",
    "connected": true,
    "latencyMs": 222
  }
]

✅ All Paystack Phase 1 Connectivity Checks PASSED!
```

---

## Scope Boundaries & Deferred Features

In accordance with Phase 1 instructions:

| Feature | Status | Implemented Phase |
| :--- | :--- | :--- |
| **Secure Paystack Connectivity** | ✅ Completed | Phase 1 |
| **Pino & Error Redaction** | ✅ Completed | Phase 1 |
| **Provider Capability Abstraction & Registry** | ✅ Completed | Phase 2 |
| **Paystack Adapter Implementation** | ✅ Completed | Phase 2 |
| **Normalized Financial Provider Error Hierarchy** | ✅ Completed | Phase 2 |
| **HMAC-SHA512 Webhook Verification Contract** | ✅ Completed | Phase 2 |
| **Transfers & Payouts (`/v1/transfers`)** | ✅ Completed | Phase 4 |
| **Webhook Ingestion & Status Synchronization** | ✅ Completed | Phase 5 |
| **Multi-Provider Routing & Failover** | ⏸️ Deferred | Phase 6+ |
| **Production / Live Money Movement** | ⏸️ Deferred | Phase 6+ |
