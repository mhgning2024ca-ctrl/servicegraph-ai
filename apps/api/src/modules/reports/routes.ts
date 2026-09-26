import type { FastifyInstance } from "fastify";

import {
  CreateReportRequestSchema,
  CreateReportResponseSchema,
  CustomerReportSchema,
  IncidentIdParamsSchema,
} from "@servicegraph/contracts";

import type { AuthorizationAdapter } from "../../auth/authorization.js";
import type { BackendRepository } from "../../ports/backend-ports.js";
import { ApiError } from "../../shared/api-error.js";
import { parseSchema } from "../../shared/parse-schema.js";
import type { ReportService } from "./report-service.js";

interface RateBucket {
  count: number;
  resetsAt: number;
}

export function registerReportRoutes(
  app: FastifyInstance,
  service: ReportService,
  repository: BackendRepository,
  authorization: AuthorizationAdapter,
): void {
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

  app.get("/v1/reports/:id", async (request) => {
    const { id } = parseSchema(IncidentIdParamsSchema, request.params);
    const actor = await authorization.authenticate(request);
    const report = await repository.findReport(id);
    if (!report) {
      throw new ApiError({ code: "NOT_FOUND", statusCode: 404, message: "Report was not found." });
    }
    if (report.citizenId !== actor.subject && !actor.permissions.has("reports:read:any")) {
      throw new ApiError({ code: "AUTH_FORBIDDEN", statusCode: 403, message: "You do not have permission to read this report." });
    }
    return CustomerReportSchema.parse(report);
  });
}
