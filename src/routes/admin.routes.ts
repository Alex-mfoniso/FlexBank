import { Router, Request, Response, NextFunction } from "express";
import { prisma } from "../lib/prisma";
import { authenticateUser, authorizeAdmin } from "../middleware/auth";
import { ValidationError, NotFoundError, ForbiddenError } from "../lib/errors";

const router = Router();

// Secure all admin endpoints with global session checks and administrative role authorization guards
router.use(authenticateUser, authorizeAdmin);

/**
 * Standardized Pagination Helper Structure
 */
const getPaginationParams = (req: Request) => {
  const page = Math.max(1, parseInt(req.query.page as string) || 1);
  const limit = Math.max(1, Math.min(100, parseInt(req.query.limit as string) || 20));
  const skip = (page - 1) * limit;
  return { page, limit, skip };
};

/**
 * GET /api/v1/admin/stats
 * Aggregates core platform metrics and compiles a dynamic live operational activity feed.
 */
router.get("/stats", async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const [
      totalUsers,
      totalProjects,
      totalCustomers,
      totalAccounts,
      totalTransfers,
      totalTransactions,
      totalApiRequests,
      failedApiRequests,
      volumeAggregate,
    ] = await Promise.all([
      prisma.user.count(),
      prisma.project.count(),
      prisma.customer.count(),
      prisma.account.count(),
      prisma.transfer.count(),
      prisma.journal.count(),
      prisma.apiRequestLog.count(),
      prisma.apiRequestLog.count({ where: { statusCode: { gte: 400 } } }),
      prisma.transfer.aggregate({
        where: { status: "successful" },
        _sum: { amount: true },
      }),
    ]);

    // Build operational activity feed on-the-fly by querying recent events across tables
    const [
      recentUsers,
      recentProjects,
      recentCustomers,
      recentAccounts,
      recentTransfers,
      recentLogs,
    ] = await Promise.all([
      prisma.user.findMany({ take: 5, orderBy: { createdAt: "desc" } }),
      prisma.project.findMany({ take: 5, orderBy: { createdAt: "desc" }, include: { organization: true } }),
      prisma.customer.findMany({ take: 5, orderBy: { createdAt: "desc" }, include: { project: true } }),
      prisma.account.findMany({ take: 5, orderBy: { createdAt: "desc" }, include: { project: true } }),
      prisma.transfer.findMany({ take: 5, orderBy: { createdAt: "desc" }, include: { project: true } }),
      prisma.apiRequestLog.findMany({ take: 10, orderBy: { createdAt: "desc" } }),
    ]);

    const activityFeed: any[] = [];

    recentUsers.forEach(u => {
      activityFeed.push({
        type: "developer_registered",
        description: `New developer ${u.firstName} ${u.lastName} (${u.email}) joined`,
        timestamp: u.createdAt,
        project: "N/A",
        status: u.status,
      });
    });

    recentProjects.forEach(p => {
      activityFeed.push({
        type: "project_created",
        description: `Project "${p.name}" initialized under Org: "${p.organization?.name || "N/A"}"`,
        timestamp: p.createdAt,
        project: p.name,
        status: p.status,
      });
    });

    recentCustomers.forEach(c => {
      activityFeed.push({
        type: "customer_created",
        description: `Customer "${c.firstName} ${c.lastName}" (${c.email}) created`,
        timestamp: c.createdAt,
        project: c.project?.name || "N/A",
        status: c.status,
      });
    });

    recentAccounts.forEach(a => {
      activityFeed.push({
        type: "account_created",
        description: `Virtual wallet account (${a.currency}) created for customer Owner ID: ${a.customerId}`,
        timestamp: a.createdAt,
        project: a.project?.name || "N/A",
        status: a.status,
      });
    });

    recentTransfers.forEach(t => {
      activityFeed.push({
        type: t.status === "successful" ? "transfer_completed" : t.status === "failed" ? "transfer_failed" : "transfer_created",
        description: `Transfer of ${t.currency} ${(t.amount / 100).toFixed(2)}: ${t.sourceAccountId} ──> ${t.destinationAccountId}`,
        timestamp: t.createdAt,
        project: t.project?.name || "N/A",
        status: t.status,
      });
    });

    recentLogs.forEach(l => {
      activityFeed.push({
        type: "api_request",
        description: `API Request: ${l.method} ${l.path} (${l.statusCode}) [${l.duration}ms]`,
        timestamp: l.createdAt,
        project: l.projectId || "Platform Admin",
        status: l.statusCode >= 400 ? "failed" : "success",
      });
    });

    // Sort by chronological timestamp
    activityFeed.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

    return res.status(200).json({
      status: "success",
      data: {
        totalUsers,
        totalProjects,
        totalCustomers,
        totalAccounts,
        totalTransfers,
        totalTransactions,
        totalApiRequests,
        failedApiRequests,
        sandboxTransactionVolume: volumeAggregate?._sum?.amount || 0,
        recentActivity: {
          transfers: recentTransfers,
          logs: recentLogs,
          feed: activityFeed.slice(0, 15),
        },
      },
    });
  } catch (err) {
    return next(err);
  }
});

