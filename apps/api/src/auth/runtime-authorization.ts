import { createRemoteJWKSet, jwtVerify } from "jose";
import type { FastifyRequest } from "fastify";

import { ApiError } from "../shared/api-error.js";
import type {
  AuthenticatedActor,
  AuthorizationAdapter,
  CanonicalPermission,
  CanonicalRole,
} from "./authorization.js";
import { CANONICAL_PERMISSIONS } from "./authorization.js";

const permissionSet = new Set<string>(CANONICAL_PERMISSIONS);
const roleSet = new Set<string>([
  "PUBLIC",
  "CITIZEN",
  "OPERATOR",
  "INCIDENT_MANAGER",
  "ADMINISTRATOR",
]);

export function createRuntimeAuthorizationAdapter(
  env: NodeJS.ProcessEnv = process.env,
): AuthorizationAdapter {
  const mode = env.AUTH_MODE?.trim().toLowerCase()
    || (env.NODE_ENV === "production" ? "auth0" : "mock");

  if (mode === "mock") {
    if (env.NODE_ENV === "production") {
      throw new Error("AUTH_MODE=mock is forbidden in production.");
    }
    return new DemoAuthorizationAdapter();
  }
  if (mode !== "auth0") throw new Error("AUTH_MODE must be auth0 or mock.");

  const domain = env.AUTH0_DOMAIN?.trim();
  const audience = env.AUTH0_AUDIENCE?.trim();
  if (!domain || !audience) throw new Error("AUTH0_DOMAIN and AUTH0_AUDIENCE are required in Auth0 mode.");

  const issuer = domain.startsWith("https://") ? domain.replace(/\/?$/, "/") : `https://${domain.replace(/\/?$/, "")}/`;
  const roleClaim = env.AUTH0_ROLES_CLAIM?.trim() || "https://servicegraph.ai/roles";
  return new Auth0AuthorizationAdapter(issuer, audience, roleClaim);
}

class DemoAuthorizationAdapter implements AuthorizationAdapter {
  async authenticate(request: FastifyRequest): Promise<AuthenticatedActor> {
    const token = bearer(request);
    if (token === "demo-incident-manager") {
      return {
        subject: "demo|incident-manager",
        permissions: new Set<CanonicalPermission>([
          "reports:read:any",
          "incidents:read",
          "incidents:analyze",
          "incidents:update",
          "remediation:propose",
          "remediation:approve",
          "remediation:execute",
          "incidents:verify",
          "communications:create",
          "simulator:control",
          "audit:read",
        ]),
        roles: new Set<CanonicalRole>(["INCIDENT_MANAGER"]),
      };
    }
    if (token === "demo-operator") {
      return {
        subject: "demo|operator",
        permissions: new Set<CanonicalPermission>([
          "reports:read:any",
          "incidents:read",
          "incidents:analyze",
          "remediation:propose",
        ]),
        roles: new Set<CanonicalRole>(["OPERATOR"]),
      };
    }
    throw unauthorized();
  }
}

class Auth0AuthorizationAdapter implements AuthorizationAdapter {
  private readonly jwks: ReturnType<typeof createRemoteJWKSet>;

  constructor(
    private readonly issuer: string,
    private readonly audience: string,
    private readonly roleClaim: string,
  ) {
    this.jwks = createRemoteJWKSet(new URL(".well-known/jwks.json", issuer));
  }

  async authenticate(request: FastifyRequest): Promise<AuthenticatedActor> {
    const token = bearer(request);
    try {
      const { payload } = await jwtVerify(token, this.jwks, {
        issuer: this.issuer,
        audience: this.audience,
      });
      if (typeof payload.sub !== "string" || !payload.sub) throw unauthorized();

      const rawPermissions = Array.isArray(payload.permissions) ? payload.permissions : [];
      const permissions = new Set(
        rawPermissions.filter(
          (value): value is CanonicalPermission =>
            typeof value === "string" && permissionSet.has(value),
        ),
      );

      const rawRoles = payload[this.roleClaim];
      const roles = new Set(
        (Array.isArray(rawRoles) ? rawRoles : []).filter(
          (value): value is CanonicalRole =>
            typeof value === "string" && roleSet.has(value),
        ),
      );

      return { subject: payload.sub, permissions, roles };
    } catch (error) {
      if (error instanceof ApiError) throw error;
      throw unauthorized();
    }
  }
}

function bearer(request: FastifyRequest): string {
  const header = request.headers.authorization;
  if (typeof header !== "string") throw unauthorized();
  const match = /^Bearer\s+(.+)$/i.exec(header.trim());
  if (!match?.[1]) throw unauthorized();
  return match[1];
}

function unauthorized(): ApiError {
  return new ApiError({
    code: "AUTH_MISSING_TOKEN",
    statusCode: 401,
    message: "Authentication is required.",
  });
}
