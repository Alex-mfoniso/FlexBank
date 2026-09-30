# Ricarut Backend MVP (Phase 1)

Welcome to the **Ricarut Backend MVP**. Ricarut is a developer-first fintech infrastructure platform providing unified APIs for financial capabilities.

This repository implements **Phase 1: Foundation**, establishing a production-oriented modular backend, database migration pipelines, structured request logging, and robust lifecycle hooks.

---

## Requirements

To run this application locally, you will need:

- **Node.js**: `v20.x` (LTS) or higher
- **Docker & Docker Compose**: For spinning up local infrastructure
- **PostgreSQL**: Version 16 (provided via Docker Compose)
- **Redis**: Version 7 (provided via Docker Compose)

---

## Getting Started

### 1. Clone & Install Dependencies

Install all npm packages specified in the configuration:

```bash
npm install
```

### 2. Configure Environment Variables

Copy the template variables file to create your active local configuration:

```bash
cp .env.example .env
```

The default values are fully optimized for the local Docker compose services:

- `PORT=4000`
- `DATABASE_URL=postgresql://postgres:postgres@localhost:5432/ricarut`
- `REDIS_URL=redis://localhost:6379`
- `LOG_LEVEL=info`
- `CORS_ORIGIN=http://localhost:3000`

---

## Infrastructure Setup

### 1. Launch PostgreSQL & Redis Containers

Spin up the local containerized services in detached mode:

```bash
docker compose up -d
```

You can verify container status using:

```bash
docker compose ps
```

### 2. Run Database Migrations

Synchronize your local PostgreSQL schema with the Prisma definition and generate the Prisma Client:

```bash
npm run db:migrate
```

---

## Development Workflow

To start the API in hot-reload development mode:

```bash
npm run dev
```

The server will boot, validate environment variables, connect to Postgres and Redis, and listen on port `4000`.

---

## Code Quality & Verification

To compile the codebase and run comprehensive type and lint checks:

- **TypeScript compile check**: `npm run typecheck`
- **Lint style check**: `npm run lint`
- **Code style formatter**: `npm run format`
- **Formatting verify**: `npm run format:check`

### Running Tests

Execute the automated integration/unit test suite using Vitest:

```bash
npm run test
```

---

## Health Checks

The server exposes standard, lightweight endpoints for health tracking and Kubernetes probes:

### 1. Liveness Probe (`GET /health` / `GET /api/v1/health`)

Verifies that the Node process is active and responding.

- **Response**: `200 OK`

```json
{
  "status": "ok",
  "service": "ricarut-api",
  "version": "0.1.0"
}
```

### 2. Readiness Probe (`GET /health/ready` / `GET /api/v1/health/ready`)

Runs actual ping queries to verify PostgreSQL and Redis connectivity before signaling readiness.

- **Healthy Response**: `200 OK`

```json
{
  "status": "ready",
  "checks": {
    "database": "ok",
    "redis": "ok"
  }
}
```

- **Degraded Response**: `503 Service Unavailable` if any core service is down.

### 3. Provider Diagnostic Probe (`GET /health/providers/paystack` / `GET /api/v1/health/providers/paystack`)

Verifies live connectivity to registered upstream financial providers (e.g. Paystack) using authenticated ping probes.

- **Healthy Response**: `200 OK`

```json
{
  "provider": "paystack",
  "connected": true
}
```

- **Diagnostic Failure**: `503 Service Unavailable` (no credentials leaked).

---

## Financial Capabilities

### Bank Account Resolution (`GET /api/v1/accounts/resolve` / `GET /v1/accounts/resolve`)

Resolves and validates official bank account ownership before creating transfer recipients or initiating payouts.

- **Authentication**: `Authorization: Bearer <RICARUT_API_KEY>`
- **Query Parameters**: `bank_code` (e.g. `058`), `account_number` (10-digit NUBAN)
- **Response**:
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
For complete documentation, see [`docs/account-resolution.md`](docs/account-resolution.md).

### Outbound Bank Transfers (`POST /v1/transfers` / `GET /v1/transfers/:id`)

Initiates vendor-agnostic outbound payouts and bank disbursements to any verified NUBAN account. Amounts are integer minor units (kobo for NGN).

- **Authentication**: `Authorization: Bearer <RICARUT_API_KEY>`
- **Headers**: `Idempotency-Key: <unique-key>`
- **Payload**:
```json
{
  "amount": 500000,
  "currency": "NGN",
  "bank_code": "058",
  "account_number": "0123456789",
  "reason": "Supplier payout",
  "reference": "payout_order_1001"
}
```
- **Response**:
```json
{
  "data": {
    "id": "txn_ric_9b2e04f1234567890123456789abcdef",
    "reference": "payout_order_1001",
    "amount": 500000,
    "currency": "NGN",
    "status": "processing",
    "bank_code": "058",
    "account_number": "0123456789",
    "account_name": "ALEXANDER TEST",
    "provider": "paystack",
    "created_at": "2026-09-30T10:45:00.000Z",
    "updated_at": "2026-09-30T10:45:00.000Z"
  },
  "requestId": "req_df421190-71aa-4c22-b918-62be1194ac10"
}
```
For complete documentation, see [`docs/transfers.md`](docs/transfers.md).

---

## Webhooks & Transfer Status Synchronization (Phase 5)

Ricarut asynchronously synchronizes outbound transfer states via provider webhooks and fallback verification inquiries:

```text
Paystack Webhook → POST /v1/webhooks/paystack (HMAC-SHA512 Verified)
                 → Idempotency Deduplication (WebhookEvent)
                 → Transfer Lookup & State Machine Validation
                 → Atomic Status Update (Transfer + ProviderTransaction)
                 → Developer Queries Ricarut (GET /v1/transfers/:id)
```

### Supported Webhook Events
- `transfer.success` $\rightarrow$ transitions transfer from `processing` to `successful`
- `transfer.failed` $\rightarrow$ transitions transfer from `processing` to `failed`
- `transfer.reversed` $\rightarrow$ transitions transfer to `reversed`

### Developer Verification Fallback
```bash
POST /v1/transfers/:id/verify
Authorization: Bearer rc_test_...
```

For complete details, signature verification guides, and local testing instructions, see [`docs/webhooks.md`](docs/webhooks.md).

---

## Architecture Design

The foundation is built using a highly clean, decoupled, and modular structure:

```text
ricarut-backend/
├── prisma/               # Database schemas and migration tracking
├── src/
│   ├── config/           # Safe Zod-validated environment config
│   ├── lib/              # Reusable singletons (Prisma, Redis, Pino Logger)
│   ├── middleware/       # Request tracers (UUIDs), formatters, error catches
│   ├── routes/           # Versioned endpoint definitions
│   ├── app.ts            # Middleware composition & routing pipeline
│   └── server.ts         # Server entrypoint and graceful shutdown listeners
├── tests/                # Automated verification suites
└── dist/                 # Compiled JavaScript output
```


Set up this Neon project in the current working directory.

1. `npm i -g neon@latest && neon login`
2. `neon skills -y`
3. `neon mcp -y`
4. `neon link --project-id bitter-cell-00908003 --branch production -y`
5. `neon config init`
6. Update `neon.ts`:

```ts
import { defineConfig } from "@neon/config/v1";

export default defineConfig({});
```

7. `neon deploy`