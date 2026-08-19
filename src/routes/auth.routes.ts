import { Router, Request, Response, NextFunction } from "express";
import { z } from "zod";
import jwt from "jsonwebtoken";
import crypto from "crypto";
import { prisma } from "../lib/prisma";
import { hashPassword, verifyPassword } from "../lib/hash";
import { env } from "../config/env";
import { logAuditEvent } from "../lib/audit-logger";
import { rateLimiterMiddleware } from "../middleware/rate-limiter";
import { authenticateUser } from "../middleware/auth";
import { ValidationError, ConflictError, UnauthorizedError, ForbiddenError } from "../lib/errors";

const router = Router();

// Standard onboarding rate limiting: 5 attempts per 60 seconds
const authRateLimiter = rateLimiterMiddleware({ windowSeconds: 60, maxRequests: 5 });

// Strong registration schema validation
const registerSchema = z.object({
  email: z.string().email("Invalid email format"),
  password: z
    .string()
    .min(8, "Password must be at least 8 characters long")
    .regex(/[A-Z]/, "Password must contain at least one uppercase letter")
    .regex(/[a-z]/, "Password must contain at least one lowercase letter")
    .regex(/[0-9]/, "Password must contain at least one number"),
  firstName: z.string().trim().min(1, "First name is required"),
  lastName: z.string().trim().min(1, "Last name is required"),
});

/**
 * Helper to convert organization names to safe, clean slugs.
 * Strips non-alphanumeric, lower-cases, and replaces whitespaces with hyphens.
 */
const generateSlug = (name: string): string => {
  return name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/[\s-]+/g, "-");
};

/**
 * POST /api/v1/auth/register
 * Onboards a new developer, establishes a default organization under atomic constraints,
 * generates a dashboard JWT session token, and records security audit logs.
 */
router.post(
  "/register",
  authRateLimiter,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const validation = registerSchema.safeParse(req.body);
      if (!validation.success) {
        const fields: Record<string, string> = {};
        validation.error.issues.forEach((issue) => {
          fields[issue.path.join(".")] = issue.message;
        });
        return next(new ValidationError("Registration input validation failed", fields));
      }

      const { email, password, firstName, lastName } = validation.data;
      const normalizedEmail = email.toLowerCase().trim();

      // Ensure duplicate emails are blocked at code level (backed by db unique constraint)
      const existingUser = await prisma.user.findUnique({
        where: { email: normalizedEmail },
      });

      if (existingUser) {
        return next(new ConflictError("A user with this email address already exists"));
      }

      // Hash password securely with Argon2id parameters
      const passwordHash = await hashPassword(password);

      const orgName = `${firstName}'s Organization`;
      let orgSlug = generateSlug(orgName);

      // Guard slug unique constraint by appending small entropy if there's a name collision
      const existingOrg = await prisma.organization.findUnique({
        where: { slug: orgSlug },
      });
      if (existingOrg) {
        orgSlug = `${orgSlug}-${crypto.randomBytes(3).toString("hex")}`;
      }

      // Atomic registration transaction: user + organization + owner membership
      const { user, organization } = await prisma.$transaction(async (tx) => {
        const newUser = await tx.user.create({
          data: {
            email: normalizedEmail,
            passwordHash,
            firstName,
            lastName,
          },
        });

        const newOrg = await tx.organization.create({
          data: {
            name: orgName,
            slug: orgSlug,
          },
        });

        await tx.organizationMember.create({
          data: {
            organizationId: newOrg.id,
            userId: newUser.id,
            role: "owner",
          },
        });

        return { user: newUser, organization: newOrg };
      });

      // Write non-blocking operational audit events
      logAuditEvent({
        userId: user.id,
        action: "user.registered",
        metadata: { email: user.email },
        ipAddress: req.ip || req.socket.remoteAddress,
        userAgent: req.headers["user-agent"],
      });

      logAuditEvent({
        userId: user.id,
        action: "organization.created",
        metadata: { organizationId: organization.id, slug: organization.slug },
        ipAddress: req.ip || req.socket.remoteAddress,
        userAgent: req.headers["user-agent"],
      });

      // Create JWT session token containing user details
      const token = jwt.sign({ userId: user.id, email: user.email }, env.JWT_SECRET, {
        expiresIn: "24h",
      });

      return res.status(201).json({
        user: {
          id: user.id,
          email: user.email,
          firstName: user.firstName,
          lastName: user.lastName,
          status: user.status,
          createdAt: user.createdAt,
          memberships: [
            {
              organizationId: organization.id,
              role: "owner",
              organizationName: organization.name,
              organizationSlug: organization.slug,
            },
          ],
        },
        token,
      });
    } catch (err) {
      return next(err);
    }
  },
);

