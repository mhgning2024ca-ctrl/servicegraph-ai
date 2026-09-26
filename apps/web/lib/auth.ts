export type OperatorProfile = {
  name: string | null;
  nickname: string | null;
  sub: string | null;
  roles: string[];
};

const DEFAULT_ROLES_CLAIM = "https://servicegraph.ai/roles";

export async function getOperatorProfile(): Promise<OperatorProfile | null> {
  let response: Response;
  try {
    response = await fetch("/auth/profile", {
      headers: { Accept: "application/json" },
      cache: "no-store",
      credentials: "same-origin",
    });
  } catch {
    return null;
  }

  if (!response.ok) return null;
  const payload = await response.json().catch(() => null) as Record<string, unknown> | null;
  if (!payload) return null;

  const rolesValue = payload[DEFAULT_ROLES_CLAIM];
  const roles = Array.isArray(rolesValue)
    ? rolesValue.filter((value): value is string => typeof value === "string")
    : [];

  return {
    name: typeof payload.name === "string" ? payload.name : null,
    nickname: typeof payload.nickname === "string" ? payload.nickname : null,
    sub: typeof payload.sub === "string" ? payload.sub : null,
    roles,
  };
}
