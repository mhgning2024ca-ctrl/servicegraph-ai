import { existsSync } from "node:fs";
import { resolve } from "node:path";
import { blocked, fail, gitFiles, pass, repoRoot, text } from "./lib.mjs";

const contractRoot = resolve(repoRoot, "packages/contracts/src");
if (!existsSync(contractRoot)) {
  blocked("shared runtime contracts are not integrated", ["packages/contracts/src is absent"]);
  process.exit();
}

const expected = [
  "packages/contracts/src/domain/common.ts",
  "packages/contracts/src/domain/report.ts",
  "packages/contracts/src/domain/incident.ts",
  "packages/contracts/src/domain/telemetry.ts",
  "packages/contracts/src/domain/remediation.ts",
  "packages/contracts/src/domain/communication.ts",
  "packages/contracts/src/api/reports.ts",
  "packages/contracts/src/api/incidents.ts",
  "packages/contracts/src/api/remediation.ts",
  "packages/contracts/src/api/simulator.ts",
  "packages/contracts/src/events/envelope.ts",
  "packages/contracts/src/index.ts",
];
const tracked = new Set(gitFiles());
const errors = expected.filter((path) => !tracked.has(path)).map((path) => `missing ${path}`);
const allContractSource = [...tracked]
  .filter((path) => path.startsWith("packages/contracts/src/") && path.endsWith(".ts"))
  .map(text).join("\n");

for (const token of ["z.object", "IncidentStatus", "CustomerReport", "Telemetry", "Idempotency"]) {
  if (!allContractSource.includes(token)) errors.push(`shared schemas do not expose ${token}`);
}

const competing = [...tracked].filter((path) =>
  path.startsWith("apps/web/") && /(?:contract|domain|schema|types?)\.tsx?$/.test(path));
for (const path of competing) {
  const source = text(path);
  if (/IncidentStatus|CustomerReport|RemediationProposal/.test(source) &&
      !/@servicegraph\/contracts/.test(source)) {
    errors.push(`${path} appears to duplicate a shared public contract`);
  }
}

if (errors.length) fail("runtime contract implementation violates the frozen layout", errors);
else pass("runtime schemas use the canonical shared package layout");

