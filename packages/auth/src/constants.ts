export const CANONICAL_ROLES = [
  "PUBLIC",
  "CITIZEN",
  "OPERATOR",
  "INCIDENT_MANAGER",
  "ADMINISTRATOR",
] as const;

export type CanonicalRole = (typeof CANONICAL_ROLES)[number];

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

const OPERATOR_PERMISSIONS = [
  "reports:read:any",
  "incidents:read",
  "incidents:analyze",
  "remediation:propose",
] as const satisfies readonly CanonicalPermission[];

const INCIDENT_MANAGER_PERMISSIONS = [
  ...OPERATOR_PERMISSIONS,
  "incidents:update",
  "remediation:approve",
  "remediation:execute",
  "incidents:verify",
  "communications:create",
  "simulator:control",
] as const satisfies readonly CanonicalPermission[];

export const ROLE_PERMISSIONS: Readonly<Record<CanonicalRole, readonly CanonicalPermission[]>> = {
  PUBLIC: [],
  CITIZEN: ["reports:read:own"],
  OPERATOR: OPERATOR_PERMISSIONS,
  INCIDENT_MANAGER: INCIDENT_MANAGER_PERMISSIONS,
  ADMINISTRATOR: [...INCIDENT_MANAGER_PERMISSIONS, "audit:read", "admin:manage"],
};

const roleSet = new Set<string>(CANONICAL_ROLES);
const permissionSet = new Set<string>(CANONICAL_PERMISSIONS);

export function isCanonicalRole(value: unknown): value is CanonicalRole {
  return typeof value === "string" && roleSet.has(value);
}

export function isCanonicalPermission(value: unknown): value is CanonicalPermission {
  return typeof value === "string" && permissionSet.has(value);
}
