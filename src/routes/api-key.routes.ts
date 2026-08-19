import { Router, Request, Response, NextFunction } from "express";
import { z } from "zod";
import crypto from "crypto";
import { prisma } from "../lib/prisma";
import { authenticateUser } from "../middleware/auth";
import { ValidationError, ForbiddenError, NotFoundError } from "../lib/errors";
import { OrgRole, ProjectEnvironment } from "@prisma/client";
import { logAuditEvent } from "../lib/audit-logger";

const router = Router({ mergeParams: true }); // Inherit parent routing parameters

// Core schema validation for key creation
const createKeySchema = z.object({
  name: z.string().trim().min(2, "API key name must be at least 2 characters long"),
  expiresInDays: z.number().int().positive().optional(),
});

/**
 * Reusable authorize filter to load the target project and enforce organization role checks.
 * Secures key management pipelines from unauthorized actions or business IDOR leaks.
 */
const authorizeApiKeyManagement = (allowedRoles: OrgRole[]) => {
  return async (req: Request, _res: Response, next: NextFunction) => {
    const user = req.user!;
    const { projectId } = req.params;

    try {
      const project = await prisma.project.findUnique({
        where: { id: projectId },
      });

      if (!project) {
        return next(new NotFoundError("Project match not found"));
      }

      // Check user membership of target project's organization
      const membership = await prisma.organizationMember.findUnique({
        where: {
          organizationId_userId: {
            organizationId: project.organizationId,
            userId: user.id,
          },
        },
      });

      if (!membership) {
        return next(new ForbiddenError("Access forbidden; you are not authorized for this project"));
      }

      if (!allowedRoles.includes(membership.role)) {
        return next(
          new ForbiddenError(
            `Insufficient privileges; required roles: [${allowedRoles.join(", ")}]`,
          ),
        );
      }

      // Attach resolved project context to request
      (req as any).project = project;
      next();
    } catch (err) {
      return next(err);
    }
  };
};

router.use(authenticateUser);

/**
 * GET /api/v1/projects/:projectId/api-keys
 * Lists existing API keys for a project. 
 * Redacts raw secrets from output fields, displaying only the safe prefixes.
 */
router.get(
  "/",
  authorizeApiKeyManagement([OrgRole.owner, OrgRole.admin, OrgRole.developer, OrgRole.viewer]),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { projectId } = req.params;

      const apiKeys = await prisma.apiKey.findMany({
        where: { projectId },
        orderBy: { createdAt: "desc" },
        select: {
          id: true,
          name: true,
          keyPrefix: true, // Redacted prefix shown, secrets excluded
          environment: true,
          lastUsedAt: true,
          expiresAt: true,
          revokedAt: true,
          createdAt: true,
          updatedAt: true,
        },
      });

      return res.status(200).json({ apiKeys });
    } catch (err) {
      return next(err);
    }
  },
);

/**
 * Helper to generate cryptographically secure, high-entropy random strings.
 * Overrides Math.random() in favor of Node's crypto subsystem.
 */
const generateSecureString = (length: number): string => {
  return crypto
    .randomBytes(Math.ceil(length / 2))
    .toString("hex")
    .slice(0, length);
};

/**
 * POST /api/v1/projects/:projectId/api-keys
 * Generates structured, cryptographically secure API keys.
 * Returns the plaintext key exactly ONCE during this payload cycle.
 */
router.post(
  "/",
  authorizeApiKeyManagement([OrgRole.owner, OrgRole.admin, OrgRole.developer]),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { projectId } = req.params;
      const validation = createKeySchema.safeParse(req.body);
      if (!validation.success) {
        return next(new ValidationError("Invalid API key payload configurations"));
      }

      const { name, expiresInDays } = validation.data;
      const project = (req as any).project;
      const user = req.user!;

      // 1. Generate high-entropy secure prefix and secret values
      const envTag = project.environment === ProjectEnvironment.live ? "live" : "test";
      const randomPrefix = generateSecureString(12);
      const randomSecret = generateSecureString(32);
      
      const keyPrefix = `fb_${envTag}_${randomPrefix}`;
      const plaintextKey = `${keyPrefix}.${randomSecret}`;

      // 2. Hash the entire key using SHA256 to ensure complete safety from leaks
      const keyHash = crypto.createHash("sha256").update(plaintextKey).digest("hex");

      const expiresAt = expiresInDays
        ? new Date(Date.now() + expiresInDays * 24 * 60 * 60 * 1000)
        : null;

      const apiKey = await prisma.apiKey.create({
        data: {
          projectId,
          name,
          keyPrefix,
          keyHash,
          environment: project.environment,
          expiresAt,
        },
      });

      // Audit event
      logAuditEvent({
        userId: user.id,
        action: "api_key.created",
        metadata: { apiKeyId: apiKey.id, projectId, environment: apiKey.environment },
        ipAddress: req.ip || req.socket.remoteAddress,
        userAgent: req.headers["user-agent"],
      });

      // Return plaintext key EXACTLY ONCE to the developer
      return res.status(201).json({
        id: apiKey.id,
        name: apiKey.name,
        key: plaintextKey,
        environment: apiKey.environment,
        expiresAt: apiKey.expiresAt,
        createdAt: apiKey.createdAt,
      });
    } catch (err) {
      return next(err);
    }
  },
);

/**
 * DELETE /api/v1/projects/:projectId/api-keys/:keyId
 * Revokes the target key setting revokedAt = now(), maintaining audit log paths.
 */
router.delete(
  "/:keyId",
  authorizeApiKeyManagement([OrgRole.owner, OrgRole.admin, OrgRole.developer]),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { keyId } = req.params;
      const user = req.user!;

      const apiKey = await prisma.apiKey.findUnique({
        where: { id: keyId },
      });

      if (!apiKey) {
        return next(new NotFoundError("API key match not found"));
      }

      if (apiKey.revokedAt) {
        return res.status(200).json({
          message: "API key has already been revoked",
        });
      }

      const updatedKey = await prisma.apiKey.update({
        where: { id: keyId },
        data: {
          revokedAt: new Date(),
        },
      });

      // Audit event
      logAuditEvent({
        userId: user.id,
        action: "api_key.revoked",
        metadata: { apiKeyId: keyId, projectId: updatedKey.projectId },
        ipAddress: req.ip || req.socket.remoteAddress,
        userAgent: req.headers["user-agent"],
      });

      return res.status(200).json({
        message: "API key successfully revoked",
      });
    } catch (err) {
      return next(err);
    }
  },
);

export const apiKeyRoutes = router;
export default apiKeyRoutes;
