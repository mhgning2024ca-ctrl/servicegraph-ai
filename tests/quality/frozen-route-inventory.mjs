import { fail, pass, text } from "./lib.mjs";

// This is deliberately an executable inventory, rather than a documentation
// grep. A frozen route is only present when its handler is defined *and* its
// module is wired into createApiApp().
const frozenRoutes = [
  ["POST", "/v1/reports", "modules/reports/routes.ts", "registerReportRoutes"],
  ["GET", "/v1/reports/:id", "modules/reports/routes.ts", "registerReportRoutes"],
  ["POST", "/v1/incidents/:id/affected-confirmations", "modules/public/routes.ts", "registerPublicRoutes"],
  ["GET", "/v1/config/public", "modules/public/routes.ts", "registerPublicRoutes"],
  ["GET", "/v1/status/incidents", "modules/public/routes.ts", "registerPublicRoutes"],
  ["GET", "/v1/incidents", "modules/incidents/full-routes.ts", "registerIncidentRoutes"],
  ["GET", "/v1/incidents/:id", "modules/incidents/full-routes.ts", "registerIncidentRoutes"],
  ["GET", "/v1/incidents/:id/evidence", "modules/incidents/full-routes.ts", "registerIncidentRoutes"],
  ["GET", "/v1/incidents/:id/graph", "modules/incidents/full-routes.ts", "registerIncidentRoutes"],
  ["POST", "/v1/incidents/:id/analyze", "modules/incidents/full-routes.ts", "registerIncidentRoutes"],
  ["POST", "/v1/incidents/:id/remediation-proposals", "modules/remediation/routes.ts", "registerRemediationRoutes"],
  ["POST", "/v1/remediation-proposals/:proposalId/decision", "modules/remediation/routes.ts", "registerRemediationRoutes"],
  ["POST", "/v1/remediation-proposals/:proposalId/execute", "modules/remediation/routes.ts", "registerRemediationRoutes"],
  ["POST", "/v1/incidents/:id/verify", "modules/remediation/routes.ts", "registerRemediationRoutes"],
  ["POST", "/v1/incidents/:id/communications", "modules/communications/routes.ts", "registerCommunicationRoutes"],
  ["POST", "/v1/telemetry", "modules/telemetry/routes.ts", "registerTelemetryRoutes"],
  ["POST", "/v1/simulator/scenarios/:scenarioKey/start", "modules/simulator/routes.ts", "registerSimulatorRoutes"],
  ["GET", "/v1/simulator/scenarios/:scenarioId", "modules/simulator/routes.ts", "registerSimulatorRoutes"],
  ["GET", "/v1/events/stream", "realtime/sse-route.ts", "registerSseRoute"],
  ["GET", "/v1/health/live", "modules/health/routes.ts", "registerHealthRoutes"],
  ["GET", "/v1/health/ready", "modules/health/routes.ts", "registerHealthRoutes"],
  ["GET", "/v1/health/integrations", "modules/health/routes.ts", "registerHealthRoutes"],
  ["POST", "/v1/voice/transcriptions", "modules/voice/routes.ts", "registerVoiceRoutes"],
];

const app = text("apps/api/src/app/create-api-app.ts");
const errors = [];

for (const [method, route, modulePath, registration] of frozenRoutes) {
  const context = `${method} ${route}`;
  let source = "";
  try {
    source = text(`apps/api/src/${modulePath}`);
  } catch {
    errors.push(`${context}: handler module apps/api/src/${modulePath} is missing`);
    continue;
  }
  if (!source.includes(`app.${method.toLowerCase()}("${route}"`)) {
    errors.push(`${context}: handler is absent from ${modulePath}`);
  }
  if (!app.includes(registration)) {
    errors.push(`${context}: ${registration} is not registered by createApiApp()`);
  }
}

if (errors.length) fail("frozen route inventory is not fully registered", errors);
else pass(`all ${frozenRoutes.length} frozen routes have handlers and application registration`);
