import assert from "node:assert/strict";
import test from "node:test";
import {
  AuthError,
  authenticateAccessToken,
  authorizeRemediationApproval,
  createClaimKeyRoleExtractor,
  createDeterministicJwtVerifier,
  loadAuth0Config,
  ROLE_PERMISSIONS,
} from "../src/index.js";

const config = loadAuth0Config(
  { AUTH0_DOMAIN: "tenant.example.auth0.com", AUTH0_AUDIENCE: "servicegraph-api" },
  createClaimKeyRoleExtractor("test/roles"),
);
const verifier = createDeterministicJwtVerifier(
  {
    manager: {
      sub: "auth0|manager",
      permissions: [...ROLE_PERMISSIONS.INCIDENT_MANAGER],
      "test/roles": ["INCIDENT_MANAGER"],
    },
    operator: {
      sub: "auth0|operator",
      permissions: [...ROLE_PERMISSIONS.OPERATOR],
      "test/roles": ["OPERATOR"],
    },
    permissionOnly: { sub: "auth0|claim-gap", permissions: ["remediation:approve"] },
    expired: { sub: "auth0|expired", exp: 99, permissions: ["incidents:read"] },
  },
  () => 100,
);

test("missing and malformed bearer tokens fail closed", async () => {
  await assert.rejects(authenticateAccessToken({}, verifier, config), AuthError);
  await assert.rejects(
    authenticateAccessToken({ authorization: "Basic abc" }, verifier, config),
    (error: unknown) => error instanceof AuthError && error.statusCode === 401,
  );
});

test("invalid tokens fail closed without leaking verifier errors", async () => {
  await assert.rejects(
    authenticateAccessToken({ authorization: "Bearer invalid" }, verifier, config),
    (error: unknown) =>
      error instanceof AuthError && error.code === "AUTH_INVALID_TOKEN" && !error.message.includes("INVALID_TEST_TOKEN"),
  );
});

test("expired tokens fail closed", async () => {
  await assert.rejects(
    authenticateAccessToken({ authorization: "Bearer expired" }, verifier, config),
    (error: unknown) => error instanceof AuthError && error.code === "AUTH_INVALID_TOKEN",
  );
});

test("operator cannot approve remediation", async () => {
  const context = await authenticateAccessToken({ authorization: "Bearer operator" }, verifier, config);
  assert.throws(() => authorizeRemediationApproval(context), /permission/i);
});

test("permission without an extracted canonical role cannot approve", async () => {
  const context = await authenticateAccessToken(
    { authorization: "Bearer permissionOnly" },
    verifier,
    config,
  );
  assert.throws(() => authorizeRemediationApproval(context), /role/i);
});

test("incident manager with the canonical permission can approve", async () => {
  const context = await authenticateAccessToken({ authorization: "Bearer manager" }, verifier, config);
  assert.equal(context.authSource, "MOCK_AUTH");
  assert.doesNotThrow(() => authorizeRemediationApproval(context));
});

test("unknown permissions and roles are discarded", async () => {
  const customVerifier = createDeterministicJwtVerifier({
    unknown: { sub: "auth0|unknown", permissions: ["root:everything"], "test/roles": ["SUPERUSER"] },
  });
  const context = await authenticateAccessToken({ authorization: "Bearer unknown" }, customVerifier, config);
  assert.equal(context.permissions.size, 0);
  assert.equal(context.roles.size, 0);
});