/**
 * GET /api/v1/admin/users
 * Lists developers/users with pagination and email/name filters.
 */
router.get("/users", async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { page, limit, skip } = getPaginationParams(req);
    const search = req.query.search as string;

    const whereClause = search
      ? {
          OR: [
            { email: { contains: search, mode: "insensitive" as any } },
            { firstName: { contains: search, mode: "insensitive" as any } },
            { lastName: { contains: search, mode: "insensitive" as any } },
          ],
        }
      : {};

    const [users, total] = await Promise.all([
      prisma.user.findMany({
        where: whereClause,
        select: {
          id: true,
          email: true,
          firstName: true,
          lastName: true,
          status: true,
          role: true,
          createdAt: true,
        },
        orderBy: { createdAt: "desc" },
        skip,
        take: limit,
      }),
      prisma.user.count({ where: whereClause }),
    ]);

    return res.status(200).json({
      status: "success",
      data: users,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (err) {
    return next(err);
  }
});

/**
 * GET /api/v1/admin/users/:userId
 * Retrieves full operational metadata of an individual user including aggregates.
 */
router.get("/users/:userId", async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { userId } = req.params;

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        status: true,
        role: true,
        createdAt: true,
        memberships: {
          include: {
            organization: {
              include: {
                projects: {
                  include: {
                    _count: {
                      select: {
                        customers: true,
                        accounts: true,
                        transfers: true,
                      },
                    },
                  },
                },
              },
            },
          },
        },
      },
    });

    if (!user) {
      return next(new NotFoundError("Developer account matching ID not found"));
    }

    // Extract dynamic aggregated metrics across all projects the developer owns/accesses
    const projectIds = user.memberships.flatMap(m => m.organization.projects.map(p => p.id));

    const [customerCount, accountCount, transferCount, recentApiActivity] = await Promise.all([
      prisma.customer.count({ where: { projectId: { in: projectIds } } }),
      prisma.account.count({ where: { projectId: { in: projectIds } } }),
      prisma.transfer.count({ where: { projectId: { in: projectIds } } }),
      prisma.apiRequestLog.findMany({
        where: { projectId: { in: projectIds } },
        orderBy: { createdAt: "desc" },
        take: 10,
      }),
    ]);

    return res.status(200).json({
      status: "success",
      data: {
        ...user,
        aggregates: {
          customerCount,
          accountCount,
          transferCount,
        },
        recentApiActivity,
      },
    });
  } catch (err) {
    return next(err);
  }
});

/**
 * GET /api/v1/admin/projects
 * Lists all projects with optional environment, status filters, and search.
 */
