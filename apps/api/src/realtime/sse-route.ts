import type { FastifyInstance } from "fastify";

import {
  OperationalEventEnvelopeSchema,
  type OperationalEventEnvelope,
} from "@servicegraph/contracts";

import {
  requirePermission,
  type AuthorizationAdapter,
} from "../auth/authorization.js";
import type { OperationalEventBus } from "./operational-event-bus.js";

export function serializeSseEvent(event: OperationalEventEnvelope): string {
  return `id: ${event.id}\nevent: ${event.type}\ndata: ${JSON.stringify(event)}\n\n`;
}

export function registerSseRoute(
  app: FastifyInstance,
  events: OperationalEventBus,
  authorization: AuthorizationAdapter,
): void {
  app.get("/v1/events/stream", async (request, reply) => {
    await requirePermission(request, authorization, "incidents:read");
    reply.hijack();
    reply.raw.writeHead(200, {
      "content-type": "text/event-stream; charset=utf-8",
      "cache-control": "no-cache, no-transform",
      connection: "keep-alive",
    });

    const lastEventId = request.headers["last-event-id"];
    for (const event of events.recent(
      typeof lastEventId === "string" ? lastEventId : undefined,
    )) {
      reply.raw.write(serializeSseEvent(OperationalEventEnvelopeSchema.parse(event)));
    }
    const subscription = events.subscribe((event) => {
      reply.raw.write(serializeSseEvent(OperationalEventEnvelopeSchema.parse(event)));
    });
    const heartbeat = setInterval(() => reply.raw.write(": heartbeat\n\n"), 20_000);
    request.raw.once("close", () => {
      clearInterval(heartbeat);
      subscription.close();
    });
  });
}
