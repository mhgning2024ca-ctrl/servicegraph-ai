import { randomUUID } from "node:crypto";
import { authHeaders, blocked, fail, pass, request } from "./lib.mjs";

const requiredEnvironment = [
  "API_BASE_URL",
  "DATABASE_URL",
  "INCIDENT_MANAGER_TOKEN",
  "REPORT_READ_HEADERS_JSON",
  "TELEMETRY_HEADERS_JSON",
  "LIVE_TELEMETRY_NODE_ID",
];
const missing = requiredEnvironment.filter((name) => !process.env[name]?.trim());
if (missing.length) {
  blocked("live vertical E2E requires persisted runtime credentials and telemetry access", [
    `missing ${missing.join(", ")}`,
    "This harness intentionally does not start the deterministic demo runtime or accept INC-2048.",
  ]);
  process.exit();
}

const forbiddenTokens = new Set(["demo-incident-manager", "demo-operator"]);
if (forbiddenTokens.has(process.env.INCIDENT_MANAGER_TOKEN)) {
  fail("live vertical E2E refuses deterministic demo credentials", [
    "Provide an incident-manager token for the authenticated live runtime.",
  ]);
  process.exit();
}

function parseHeaderEnvironment(name) {
  try {
    const value = JSON.parse(process.env[name]);
    if (!value || Array.isArray(value) || typeof value !== "object") throw new Error("not an object");
    return value;
  } catch {
    blocked(`${name} must be a JSON object of request headers`, [
      "Example: {\"authorization\":\"Bearer …\"}; never commit its value.",
    ]);
    process.exit();
  }
}

const managerHeaders = authHeaders();
const reportReadHeaders = parseHeaderEnvironment("REPORT_READ_HEADERS_JSON");
const telemetryHeaders = parseHeaderEnvironment("TELEMETRY_HEADERS_JSON");
const runId = `live-e2e-${randomUUID()}`;
const startedAt = new Date().toISOString();
const errors = [];
const post = (path, body, headers = {}) => request(path, {
  method: "POST", headers: { ...managerHeaders, ...headers }, body: JSON.stringify(body),
});
const requireOk = (result, description) => {
  if (!result.response.ok) errors.push(`${description} returned ${result.response.status}`);
  return result.response.ok;
};
const delay = (milliseconds) => new Promise((resolve) => setTimeout(resolve, milliseconds));

async function poll(description, check, attempts = 15) {
  for (let attempt = 0; attempt < attempts; attempt += 1) {
    const result = await check();
    if (result) return result;
    if (attempt + 1 < attempts) await delay(2_000);
  }
  errors.push(`${description} was not observable within ${attempts * 2} seconds`);
  return null;
}

// Live data must be present before this harness creates any mutable evidence.
// DEMO_MOCK_MODE is a failure, never a substitute for provider verification.
const integrations = await request("/v1/health/integrations", { headers: managerHeaders });
if (requireOk(integrations, "integration health")) {
  const tigerData = integrations.body?.integrations?.find((item) => item.provider === "TIGERDATA");
  if (!tigerData || tigerData.state !== "AVAILABLE" || tigerData.reasonCode === "DEMO_MOCK_MODE") {
    errors.push("live TigerData integration is not AVAILABLE (deterministic/demo data is forbidden)");
  }
}

const reportInput = {
  clientReportId: randomUUID(),
  channel: "WEB_TEXT",
  text: `Live vertical E2E report ${runId}: connectivity degradation requires correlation.`,
  serviceId: null,
  areaCode: "OTT-CENTRETOWN",
  latitude: null,
  longitude: null,
  sourceLanguage: "en",
};
const created = await request("/v1/reports", {
  method: "POST",
  headers: { "idempotency-key": `${runId}-report` },
  body: JSON.stringify(reportInput),
});
if (created.response.status !== 201) errors.push(`unique report create returned ${created.response.status}`);
const reportId = created.body?.report?.id;
if (!reportId) errors.push("unique report create did not return report.id");

if (reportId) {
  const retrieved = await request(`/v1/reports/${reportId}`, { headers: reportReadHeaders });
  if (requireOk(retrieved, "unique report retrieval")) {
    const retrievedReport = retrieved.body?.report ?? retrieved.body;
    if (retrievedReport?.id !== reportId || retrievedReport?.text !== reportInput.text) {
      errors.push("retrieved report does not match the uniquely created report");
    }
  }
}

const telemetry = await request("/v1/telemetry", {
  method: "POST",
  headers: telemetryHeaders,
  body: JSON.stringify([{
    id: randomUUID(),
    nodeId: process.env.LIVE_TELEMETRY_NODE_ID,
    observedAt: new Date().toISOString(),
    metric: "PACKET_LOSS_PCT",
    value: 18.5,
    unit: "percent",
    source: "EXTERNAL",
    scenarioId: null,
  }]),
});
requireOk(telemetry, "live telemetry ingestion");

