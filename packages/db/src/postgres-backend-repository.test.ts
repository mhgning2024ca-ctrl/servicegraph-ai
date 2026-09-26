import assert from "node:assert/strict";
import test from "node:test";

import { PostgresBackendRepository, type PostgresClient } from "./postgres-backend-repository.js";

const reportId = "4b6a4537-2e9c-4e80-94e0-108db1b544fe";
const clientReportId = "6b6a4537-2e9c-4e80-94e0-108db1b544fe";
const nodeId = "17171717-1717-4717-8717-171717171717";

test("PostgresBackendRepository binds report and telemetry values without interpolating them", async () => {
  const calls: Array<{ text: string; values?: readonly unknown[] }> = [];
  const client: PostgresClient = {
    async query(query) {
      calls.push(query);
      if (query.text.includes("INSERT INTO customer_reports")) {
        const values = query.values!;
        return { rows: [{
          id: values[0], client_report_id: values[1], created_at: values[2], channel: values[3],
          state: values[4], report_text: values[5], transcript: values[6], audio_asset_id: values[7],
          service_id: values[8], area_code: values[9], latitude: values[10], longitude: values[11],
          symptom_codes: values[12], citizen_subject: values[13], correlated_incident_id: values[14],
          source_language: values[15],
        }] };
      }
      return { rows: [] };
    },
  };
  const repository = new PostgresBackendRepository(client);
  const created = await repository.createReport({
    id: reportId, clientReportId, createdAt: "2026-09-26T12:00:00.000Z", channel: "WEB_TEXT",
    state: "RECEIVED", text: "Connectivity is intermittent", transcript: null, audioAssetId: null,
    serviceId: null, areaCode: "OTT-CENTRETOWN", latitude: null, longitude: null, symptomCodes: [],
    citizenId: null, correlatedIncidentId: null, sourceLanguage: "en",
  });
  await repository.saveTelemetrySamples([{
    id: "71717171-1717-4717-8717-171717171717", nodeId, observedAt: "2026-09-26T12:01:00.000Z",
    metric: "PACKET_LOSS_PCT", value: 21, unit: "percent", source: "SIMULATOR", scenarioId: null,
  }]);

  assert.equal(created.id, reportId);
  const [reportInsert, telemetryInsert] = calls;
  assert.ok(reportInsert?.text.includes("$1::uuid"));
  assert.doesNotMatch(reportInsert!.text, /Connectivity is intermittent/);
  assert.ok(telemetryInsert?.text.includes("$1::uuid"));
  assert.doesNotMatch(telemetryInsert!.text, new RegExp(nodeId));
  assert.equal(telemetryInsert?.values?.[1], nodeId);
});

test("PostgresBackendRepository readiness requires the migrated report and telemetry tables", async () => {
  const ready = new PostgresBackendRepository({
    async query() { return { rows: [{ reports: "customer_reports", telemetry: "telemetry_samples" }] }; },
  });
  const missing = new PostgresBackendRepository({
    async query() { return { rows: [{ reports: "customer_reports", telemetry: null }] }; },
  });
  assert.equal(await ready.isReady(), true);
  assert.equal(await missing.isReady(), false);
});
