import { z } from "zod";
import { CustomerStatus } from "@prisma/client";

export const createCustomerSchema = z.object({
  externalId: z
    .string()
    .trim()
    .min(1, "externalId is required")
    .max(255, "externalId cannot exceed 255 characters"),
  firstName: z
    .string()
    .trim()
    .min(1, "firstName is required")
    .max(100, "firstName cannot exceed 100 characters"),
  lastName: z
    .string()
    .trim()
    .min(1, "lastName is required")
    .max(100, "lastName cannot exceed 100 characters"),
  email: z
    .string()
    .trim()
    .email("Invalid email format")
    .max(255, "email cannot exceed 255 characters"),
  phone: z
    .string()
    .trim()
    .max(50, "phone cannot exceed 50 characters")
    .optional()
    .nullable(),
  metadata: z
    .record(z.any())
    .optional()
    .nullable(),
});

export const updateCustomerSchema = z.object({
  firstName: z
    .string()
    .trim()
    .min(1, "firstName is required")
    .max(100, "firstName cannot exceed 100 characters")
    .optional(),
  lastName: z
    .string()
    .trim()
    .min(1, "lastName is required")
    .max(100, "lastName cannot exceed 100 characters")
    .optional(),
  email: z
    .string()
    .trim()
    .email("Invalid email format")
    .max(255, "email cannot exceed 255 characters")
    .optional(),
  phone: z
    .string()
    .trim()
    .max(50, "phone cannot exceed 50 characters")
    .optional()
    .nullable(),
  status: z
    .nativeEnum(CustomerStatus)
    .optional(),
  metadata: z
    .record(z.any())
    .optional()
    .nullable(),
});
