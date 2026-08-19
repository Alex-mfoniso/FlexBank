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
export type CreateTransferInput = z.infer<typeof CreateTransferSchema>;
