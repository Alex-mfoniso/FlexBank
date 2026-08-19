import { z } from "zod";
import { AccountStatus } from "@prisma/client";

export const createAccountSchema = z.object({
  customerId: z
    .string()
    .trim()
    .min(1, "customerId is required"),
  currency: z
    .string()
    .trim()
    .toUpperCase()
    .length(3, "currency must be a 3-letter ISO code"),
  name: z
    .string()
    .trim()
    .min(1, "Account name is required")
    .max(100, "Account name cannot exceed 100 characters"),
});

export const updateAccountSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, "Account name cannot be empty")
    .max(100, "Account name cannot exceed 100 characters")
    .optional(),
  status: z
    .nativeEnum(AccountStatus)
    .optional(),
});
