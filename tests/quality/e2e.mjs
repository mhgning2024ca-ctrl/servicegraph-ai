import { randomUUID } from "node:crypto";
import { authHeaders, blocked, fail, pass, request } from "./lib.mjs";

if (!process.env.API_BASE_URL || !process.env.INCIDENT_MANAGER_TOKEN) {
  blocked("canonical E2E requires the integrated runtime and an incident-manager token", [
    "set API_BASE_URL", "set INCIDENT_MANAGER_TOKEN (never commit it)",
  ]);
  process.exit();
}

const headers = authHeaders();
const errors = [];
const post = (path, body, extraHeaders = {}) => request(path, {
  method: "POST", headers: { ...headers, ...extraHeaders }, body: JSON.stringify(body),
});

const scenario = await post("/v1/simulator/scenarios/node17-degradation/start", { speed: 1 });
if (!scenario.response.ok) errors.push(`scenario start returned ${scenario.response.status}`);

for (const [index, text] of [
  "Internet is dropping in Centretown.",
  "Ma connexion est très lente depuis vingt minutes.",
  "Calls and video keep freezing near downtown Ottawa.",
].entries()) {
  const result = await request("/v1/reports", {
    method: "POST",
    headers: { "idempotency-key": `e2e-${randomUUID()}` },
    body: JSON.stringify({
      clientReportId: randomUUID(), channel: "WEB_TEXT", text, serviceId: null,
      areaCode: "OTT-CENTRETOWN", latitude: null, longitude: null,
      sourceLanguage: index === 1 ? "fr" : "en",
    }),
  });
  if (result.response.status !== 201) errors.push(`report ${index + 1} returned ${result.response.status}`);
}

const list = await request("/v1/incidents?limit=100", { headers });
const incidents = list.body?.incidents ?? list.body?.items ?? [];
const incident = incidents.find((item) => item.incidentNumber === "INC-2048") ?? incidents[0];
if (!list.response.ok) errors.push(`incident list returned ${list.response.status}`);
if (!incident?.id) errors.push("no correlated incident is available after scenario reports");

if (incident?.id) {
  const analysis = await post(`/v1/incidents/${incident.id}/analyze`, {});
  if (analysis.response.status !== 202) errors.push(`analysis returned ${analysis.response.status}`);
  const detail = await request(`/v1/incidents/${incident.id}`, { headers });
  const hypothesis = detail.body?.rootCauseHypothesis;
  if (!hypothesis?.evidenceIds?.length) errors.push("root-cause hypothesis has no linked evidence");
  if (hypothesis && hypothesis.targetNodeId == null) errors.push("root-cause hypothesis has no target node");

  const evidence = await request(`/v1/incidents/${incident.id}/evidence`, { headers });
  const evidenceItems = evidence.body?.evidence ?? evidence.body ?? [];
  const evidenceIds = Array.isArray(evidenceItems) ? evidenceItems.map((item) => item.id).filter(Boolean) : [];
  const proposal = await post(`/v1/incidents/${incident.id}/remediation-proposals`, {
    version: 1, createdBy: "OPERATOR", actionType: "REROUTE_TRAFFIC",
    targetNodeId: hypothesis?.targetNodeId ?? null, parameters: { scenario: "node17-degradation" },
    rationale: "Reroute simulated traffic away from the evidence-backed degraded node.",
    expectedEffect: "Packet loss and latency return below deterministic thresholds.",
    risk: "LOW", evidenceIds,
  });
  const proposalId = proposal.body?.proposal?.id ?? proposal.body?.id;
  if (!proposal.response.ok || !proposalId) errors.push(`proposal creation returned ${proposal.response.status}`);

  if (proposalId) {
    const unauth = await request(`/v1/remediation-proposals/${proposalId}/decision`, {
      method: "POST", body: JSON.stringify({ proposalVersion: 1, decision: "APPROVE", comment: null }),
    });
    if (![401, 403].includes(unauth.response.status)) errors.push("unauthorized approval was not rejected");
    const approval = await post(`/v1/remediation-proposals/${proposalId}/decision`, {
      proposalVersion: 1, decision: "APPROVE", comment: "Approved by canonical E2E.",
    });
    if (!approval.response.ok) errors.push(`authorized approval returned ${approval.response.status}`);
    const executionKey = `e2e-execute-${randomUUID()}`;
    const execute = () => post(`/v1/remediation-proposals/${proposalId}/execute`, {}, { "idempotency-key": executionKey });
    const first = await execute();
    const replay = await execute();
    const firstId = first.body?.execution?.id ?? first.body?.id;
    const replayId = replay.body?.execution?.id ?? replay.body?.id;
    if (!first.response.ok || !replay.response.ok || (firstId && replayId && firstId !== replayId)) {
      errors.push("simulator execution is not idempotent");
    }
    const verification = await post(`/v1/incidents/${incident.id}/verify`, {});
    if (!verification.response.ok || verification.body?.verification?.passed === false) {
      errors.push(`verification did not pass (${verification.response.status})`);
    }
    const communication = await post(`/v1/incidents/${incident.id}/communications`, {
      audience: "AFFECTED_USERS", language: "fr",
      text: "Le service est rétabli et la récupération a été vérifiée.",
    });
    if (!communication.response.ok) errors.push(`communication returned ${communication.response.status}`);
  }
}

if (errors.length) fail("canonical report-to-communication E2E failed", errors);
else pass("canonical report-to-correlation-to-safe-resolution E2E passed");

