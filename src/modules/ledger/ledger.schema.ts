import { z } from "zod";

/**
 * Zod validation schema for internal transfer execution payloads.
 */
export const internalTransferSchema = z.object({
  sourceAccountId: z
    .string()
    .trim()
    .min(1, "sourceAccountId is required"),
  destinationAccountId: z
    .string()
    .trim()
    .min(1, "destinationAccountId is required"),
  amount: z
    .number()
    .int("amount must be an integer")
    .positive("amount must be a positive integer in minor units"),
  currency: z
    .string()
    .trim()
    .toUpperCase()
    .length(3, "currency must be a 3-letter ISO code"),
  reference: z
    .string()
    .trim()
    .min(1, "reference is required"),
  description: z
    .string()
    .trim()
    .max(255, "description cannot exceed 255 characters")
    .optional(),
  metadata: z
    .record(z.any())
    .optional(),
});

/**
 * Zod validation schema for cursor-paginated ledger query strings.
 */
export const ledgerQuerySchema = z.object({
  limit: z
    .string()
    .optional()
    .transform((val) => (val ? Math.min(Math.max(parseInt(val, 10), 1), 100) : 50)),
  cursor: z
    .string()
    .optional(),
});
