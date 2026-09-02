import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import crypto from "crypto";
import { env } from "../config/env";
import { prisma } from "../lib/prisma";
import { UnauthorizedError, ForbiddenError, ValidationError } from "../lib/errors";
import { logger } from "../lib/logger";
import { OrgRole, ProjectEnvironment } from "@prisma/client";

// Extend Express Request types to support our injected security contexts
declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      user?: {
        id: string;
        email: string;
        firstName: string;
        lastName: string;
      };
      apiKeyContext?: {
        apiKeyId: string;
        projectId: string;
        organizationId: string;
        environment: ProjectEnvironment;
      };
    }
  }
}

/**
 * Express middleware to authenticate standard session-based dashboard requests.
 * Extracts, verifies, and decodes the JWT Bearer token, then attaches the user context to the request.
 */
export const authenticateUser = async (req: Request, _res: Response, next: NextFunction) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return next(new UnauthorizedError("Missing or malformed Authorization Bearer header"));
  }

  const token = authHeader.split(" ")[1];

  try {
    const decoded = jwt.verify(token, env.JWT_SECRET) as {
      userId: string;
      email: string;
    };

    const user = await prisma.user.findUnique({
      where: { id: decoded.userId },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        status: true,
      },
    });

    if (!user) {
      return next(new UnauthorizedError("Active user session match not found"));
    }

    if (user.status === "suspended") {
      return next(new ForbiddenError("Access forbidden; your user account is suspended"));
    }

    req.user = {
      id: user.id,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
    };

    next();
  } catch {
    return next(new UnauthorizedError("Invalid or expired session credentials"));
  }
};

// Stripe-style format regex: [fb/rc]_[test/live]_[12_char_prefix].[32_char_secret]
const API_KEY_REGEX = /^(fb|rc)_(test|live)_([a-zA-Z0-9]{12})\.([a-zA-Z0-9]{32})$/;

/**
 * Express middleware to authenticate developer API requests using structured project keys.
 * Validates the token structure, looks up by prefix (indexed), and hashes the secret to match 
 * against the database's record using timing-safe buffer comparisons.
 */
export const authenticateApiKey = async (req: Request, _res: Response, next: NextFunction) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return next(new UnauthorizedError("Missing or malformed Authorization Bearer API key"));
  }

  const rawKey = authHeader.split(" ")[1];
  const match = rawKey.match(API_KEY_REGEX);

  if (!match) {
    return next(new UnauthorizedError("Invalid API key format"));
  }

  const keyPrefix = `${match[1]}_${match[2]}_${match[3]}`;

  try {
    // 1. Efficient prefix indexing query
    const apiKey = await prisma.apiKey.findUnique({
      where: { keyPrefix },
      include: {
        project: true,
      },
    });

    if (!apiKey) {
      return next(new UnauthorizedError("Invalid API key credentials"));
    }

    // 2. Hash the incoming string
    const incomingHash = crypto.createHash("sha256").update(rawKey).digest("hex");

    // 3. Constant-time secure comparison to prevent timing side-channel attacks
    const isSecretValid = crypto.timingSafeEqual(
      Buffer.from(incomingHash, "utf-8"),
      Buffer.from(apiKey.keyHash, "utf-8"),
    );

    if (!isSecretValid) {
      return next(new UnauthorizedError("Invalid API key credentials"));
    }

    // 4. Verify revocation status
    if (apiKey.revokedAt) {
      return next(new UnauthorizedError("API key has been revoked"));
    }

    // 5. Verify expiration constraints
    if (apiKey.expiresAt && apiKey.expiresAt < new Date()) {
      return next(new UnauthorizedError("API key has expired"));
    }

    // 6. Append developer API request context
    req.apiKeyContext = {
      apiKeyId: apiKey.id,
      projectId: apiKey.projectId,
      organizationId: apiKey.project.organizationId,
      environment: apiKey.environment,
    };

    // Update lastUsedAt timestamp as a background (non-blocking) query - throttled to once per 60 seconds
    const shouldUpdateLastUsed =
      !apiKey.lastUsedAt ||
      Date.now() - new Date(apiKey.lastUsedAt).getTime() > 60 * 1000;

    if (shouldUpdateLastUsed) {
      prisma.apiKey
        .update({
          where: { id: apiKey.id },
          data: { lastUsedAt: new Date() },
        })
        .catch((err) => {
          // Prevent background db update errors from crashing active requests
          logger.error({ err, keyId: apiKey.id }, "Error updating apiKey.lastUsedAt timestamp");
        });
    }

    next();
  } catch (err) {
    return next(err);
  }
};

