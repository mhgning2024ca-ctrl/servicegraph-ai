import { execFileSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

export const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), "../..");

export function pass(message) {
  console.log(`PASS: ${message}`);
}

export function fail(message, details = []) {
  console.error(`FAIL: ${message}`);
  for (const detail of details) console.error(`  - ${detail}`);
  process.exitCode = 1;
}

export function blocked(message, details = []) {
  console.warn(`BLOCKED: ${message}`);
  for (const detail of details) console.warn(`  - ${detail}`);
  if (!process.exitCode) process.exitCode = 2;
}

export function requireFiles(paths, purpose) {
  const missing = paths.filter((path) => !existsSync(resolve(repoRoot, path)));
  if (missing.length) {
    blocked(purpose, missing.map((path) => `missing ${path}`));
    return false;
  }
  return true;
}

export function text(path) {
  return readFileSync(resolve(repoRoot, path), "utf8");
}

export function gitFiles() {
  return execFileSync("git", ["ls-files", "-z"], {
    cwd: repoRoot,
    encoding: "utf8",
  }).split("\0").filter(Boolean);
}

export function expectIncludes(content, expected, context, errors) {
  if (!content.includes(expected)) errors.push(`${context}: missing ${JSON.stringify(expected)}`);
}

export async function request(path, options = {}) {
  const base = process.env.API_BASE_URL?.replace(/\/$/, "");
  if (!base) throw new Error("API_BASE_URL is not set");
  const headers = { accept: "application/json", ...(options.headers ?? {}) };
  if (options.body && !headers["content-type"]) headers["content-type"] = "application/json";
  const response = await fetch(`${base}${path}`, { ...options, headers });
  const raw = await response.text();
  let body = null;
  if (raw) {
    try { body = JSON.parse(raw); } catch { body = raw; }
  }
  return { response, body };
}

export function authHeaders(token = process.env.INCIDENT_MANAGER_TOKEN) {
  return token ? { authorization: `Bearer ${token}` } : {};
}

