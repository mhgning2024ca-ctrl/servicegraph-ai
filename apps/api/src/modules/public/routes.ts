import { randomUUID } from "node:crypto";
import type { FastifyInstance } from "fastify";

import {
  AffectedConfirmationRequestSchema,
  AffectedConfirmationResponseSchema,
  IncidentIdParamsSchema,
  PublicConfigResponseSchema,
  PublicIncidentListResponseSchema,
} from "@servicegraph/contracts";

import type { BackendRepository } from "../../ports/backend-ports.js";
import { ApiError } from "../../shared/api-error.js";
import { parseSchema } from "../../shared/parse-schema.js";
import type { OperationalEventBus } from "../../realtime/operational-event-bus.js";

interface RateBucket { count: number; resetsAt: number }

export function registerPublicRoutes(
  app: FastifyInstance,
  repository: BackendRepository,
  events: OperationalEventBus,
  env: NodeJS.ProcessEnv = process.env,
): void {
  const confirmations = new Map<string, RateBucket>();

  app.get("/v1/config/public", async () => {
    const authMode = (env.AUTH_MODE?.toLowerCase() === "auth0" || env.NODE_ENV === "production")
      ? "auth0"
      : "mock";
    return PublicConfigResponseSchema.parse({
      auth: {
        mode: authMode,
        domain: authMode === "auth0" ? env.AUTH0_DOMAIN ?? null : null,
        clientId: authMode === "auth0" ? env.AUTH0_CLIENT_ID ?? null : null,
        audience: authMode === "auth0" ? env.AUTH0_AUDIENCE ?? null : null,
      },
      features: {
        gemini: Boolean(env.GEMINI_API_KEY),
        tigerData: Boolean(env.DATABASE_URL),
        elevenLabs: Boolean(env.ELEVENLABS_API_KEY),
        backboard: Boolean(env.BACKBOARD_API_KEY && env.BACKBOARD_ASSISTANT_ID),
        simulator: env.SIMULATOR_ENABLED !== "false",
      },
    });
  });

  app.get("/v1/status/incidents", async () => {
    const incidents = await repository.listIncidents({ limit: 50 });
    return PublicIncidentListResponseSchema.parse({
      incidents: incidents
        .filter((incident) => incident.status !== "DETECTED")
        .map((incident) => ({
          id: incident.id,
          incidentNumber: incident.incidentNumber,
          title: incident.title,
          status: incident.status,
          severity: incident.severity,
          affectedUsersEstimate: incident.affectedUsersEstimate,
          affectedAreaCodes: incident.affectedAreaCodes,
          updatedAt: incident.updatedAt,
          resolvedAt: incident.resolvedAt,
        })),
    });
  });

  app.post("/v1/incidents/:id/affected-confirmations", async (request, reply) => {
    enforceRate(confirmations, request.ip, 30, 10 * 60_000);
    const { id } = parseSchema(IncidentIdParamsSchema, request.params);
    const input = parseSchema(AffectedConfirmationRequestSchema, request.body);
    const incident = await repository.findIncident(id);
    if (!incident) {
      throw new ApiError({ code: "NOT_FOUND", statusCode: 404, message: "Incident was not found." });
    }
    const evidenceId = randomUUID();
    const observedAt = new Date().toISOString();
    await repository.saveEvidence({
      id: evidenceId,
      incidentId: id,
      type: "CUSTOMER_REPORT",
      sourceId: randomUUID(),
      summary: `Citizen impact confirmation for ${input.areaCode ?? "unspecified area"}.`,
      observedAt,
      weight: 0.2,
    });
    events.publish({
      id: randomUUID(),
      type: "incident.updated",
      occurredAt: observedAt,
      correlationId: request.correlationId,
      entityId: id,
      payload: { reason: "affected-confirmation", areaCode: input.areaCode, serviceId: input.serviceId },
    });
    return reply.status(202).send(AffectedConfirmationResponseSchema.parse({
      accepted: true,
      incidentId: id,
      evidenceId,
    }));
  });
}

function enforceRate(
  buckets: Map<string, RateBucket>,
  key: string,
  limit: number,
  windowMs: number,
): void {
  const now = Date.now();
  const current = buckets.get(key);
  const bucket = !current || current.resetsAt <= now
    ? { count: 0, resetsAt: now + windowMs }
    : current;
  bucket.count += 1;
  buckets.set(key, bucket);
  if (bucket.count > limit) {
    throw new ApiError({
      code: "RATE_LIMITED",
      statusCode: 429,
      message: "Too many requests. Try again later.",
    });
  }
}
