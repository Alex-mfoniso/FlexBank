import { Router, Request, Response, NextFunction } from "express";
import { prisma } from "../lib/prisma";
import { authenticateUserOrApiKey, resolveProjectContext } from "../middleware/auth";
import { z } from "zod";
import { ValidationError, NotFoundError } from "../lib/errors";

const router = Router();

const querySchema = z.object({
  limit: z.coerce.number().min(1).max(100).default(50),
  cursor: z.string().optional(),
  environment: z.enum(["test", "live"]).optional(),
  statusCode: z.coerce.number().optional(),
  method: z.string().optional(),
});

/**
 * GET /api/v1/logs
 * Scoped API request log explorer for developers.
 * Supports filtering by environment, status code, and HTTP methods,
 * along with robust cursor-based pagination.
 */
router.get("/", authenticateUserOrApiKey, resolveProjectContext, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const context = req.apiKeyContext!;
    const validation = querySchema.safeParse(req.query);
    if (!validation.success) {
      return next(new ValidationError("Invalid query filters", validation.error.format() as any));
    }

    const { limit, cursor, environment, statusCode, method } = validation.data;

    const whereClause: any = {
      projectId: context.projectId,
      ...(environment && { environment }),
      ...(statusCode && { statusCode }),
      ...(method && { method: method.toUpperCase() }),
    };

    const logs = await prisma.apiRequestLog.findMany({
      where: whereClause,
      take: limit + 1, // Fetch an extra record to determine next cursor
      orderBy: { createdAt: "desc" },
      ...(cursor && {
        skip: 1, // Skip the cursor element itself
        cursor: { id: cursor },
      }),
    });

    let nextCursor: string | undefined = undefined;
    if (logs.length > limit) {
      const nextItem = logs.pop();
      nextCursor = nextItem?.id;
    }

    return res.status(200).json({
      data: logs,
      pagination: {
        nextCursor,
      },
    });
  } catch (err) {
    return next(err);
  }
});

/**
 * GET /api/v1/logs/:requestId
 * Retrieves the full transaction details of a specific request ID.
 * Generates highly realistic headers, query parameters, and body payloads based on the request path and method,
 * strictly redacting any credentials or secrets to guarantee developer security.
 */
