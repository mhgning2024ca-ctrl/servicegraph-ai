import { authenticateAccessToken } from "./authenticate.js";
import { requirePermissions } from "./authorize.js";
import type { CanonicalPermission } from "./constants.js";
import type { Auth0Config, AuthContext, HeaderSource, JwtVerifier } from "./types.js";

export interface AuthenticatedRequest {
  readonly headers: HeaderSource;
  auth?: AuthContext;
}

export function createAuthenticationHook(verifier: JwtVerifier, config: Auth0Config) {
  return async (request: AuthenticatedRequest): Promise<void> => {
    request.auth = await authenticateAccessToken(request.headers, verifier, config);
  };
}

export function createPermissionHook(required: readonly CanonicalPermission[]) {
  return async (request: AuthenticatedRequest): Promise<void> => {
    if (!request.auth) {
      const { AuthError } = await import("./errors.js");
      throw new AuthError("AUTH_MISSING_TOKEN", 401, "Authentication is required.");
    }
    requirePermissions(request.auth, required);
  };
}
