import type { FastifyInstance } from "fastify";

import {
  CreateReportRequestSchema,
  CreateReportResponseSchema,
} from "@servicegraph/contracts";

import { ApiError } from "../../shared/api-error.js";
import { parseSchema } from "../../shared/parse-schema.js";
import type { ReportService } from "./report-service.js";

interface RateBucket {
  count: number;
  resetsAt: number;
}

export function registerReportRoutes(app: FastifyInstance, service: ReportService): void {
  const buckets = new Map<string, RateBucket>();

  app.post("/v1/reports", async (request, reply) => {
    const now = Date.now();
    const current = buckets.get(request.ip);
    const bucket = !current || current.resetsAt <= now
      ? { count: 0, resetsAt: now + 10 * 60 * 1_000 }
      : current;
    bucket.count += 1;
    buckets.set(request.ip, bucket);
    if (bucket.count > 20) {
      throw new ApiError({
        code: "RATE_LIMITED",
        statusCode: 429,
        message: "Too many report submissions. Try again later.",
      });
    }

    const idempotencyKey = request.headers["idempotency-key"];
    if (typeof idempotencyKey !== "string" || idempotencyKey.trim() === "") {
      throw new ApiError({
        code: "VALIDATION_ERROR",
        statusCode: 400,
        message: "Idempotency-Key header is required.",
      });
    }
    const input = parseSchema(CreateReportRequestSchema, request.body);
    const response = await service.create({
      input,
      idempotencyKey,
      correlationId: request.correlationId,
      citizenSubject: null,
    });
    return reply.status(201).send(CreateReportResponseSchema.parse(response));
  });
}
