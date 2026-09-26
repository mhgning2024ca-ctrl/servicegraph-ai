import { AuthError } from "./errors.js";
import type { Auth0Config, RoleExtractor } from "./types.js";

export interface Auth0Environment {
  readonly AUTH0_DOMAIN?: string;
  readonly AUTH0_AUDIENCE?: string;
}

function normalizeIssuer(domain: string): string {
  const candidate = domain.startsWith("https://") ? domain : `https://${domain}`;
  let parsed: URL;
  try {
    parsed = new URL(candidate);
  } catch {
    throw new AuthError("AUTH_CONFIGURATION_ERROR", 503, "Auth0 configuration is invalid.");
  }
  if (parsed.protocol !== "https:" || parsed.username || parsed.password || parsed.pathname !== "/") {
    throw new AuthError("AUTH_CONFIGURATION_ERROR", 503, "Auth0 configuration is invalid.");
  }
  return `${parsed.origin}/`;
}

export function loadAuth0Config(env: Auth0Environment, roleExtractor?: RoleExtractor): Auth0Config {
  const domain = env.AUTH0_DOMAIN?.trim();
  const audience = env.AUTH0_AUDIENCE?.trim();
  if (!domain || !audience) {
    throw new AuthError("AUTH_CONFIGURATION_ERROR", 503, "Auth0 is not configured.");
  }
  return {
    issuer: normalizeIssuer(domain),
    audience,
    ...(roleExtractor ? { roleExtractor } : {}),
  };
}
