import { randomUUID } from "node:crypto";
import { blocked, fail, pass, request } from "./lib.mjs";

if (!process.env.API_BASE_URL) {
  blocked("API smoke requires a running integrated API", ["set API_BASE_URL, e.g. http://localhost:3001"]);
  process.exit();
}

const errors = [];
const health = await request("/v1/health/live");
if (!health.response.ok) errors.push(`health/live returned ${health.response.status}`);

const proposalId = "00000000-0000-4000-8000-000000000099";
const unauthorized = await request(`/v1/remediation-proposals/${proposalId}/decision`, {
  method: "POST",
  body: JSON.stringify({ proposalVersion: 1, decision: "APPROVE", comment: null }),
});
if (![401, 403].includes(unauthorized.response.status)) {
  errors.push(`unauthorized approval returned ${unauthorized.response.status}, expected 401/403`);
}

const key = `quality-${randomUUID()}`;
const report = {
  clientReportId: randomUUID(), channel: "WEB_TEXT",
  text: "ServiceGraph deterministic quality report", serviceId: null,
  areaCode: "OTT-CENTRETOWN", latitude: null, longitude: null, sourceLanguage: "en",
};
const create = (payload) => request("/v1/reports", {
  method: "POST", headers: { "idempotency-key": key }, body: JSON.stringify(payload),
});
const first = await create(report);
const replay = await create(report);
const conflict = await create({ ...report, text: `${report.text} changed` });
if (first.response.status !== 201) errors.push(`report create returned ${first.response.status}`);
if (![200, 201].includes(replay.response.status)) errors.push(`idempotent replay returned ${replay.response.status}`);
if (conflict.response.status !== 409) errors.push(`changed fingerprint returned ${conflict.response.status}, expected 409`);
const firstId = first.body?.report?.id;
const replayId = replay.body?.report?.id;
if (firstId && replayId && firstId !== replayId) errors.push("idempotent replay returned a different report id");

if (errors.length) fail("API smoke failed", errors);
else pass("health, unauthorized approval, and report idempotency checks passed");

