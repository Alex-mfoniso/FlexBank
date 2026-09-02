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
