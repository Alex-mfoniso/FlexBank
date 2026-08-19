import { prisma } from "../../lib/prisma";
import crypto from "crypto";
import { IdempotencyKeyReusedError, ConflictError } from "../../lib/errors";
import { Prisma } from "@prisma/client";

/**
 * Service managing transactional idempotent retries on PostgreSQL.
 * Guarantees that any state-mutating financial payload is executed exactly once.
 */
export class IdempotencyService {
  /**
   * Generates a unique SHA-256 hash representation of a given request payload.
   */
  static generateHash(payload: any): string {
    const str = typeof payload === "string" ? payload : JSON.stringify(payload || {});
    return crypto.createHash("sha256").update(str).digest("hex");
  }

  /**
   * Orchestrates an operation with strict idempotency guarantees.
   */
  static async runIdempotent<T>(
    projectId: string,
    key: string,
    payload: any,
    ttlSeconds = 86400, // 24 Hours default TTL
    operation: (tx: Prisma.TransactionClient) => Promise<T>,
  ): Promise<T> {
    const hash = this.generateHash(payload);
    const expiresAt = new Date(Date.now() + ttlSeconds * 1000);

    return await prisma.$transaction(async (tx) => {
      const existing = await tx.idempotencyRecord.findUnique({
        where: {
          projectId_key: {
            projectId,
            key,
          },
        },
      });

      if (existing) {
        // Assert payload consistency
        if (existing.requestHash !== hash) {
          throw new IdempotencyKeyReusedError(
            `Idempotency key "${key}" has already been used for a different request payload.`,
          );
        }

        // Return error for concurrent duplicate executions
        if (existing.status === "pending") {
          throw new ConflictError("An operation with this idempotency key is already in progress.");
        }

        // Return the cached successful output immediately
        if (existing.status === "completed") {
          return existing.response as T;
        }

        // If previous run failed, we allow a safe retry
      }

      // Record a new pending lock
      await tx.idempotencyRecord.upsert({
        where: {
          projectId_key: {
            projectId,
            key,
          },
        },
        create: {
          projectId,
          key,
          requestHash: hash,
          status: "pending",
          expiresAt,
        },
        update: {
          requestHash: hash,
          status: "pending",
          expiresAt,
        },
      });

      try {
        const result = await operation(tx);

        // Persist successful outcome payload
        await tx.idempotencyRecord.update({
          where: {
            projectId_key: {
              projectId,
              key,
            },
          },
          data: {
            status: "completed",
            response: result as any,
          },
        });

        return result;
      } catch (err) {
        // Unlock on standard failures so clients can retry safely
        await tx.idempotencyRecord.update({
          where: {
            projectId_key: {
              projectId,
              key,
            },
          },
          data: {
            status: "failed",
          },
        });
        throw err;
      }
    });
  }
}
export default IdempotencyService;
