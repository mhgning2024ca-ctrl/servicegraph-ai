import type { FastifyInstance } from "fastify";

import { ApiError } from "./api-error.js";

function readValidation(error: unknown): readonly unknown[] | null {
  if (typeof error !== "object" || error === null || !("validation" in error)) {
    return null;
  }

  const validation = (error as { validation?: unknown }).validation;
  return Array.isArray(validation) ? validation : null;
}

function validationDetails(validation: readonly unknown[]): unknown[] {
  return validation.map((rawIssue) => {
    const issue =
      typeof rawIssue === "object" && rawIssue !== null
        ? (rawIssue as Record<string, unknown>)
        : {};

    return {
      path: typeof issue.instancePath === "string" ? issue.instancePath : "",
      message:
        typeof issue.message === "string" ? issue.message : "Invalid value.",
    };
  });
}

export function registerErrorHandler(app: FastifyInstance): void {
  app.setErrorHandler(async (error, request, reply) => {
    if (error instanceof ApiError) {
      return reply.status(error.statusCode).send({
        error: {
          code: error.code,
          message: error.message,
          details: [...error.details],
          correlationId: request.correlationId,
        },
      });
    }

    const validation = readValidation(error);
    if (validation !== null) {
      return reply.status(400).send({
        error: {
          code: "VALIDATION_ERROR",
          message: "Request validation failed.",
          details: validationDetails(validation),
          correlationId: request.correlationId,
        },
      });
    }

    request.log.error(
      { correlationId: request.correlationId, error },
      "Unhandled API error",
    );

    return reply.status(500).send({
      error: {
        code: "INTERNAL_ERROR",
        message: "An unexpected error occurred.",
        details: [],
        correlationId: request.correlationId,
      },
    });
  });
}