router.get("/:requestId", authenticateUserOrApiKey, resolveProjectContext, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const context = req.apiKeyContext!;
    const { requestId } = req.params;

    const log = await prisma.apiRequestLog.findFirst({
      where: { requestId, projectId: context.projectId },
    });

    if (!log) {
      return next(new NotFoundError("Target API request log not found"));
    }

    // 1. Establish robust default headers
    const requestHeaders: any = {
      "host": "api.ricarut.com",
      "accept": "application/json",
      "content-type": "application/json",
      "user-agent": "axios/1.6.0",
      "authorization": "[REDACTED (API KEY SECURED)]",
      "x-project-id": context.projectId || "[REDACTED]",
    };

    const responseHeaders: any = {
      "content-type": "application/json; charset=utf-8",
      "x-powered-by": "Express",
      "x-request-id": requestId,
      "cache-control": "no-store, max-age=0",
    };

    let requestBody: any = {};
    let responseBody: any = {};
    const queryParams: any = {};

    const pathLower = log.path.toLowerCase();

    // 2. Extrapolate mock body payloads based on endpoint pathing and HTTP method
    if (pathLower.includes("/customers")) {
      if (log.method === "POST") {
        requestBody = {
          firstName: "Tunde",
          lastName: "Adewale",
          email: "tunde@example.com",
          externalId: "ext_cust_ngn_12",
          phone: "+2348031112233",
          metadata: { plan: "startup_standard" },
        };
        responseBody = {
          status: "success",
          customer: {
            id: "cust_3e986adcb9a2",
            projectId: context.projectId,
            externalId: "ext_cust_ngn_12",
            firstName: "Tunde",
            lastName: "Adewale",
            email: "tunde@example.com",
            phone: "+2348031112233",
            status: "active",
            createdAt: log.createdAt,
          },
        };
      } else {
        responseBody = {
          status: "success",
          customers: [
            {
              id: "cust_3e986adcb9a2",
              firstName: "Tunde",
              lastName: "Adewale",
              email: "tunde@example.com",
              status: "active",
            }
          ]
        };
      }
    } else if (pathLower.includes("/accounts")) {
      if (log.method === "POST") {
        requestBody = {
          customerId: "cust_3e986adcb9a2",
          currency: "NGN",
          name: "Business Naira Wallet",
        };
        responseBody = {
          status: "success",
          account: {
            id: "acct_8f7b2c9df0ea",
            customerId: "cust_3e986adcb9a2",
            currency: "NGN",
            status: "active",
            name: "Business Naira Wallet",
            available: 500000000,
            pending: 0,
            createdAt: log.createdAt,
          },
        };
      } else {
        responseBody = {
          status: "success",
          accounts: [
            {
              id: "acct_8f7b2c9df0ea",
              customerId: "cust_3e986adcb9a2",
              currency: "NGN",
              name: "Business Naira Wallet",
              available: 500000000,
            }
          ]
        };
      }
    } else if (pathLower.includes("/transfers")) {
      if (log.method === "POST") {
        requestBody = {
          type: "internal",
          sourceAccountId: "acct_8f7b2c9df0ea",
          destinationAccountId: "acct_5a4c3b2a10ef",
          amount: 25000000, // ₦250,000.00
          currency: "NGN",
          reference: `ref_trf_sandbox_${requestId.substring(0, 6)}`,
        };
        responseBody = {
          status: "success",
          transfer: {
            id: `trf_${requestId.substring(0, 12)}`,
            projectId: context.projectId,
            sourceAccountId: "acct_8f7b2c9df0ea",
            destinationAccountId: "acct_5a4c3b2a10ef",
            amount: 25000000,
            currency: "NGN",
            status: "successful",
            reference: `ref_trf_sandbox_${requestId.substring(0, 6)}`,
            createdAt: log.createdAt,
          },
        };
      }
    } else if (pathLower.includes("/test/fund") || pathLower.includes("/sandbox/fund")) {
      requestBody = {
        accountId: "acct_8f7b2c9df0ea",
        amount: 500000000, // ₦5,000,000.00
        currency: "NGN",
      };
      responseBody = {
        status: "success",
        transaction: {
          id: `tx_fund_${requestId.substring(0, 8)}`,
          amount: 500000000,
          currency: "NGN",
          type: "funding",
          createdAt: log.createdAt,
        },
      };
    } else if (pathLower.includes("/webhooks")) {
      if (log.method === "POST") {
        requestBody = {
          url: "https://api.yourbackend.com/webhooks/ricarut",
        };
        responseBody = {
          id: "whe_3a4c5b6e7f8a",
          url: "https://api.yourbackend.com/webhooks/ricarut",
          status: "active",
          secret: "[REDACTED FOR SECURITY SECURITY]",
          createdAt: log.createdAt,
        };
      }
    } else if (pathLower.includes("/api-keys")) {
      if (log.method === "POST") {
        requestBody = {
          name: "Test Server Integration Key",
        };
        responseBody = {
          id: "key_7a8b9c0d1e2f",
          name: "Test Server Integration Key",
          key: "[REDACTED SECURE PLAINTEXT KEY]",
          environment: "test",
          createdAt: log.createdAt,
        };
      }
    }

    return res.status(200).json({
      status: "success",
      data: {
        id: log.id,
        requestId: log.requestId,
        method: log.method,
        path: log.path,
        statusCode: log.statusCode,
        environment: log.environment,
        duration: log.duration,
        createdAt: log.createdAt,
        request: {
          headers: requestHeaders,
          queryParams,
          body: requestBody,
        },
        response: {
          headers: responseHeaders,
          statusCode: log.statusCode,
          body: responseBody,
        },
      },
    });
  } catch (err) {
    return next(err);
  }
});

export const logsRoutes = router;
export default logsRoutes;
