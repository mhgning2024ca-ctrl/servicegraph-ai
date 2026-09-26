import type { FastifyRequest } from "fastify";

import { ApiError } from "../shared/api-error.js";
import type {
  AuthenticatedActor,
  AuthorizationAdapter,
} from "./authorization.js";

/** Reads the AuthContext attached by A5's createAuthenticationHook. */
export class A5RequestContextAuthorizationAdapter implements AuthorizationAdapter {
  async authenticate(request: FastifyRequest): Promise<AuthenticatedActor> {
    const context = (request as FastifyRequest & { auth?: AuthenticatedActor }).auth;
    if (!context) {
      throw new ApiError({
        code: "AUTH_MISSING_TOKEN",
        statusCode: 401,
        message: "Authentication is required.",
      });
    }
    return context;
  }
}
