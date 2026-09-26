import assert from "node:assert/strict";
import test from "node:test";
import {
  buildNode17Scenario,
  degradationFrames,
  DeterministicScenarioController,
  recoveryFrames,
} from "./node17-scenario.js";

test("NODE-17 scenario is deterministic and includes degradation plus recovery", () => {
  const first = buildNode17Scenario("2026-09-26T12:00:00Z");
  const second = buildNode17Scenario("2026-09-26T12:00:00Z");

  assert.deepEqual(first, second);
  assert.equal(first.frames.length, 17);
  assert.equal(degradationFrames(first).length, 12);
  assert.equal(recoveryFrames(first).length, 5);
  assert.equal(first.frames[10]?.samples[0]?.value, 242);
  assert.equal(first.frames[10]?.samples[1]?.value, 21);
  assert.equal(first.frames[16]?.samples[0]?.value, 19);
});

test("speed changes emission delay without changing the virtual telemetry timeline", () => {
  const normal = buildNode17Scenario("2026-09-26T12:00:00Z", 1);
  const accelerated = buildNode17Scenario("2026-09-26T12:00:00Z", 60);

  assert.equal(normal.frames[6]?.samples[0]?.observedAt, accelerated.frames[6]?.samples[0]?.observedAt);
  assert.equal(normal.frames[6]?.delayMs, accelerated.frames[6]!.delayMs * 60);
});

test("approved recovery execution is idempotent and unapproved execution fails closed", () => {
  const scenario = buildNode17Scenario("2026-09-26T12:00:00Z");
  const controller = new DeterministicScenarioController();

  assert.throws(() => controller.applyApprovedAction(scenario, "action-1", false), /approved remediation/);
  const first = controller.applyApprovedAction(scenario, "action-1", true);
  const retry = controller.applyApprovedAction(scenario, "action-1", true);
  assert.strictEqual(first, retry);

  controller.reset("action-1");
  const afterReset = controller.applyApprovedAction(scenario, "action-1", true);
  assert.notStrictEqual(first, afterReset);
});