const loginSchema = z.object({
  email: z.string().email("Invalid email format"),
  password: z.string().min(1, "Password is required"),
});

/**
 * POST /api/v1/auth/login
 * Validates credentials, verifies Argon2id hash parameters, and grants a short-lived JWT.
 */
router.post("/login", authRateLimiter, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const validation = loginSchema.safeParse(req.body);
    if (!validation.success) {
      return next(new ValidationError("Invalid login payload constraints"));
    }

    const { email, password } = validation.data;
    const normalizedEmail = email.toLowerCase().trim();

    const user = await prisma.user.findUnique({
      where: { email: normalizedEmail },
      include: {
        memberships: {
          include: {
            organization: true,
          },
        },
      },
    });

    if (!user) {
      // Obfuscate rejection to protect against account enumeration
      return next(new UnauthorizedError("Invalid email or password"));
    }

    const isPasswordValid = await verifyPassword(password, user.passwordHash);
    if (!isPasswordValid) {
      return next(new UnauthorizedError("Invalid email or password"));
    }

    if (user.status === "suspended") {
      return next(new ForbiddenError("Access forbidden; your user account has been suspended"));
    }

    // Write audit event
    logAuditEvent({
      userId: user.id,
      action: "user.logged_in",
      ipAddress: req.ip || req.socket.remoteAddress,
      userAgent: req.headers["user-agent"],
    });

    // Create JWT token
    const token = jwt.sign({ userId: user.id, email: user.email }, env.JWT_SECRET, {
      expiresIn: "24h",
    });

    return res.status(200).json({
      user: {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        status: user.status,
        createdAt: user.createdAt,
        memberships: user.memberships.map((m) => ({
          organizationId: m.organizationId,
          role: m.role,
          organizationName: m.organization.name,
          organizationSlug: m.organization.slug,
        })),
      },
      token,
    });
  } catch (err) {
    return next(err);
  }
});

/**
 * POST /api/v1/auth/logout
 * Destroys token association (stateless token is logged out on the client; audit-logged here).
 */
router.post("/logout", authenticateUser, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const user = req.user!;

    logAuditEvent({
      userId: user.id,
      action: "user.logged_out",
      ipAddress: req.ip || req.socket.remoteAddress,
      userAgent: req.headers["user-agent"],
    });

    return res.status(200).json({
      message: "Logout successful",
    });
  } catch (err) {
    return next(err);
  }
});

/**
 * GET /api/v1/auth/me
 * Retrieves current active profile combined with a list of organization roles and details.
 */
router.get("/me", authenticateUser, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const sessionUser = req.user!;

    const user = await prisma.user.findUnique({
      where: { id: sessionUser.id },
      include: {
        memberships: {
          include: {
            organization: true,
          },
        },
      },
    });

    if (!user) {
      return next(new UnauthorizedError("Active user session match not found"));
    }

    return res.status(200).json({
      user: {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        status: user.status,
        createdAt: user.createdAt,
        memberships: user.memberships.map((m) => ({
          organizationId: m.organizationId,
          role: m.role,
          organizationName: m.organization.name,
          organizationSlug: m.organization.slug,
        })),
      },
    });
  } catch (err) {
    return next(err);
  }
});

export const authRoutes = router;
export default authRoutes;
