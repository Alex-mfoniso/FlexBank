import { describe, it, expect } from "vitest";
import { execSync } from "child_process";
import path from "path";

describe("Environment Configuration Validation", () => {
  it("should fail validation and exit with code 1 if critical variables are missing or invalid", () => {
    const envTsPath = path.resolve(__dirname, "../src/config/env.ts");

    let errorOccurred = false;
    let stderr = "";

    try {
      // Execute the environment script in an isolated child process using tsx
      execSync(`npx tsx "${envTsPath}"`, {
        env: {
          NODE_ENV: "development",
          PORT: "4000",
          LOG_LEVEL: "info",
          CORS_ORIGIN: "http://localhost:3000",
          // Explicitly supply invalid URLs so dotenv doesn't load valid ones from disk
          DATABASE_URL: "invalid-database-url",
          REDIS_URL: "invalid-redis-url",
        },
        stdio: "pipe", // Capture stderr and stdout
      });
    } catch (err) {
      errorOccurred = true;
      const execError = err as { stderr?: Buffer };
      stderr = execError.stderr?.toString() || "";
    }

    // Assert that the child process failed (exited with non-zero code)
    expect(errorOccurred).toBe(true);
    // Assert that the user-friendly Zod failure reasons are printed on stderr
    expect(stderr).toContain("Invalid environment configuration during startup");
    expect(stderr).toContain("DATABASE_URL");
    expect(stderr).toContain("REDIS_URL");
  });
});