router.get("/projects", async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { page, limit, skip } = getPaginationParams(req);
    const search = req.query.search as string;
    const environment = req.query.environment as string;
    const status = req.query.status as string;

    const whereClause: any = {
      ...(environment && { environment: environment as any }),
      ...(status && { status }),
      ...(search && {
        OR: [
          { name: { contains: search, mode: "insensitive" as any } },
          { id: { contains: search, mode: "insensitive" as any } },
        ],
      }),
    };

    const [projects, total] = await Promise.all([
      prisma.project.findMany({
        where: whereClause,
        include: {
          organization: {
            include: {
              members: {
                include: {
                  user: {
                    select: {
                      id: true,
                      email: true,
                      firstName: true,
                      lastName: true,
                    },
                  },
                },
              },
            },
          },
          _count: {
            select: {
              customers: true,
              accounts: true,
              transfers: true,
              journals: true,
            },
          },
        },
        orderBy: { createdAt: "desc" },
        skip,
        take: limit,
      }),
      prisma.project.count({ where: whereClause }),
    ]);

    return res.status(200).json({
      status: "success",
      data: projects,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (err) {
    return next(err);
  }
});

/**
 * GET /api/v1/admin/projects/:projectId
 * Retrieves detailed diagnostics of a specific project workspace.
 */
router.get("/projects/:projectId", async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { projectId } = req.params;

    const project = await prisma.project.findUnique({
      where: { id: projectId },
      include: {
        organization: {
          include: {
            members: {
              include: {
                user: {
                  select: {
                    id: true,
                    email: true,
                    firstName: true,
                    lastName: true,
                  },
                },
              },
            },
          },
        },
        _count: {
          select: {
            customers: true,
            accounts: true,
            transfers: true,
            journals: true,
            apiKeys: true,
          },
        },
      },
    });

    if (!project) {
      return next(new NotFoundError("Project workspace not found"));
    }

    const [recentLogs, recentSandboxEvents, apiKeys] = await Promise.all([
      prisma.apiRequestLog.findMany({
        where: { projectId },
        orderBy: { createdAt: "desc" },
        take: 10,
      }),
      prisma.sandboxEvent.findMany({
        where: { projectId },
        orderBy: { createdAt: "desc" },
        take: 10,
      }),
      prisma.apiKey.findMany({
        where: { projectId },
        select: {
          id: true,
          name: true,
          keyPrefix: true,
          environment: true,
          revokedAt: true,
          createdAt: true,
          lastUsedAt: true,
        },
        orderBy: { createdAt: "desc" },
      }),
    ]);

    return res.status(200).json({
      status: "success",
      data: {
        project,
        apiKeys,
        recentLogs,
        recentSandboxEvents,
      },
    });
  } catch (err) {
    return next(err);
  }
});

/**
 * GET /api/v1/admin/customers
 * Lists customers with search filters and pagination.
 */
router.get("/customers", async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { page, limit, skip } = getPaginationParams(req);
    const search = req.query.search as string;
    const status = req.query.status as string;

    const whereClause: any = {
      ...(status && { status: status as any }),
      ...(search && {
        OR: [
          { email: { contains: search, mode: "insensitive" as any } },
          { firstName: { contains: search, mode: "insensitive" as any } },
          { lastName: { contains: search, mode: "insensitive" as any } },
          { externalId: { contains: search, mode: "insensitive" as any } },
          { id: { contains: search, mode: "insensitive" as any } },
        ],
      }),
    };

    const [customers, total] = await Promise.all([
      prisma.customer.findMany({
        where: whereClause,
        include: {
          project: true,
          accounts: true,
        },
        orderBy: { createdAt: "desc" },
        skip,
        take: limit,
      }),
      prisma.customer.count({ where: whereClause }),
    ]);

    return res.status(200).json({
      status: "success",
      data: customers,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (err) {
    return next(err);
  }
});

/**
 * GET /api/v1/admin/customers/:id
 * Retrieve detail of an individual customer owner.
 */
router.get("/customers/:id", async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;

    const customer = await prisma.customer.findUnique({
      where: { id },
      include: {
        project: true,
        accounts: true,
        transfers: {
          take: 15,
          orderBy: { createdAt: "desc" },
        },
      },
    });

    if (!customer) {
      return next(new NotFoundError("Customer profile matching ID not found"));
    }

    return res.status(200).json({ status: "success", data: customer });
  } catch (err) {
    return next(err);
  }
});

/**
 * GET /api/v1/admin/accounts
 * Lists all active financial virtual accounts with search and pagination.
 */
