import { createApiApp } from "../../apps/api/dist/src/app/create-api-app.js";
import { createRuntimeAuthorizationAdapter } from "../../apps/api/dist/src/auth/runtime-authorization.js";
import {
  createSeededDemoRepository,
  DeterministicIncidentAnalysisAdapter,
} from "../../apps/api/dist/src/mocks/demo-runtime.js";

const port = Number.parseInt(process.env.API_PORT ?? "3001", 10);
const host = process.env.API_HOST ?? "127.0.0.1";

// This process is intentionally test-only. It gives the HTTP-level canonical
// E2E the same explicit deterministic analysis injection used by the API's
// in-process canonical test; production runtime composition never falls back.
const app = await createApiApp({
  dependencies: {
    repository: createSeededDemoRepository(),
    authorization: createRuntimeAuthorizationAdapter({ AUTH_MODE: "mock", NODE_ENV: "test" }),
    incidentAnalysis: new DeterministicIncidentAnalysisAdapter(),
  },
});

const close = async () => {
  await app.close();
  process.exit(0);
};
process.once("SIGINT", () => void close());
process.once("SIGTERM", () => void close());

await app.listen({ host, port });
