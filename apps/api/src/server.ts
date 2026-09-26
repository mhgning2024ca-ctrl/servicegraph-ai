import { createApiApp } from "./app/create-api-app.js";
import { createRuntimeAuthorizationAdapter } from "./auth/runtime-authorization.js";
import { createSeededDemoRepository } from "./mocks/demo-runtime.js";
import { createPostgresPool, PostgresBackendRepository } from "@servicegraph/db";

const port = Number.parseInt(process.env.API_PORT ?? "3001", 10);
const host = process.env.API_HOST ?? "0.0.0.0";
const allowedOrigins = (process.env.CORS_ALLOWED_ORIGINS ?? "http://localhost:3000")
  .split(",")
  .map((value) => value.trim())
  .filter(Boolean);

const databaseUrl = process.env.DATABASE_URL?.trim();
const postgres = databaseUrl ? createPostgresPool(databaseUrl) : null;
const repository = postgres ? new PostgresBackendRepository(postgres) : createSeededDemoRepository();
const authorization = createRuntimeAuthorizationAdapter(process.env);

const app = await createApiApp({
  logger: true,
  allowedOrigins,
  dependencies: {
    repository,
    ...(postgres ? { telemetry: repository } : {}),
    authorization,
  },
});

const shutdown = async (signal: string) => {
  app.log.info({ signal }, "shutdown requested");
  await app.close();
  await postgres?.close();
  process.exit(0);
};

process.once("SIGINT", () => void shutdown("SIGINT"));
process.once("SIGTERM", () => void shutdown("SIGTERM"));

try {
  await app.listen({ host, port });
  app.log.info({ host, port }, "ServiceGraph API listening");
} catch (error) {
  app.log.error(error);
  process.exit(1);
}
