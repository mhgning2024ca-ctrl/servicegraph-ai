import { randomUUID } from "node:crypto";
import type { FastifyInstance } from "fastify";

import { TelemetryBatchSchema } from "@servicegraph/contracts";

import { requirePermission, type AuthorizationAdapter } from "../../auth/authorization.js";
import type { TelemetryStore } from "../../ports/backend-ports.js";
import type { OperationalEventBus } from "../../realtime/operational-event-bus.js";
import { parseSchema } from "../../shared/parse-schema.js";

/**
 * The production route requires the simulator-control permission. Development
 * uses the deterministic local simulator path and is never presented as a live
 * external telemetry source.
 */
export function registerTelemetryRoutes(
  app: FastifyInstance,
  store: TelemetryStore,
  authorization: AuthorizationAdapter,
  events: OperationalEventBus,
  env: NodeJS.ProcessEnv = process.env,
): void {
  app.post("/v1/telemetry", async (request, reply) => {
    if (env.NODE_ENV === "production") {
      await requirePermission(request, authorization, "simulator:control");
    }
    const samples = parseSchema(TelemetryBatchSchema, request.body);
    await store.saveTelemetrySamples(samples);

    for (const sample of samples) {
      const anomalous =
        (sample.metric === "LATENCY_MS" && sample.value >= 100) ||
        (sample.metric === "PACKET_LOSS_PCT" && sample.value >= 5);
      if (!anomalous) continue;
      events.publish({
        id: randomUUID(),
        type: "telemetry.anomaly",
        occurredAt: sample.observedAt,
        correlationId: request.correlationId,
        entityId: sample.id,
        payload: { nodeId: sample.nodeId, metric: sample.metric, value: sample.value, source: sample.source },
      });
    }
    return reply.status(204).send();
  });
}
