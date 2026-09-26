import type { FastifyRequest } from "fastify";

import { ApiError } from "../shared/api-error.js";

export const CANONICAL_PERMISSIONS = [
  "reports:read:own",
  "reports:read:any",
  "incidents:read",
  "incidents:analyze",
  "incidents:update",
  "remediation:propose",
  "remediation:approve",
  "remediation:execute",
  "incidents:verify",
  "communications:create",
  "audit:read",
  "simulator:control",
  "admin:manage",
] as const;
export type CanonicalPermission = (typeof CANONICAL_PERMISSIONS)[number];

export type CanonicalRole =
  | "PUBLIC"
  | "CITIZEN"
  | "OPERATOR"
  | "INCIDENT_MANAGER"
  | "ADMINISTRATOR";

export interface AuthenticatedActor {
  subject: string;
  permissions: ReadonlySet<CanonicalPermission>;
  roles: ReadonlySet<CanonicalRole>;
}

export interface AuthorizationAdapter {
  authenticate(request: FastifyRequest): Promise<AuthenticatedActor>;
}

export class DenyAllAuthorizationAdapter implements AuthorizationAdapter {
  async authenticate(): Promise<AuthenticatedActor> {
    throw new ApiError({
      code: "AUTH_MISSING_TOKEN",
      statusCode: 401,
      message: "Authentication is required.",
    });
  }
}

export async function requirePermission(
  request: FastifyRequest,
  adapter: AuthorizationAdapter,
  permission: CanonicalPermission,
): Promise<AuthenticatedActor> {
  const actor = await adapter.authenticate(request);
  if (!actor.permissions.has(permission)) {
    throw new ApiError({
      code: "AUTH_FORBIDDEN",
      statusCode: 403,
      message: "You do not have permission to perform this action.",
    });
  }
  return actor;
}

export function assertApprovalRole(actor: AuthenticatedActor): void {
  if (
    !actor.roles.has("INCIDENT_MANAGER") &&
    !actor.roles.has("ADMINISTRATOR")
  ) {
    throw new ApiError({
      code: "AUTH_FORBIDDEN",
      statusCode: 403,
      message: "Your role does not allow this action.",
    });
  }
}
