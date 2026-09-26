import { isCanonicalPermission, isCanonicalRole } from "./constants.js";
import { AuthError } from "./errors.js";
import type { Auth0Config, AuthContext, HeaderSource, JwtVerifier } from "./types.js";

export function readBearerToken(headers: HeaderSource): string {
  const header = headers.authorization;
  if (typeof header !== "string") {
    throw new AuthError("AUTH_MISSING_TOKEN", 401, "Authentication is required.");
  }
  const match = /^Bearer ([^\s]+)$/i.exec(header.trim());
  if (!match?.[1]) {
    throw new AuthError("AUTH_INVALID_TOKEN", 401, "The access token is invalid.");
  }
  return match[1];
}

export async function authenticateAccessToken(
  headers: HeaderSource,
  verifier: JwtVerifier,
  config: Auth0Config,
): Promise<AuthContext> {
  const token = readBearerToken(headers);
  let claims;
  try {
    claims = await verifier.verify(token, { issuer: config.issuer, audience: config.audience });
  } catch {
    throw new AuthError("AUTH_INVALID_TOKEN", 401, "The access token is invalid.");
  }

  if (typeof claims.sub !== "string" || claims.sub.length === 0) {
    throw new AuthError("AUTH_INVALID_CLAIMS", 401, "The access token claims are invalid.");
  }

  const permissions = new Set(
    Array.isArray(claims.permissions) ? claims.permissions.filter(isCanonicalPermission) : [],
  );
  const extractedRoles = config.roleExtractor?.(claims);
  const roles = new Set(Array.isArray(extractedRoles) ? extractedRoles.filter(isCanonicalRole) : []);

  return { authSource: verifier.mode, subject: claims.sub, permissions, roles, claims };
}
