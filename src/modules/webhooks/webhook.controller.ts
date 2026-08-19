import { Router, Request, Response, NextFunction } from "express";
import { z } from "zod";
import crypto from "crypto";
import { prisma } from "../../lib/prisma";
import { authenticateUserOrApiKey, resolveProjectContext } from "../../middleware/auth";
import { ValidationError, NotFoundError } from "../../lib/errors";

const router = Router();

const createEndpointSchema = z.object({
  url: z.string().url("Must be a valid webhook receiver URL"),
});

const updateEndpointSchema = z.object({
  url: z.string().url("Must be a valid webhook receiver URL").optional(),
  status: z.enum(["active", "disabled"]).optional(),
});

// Secure all webhook configuration routes supporting both user JWT and API Key sessions
router.use(authenticateUserOrApiKey, resolveProjectContext);

/**
 * POST /api/v1/webhooks/endpoints
 * Registers a new project-level webhook receiver.
 * Returns the secure HMAC signing secret exactly ONCE during creation.
 */
router.post("/", async (req: Request, res: Response, next: NextFunction) => {
  try {
    const context = req.apiKeyContext!;
    const validation = createEndpointSchema.safeParse(req.body);
    if (!validation.success) {
      return next(new ValidationError("Invalid webhook endpoint configuration", validation.error.format() as any));
    }

    const { url } = validation.data;
    const endpointId = `whe_${crypto.randomUUID().replace(/-/g, "")}`;
    const secret = `whsec_${crypto.randomBytes(16).toString("hex")}`;

    const endpoint = await prisma.webhookEndpoint.create({
      data: {
        id: endpointId,
        projectId: context.projectId,
        url,
        secret,
        status: "active",
      },
    });

    return res.status(201).json({
      id: endpoint.id,
      url: endpoint.url,
      status: endpoint.status,
      secret: endpoint.secret, // Plaintext secret returned exactly once
      createdAt: endpoint.createdAt,
    });
  } catch (err) {
    return next(err);
  }
});

/**
 * GET /api/v1/webhooks/endpoints
 * Lists all registered webhook endpoints for the authenticated project.
 * Completely redacts the secure signing secrets.
 */
router.get("/", async (req: Request, res: Response, next: NextFunction) => {
  try {
    const context = req.apiKeyContext!;

    const endpoints = await prisma.webhookEndpoint.findMany({
      where: { projectId: context.projectId },
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        url: true,
        status: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    return res.status(200).json({ data: endpoints });
  } catch (err) {
    return next(err);
  }
});

/**
 * PATCH /api/v1/webhooks/endpoints/:id
 * Updates target webhook configuration. Secrets are never modified.
 */
router.patch("/:id", async (req: Request, res: Response, next: NextFunction) => {
  try {
    const context = req.apiKeyContext!;
    const { id } = req.params;

    const validation = updateEndpointSchema.safeParse(req.body);
    if (!validation.success) {
      return next(new ValidationError("Invalid webhook update payload", validation.error.format() as any));
    }

    const endpoint = await prisma.webhookEndpoint.findUnique({
      where: { id },
    });

    if (!endpoint || endpoint.projectId !== context.projectId) {
      return next(new NotFoundError("Webhook endpoint match not found"));
    }

    const updated = await prisma.webhookEndpoint.update({
      where: { id },
      data: validation.data,
      select: {
        id: true,
        url: true,
        status: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    return res.status(200).json({ data: updated });
  } catch (err) {
    return next(err);
  }
});

/**
 * DELETE /api/v1/webhooks/endpoints/:id
 * Soft-deletes (disables) a webhook endpoint to preserve delivery log history.
 */
router.delete("/:id", async (req: Request, res: Response, next: NextFunction) => {
  try {
    const context = req.apiKeyContext!;
    const { id } = req.params;

    const endpoint = await prisma.webhookEndpoint.findUnique({
      where: { id },
    });

    if (!endpoint || endpoint.projectId !== context.projectId) {
      return next(new NotFoundError("Webhook endpoint match not found"));
    }

    await prisma.webhookEndpoint.update({
      where: { id },
      data: { status: "disabled" },
    });

    return res.status(200).json({
      success: true,
      message: "Webhook endpoint successfully disabled",
    });
  } catch (err) {
    return next(err);
  }
});

/**
 * GET /api/v1/webhooks/endpoints/:id/deliveries
 * Lists all delivery logs associated with a specific webhook endpoint.
 */
router.get("/:id/deliveries", async (req: Request, res: Response, next: NextFunction) => {
  try {
    const context = req.apiKeyContext!;
    const { id } = req.params;

    const endpoint = await prisma.webhookEndpoint.findUnique({
      where: { id },
    });

    if (!endpoint || endpoint.projectId !== context.projectId) {
      return next(new NotFoundError("Webhook endpoint match not found"));
    }

    const deliveries = await prisma.webhookDelivery.findMany({
      where: { webhookEndpointId: id },
      orderBy: { createdAt: "desc" },
    });

    return res.status(200).json({ data: deliveries });
  } catch (err) {
    return next(err);
  }
});

/**
 * POST /api/v1/webhooks/endpoints/:id/test-event
 * Triggers a simulated test webhook delivery specifically for this endpoint.
 */
router.post("/:id/test-event", async (req: Request, res: Response, next: NextFunction) => {
  try {
    const context = req.apiKeyContext!;
    const { id } = req.params;
    const { eventType } = req.body;

    if (!eventType) {
      return next(new ValidationError("eventType is required"));
    }

    const endpoint = await prisma.webhookEndpoint.findUnique({
      where: { id },
    });

    if (!endpoint || endpoint.projectId !== context.projectId) {
      return next(new NotFoundError("Webhook endpoint match not found"));
    }

    const eventId = `evt_${crypto.randomUUID().replace(/-/g, "")}`;
    const payload = {
      id: eventId,
      type: eventType,
      data: {
        object: {
          id: `trf_simulated_${crypto.randomUUID().replace(/-/g, "").substring(0, 12)}`,
          amount: 500000, // ₦5,000.00
          currency: "NGN",
          status: "successful",
          reference: `ref_test_${crypto.randomUUID().substring(0, 6)}`,
        },
      },
      createdAt: new Date().toISOString(),
    };
    const payloadStr = JSON.stringify(payload);
    const deliveryId = `whd_${crypto.randomUUID().replace(/-/g, "")}`;

    // 1. Create a "pending" delivery attempt in PostgreSQL
    await prisma.webhookDelivery.create({
      data: {
        id: deliveryId,
        webhookEndpointId: endpoint.id,
        eventId,
        eventType,
        status: "pending",
        attempts: 0,
        payload: payloadStr,
      },
    });

    // 2. Queue the job asynchronously onto the QueueManager for execution
    const { QueueManager } = await import("../../lib/queue");
    await QueueManager.enqueue("webhooks", {
      deliveryId,
      endpointId: endpoint.id,
      eventId,
      eventType,
      payloadStr,
      attempt: 1,
    });

    return res.status(200).json({
      success: true,
      message: `Test event '${eventType}' successfully triggered for endpoint ${endpoint.url}`,
      deliveryId,
    });
  } catch (err) {
    return next(err);
  }
});

export const webhookController = router;
export default webhookController;
