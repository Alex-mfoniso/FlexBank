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

export const resolveAccountQuerySchema = z
  .object({
    bank_code: z
      .string()
      .trim()
      .min(1, "bank_code cannot be empty")
      .regex(/^\d{3,6}$/, "bank_code must be between 3 and 6 digits")
      .optional(),
    bankCode: z
      .string()
      .trim()
      .min(1, "bankCode cannot be empty")
      .regex(/^\d{3,6}$/, "bankCode must be between 3 and 6 digits")
      .optional(),
    account_number: z
      .string()
      .trim()
      .min(1, "account_number cannot be empty")
      .regex(/^\d{10}$/, "account_number must be a 10-digit account number")
      .optional(),
    accountNumber: z
      .string()
      .trim()
      .min(1, "accountNumber cannot be empty")
      .regex(/^\d{10}$/, "accountNumber must be a 10-digit account number")
      .optional(),
  })
  .superRefine((data, ctx) => {
    const bankCode = data.bank_code || data.bankCode;
    const accountNumber = data.account_number || data.accountNumber;

    if (!bankCode) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "bank_code is required",
        path: ["bank_code"],
      });
    }

    if (!accountNumber) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "account_number is required",
        path: ["account_number"],
      });
    }
  })
  .transform((data) => ({
    bank_code: (data.bank_code || data.bankCode)!,
    account_number: (data.account_number || data.accountNumber)!,
  }));

