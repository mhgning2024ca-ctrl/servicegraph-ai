import { randomUUID } from "node:crypto";

import type { FastifyInstance } from "fastify";

declare module "fastify" {
  interface FastifyRequest {
    correlationId: string;
  }
}

const CORRELATION_HEADER = "x-correlation-id";

export interface CorrelationIdOptions {
  generateCorrelationId?: () => string;
}

function isUuid(value: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/iu.test(
    value,
  );
}

function readIncomingCorrelationId(value: string | string[] | undefined): string | null {
  if (typeof value !== "string") {
    return null;
  }

  const candidate = value.trim();
  return isUuid(candidate) ? candidate : null;
}

export async function registerCorrelationIds(
  app: FastifyInstance,
  options: CorrelationIdOptions = {},
): Promise<void> {
  const generateCorrelationId = options.generateCorrelationId ?? randomUUID;

  app.decorateRequest("correlationId", "");
  app.addHook("onRequest", async (request, reply) => {
    const incomingId = readIncomingCorrelationId(request.headers[CORRELATION_HEADER]);
    const correlationId = incomingId ?? generateCorrelationId();

    request.correlationId = correlationId;
    reply.header(CORRELATION_HEADER, correlationId);
  });
}
