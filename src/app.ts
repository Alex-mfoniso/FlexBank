import express from "express";
import helmet from "helmet";
import cors from "cors";
import { env } from "./config/env";
import { requestIdMiddleware } from "./middleware/request-id";
import { standardResponseMiddleware } from "./middleware/standard-response";
import { requestLoggerMiddleware } from "./middleware/request-logger";
import { notFoundMiddleware } from "./middleware/not-found";
import { errorHandlerMiddleware } from "./middleware/error-handler";
import { healthRoutes } from "./routes/health.routes";
import { authRoutes } from "./routes/auth.routes";
import { organizationRoutes } from "./routes/organization.routes";
import { projectRoutes } from "./routes/project.routes";
import { apiKeyRoutes } from "./routes/api-key.routes";
import { docsRoutes } from "./routes/docs.routes";
import { authenticateApiKey } from "./middleware/auth";
import { apiLoggerMiddleware } from "./middleware/api-logger";
import { logsRoutes } from "./routes/logs.routes";
import customerRoutes from "./modules/customers/customer.routes";
import accountRoutes from "./modules/accounts/account.routes";
import ledgerRoutes from "./modules/ledger/ledger.routes";
import transferRoutes from "./modules/transfers/transfer.routes";
import { webhookController } from "./modules/webhooks/webhook.controller";
import { sandboxController } from "./modules/sandbox/sandbox.controller";
import { ledgerExplorerRoutes } from "./routes/ledger-explorer.routes";
import { overviewRoutes } from "./routes/overview.routes";
import { adminRoutes } from "./routes/admin.routes";

const app = express();

// 1. Core Security Middlewares
app.use(helmet());

const DEFAULT_ALLOWED_ORIGINS = [
  "https://ricarut.vercel.app",
  "https://flexbank-one.vercel.app",
  "http://localhost:3000",
  "http://localhost:5173",
];

app.use(
  cors({
    origin: (origin, callback) => {
      // Allow requests with no origin (e.g. mobile apps, curl, server-to-server)
      if (!origin) {
        return callback(null, true);
      }

      const configuredOrigins = env.CORS_ORIGIN
        ? env.CORS_ORIGIN.split(",").map((o) => o.trim().toLowerCase())
        : [];

      const normalizedOrigin = origin.trim().toLowerCase();

      if (
        configuredOrigins.includes("*") ||
        configuredOrigins.includes(normalizedOrigin) ||
        DEFAULT_ALLOWED_ORIGINS.some((allowed) => allowed.toLowerCase() === normalizedOrigin)
      ) {
        return callback(null, true);
      }

      // Allow any Vercel deployment for Ricarut or Flexbank (preview branches, staging, production)
      try {
        const parsedUrl = new URL(origin);
        if (
          parsedUrl.hostname.endsWith(".vercel.app") &&
          (parsedUrl.hostname.includes("ricarut") || parsedUrl.hostname.includes("flexbank"))
        ) {
          return callback(null, true);
        }
      } catch {
        // Ignore invalid URL format
      }

      return callback(null, false);
    },
    methods: ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
    allowedHeaders: [
      "Content-Type",
      "Authorization",
      "X-Request-ID",
      "x-request-id",
      "X-Project-ID",
      "x-project-id",
      "Idempotency-Key",
      "idempotency-key",
      "X-API-Key",
      "x-api-key",
    ],
    exposedHeaders: ["X-Request-ID", "x-request-id", "Idempotency-Key", "idempotency-key"],
    credentials: true,
  }),
);

// 2. Body Parser Middleware with secure limit constraints and raw body buffer preservation
app.use(
  express.json({
    limit: "1mb",
    verify: (req: any, _res, buf) => {
      req.rawBody = buf;
    },
  }),
);

// 3. Tracing & Logging Pipeline
app.use(requestIdMiddleware);
app.use(standardResponseMiddleware);
app.use(requestLoggerMiddleware);

// 4. API Versioning Setup
const v1Router = express.Router();

// Run request logger middleware for all API requests
v1Router.use(apiLoggerMiddleware);

// Mount modules onto v1 router
v1Router.use("/", healthRoutes);
v1Router.use("/auth", authRoutes);
v1Router.use("/organizations", organizationRoutes);
v1Router.use("/projects", projectRoutes);
v1Router.use("/projects", overviewRoutes);
v1Router.use("/projects/:projectId/api-keys", apiKeyRoutes);
v1Router.use("/customers", customerRoutes);
v1Router.use("/accounts", accountRoutes);
v1Router.use("/", ledgerExplorerRoutes);
v1Router.use("/webhooks/endpoints", webhookController);
v1Router.use("/logs", logsRoutes);
v1Router.use("/test", sandboxController);
v1Router.use("/", ledgerRoutes);
v1Router.use("/", transferRoutes);
v1Router.use("/docs", docsRoutes);
v1Router.use("/admin", adminRoutes);

// Core Developer API key verification test route
v1Router.get("/auth/test-key", authenticateApiKey, (req, res) => {
  return res.status(200).json({ status: "success", context: req.apiKeyContext });
});

// Register v1 prefix and /v1 convenience alias
app.use("/api/v1", v1Router);
app.use("/v1", v1Router);

// Register root paths for infrastructure/load balancer convenience
app.use("/", healthRoutes);

// 5. Standard fallback for missing routes
app.use(notFoundMiddleware);

// 6. Centralized Error Handler (must be registered last)
app.use(errorHandlerMiddleware);

export { app };
export default app;
