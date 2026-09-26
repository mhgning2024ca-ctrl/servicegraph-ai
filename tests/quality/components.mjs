import { execFileSync } from "node:child_process";
import { existsSync } from "node:fs";
import { resolve } from "node:path";
import { blocked, fail, pass, repoRoot } from "./lib.mjs";

const suites = [
  ["data repository", "packages/db/package.json"],
  ["deterministic simulator", "services/network-simulator/package.json"],
  ["Gemini malformed/degraded output", "services/ai/package.json"],
  ["Backboard degraded mode", "services/memory/backboard/package.json"],
  ["Auth0 authorization", "packages/auth/package.json"],
  ["ElevenLabs degraded mode", "services/voice/elevenlabs/package.json"],
];
const missing = suites.filter(([, manifest]) => !existsSync(resolve(repoRoot, manifest)));
if (missing.length) {
  blocked("component suites await integration", missing.map(([name, manifest]) => `${name}: ${manifest}`));
  process.exit();
}

const failures = [];
for (const [name, manifest] of suites) {
  const cwd = resolve(repoRoot, manifest, "..");
  try {
    execFileSync("pnpm", ["test"], { cwd, stdio: "inherit", env: { ...process.env, CI: "1" } });
  } catch (error) {
    failures.push(`${name}: test command exited ${error.status ?? "unexpectedly"}`);
  }
}

if (failures.length) fail("one or more component quality suites failed", failures);
else pass("simulator determinism, malformed AI, auth, and provider degradation suites passed");

