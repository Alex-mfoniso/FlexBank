import { z } from "zod";

export const CreateTransferSchema = z.object({
  type: z.enum(["internal", "external"]),
  sourceAccountId: z.string().min(1, "Source account ID is required"),
  destinationAccountId: z.string().optional(),
  amount: z.number().int().positive("Amount must be a positive integer in minor units"),
  currency: z.string().length(3, "Currency must be a 3-character ISO code").toUpperCase(),
  reference: z.string().min(1, "Reference is required"),
  beneficiary: z
    .object({
      type: z.enum(["bank_account"]),
      bankCode: z.string().min(1, "Bank code is required"),
      accountNumber: z.string().min(1, "Account number is required"),
      accountName: z.string().optional(),
    })
    .optional(),
}).refine(
  (data) => {
    if (data.type === "internal") {
      return !!data.destinationAccountId;
    }
    if (data.type === "external") {
      return !!data.beneficiary;
    }
    return true;
  },
  {
    message: "Destination account ID is required for internal transfers; beneficiary details are required for external transfers",
    path: ["destinationAccountId"],
  }
);

export const QueryTransfersSchema = z.object({
  limit: z
    .preprocess((val) => (val ? Number(val) : 50), z.number().int().positive().max(100))
    .optional(),
  cursor: z.string().optional(),
  status: z
    .enum(["created", "pending", "processing", "successful", "failed", "reversed", "cancelled"])
    .optional(),
  type: z.enum(["internal", "external"]).optional(),
  customerId: z.string().optional(),
  sourceAccountId: z.string().optional(),
  reference: z.string().optional(),
});

export const CreateDeveloperTransferSchema = z
  .object({
    amount: z
      .number({
        required_error: "Amount is required",
        invalid_type_error: "Amount must be a number",
      })
      .int("Amount must be an integer in minor units")
      .positive("Amount must be a positive integer"),
    currency: z
      .string({ required_error: "Currency is required" })
      .length(3, "Currency must be a 3-character ISO code")
      .toUpperCase()
      .refine((val) => val === "NGN", {
        message: "Unsupported currency. Currently only NGN is supported for transfers",
      }),
    bank_code: z
      .string()
      .regex(/^\d{3,6}$/, "Bank code must be between 3 and 6 digits")
      .optional(),
    bankCode: z
      .string()
      .regex(/^\d{3,6}$/, "Bank code must be between 3 and 6 digits")
      .optional(),
    account_number: z
      .string()
      .regex(/^\d{10}$/, "Account number must be a 10-digit NUBAN string")
      .optional(),
    accountNumber: z
      .string()
      .regex(/^\d{10}$/, "Account number must be a 10-digit NUBAN string")
      .optional(),
    reference: z
      .string({ required_error: "Reference is required" })
      .min(1, "Reference cannot be empty"),
    reason: z.string().max(255).optional(),
    account_name: z.string().optional(),
    accountName: z.string().optional(),
  })
  .refine((data) => !!(data.bank_code || data.bankCode), {
    message: "bank_code is required",
    path: ["bank_code"],
  })
  .refine((data) => !!(data.account_number || data.accountNumber), {
    message: "account_number is required",
    path: ["account_number"],
  })
  .transform((data) => ({
    amount: data.amount,
    currency: data.currency,
    bankCode: (data.bank_code || data.bankCode)!,
    accountNumber: (data.account_number || data.accountNumber)!,
    reference: data.reference,
    reason: data.reason,
    accountName: data.account_name || data.accountName,
  }));

export type CreateTransferInput = z.infer<typeof CreateTransferSchema>;
export type CreateDeveloperTransferInput = z.infer<typeof CreateDeveloperTransferSchema>;

