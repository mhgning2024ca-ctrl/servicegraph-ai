import { createHash } from "node:crypto";

export const NODE17_SCENARIO_KEY = "node17-degradation" as const;
export const NODE17_SCENARIO_ID = "71717171-1717-4717-8717-171717171717";
export const NODE17_ID = "17171717-1717-4717-8717-171717171717";

export type TelemetryMetric =
  | "LATENCY_MS"
  | "PACKET_LOSS_PCT"
  | "ERROR_RATE"
  | "THROUGHPUT_MBPS"
  | "AVAILABILITY";

export interface SimulatorTelemetrySample {
  id: string;
  nodeId: string;
  observedAt: string;
  metric: TelemetryMetric;
  value: number;
  unit: string;
  source: "SIMULATOR";
  scenarioId: string;
}

export type ScenarioPhase =
  | "BASELINE"
  | "DEGRADING"
  | "DEGRADED"
  | "RECOVERING"
  | "RECOVERED";

export interface ScenarioFrame {
  offsetMs: number;
  delayMs: number;
  phase: ScenarioPhase;
  samples: readonly SimulatorTelemetrySample[];
}

export interface Node17Scenario {
  scenarioId: string;
  scenarioKey: typeof NODE17_SCENARIO_KEY;
  targetNodeId: string;
  startedAt: string;
  speed: number;
  frames: readonly ScenarioFrame[];
}

const latency = [18, 19, 18, 20, 19, 42, 78, 126, 181, 224, 242, 231, 142, 74, 36, 22, 19] as const;
const packetLoss = [0.1, 0.1, 0.2, 0.1, 0.2, 1.8, 4.2, 8.4, 12.6, 17.8, 21.0, 18.5, 9.0, 3.1, 0.9, 0.3, 0.2] as const;

function phaseForMinute(minute: number): ScenarioPhase {
  if (minute <= 4) return "BASELINE";
  if (minute <= 9) return "DEGRADING";
  if (minute <= 11) return "DEGRADED";
  if (minute <= 15) return "RECOVERING";
  return "RECOVERED";
}

function stableUuid(input: string): string {
  const hex = createHash("md5").update(input).digest("hex").split("");
  return `${hex.slice(0, 8).join("")}-${hex.slice(8, 12).join("")}-${hex.slice(12, 16).join("")}-${hex.slice(16, 20).join("")}-${hex.slice(20).join("")}`;
}

function sample(
  startedAtMs: number,
  minute: number,
  metric: "LATENCY_MS" | "PACKET_LOSS_PCT",
  value: number,
  unit: "ms" | "percent",
): SimulatorTelemetrySample {
  const observedAt = new Date(startedAtMs + minute * 60_000).toISOString();
  return {
    id: stableUuid(`${NODE17_SCENARIO_ID}:${minute}:${metric}`),
    nodeId: NODE17_ID,
    observedAt,
    metric,
    value,
    unit,
    source: "SIMULATOR",
    scenarioId: NODE17_SCENARIO_ID,
  };
}

export function buildNode17Scenario(startedAt: string, speed = 1): Node17Scenario {
  const startedAtMs = Date.parse(startedAt);
  if (!Number.isFinite(startedAtMs)) throw new TypeError("startedAt must be an ISO-8601 timestamp");
  if (!Number.isFinite(speed) || speed <= 0) throw new RangeError("speed must be greater than zero");

  const frames = latency.map((latencyValue, minute): ScenarioFrame => {
    const offsetMs = minute * 60_000;
    return {
      offsetMs,
      delayMs: offsetMs / speed,
      phase: phaseForMinute(minute),
      samples: [
        sample(startedAtMs, minute, "LATENCY_MS", latencyValue, "ms"),
        sample(startedAtMs, minute, "PACKET_LOSS_PCT", packetLoss[minute]!, "percent"),
      ],
    };
  });

  return {
    scenarioId: NODE17_SCENARIO_ID,
    scenarioKey: NODE17_SCENARIO_KEY,
    targetNodeId: NODE17_ID,
    startedAt: new Date(startedAtMs).toISOString(),
    speed,
    frames,
  };
}

export function degradationFrames(scenario: Node17Scenario): readonly ScenarioFrame[] {
  return scenario.frames.filter((frame) => frame.phase !== "RECOVERING" && frame.phase !== "RECOVERED");
}

export function recoveryFrames(scenario: Node17Scenario): readonly ScenarioFrame[] {
  return scenario.frames.filter((frame) => frame.phase === "RECOVERING" || frame.phase === "RECOVERED");
}

export class DeterministicScenarioController {
  readonly #executions = new Map<string, readonly ScenarioFrame[]>();

  applyApprovedAction(
    scenario: Node17Scenario,
    simulatorActionId: string,
    approved: boolean,
    actionType: "REROUTE_TRAFFIC" = "REROUTE_TRAFFIC",
  ): readonly ScenarioFrame[] {
    if (!approved) throw new Error("Simulator recovery requires an approved remediation");
    if (actionType !== "REROUTE_TRAFFIC") throw new Error("NODE-17 recovery requires the approved simulated reroute");
    const existing = this.#executions.get(simulatorActionId);
    if (existing) return existing;

    const frames = recoveryFrames(scenario);
    this.#executions.set(simulatorActionId, frames);
    return frames;
  }

  reset(simulatorActionId?: string): void {
    if (simulatorActionId) {
      this.#executions.delete(simulatorActionId);
      return;
    }
    this.#executions.clear();
  }
}