router.get("/accounts", async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { page, limit, skip } = getPaginationParams(req);
    const search = req.query.search as string;
    const currency = req.query.currency as string;
    const status = req.query.status as string;

    const whereClause: any = {
      ...(currency && { currency }),
      ...(status && { status: status as any }),
      ...(search && {
        OR: [
          { id: { contains: search, mode: "insensitive" as any } },
          { customerId: { contains: search, mode: "insensitive" as any } },
          { customer: { firstName: { contains: search, mode: "insensitive" as any } } },
          { customer: { lastName: { contains: search, mode: "insensitive" as any } } },
        ],
      }),
    };

    const [accounts, total] = await Promise.all([
      prisma.account.findMany({
        where: whereClause,
        include: {
          project: true,
          customer: true,
        },
        orderBy: { createdAt: "desc" },
        skip,
        take: limit,
      }),
      prisma.account.count({ where: whereClause }),
    ]);

    return res.status(200).json({
      status: "success",
      data: accounts,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (err) {
    return next(err);
  }
});

/**
 * GET /api/v1/admin/accounts/:accountId
 * Retrieves details on a single wallet, including double-entry splits.
 */
router.get("/accounts/:accountId", async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { accountId } = req.params;

    const account = await prisma.account.findUnique({
      where: { id: accountId },
      include: {
        project: true,
        customer: true,
      },
    });

    if (!account) {
      return next(new NotFoundError("Wallet account matching ID not found"));
    }

    // Lookup immutable double-entry ledger stream postings
    const ledgerEntries = await prisma.ledgerEntry.findMany({
      where: { ledgerAccountId: accountId },
      include: {
        journal: {
          include: {
            project: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
      take: 25,
    });

    return res.status(200).json({
      status: "success",
      data: {
        account,
        ledgerEntries,
      },
    });
  } catch (err) {
    return next(err);
  }
});

/**
 * GET /api/v1/admin/transfers
 * Lists historical transfer transfers with pagination.
 */
router.get("/transfers", async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { page, limit, skip } = getPaginationParams(req);
    const search = req.query.search as string;
    const status = req.query.status as string;

    const whereClause: any = {
      ...(status && { status: status as any }),
      ...(search && {
        OR: [
          { id: { contains: search, mode: "insensitive" as any } },
          { sourceAccountId: { contains: search, mode: "insensitive" as any } },
          { destinationAccountId: { contains: search, mode: "insensitive" as any } },
          { customerId: { contains: search, mode: "insensitive" as any } },
        ],
      }),
    };

    const [transfers, total] = await Promise.all([
      prisma.transfer.findMany({
        where: whereClause,
        include: {
          project: true,
          customer: true,
          sourceAccount: true,
          destinationAccount: true,
        },
        orderBy: { createdAt: "desc" },
        skip,
        take: limit,
      }),
      prisma.transfer.count({ where: whereClause }),
    ]);

    return res.status(200).json({
      status: "success",
      data: transfers,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (err) {
    return next(err);
  }
});

/**
 * GET /api/v1/admin/transfers/:transferId
 * Displays timelines and journal mappings of a single transfer transaction.
 */
router.get("/transfers/:transferId", async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { transferId } = req.params;

    const transfer = await prisma.transfer.findUnique({
      where: { id: transferId },
      include: {
        project: true,
        customer: true,
        sourceAccount: true,
        destinationAccount: true,
      },
    });

    if (!transfer) {
      return next(new NotFoundError("Transfer matching ID not found"));
    }

    const [providerTransactions, ledgerJournals] = await Promise.all([
      prisma.providerTransaction.findMany({
        where: { transferId },
        orderBy: { createdAt: "desc" },
      }),
      prisma.journal.findMany({
        where: { reference: transferId },
        include: {
          entries: {
            include: {
              ledgerAccount: true,
            },
          },
        },
      }),
    ]);

    return res.status(200).json({
      status: "success",
      data: {
        transfer,
        providerTransactions,
        ledgerJournals,
      },
    });
  } catch (err) {
    return next(err);
  }
});

/**
 * GET /api/v1/admin/transactions
 * Lists core double-entry accounting journals with search and pagination.
 */
router.get("/transactions", async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { page, limit, skip } = getPaginationParams(req);
    const search = req.query.search as string;

    const whereClause = search
      ? {
          OR: [
            { id: { contains: search, mode: "insensitive" as any } },
            { reference: { contains: search, mode: "insensitive" as any } },
          ],
        }
      : {};

    const [journals, total] = await Promise.all([
      prisma.journal.findMany({
        where: whereClause,
        include: {
          project: true,
          entries: {
            include: {
              ledgerAccount: true,
            },
          },
        },
        orderBy: { createdAt: "desc" },
        skip,
        take: limit,
      }),
      prisma.journal.count({ where: whereClause }),
    ]);

    return res.status(200).json({
      status: "success",
      data: journals,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (err) {
    return next(err);
  }
});

/**
 * GET /api/v1/admin/transactions/:id
 * Retrieve details for a single accounting journal.
 */
router.get("/transactions/:id", async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;

    const journal = await prisma.journal.findUnique({
      where: { id },
      include: {
        project: true,
        entries: {
          include: {
            ledgerAccount: true,
          },
        },
      },
    });

    if (!journal) {
      return next(new NotFoundError("Accounting journal matching ID not found"));
    }

    return res.status(200).json({ status: "success", data: journal });
  } catch (err) {
    return next(err);
  }
});

/**
 * Common handler block for API request logs explorer
 */
