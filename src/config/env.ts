import dotenv from "dotenv";
import { z } from "zod";

// Load environment variables from .env file
dotenv.config();

const envSchema = z.object({
  NODE_ENV: z.enum(["development", "production", "test"]).default("development"),
  PORT: z.coerce.number().int().positive().default(4000),
  DATABASE_URL: z.string().url("DATABASE_URL must be a valid connection URL"),
  REDIS_URL: z.string().url("REDIS_URL must be a valid Redis URL"),
  LOG_LEVEL: z.enum(["fatal", "error", "warn", "info", "debug", "trace", "silent"]).default("info"),
  CORS_ORIGIN: z.string().min(1, "CORS_ORIGIN is required"),
  JWT_SECRET: z.string().min(32, "JWT_SECRET must be at least 32 characters long"),
  APP_NAME: z.string().default("Ricarut"),
  APP_DESCRIPTION: z.string().default("Financial infrastructure for African developers"),
});

const parsedEnv = envSchema.safeParse(process.env);

if (!parsedEnv.success) {
  // Print human-readable validation errors before failing fast
  // eslint-disable-next-line no-console
  console.error("❌ Invalid environment configuration during startup:");
  parsedEnv.error.issues.forEach((issue) => {
    // eslint-disable-next-line no-console
    console.error(`   - [${issue.path.join(".")}] ${issue.message}`);
  });
  process.exit(1);
}

export const env = parsedEnv.data;
export type Env = z.infer<typeof envSchema>;
