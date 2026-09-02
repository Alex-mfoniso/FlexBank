import { describe, it, expect, vi, beforeEach } from "vitest";
import request from "supertest";
import { app } from "../src/app";

// Mock the prisma client to isolate unit testing
vi.mock("../src/lib/prisma", () => {
  return {
    prisma: {
      $queryRaw: vi.fn(),
    },
  };
});

// Mock the redis client to isolate unit testing
vi.mock("../src/lib/redis", () => {
  return {
    redis: {
      ping: vi.fn(),
    },
  };
});

import { prisma } from "../src/lib/prisma";
import { redis } from "../src/lib/redis";

describe("Ricarut API Health Endpoints", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("GET /health", () => {
    it("should return 200 and expected status fields", async () => {
      const response = await request(app).get("/health");

      expect(response.status).toBe(200);
      expect(response.body).toEqual({
        status: "ok",
        service: "ricarut-api",
        version: "0.1.0",
      });
    });

    it("should return X-Request-ID in response headers", async () => {
      const response = await request(app).get("/health");
      expect(response.headers).toHaveProperty("x-request-id");
      expect(response.headers["x-request-id"]).toMatch(/^req_/);
    });
  });

  describe("GET /health/ready", () => {
    it("should return 200 and ready status when database and redis are healthy", async () => {
      vi.mocked(prisma.$queryRaw).mockResolvedValueOnce([1]);
      vi.mocked(redis.ping).mockResolvedValueOnce("PONG");

      const response = await request(app).get("/health/ready");

      expect(response.status).toBe(200);
      expect(response.body).toEqual({
        status: "ready",
        checks: {
          database: "ok",
          redis: "ok",
        },
      });
    });

    it("should return 503 and down status when database query fails", async () => {
      vi.mocked(prisma.$queryRaw).mockRejectedValueOnce(new Error("DB connection timeout"));
      vi.mocked(redis.ping).mockResolvedValueOnce("PONG");

      const response = await request(app).get("/health/ready");

      expect(response.status).toBe(503);
      expect(response.body).toEqual({
        status: "down",
        checks: {
          database: "down",
          redis: "ok",
        },
      });
    });

    it("should return 503 and down status when redis ping fails", async () => {
      vi.mocked(prisma.$queryRaw).mockResolvedValueOnce([1]);
      vi.mocked(redis.ping).mockRejectedValueOnce(new Error("Redis disconnected"));

      const response = await request(app).get("/health/ready");

      expect(response.status).toBe(503);
      expect(response.body).toEqual({
        status: "down",
        checks: {
          database: "ok",
          redis: "down",
        },
      });
    });
  });

  describe("Error Handling & Request ID Tracing", () => {
    it("should return 404 and structured JSON response for non-existent routes", async () => {
      const response = await request(app).get("/api/v1/unknown-endpoint-path");

      expect(response.status).toBe(404);
      expect(response.body).toHaveProperty("error");
      expect(response.body.error).toEqual({
        code: "NOT_FOUND",
        message: "Route GET /api/v1/unknown-endpoint-path not found",
        requestId: expect.stringMatching(/^req_/),
      });
    });
  });
});
