import pino from "pino";
import { env } from "../config/env";

export const logger = pino({
  level: env.LOG_LEVEL,
  // Ensure we output level names (like 'info') as string instead of integers
  formatters: {
    level: (label) => {
      return { level: label };
    },
  },
  timestamp: pino.stdTimeFunctions.isoTime,
  redact: {
    paths: [
      "req.headers.authorization",
      "req.headers.cookie",
      "password",
      "token",
      "apiKey",
      "secret",
      "secretKey",
      "PAYSTACK_SECRET_KEY",
      "paystackSecretKey",
      "authorization",
      "Authorization",
      "headers.authorization",
      "creditCard",
      "account_number",
      "accountNumber",
    ],
    remove: true,
  },
});
