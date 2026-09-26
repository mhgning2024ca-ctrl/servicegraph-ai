import { createPublicKey, verify as verifySignature, type JsonWebKey } from "node:crypto";
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

interface JwtHeader {
  alg?: unknown;
  kid?: unknown;
}
interface JwtPayload {
  sub?: unknown;
  iss?: unknown;
  aud?: unknown;
  exp?: unknown;
  nbf?: unknown;
  permissions?: unknown;
  [key: string]: unknown;
}
interface Jwk {
  kid?: string;
  kty?: string;
  n?: string;
  e?: string;
  alg?: string;
  use?: string;
}
interface JwksResponse { keys?: Jwk[] }

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

  const issuer = domain.startsWith("https://")
    ? domain.replace(/\/?$/, "/")
    : `https://${domain.replace(/\/?$/, "")}/`;
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
  private cachedKeys: { expiresAt: number; keys: Jwk[] } | null = null;

  constructor(
    private readonly issuer: string,
    private readonly audience: string,
    private readonly roleClaim: string,
  ) {}

  async authenticate(request: FastifyRequest): Promise<AuthenticatedActor> {
    const token = bearer(request);
    const payload = await this.verifyJwt(token);
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
  }

  private async verifyJwt(token: string): Promise<JwtPayload> {
    const parts = token.split(".");
    if (parts.length !== 3) throw unauthorized();
    const [encodedHeader, encodedPayload, encodedSignature] = parts;
    if (!encodedHeader || !encodedPayload || !encodedSignature) throw unauthorized();

    let header: JwtHeader;
    let payload: JwtPayload;
    try {
      header = JSON.parse(Buffer.from(encodedHeader, "base64url").toString("utf8")) as JwtHeader;
      payload = JSON.parse(Buffer.from(encodedPayload, "base64url").toString("utf8")) as JwtPayload;
    } catch {
      throw unauthorized();
    }

    if (header.alg !== "RS256" || typeof header.kid !== "string") throw unauthorized();
    const jwk = (await this.keys()).find((key) => key.kid === header.kid);
    if (!jwk || jwk.kty !== "RSA" || !jwk.n || !jwk.e) throw unauthorized();

    const key = createPublicKey({
      key: { kty: "RSA", n: jwk.n, e: jwk.e } as JsonWebKey,
      format: "jwk",
    });
    const valid = verifySignature(
      "RSA-SHA256",
      Buffer.from(`${encodedHeader}.${encodedPayload}`),
      key,
      Buffer.from(encodedSignature, "base64url"),
    );
    if (!valid) throw unauthorized();

    const now = Math.floor(Date.now() / 1000);
    if (payload.iss !== this.issuer) throw unauthorized();
    const audiences = Array.isArray(payload.aud) ? payload.aud : [payload.aud];
    if (!audiences.includes(this.audience)) throw unauthorized();
    if (typeof payload.exp !== "number" || payload.exp <= now) throw unauthorized();
    if (typeof payload.nbf === "number" && payload.nbf > now + 30) throw unauthorized();

    return payload;
  }

  private async keys(): Promise<Jwk[]> {
    if (this.cachedKeys && this.cachedKeys.expiresAt > Date.now()) return this.cachedKeys.keys;
    const response = await fetch(new URL(".well-known/jwks.json", this.issuer), {
      signal: AbortSignal.timeout(5_000),
    });
    if (!response.ok) throw unauthorized();
    const data = await response.json() as JwksResponse;
    const keys = Array.isArray(data.keys) ? data.keys : [];
    if (!keys.length) throw unauthorized();
    this.cachedKeys = { keys, expiresAt: Date.now() + 5 * 60_000 };
    return keys;
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
