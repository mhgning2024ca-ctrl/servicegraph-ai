import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { fail, gitFiles, pass, repoRoot } from "./lib.mjs";

const findings = [];
const binaryExtensions = /\.(?:png|jpe?g|gif|webp|ico|woff2?|pdf|mp3|wav)$/i;
const exactSecretNames = /^(?:GEMINI_API_KEY|ELEVENLABS_API_KEY|AUTH0_CLIENT_SECRET|AUTH0_SECRET|BACKBOARD_API_KEY|DATABASE_URL)$/;
const tokenPatterns = [
  [/-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----/, "private key"],
  [/AIza[0-9A-Za-z_-]{30,}/, "Google API key"],
  [/sk-[0-9A-Za-z_-]{24,}/, "secret token"],
  [/github_pat_[0-9A-Za-z_]{30,}/, "GitHub token"],
];

for (const path of gitFiles()) {
  if (binaryExtensions.test(path) || path.endsWith("pnpm-lock.yaml")) continue;
  let source;
  try { source = readFileSync(resolve(repoRoot, path), "utf8"); } catch { continue; }
  for (const [pattern, label] of tokenPatterns) {
    if (pattern.test(source)) findings.push(`${path}: possible ${label}`);
  }
  for (const [index, line] of source.split(/\r?\n/).entries()) {
    const assignment = line.match(/^\s*([A-Z][A-Z0-9_]*)\s*=\s*(.+?)\s*$/);
    if (!assignment || !exactSecretNames.test(assignment[1])) continue;
    const value = assignment[2].replace(/^['"]|['"]$/g, "");
    if (value && !/(example|placeholder|change[-_ ]?me|your[-_ ]|<.+>|\$\{|localhost)/i.test(value)) {
      findings.push(`${path}:${index + 1}: non-placeholder ${assignment[1]}`);
    }
  }
}

if (findings.length) fail("potential committed secrets detected", findings);
else pass("tracked files contain no recognized real-secret patterns");