const handleApiActivityLogs = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { page, limit, skip } = getPaginationParams(req);
    const statusFilter = req.query.status as string; // "success" | "4xx" | "5xx" | "2xx"
    const category = req.query.category as string; // "transfers" | "auth" | "customers" | "accounts" | "other"
    const search = req.query.search as string; // search by requestId or path

    let statusQuery: any = {};
    if (statusFilter === "success" || statusFilter === "2xx") {
      statusQuery = { statusCode: { lt: 400 } };
    } else if (statusFilter === "4xx") {
      statusQuery = { statusCode: { gte: 400, lt: 500 } };
    } else if (statusFilter === "5xx") {
      statusQuery = { statusCode: { gte: 500 } };
    }

    let pathQuery: any = {};
    if (category === "transfers") {
      pathQuery = { path: { contains: "/transfers", mode: "insensitive" as any } };
    } else if (category === "auth") {
      pathQuery = { path: { contains: "/auth", mode: "insensitive" as any } };
    } else if (category === "customers") {
      pathQuery = { path: { contains: "/customers", mode: "insensitive" as any } };
    } else if (category === "accounts") {
      pathQuery = { path: { contains: "/accounts", mode: "insensitive" as any } };
    } else if (category === "other") {
      pathQuery = {
        NOT: [
          { path: { contains: "/transfers", mode: "insensitive" as any } },
          { path: { contains: "/auth", mode: "insensitive" as any } },
          { path: { contains: "/customers", mode: "insensitive" as any } },
          { path: { contains: "/accounts", mode: "insensitive" as any } },
        ],
      };
    }

    let searchQuery: any = {};
    if (search) {
      searchQuery = {
        OR: [
          { requestId: { contains: search, mode: "insensitive" as any } },
          { path: { contains: search, mode: "insensitive" as any } },
        ],
      };
    }

    const whereClause = {
      ...statusQuery,
      ...pathQuery,
      ...searchQuery,
    };

    const [logs, total] = await Promise.all([
      prisma.apiRequestLog.findMany({
        where: whereClause,
        orderBy: { createdAt: "desc" },
        skip,
        take: limit,
      }),
      prisma.apiRequestLog.count({ where: whereClause }),
    ]);

    // Redaction utility matching existing security rules
    const redactedLogs = logs.map(l => ({
      ...l,
      headers: "[REDACTED (ADMIN CONTROL)]",
      apiKey: "[REDACTED]",
      authorization: "[REDACTED]",
    }));

    return res.status(200).json({
      status: "success",
      data: redactedLogs,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (err) {
    return next(err);
  }
};

/**
 * GET /api/v1/admin/api-activity
 * Lists API activity logs. Supporting pagination, filtering, searching and redactions.
 */
router.get("/api-activity", handleApiActivityLogs);

/**
 * GET /api/v1/admin/logs
 * Alias mapping to satisfy different administrative logs URL structures.
 */
router.get("/logs", handleApiActivityLogs);

/**
 * GET /api/v1/admin/sandbox
 * Aggregates mock provider records, sandbox transactions, and sandboxed events.
 */
router.get("/sandbox", async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const [
      sandboxTransfers,
      sandboxAccounts,
      sandboxEvents,
      providerTxCount,
    ] = await Promise.all([
      prisma.transfer.findMany({
        orderBy: { createdAt: "desc" },
        take: 20,
      }),
      prisma.account.findMany({
        orderBy: { createdAt: "desc" },
        take: 20,
      }),
      prisma.sandboxEvent.findMany({
        orderBy: { createdAt: "desc" },
        take: 20,
      }),
      prisma.providerTransaction.count(),
    ]);

    return res.status(200).json({
      status: "success",
      data: {
        providerStatus: "SANDBOX_SIMULATOR_ACTIVE",
        totalProviderTransactions: providerTxCount,
        sandboxTransfers,
        sandboxAccounts,
        sandboxEvents,
      },
    });
  } catch (err) {
    return next(err);
  }
});

/**
 * GET /api/v1/admin/system
 * Returns overall system status check metadata. Excludes any sensitive keys or environments.
 */
router.get("/system", async (_req: Request, res: Response, next: NextFunction) => {
  try {
    // Check DB liveness
    const dbCheck = await prisma.$queryRaw`SELECT 1 as liveness`;
    const dbStatus = Array.isArray(dbCheck) && dbCheck.length > 0 ? "ONLINE" : "OFFLINE";

    return res.status(200).json({
      status: "success",
      data: {
        apiStatus: "ONLINE",
        databaseStatus: dbStatus,
        sandboxProviderStatus: "SANDBOX_SIMULATOR_ACTIVE",
        environment: "SANDBOX_TEST_MODE",
        version: "1.0.0-MVP-REBRAND",
      },
    });
  } catch (err) {
    return res.status(500).json({
      status: "error",
      data: {
        apiStatus: "ONLINE",
        databaseStatus: "OFFLINE",
        sandboxProviderStatus: "UNKNOWN",
        environment: "SANDBOX_TEST_MODE",
        version: "1.0.0-MVP-REBRAND",
      },
    });
  }
});

