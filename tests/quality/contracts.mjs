import { expectIncludes, fail, pass, requireFiles, text } from "./lib.mjs";

const required = [
  "AGENTS.md",
  "docs/00_MASTER_SPEC.md",
  "docs/03_API_DATA_CONTRACTS.md",
  "docs/08_DEMO_ACCEPTANCE.md",
  "docs/13_SECURITY_RBAC_MATRIX.md",
  "docs/23_CONTRACT_FREEZE_V1.md",
];

if (!requireFiles(required, "canonical contract documents are unavailable")) process.exit();

const api = text("docs/03_API_DATA_CONTRACTS.md");
const rbac = text("docs/13_SECURITY_RBAC_MATRIX.md");
const demo = text("docs/08_DEMO_ACCEPTANCE.md");
const master = text("docs/00_MASTER_SPEC.md");
const errors = [];

for (const value of [
  "DETECTED", "INVESTIGATING", "CONFIRMED", "REMEDIATION_PROPOSED",
  "AWAITING_APPROVAL", "REJECTED", "REMEDIATING", "VERIFYING", "RESOLVED", "CLOSED",
]) expectIncludes(api, value, "IncidentStatus", errors);

for (const route of [
  "POST /v1/reports",
  "GET /v1/incidents",
  "POST /v1/incidents/:id/analyze",
  "POST /v1/remediation-proposals/:proposalId/decision",
  "POST /v1/remediation-proposals/:proposalId/execute",
  "POST /v1/incidents/:id/verify",
  "POST /v1/incidents/:id/communications",
  "POST /v1/simulator/scenarios/:scenarioKey/start",
  "GET /v1/events/stream",
]) expectIncludes(api, route, "API route freeze", errors);

for (const permission of [
  "incidents:read", "incidents:analyze", "remediation:propose", "remediation:approve",
  "remediation:execute", "incidents:verify", "communications:create", "simulator:control",
]) expectIncludes(rbac, permission, "RBAC matrix", errors);

for (const invariant of ["NODE-17", "INC-2048", "unauthorized approval", "idempotent", "FR | EN"]) {
  const haystack = `${demo}\n${api}\n${master}`;
  expectIncludes(haystack, invariant, "demo acceptance", errors);
}

if (errors.length) fail("frozen contracts are incomplete or inconsistent", errors);
else pass("frozen routes, states, RBAC, and demo identifiers are present");
