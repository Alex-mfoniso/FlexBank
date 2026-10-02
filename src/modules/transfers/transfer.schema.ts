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

const DestinationSchema = z.object({
  type: z.enum(["bank_account", "mobile_money"]).optional(),
  country: z.string().optional(),
  provider: z.enum(["paystack", "mpesa"]).optional(),
  bank_code: z.string().optional(),
  bankCode: z.string().optional(),
  account_number: z.string().optional(),
  accountNumber: z.string().optional(),
  account_name: z.string().optional(),
  accountName: z.string().optional(),
  phone_number: z.string().optional(),
  phoneNumber: z.string().optional(),
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
      .string()
      .length(3, "Currency must be a 3-character ISO code")
      .toUpperCase()
      .optional(),
    provider: z.enum(["paystack", "mpesa"]).optional(),
    bank_code: z.string().optional(),
    bankCode: z.string().optional(),
    account_number: z.string().optional(),
    accountNumber: z.string().optional(),
    account_name: z.string().optional(),
    accountName: z.string().optional(),
    phone_number: z.string().optional(),
    phoneNumber: z.string().optional(),
    recipient_name: z.string().optional(),
    recipientName: z.string().optional(),
    destination: DestinationSchema.optional(),
    reference: z
      .string({ required_error: "Reference is required" })
      .min(1, "Reference cannot be empty"),
    reason: z.string().max(255).optional(),
  })
  .superRefine((data, ctx) => {
    // Resolve destination fields from top-level or destination object
    const bankCode =
      data.bank_code || data.bankCode || data.destination?.bank_code || data.destination?.bankCode;
    const accountNumber =
      data.account_number ||
      data.accountNumber ||
      data.destination?.account_number ||
      data.destination?.accountNumber;
    const phoneNumber =
      data.phone_number ||
      data.phoneNumber ||
      data.destination?.phone_number ||
      data.destination?.phoneNumber;
    const destinationType =
      data.destination?.type || (phoneNumber ? "mobile_money" : "bank_account");

    // 1. Must have either bank details or phone number
    if (!bankCode && !phoneNumber) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message:
          "Either bank details (bank_code, account_number) or mobile money details (phone_number) must be provided",
        path: ["destination"],
      });
      return;
    }

    // 2. Validate Bank Account rail
    if (destinationType === "bank_account" || (!phoneNumber && (bankCode || accountNumber))) {
      if (!bankCode) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "bank_code is required for bank transfer",
          path: ["bank_code"],
        });
      } else if (!/^\d{3,6}$/.test(bankCode)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Bank code must be between 3 and 6 digits",
          path: ["bank_code"],
        });
      }

      if (!accountNumber) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "account_number is required for bank transfer",
          path: ["account_number"],
        });
      } else if (!/^\d{10}$/.test(accountNumber)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Account number must be a 10-digit NUBAN string",
          path: ["account_number"],
        });
      }

      if (data.currency && data.currency !== "NGN") {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: `Unsupported currency '${data.currency}' for Nigerian bank transfer. Nigerian bank payouts only support NGN`,
          path: ["currency"],
        });
      }
    }

    // 3. Validate Mobile Money rail (M-Pesa)
    if (destinationType === "mobile_money" || phoneNumber) {
      if (!phoneNumber || phoneNumber.trim() === "") {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "phone_number is required for mobile money transfer",
          path: ["phone_number"],
        });
      }

      if (data.currency && data.currency !== "KES") {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: `Unsupported currency '${data.currency}' for M-Pesa mobile money transfer. Kenyan M-Pesa payouts only support KES`,
          path: ["currency"],
        });
      }
    }
  })
  .transform((data) => {
    const bankCode =
      data.bank_code || data.bankCode || data.destination?.bank_code || data.destination?.bankCode;
    const accountNumber =
      data.account_number ||
      data.accountNumber ||
      data.destination?.account_number ||
      data.destination?.accountNumber;
    const phoneNumber =
      data.phone_number ||
      data.phoneNumber ||
      data.destination?.phone_number ||
      data.destination?.phoneNumber;
    const isMobileMoney = !!phoneNumber || data.destination?.type === "mobile_money";

    const resolvedCurrency = (data.currency || (isMobileMoney ? "KES" : "NGN")).toUpperCase();
    const resolvedProvider =
      data.provider || data.destination?.provider || (isMobileMoney ? "mpesa" : "paystack");

    const accountName =
      data.account_name ||
      data.accountName ||
      data.recipient_name ||
      data.recipientName ||
      data.destination?.account_name ||
      data.destination?.accountName;

    return {
      amount: data.amount,
      currency: resolvedCurrency as "NGN" | "KES",
      reference: data.reference,
      reason: data.reason,
      provider: resolvedProvider as "paystack" | "mpesa",
      bankCode,
      accountNumber,
      accountName,
      phoneNumber,
      recipientName: accountName,
      destination: data.destination
        ? (isMobileMoney
            ? {
                type: "mobile_money" as const,
                country: "KE" as const,
                provider: "mpesa" as const,
                phone_number: phoneNumber!,
                account_name: accountName,
              }
            : {
                type: "bank_account" as const,
                country: "NG" as const,
                provider: "paystack" as const,
                bank_code: bankCode!,
                account_number: accountNumber!,
                account_name: accountName,
              })
        : undefined,
    };
  });

export type CreateTransferInput = z.infer<typeof CreateTransferSchema>;
export type CreateDeveloperTransferInput = z.infer<typeof CreateDeveloperTransferSchema>;