/**
 * POST /api/v1/admin/users/:userId/toggle-status
 * Safe administrative toggle action: Suspend or activate a user account.
 * Inserts dynamic audit logging trail.
 */
router.post("/users/:userId/toggle-status", async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { userId } = req.params;

    // Reject self-suspension
    if (userId === req.user!.id) {
      return next(new ValidationError("You cannot suspend your own administrative session"));
    }

    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
      return next(new NotFoundError("Target user matching ID not found"));
    }

    const newStatus = user.status === "suspended" ? "active" : "suspended";

    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: { status: newStatus as any },
    });

    // Record Action in our standard AuditLog model
    await prisma.auditLog.create({
      data: {
        userId: req.user!.id,
        action: `admin.user.${newStatus}`,
        metadata: {
          targetUserId: userId,
          targetEmail: user.email,
          previousStatus: user.status,
          newStatus: updatedUser.status,
        },
        ipAddress: req.ip,
        userAgent: req.headers["user-agent"],
      },
    });

    return res.status(200).json({
      status: "success",
      message: `User account status has been updated to ${newStatus}`,
      data: {
        userId: updatedUser.id,
        email: updatedUser.email,
        status: updatedUser.status,
      },
    });
  } catch (err) {
    return next(err);
  }
});

/**
 * POST /api/v1/admin/projects/:projectId/toggle-status
 * Safe administrative toggle action: Suspend or activate a project workspace.
 * Writes audit log tracking lines.
 */
router.post("/projects/:projectId/toggle-status", async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { projectId } = req.params;

    const project = await prisma.project.findUnique({ where: { id: projectId } });
    if (!project) {
      return next(new NotFoundError("Target project matching ID not found"));
    }

    const newStatus = project.status === "suspended" ? "active" : "suspended";

    const updatedProject = await prisma.project.update({
      where: { id: projectId },
      data: { status: newStatus },
    });

    // Record Action in AuditLog model
    await prisma.auditLog.create({
      data: {
        userId: req.user!.id,
        action: `admin.project.${newStatus}`,
        metadata: {
          targetProjectId: projectId,
          projectName: project.name,
          previousStatus: project.status,
          newStatus: updatedProject.status,
        },
        ipAddress: req.ip,
        userAgent: req.headers["user-agent"],
      },
    });

    return res.status(200).json({
      status: "success",
      message: `Project workspace status has been toggled to ${newStatus}`,
      data: {
        projectId: updatedProject.id,
        name: updatedProject.name,
        status: updatedProject.status,
      },
    });
  } catch (err) {
    return next(err);
  }
});

/**
 * POST /api/v1/admin/api-keys/:keyId/revoke
 * Safe administrative toggle action: Force revoke an API key.
 * Logs execution footprint.
 */
router.post("/api-keys/:keyId/revoke", async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { keyId } = req.params;

    const apiKey = await prisma.apiKey.findUnique({ where: { id: keyId } });
    if (!apiKey) {
      return next(new NotFoundError("Target API key matching ID not found"));
    }

    if (apiKey.revokedAt) {
      return next(new ValidationError("API key is already revoked"));
    }

    const updatedKey = await prisma.apiKey.update({
      where: { id: keyId },
      data: { revokedAt: new Date() },
    });

    // Record Action in AuditLog model
    await prisma.auditLog.create({
      data: {
        userId: req.user!.id,
        action: "admin.api_key.revoked",
        metadata: {
          targetKeyId: keyId,
          keyPrefix: apiKey.keyPrefix,
          projectId: apiKey.projectId,
        },
        ipAddress: req.ip,
        userAgent: req.headers["user-agent"],
      },
    });

    return res.status(200).json({
      status: "success",
      message: "API key has been successfully revoked by administrator",
      data: {
        id: updatedKey.id,
        keyPrefix: updatedKey.keyPrefix,
        revokedAt: updatedKey.revokedAt,
      },
    });
  } catch (err) {
    return next(err);
  }
});

export const adminRoutes = router;
export default adminRoutes;
