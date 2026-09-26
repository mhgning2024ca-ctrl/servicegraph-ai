import type { CanonicalPermission, CanonicalRole } from "./constants.js";
import { AuthError } from "./errors.js";
import type { AuthContext } from "./types.js";

export function requirePermissions(
  context: AuthContext,
  required: readonly CanonicalPermission[],
): void {
  if (!required.every((permission) => context.permissions.has(permission))) {
    throw new AuthError("AUTH_FORBIDDEN", 403, "You do not have permission to perform this action.");
  }
}

export function requireAnyRole(context: AuthContext, allowed: readonly CanonicalRole[]): void {
  if (!allowed.some((role) => context.roles.has(role))) {
    throw new AuthError("AUTH_FORBIDDEN", 403, "Your role does not allow this action.");
  }
}

export function authorizeRemediationApproval(context: AuthContext): void {
  requirePermissions(context, ["remediation:approve"]);
  requireAnyRole(context, ["INCIDENT_MANAGER", "ADMINISTRATOR"]);
}