const incident = await poll("new incident correlation", async () => {
  const list = await request("/v1/incidents?limit=100", { headers: managerHeaders });
  if (!list.response.ok) {
    errors.push(`incident query returned ${list.response.status}`);
    return null;
  }
  const incidents = list.body?.items ?? list.body?.incidents ?? [];
  const candidate = incidents.find((item) =>
    item.incidentNumber !== "INC-2048" && item.createdAt >= startedAt,
  );
  if (!candidate?.id) return null;
  const evidence = await request(`/v1/incidents/${candidate.id}/evidence`, { headers: managerHeaders });
  const evidenceItems = evidence.body?.evidence ?? [];
  return evidence.response.ok && evidenceItems.some((item) =>
    item.sourceId === reportId || String(item.summary ?? "").includes(runId),
  ) ? candidate : null;
});

if (!incident?.id) {
  errors.push("no incident was correlated from this unique live report; preloaded INC-2048 is explicitly rejected");
}

if (incident?.id) {
  const evidence = await request(`/v1/incidents/${incident.id}/evidence`, { headers: managerHeaders });
  const evidenceItems = evidence.body?.evidence ?? [];
  const uniqueEvidence = evidenceItems.filter((item) =>
    item.sourceId === reportId || String(item.summary ?? "").includes(runId),
  );
  if (!requireOk(evidence, "new incident evidence") || !uniqueEvidence.length) {
    errors.push("incident evidence does not link the unique report to this run");
  }

  const analysis = await post(`/v1/incidents/${incident.id}/analyze`, {});
  if (analysis.response.status !== 202) errors.push(`live analysis returned ${analysis.response.status}`);
  const detail = await poll("evidence-backed live analysis", async () => {
    const result = await request(`/v1/incidents/${incident.id}`, { headers: managerHeaders });
    if (!result.response.ok) return null;
    return result.body?.rootCauseHypothesis?.evidenceIds?.length ? result : null;
  });
  const hypothesis = detail?.body?.rootCauseHypothesis;
  if (!hypothesis?.evidenceIds?.length) errors.push("analysis did not persist an evidence-backed root-cause hypothesis");

  const proposal = await post(`/v1/incidents/${incident.id}/remediation-proposals`, {
    version: 1,
    createdBy: "OPERATOR",
    actionType: "REROUTE_TRAFFIC",
    targetNodeId: hypothesis?.targetNodeId ?? process.env.LIVE_TELEMETRY_NODE_ID,
    parameters: { qualityRunId: runId },
    rationale: "Live quality harness remediation after evidence-backed analysis.",
    expectedEffect: "Live telemetry returns below configured verification thresholds.",
    risk: "LOW",
    evidenceIds: hypothesis?.evidenceIds ?? uniqueEvidence.map((item) => item.id),
  });
  const proposalId = proposal.body?.proposal?.id;
  if (!requireOk(proposal, "remediation proposal") || !proposalId) errors.push("live proposal id is missing");

  if (proposalId) {
    const unauthorized = await request(`/v1/remediation-proposals/${proposalId}/decision`, {
      method: "POST",
      body: JSON.stringify({ proposalVersion: 1, decision: "APPROVE", comment: null }),
    });
    if (![401, 403].includes(unauthorized.response.status)) {
      errors.push(`unauthorized approval returned ${unauthorized.response.status}, expected 401/403`);
    }
    const approved = await post(`/v1/remediation-proposals/${proposalId}/decision`, {
      proposalVersion: 1, decision: "APPROVE", comment: `Live E2E approval ${runId}.`,
    });
    requireOk(approved, "incident-manager approval");

    const execution = await post(`/v1/remediation-proposals/${proposalId}/execute`, {}, {
      "idempotency-key": `${runId}-execute`,
    });
    requireOk(execution, "approved remediation execution");
    const verification = await post(`/v1/incidents/${incident.id}/verify`, {});
    if (!requireOk(verification, "post-execution verification") || verification.body?.verification?.passed !== true) {
      errors.push("post-execution verification did not pass from the live telemetry path");
    }
  }

  const resolved = await request(`/v1/incidents/${incident.id}`, { headers: managerHeaders });
  if (!requireOk(resolved, "resolved incident retrieval") || resolved.body?.incident?.status !== "RESOLVED") {
    errors.push("incident did not reach RESOLVED after verification");
  }
  const publicStatus = await request("/v1/status/incidents");
  const publicIncident = publicStatus.body?.incidents?.find((item) => item.id === incident.id);
  if (!requireOk(publicStatus, "public status") || publicIncident?.status !== "RESOLVED") {
    errors.push("public status does not expose the newly resolved live incident");
  }
}

if (errors.length) fail("live report-to-resolution vertical E2E failed", errors);
else pass(`live unique report ${reportId} completed report-to-resolution without deterministic fixtures`);
