import { randomUUID } from "node:crypto";

import Fastify from "fastify";
import { describe, expect, it } from "vitest";

import { registerApiInfrastructure } from "../src/app/register-api-infrastructure.js";
import { ApiError } from "../src/shared/api-error.js";

describe("API infrastructure", () => {
  it("propagates a valid incoming correlation ID", async () => {
    const app = Fastify();
    await registerApiInfrastructure(app);
    app.get("/test", async (request) => ({ correlationId: request.correlationId }));

    const correlationId = randomUUID();
    const response = await app.inject({
      method: "GET",
      url: "/test",
      headers: { "x-correlation-id": correlationId },
    });

    expect(response.statusCode).toBe(200);
    expect(response.headers["x-correlation-id"]).toBe(correlationId);
    expect(response.json()).toEqual({ correlationId });
    await app.close();
  });

  it("replaces an invalid incoming correlation ID", async () => {
    const app = Fastify();
    const generated = randomUUID();
    await registerApiInfrastructure(app, { generateCorrelationId: () => generated });
    app.get("/test", async (request) => ({ correlationId: request.correlationId }));

    const response = await app.inject({
      method: "GET",
      url: "/test",
      headers: { "x-correlation-id": "not-a-uuid" },
    });

    expect(response.headers["x-correlation-id"]).toBe(generated);
    expect(response.json()).toEqual({ correlationId: generated });
    await app.close();
  });

  it("serializes domain-safe errors with the canonical envelope", async () => {
    const app = Fastify();
    const correlationId = randomUUID();
    await registerApiInfrastructure(app, { generateCorrelationId: () => correlationId });
    app.get("/test", async () => {
      throw new ApiError({
        code: "SERVICE_UNAVAILABLE",
        statusCode: 503,
        message: "Required persistence is unavailable.",
      });
    });

    const response = await app.inject({ method: "GET", url: "/test" });

    expect(response.statusCode).toBe(503);
    expect(response.json()).toEqual({
      error: {
        code: "SERVICE_UNAVAILABLE",
        message: "Required persistence is unavailable.",
        details: [],
        correlationId,
      },
    });
    await app.close();
  });

  it("does not expose an unexpected error or its stack", async () => {
    const app = Fastify();
    const correlationId = randomUUID();
    await registerApiInfrastructure(app, { generateCorrelationId: () => correlationId });
    app.get("/test", async () => {
      throw new Error("private database detail");
    });

    const response = await app.inject({ method: "GET", url: "/test" });
    const body = response.body;

    expect(response.statusCode).toBe(500);
    expect(body).not.toContain("private database detail");
    expect(body).not.toContain("stack");
    expect(response.json()).toEqual({
      error: {
        code: "INTERNAL_ERROR",
        message: "An unexpected error occurred.",
        details: [],
        correlationId,
      },
    });
    await app.close();
  });
});
