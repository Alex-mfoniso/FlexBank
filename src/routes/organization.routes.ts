import { Router, Request, Response, NextFunction } from "express";
import { z } from "zod";
import crypto from "crypto";
import { prisma } from "../lib/prisma";
import { authenticateUser, requireOrgRole } from "../middleware/auth";
import { ValidationError, ForbiddenError, ConflictError } from "../lib/errors";
import { OrgRole } from "@prisma/client";

const router = Router();

// Core schema validation for organization creation
const createOrgSchema = z.object({
  name: z.string().trim().min(2, "Organization name must be at least 2 characters long"),
});

// Validation schema for patches
const patchOrgSchema = z.object({
  name: z.string().trim().min(2, "Organization name must be at least 2 characters long").optional(),
  slug: z.string().trim().min(2, "Organization slug must be at least 2 characters long").optional(),
});

/**
 * Helper to convert organization names to safe, clean slugs.
 */
const generateSlug = (name: string): string => {
  return name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/[\s-]+/g, "-");
};

// All organization endpoints are globally protected by user authorization
router.use(authenticateUser);

/**
 * POST /api/v1/organizations
 * Manually registers a new organization business entity, auto-generating a unique slug,
 * and linking the registering user as the organization's absolute owner inside a database transaction.
 */
router.post("/", async (req: Request, res: Response, next: NextFunction) => {
  try {
    const validation = createOrgSchema.safeParse(req.body);
    if (!validation.success) {
      return next(new ValidationError("Invalid organization payload settings"));
    }

    const { name } = validation.data;
    const user = req.user!;
    let orgSlug = generateSlug(name);

    // Ensure slug unique constraint is guarded
    const existingOrg = await prisma.organization.findUnique({
      where: { slug: orgSlug },
    });
    if (existingOrg) {
      orgSlug = `${orgSlug}-${crypto.randomBytes(3).toString("hex")}`;
    }

    const organization = await prisma.$transaction(async (tx) => {
      const org = await tx.organization.create({
        data: {
          name,
          slug: orgSlug,
        },
      });

      await tx.organizationMember.create({
        data: {
          organizationId: org.id,
          userId: user.id,
          role: OrgRole.owner,
        },
      });

      return org;
    });

    return res.status(201).json({ organization });
  } catch (err) {
    return next(err);
  }
});

/**
 * GET /api/v1/organizations
 * Lists all organizations the authenticated user belongs to.
 */
router.get("/", async (req: Request, res: Response, next: NextFunction) => {
  try {
    const user = req.user!;

    const memberships = await prisma.organizationMember.findMany({
      where: { userId: user.id },
      include: {
        organization: true,
      },
    });

    const organizations = memberships.map((m) => ({
      id: m.organization.id,
      name: m.organization.name,
      slug: m.organization.slug,
      status: m.organization.status,
      role: m.role,
      createdAt: m.organization.createdAt,
    }));

    return res.status(200).json({ organizations });
  } catch (err) {
    return next(err);
  }
});

/**
 * GET /api/v1/organizations/:id
 * Retrieves detailed configurations for a singular organization.
 * Explicitly guards against IDOR leaks by checking user membership in the target organization.
 */
router.get("/:id", async (req: Request, res: Response, next: NextFunction) => {
  try {
    const user = req.user!;
    const { id } = req.params;

    const membership = await prisma.organizationMember.findUnique({
      where: {
        organizationId_userId: {
          organizationId: id,
          userId: user.id,
        },
      },
      include: {
        organization: true,
      },
    });

    if (!membership) {
      // Obfuscated with 403 Forbidden to prevent organization discovery
      return next(new ForbiddenError("Access denied; you are not a member of this organization"));
    }

    return res.status(200).json({
      organization: {
        id: membership.organization.id,
        name: membership.organization.name,
        slug: membership.organization.slug,
        status: membership.organization.status,
        role: membership.role,
        createdAt: membership.organization.createdAt,
      },
    });
  } catch (err) {
    return next(err);
  }
});

/**
 * PATCH /api/v1/organizations/:id
 * Updates organization parameters. Gated by owner or admin roles.
 */
router.patch(
  "/:id",
  (req, _res, next) => {
    // Standardize organizationId mapping for requireOrgRole interceptor
    req.params.organizationId = req.params.id;
    next();
  },
  requireOrgRole([OrgRole.owner, OrgRole.admin]),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { id } = req.params;
      const validation = patchOrgSchema.safeParse(req.body);
      if (!validation.success) {
        return next(new ValidationError("Invalid update properties"));
      }

      const { name, slug } = validation.data;

      const finalSlug = slug ? generateSlug(slug) : undefined;
      if (finalSlug) {
        const duplicate = await prisma.organization.findUnique({
          where: { slug: finalSlug },
        });
        if (duplicate && duplicate.id !== id) {
          return next(new ConflictError("Organization slug already in use"));
        }
      }

      const organization = await prisma.organization.update({
        where: { id },
        data: {
          name: name || undefined,
          slug: finalSlug || undefined,
        },
      });

      return res.status(200).json({ organization });
    } catch (err) {
      return next(err);
    }
  },
);

export const organizationRoutes = router;
export default organizationRoutes;