/**
 * Reusable Express authorization filter to require a specific set of roles in the organization.
 * Resolves the target organization ID dynamically from parameters, bodies, or query parameters,
 * and validates database membership roles before proceeding.
 */
export const requireOrgRole = (allowedRoles: OrgRole[]) => {
  return async (req: Request, _res: Response, next: NextFunction) => {
    const user = req.user;
    if (!user) {
      return next(new UnauthorizedError("Authentication required"));
    }

    // Resolve target organizationId dynamically from params, request body, or query params
    const organizationId =
      req.params.orgId ||
      req.params.organizationId ||
      req.body.organizationId ||
      req.query.organizationId;

    if (!organizationId || typeof organizationId !== "string") {
      return next(new ForbiddenError("Organization context is required for this operation"));
    }

    try {
      const member = await prisma.organizationMember.findUnique({
        where: {
          organizationId_userId: {
            organizationId,
            userId: user.id,
          },
        },
      });

      if (!member) {
        // Return 403 Forbidden to prevent organization enumeration vulnerabilities
        return next(new ForbiddenError("Access forbidden; you are not a member of this organization"));
      }

      if (!allowedRoles.includes(member.role)) {
        return next(
          new ForbiddenError(
            `Insufficient permission privileges; required roles: [${allowedRoles.join(", ")}]`,
          ),
        );
      }

      next();
    } catch (err) {
      return next(err);
    }
  };
};

/**
 * Unified middleware supporting either user JWT or API Key authentication.
 * Dynamically forwards to the appropriate strategy.
 */
export const authenticateUserOrApiKey = async (req: Request, res: Response, next: NextFunction) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return next(new UnauthorizedError("Missing or malformed Authorization Bearer token"));
  }

  const token = authHeader.split(" ")[1];

  if (token.startsWith("fb_test_") || token.startsWith("fb_live_") || token.startsWith("rc_test_") || token.startsWith("rc_live_")) {
    return authenticateApiKey(req, res, next);
  } else {
    return authenticateUser(req, res, next);
  }
};

/**
 * Middleware to resolve project context dynamically and enforce membership boundaries
 * for both dashboard users and api keys.
 */
export const resolveProjectContext = async (req: Request, _res: Response, next: NextFunction) => {
  if (req.apiKeyContext) {
    return next();
  }

  const projectId = req.query.projectId || req.body.projectId || req.headers["x-project-id"];
  if (!projectId || typeof projectId !== "string") {
    return next(new ValidationError("Project context (projectId) is required"));
  }

  try {
    const project = await prisma.project.findUnique({
      where: { id: projectId },
    });

    if (!project) {
      return next(new ForbiddenError("Project context not found or access forbidden"));
    }

    const membership = await prisma.organizationMember.findUnique({
      where: {
        organizationId_userId: {
          organizationId: project.organizationId,
          userId: req.user!.id,
        },
      },
    });

    if (!membership) {
      return next(new ForbiddenError("Access forbidden; you are not a member of the project's organization"));
    }

    req.apiKeyContext = {
      apiKeyId: "",
      projectId: project.id,
      organizationId: project.organizationId,
      environment: project.environment === "live" ? "live" : "test",
    };

    next();
  } catch (err) {
    return next(err);
  }
};

/**
 * Middleware to restrict route access strictly to platform administrators.
 */
export const authorizeAdmin = async (req: Request, _res: Response, next: NextFunction) => {
  const user = req.user;
  if (!user) {
    return next(new UnauthorizedError("Authentication required"));
  }

  try {
    const dbUser = await prisma.user.findUnique({
      where: { id: user.id },
      select: { role: true },
    });

    if (!dbUser || dbUser.role !== "admin") {
      return next(new ForbiddenError("Access forbidden; administrative privileges required"));
    }

    next();
  } catch (err) {
    return next(err);
  }
};


