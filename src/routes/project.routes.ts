import { Router, Request, Response, NextFunction } from "express";
import { z } from "zod";
import { prisma } from "../lib/prisma";
import { authenticateUser, requireOrgRole } from "../middleware/auth";
import { ValidationError, ForbiddenError, NotFoundError } from "../lib/errors";
import { OrgRole, ProjectEnvironment } from "@prisma/client";
import { logAuditEvent } from "../lib/audit-logger";

const router = Router();

// Zod schemas for input validation
const createProjectSchema = z.object({
  organizationId: z.string().uuid("Invalid organizationId format"),
  name: z.string().trim().min(2, "Project name must be at least 2 characters long"),
  description: z.string().trim().optional(),
  environment: z.nativeEnum(ProjectEnvironment).default(ProjectEnvironment.test),
});

const patchProjectSchema = z.object({
  name: z.string().trim().min(2, "Project name must be at least 2 characters long").optional(),
  description: z.string().trim().optional(),
});

router.use(authenticateUser);

/**
 * POST /api/v1/projects
 * Adds a new project inside the designated organization context.
 * Gated by Owner, Admin, and Developer roles.
 */
router.post(
  "/",
  requireOrgRole([OrgRole.owner, OrgRole.admin, OrgRole.developer]),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const validation = createProjectSchema.safeParse(req.body);
      if (!validation.success) {
        return next(new ValidationError("Invalid project creation payload details"));
      }

      const { organizationId, name, description, environment } = validation.data;
      const user = req.user!;

      const project = await prisma.project.create({
        data: {
          organizationId,
          name,
          description: description || null,
          environment,
        },
      });

      // Audit event
      logAuditEvent({
        userId: user.id,
        action: "project.created",
        metadata: { projectId: project.id, organizationId, environment },
        ipAddress: req.ip || req.socket.remoteAddress,
        userAgent: req.headers["user-agent"],
      });

      return res.status(201).json({ project });
    } catch (err) {
      return next(err);
    }
  },
);

/**
 * GET /api/v1/projects
 * Lists projects authorized for viewing. 
 * If organizationId query is specified, checks membership of that org.
 * If absent, fetches all accessible projects across any org the user is registered in.
 */
router.get("/", async (req: Request, res: Response, next: NextFunction) => {
  try {
    const user = req.user!;
    const { organizationId } = req.query;

    if (organizationId && typeof organizationId === "string") {
      const membership = await prisma.organizationMember.findUnique({
        where: {
          organizationId_userId: {
            organizationId,
            userId: user.id,
          },
        },
      });

      if (!membership) {
        return next(new ForbiddenError("Access forbidden; you are not a member of this organization"));
      }

      const projects = await prisma.project.findMany({
        where: { organizationId },
        orderBy: { createdAt: "desc" },
      });

      return res.status(200).json({ projects });
    }

    // No single org queried, gather all active user memberships
    const memberships = await prisma.organizationMember.findMany({
      where: { userId: user.id },
      select: { organizationId: true },
    });

    const orgIds = memberships.map((m) => m.organizationId);

    const projects = await prisma.project.findMany({
      where: {
        organizationId: { in: orgIds },
      },
      orderBy: { createdAt: "desc" },
    });

    return res.status(200).json({ projects });
  } catch (err) {
    return next(err);
  }
});

/**
 * GET /api/v1/projects/:id
 * Retrieves detail configurations for a project. Enforces membership boundaries.
 */
router.get("/:id", async (req: Request, res: Response, next: NextFunction) => {
  try {
    const user = req.user!;
    const { id } = req.params;

    const project = await prisma.project.findUnique({
      where: { id },
    });

    if (!project) {
      return next(new NotFoundError("Project match not found"));
    }

    // Ensure user has access boundaries satisfied
    const membership = await prisma.organizationMember.findUnique({
      where: {
        organizationId_userId: {
          organizationId: project.organizationId,
          userId: user.id,
        },
      },
    });

    if (!membership) {
      return next(new ForbiddenError("Access forbidden; you are not authorized to view this project"));
    }

    return res.status(200).json({ project });
  } catch (err) {
    return next(err);
  }
});

/**
 * Helper middleware to load the project and verify organization membership/roles dynamically.
 * Standardizes IDOR protection and role permissions across patch and delete mutations.
 */
const loadAndAuthorizeProject = (allowedRoles: OrgRole[]) => {
  return async (req: Request, _res: Response, next: NextFunction) => {
    const user = req.user!;
    const { id } = req.params;

    try {
      const project = await prisma.project.findUnique({
        where: { id },
      });

      if (!project) {
        return next(new NotFoundError("Project match not found"));
      }

      const membership = await prisma.organizationMember.findUnique({
        where: {
          organizationId_userId: {
            organizationId: project.organizationId,
            userId: user.id,
          },
        },
      });

      if (!membership) {
        return next(new ForbiddenError("Access forbidden; you are not authorized to access this project"));
      }

      if (!allowedRoles.includes(membership.role)) {
        return next(
          new ForbiddenError(
            `Insufficient privileges; required roles: [${allowedRoles.join(", ")}]`,
          ),
        );
      }

      // Inject the fetched project onto the request context for reuse
      (req as any).project = project;
      next();
    } catch (err) {
      return next(err);
    }
  };
};

/**
 * PATCH /api/v1/projects/:id
 * Updates project details (name/description). Gated by Owner, Admin, and Developer roles.
 */
router.patch(
  "/:id",
  loadAndAuthorizeProject([OrgRole.owner, OrgRole.admin, OrgRole.developer]),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { id } = req.params;
      const validation = patchProjectSchema.safeParse(req.body);
      if (!validation.success) {
        return next(new ValidationError("Invalid update properties"));
      }

      const { name, description } = validation.data;

      const project = await prisma.project.update({
        where: { id },
        data: {
          name: name || undefined,
          description: description !== undefined ? description : undefined,
        },
      });

      return res.status(200).json({ project });
    } catch (err) {
      return next(err);
    }
  },
);

/**
 * DELETE /api/v1/projects/:id
 * Deletes the specified project from the organization. Gated by Owner and Admin roles.
 */
router.delete(
  "/:id",
  loadAndAuthorizeProject([OrgRole.owner, OrgRole.admin]),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { id } = req.params;

      await prisma.project.delete({
        where: { id },
      });

      return res.status(200).json({
        message: "Project successfully deleted",
      });
    } catch (err) {
      return next(err);
    }
  },
);

export const projectRoutes = router;
export default projectRoutes;
