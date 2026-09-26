import { randomUUID } from "node:crypto";

import type {
  BlastRadiusSnapshot,
  IncidentEvidence,
  IncidentGraph,
  IncidentSummary,
  RemediationExecution,
  RootCauseHypothesis,
  VerificationSnapshot,
} from "@servicegraph/contracts";

import type {
  IncidentAnalysisAdapter,
  IntegrationResult,
  ScenarioRuntime,
  SimulatorExecutionAdapter,
  VerificationAdapter,
} from "../ports/backend-ports.js";
import { InMemoryBackendRepository } from "./in-memory-backend.js";

export const DEMO_INCIDENT_ID = "20482048-2048-4048-8048-204820482048";
export const DEMO_NODE17_ID = "17171717-1717-4717-8717-171717171717";
export const DEMO_NODE12_ID = "12121212-1212-4212-8212-121212121212";
export const DEMO_SERVICE_ID = "11111111-1111-4111-8111-111111111111";

const evidenceIds = {
  reports: "eeeeeeee-0001-4000-8000-000000000001",
  packetLoss: "eeeeeeee-0002-4000-8000-000000000002",
  topology: "eeeeeeee-0003-4000-8000-000000000003",
} as const;

export function createSeededDemoRepository(now = new Date()): InMemoryBackendRepository {
  const repository = new InMemoryBackendRepository(true);
  const createdAt = new Date(now.getTime() - 14 * 60_000).toISOString();
  const updatedAt = now.toISOString();

  const incident: IncidentSummary = {
    id: DEMO_INCIDENT_ID,
    incidentNumber: "INC-2048",
    title: "Intermittent connectivity — Ottawa Centre",
    status: "CONFIRMED",
    severity: "CRITICAL",
    createdAt,
    updatedAt,
    startedAt: createdAt,
    resolvedAt: null,
    affectedUsersEstimate: 1284,
    affectedServiceIds: [DEMO_SERVICE_ID],
    affectedAreaCodes: ["OTT-CENTRETOWN"],
    probableRootNodeId: DEMO_NODE17_ID,
    rootCauseConfidence: 0.94,
  };
  repository.incidents.set(incident.id, incident);

  const evidence: IncidentEvidence[] = [
    {
      id: evidenceIds.reports,
      incidentId: incident.id,
      type: "CUSTOMER_REPORT",
      sourceId: "aaaaaaaa-0001-4000-8000-000000000001",
      summary: "37 reports describe overlapping connectivity symptoms in Ottawa Centre.",
      observedAt: updatedAt,
      weight: 0.84,
    },
    {
      id: evidenceIds.packetLoss,
      incidentId: incident.id,
      type: "TELEMETRY_ANOMALY",
      sourceId: "aaaaaaaa-0002-4000-8000-000000000002",
      summary: "NODE-17 packet loss rose from 1% to 21% while latency peaked near 242 ms.",
      observedAt: updatedAt,
      weight: 0.98,
    },
    {
      id: evidenceIds.topology,
      incidentId: incident.id,
      type: "TOPOLOGY",
      sourceId: DEMO_NODE17_ID,
      summary: "Affected services share a dependency on NODE-17.",
      observedAt: updatedAt,
      weight: 0.91,
    },
  ];
  for (const item of evidence) repository.evidence.set(item.id, item);

  const graph: IncidentGraph = {
    nodes: [
      { id: "reports", category: "REPORT", label: "37 reports", status: "CORRELATED", metadata: { count: 37 } },
      { id: "service", category: "SERVICE", label: "Internet Service", status: "DEGRADED", metadata: {} },
      { id: "area", category: "AREA", label: "Ottawa Centre", status: null, metadata: {} },
      { id: DEMO_NODE17_ID, category: "INFRASTRUCTURE_NODE", label: "NODE-17", status: "CRITICAL", metadata: { packetLossPct: 21, latencyMs: 242 } },
      { id: "packet-loss", category: "TELEMETRY_ANOMALY", label: "Packet loss 21%", status: "CRITICAL", metadata: {} },
      { id: "hypothesis", category: "HYPOTHESIS", label: "NODE-17 probable root cause", status: "94%", metadata: { confidence: 0.94 } },
    ],
    edges: [
      { id: "g1", source: "reports", target: "service", type: "REPORT_AFFECTS_SERVICE" },
      { id: "g2", source: "reports", target: "area", type: "REPORT_LOCATED_IN_AREA" },
      { id: "g3", source: "service", target: DEMO_NODE17_ID, type: "SERVICE_DEPENDS_ON_NODE" },
      { id: "g4", source: "packet-loss", target: DEMO_NODE17_ID, type: "TELEMETRY_OBSERVED_ON_NODE" },
      { id: "g5", source: DEMO_NODE17_ID, target: "hypothesis", type: "EVIDENCE_SUPPORTS_HYPOTHESIS" },
    ],
  };
  repository.graphs.set(incident.id, graph);

  for (const provider of ["GEMINI", "TIGERDATA", "AUTH0", "ELEVENLABS", "BACKBOARD"]) {
    repository.integrationHealth.set(provider, {
      provider,
      state: "UNAVAILABLE",
      checkedAt: updatedAt,
      reasonCode: "DEMO_MOCK_MODE",
    });
  }
  return repository;
}

export class DeterministicIncidentAnalysisAdapter implements IncidentAnalysisAdapter {
  constructor(private readonly now = () => new Date()) {}

  async analyze(incidentId: string, _correlationId: string): Promise<IntegrationResult<{ hypothesis: RootCauseHypothesis; blastRadius: BlastRadiusSnapshot }>> {
    const createdAt = this.now().toISOString();
    return {
      ok: true,
      provider: "RULE_ENGINE",
      durationMs: 1,
      data: {
        hypothesis: {
          id: randomUUID(),
          incidentId,
          createdAt,
          label: "NODE-17 packet-loss / latency degradation",
          targetNodeId: DEMO_NODE17_ID,
          confidence: 0.94,
          rationale: "Correlated complaints, topology dependencies, packet loss and latency converge on NODE-17.",
          evidenceIds: Object.values(evidenceIds),
          assumptions: ["Demo scenario uses deterministic network telemetry."],
          modelProvider: "RULE_ENGINE",
          modelName: null,
          promptVersion: null,
        },
        blastRadius: {
          id: randomUUID(),
          incidentId,
          createdAt,
          affectedUsersEstimate: 1284,
          affectedServiceIds: [DEMO_SERVICE_ID],
          affectedAreaCodes: ["OTT-CENTRETOWN"],
          affectedNodeIds: [DEMO_NODE17_ID],
        },
      },
    };
  }
}

export class DeterministicSimulatorAdapter implements SimulatorExecutionAdapter {
  constructor(private readonly now = () => new Date()) {}

  async execute(proposal: Parameters<SimulatorExecutionAdapter["execute"]>[0], idempotencyKey: string): Promise<IntegrationResult<RemediationExecution>> {
    const startedAt = this.now().toISOString();
    return {
      ok: true,
      provider: "NETWORK_SIMULATOR",
      durationMs: 1,
      data: {
        id: stableExecutionId(proposal.id, idempotencyKey),
        proposalId: proposal.id,
        startedAt,
        completedAt: startedAt,
        state: "SUCCEEDED",
        simulatorActionId: "node17-reroute",
        resultSummary: "Simulated traffic rerouted from NODE-17 to NODE-12.",
      },
    };
  }
}

export class DeterministicVerificationAdapter implements VerificationAdapter {
  constructor(private readonly now = () => new Date()) {}

  async verify(incident: IncidentSummary, execution: RemediationExecution): Promise<VerificationSnapshot> {
    const createdAt = this.now().toISOString();
    return {
      id: randomUUID(),
      incidentId: incident.id,
      executionId: execution.id,
      createdAt,
      windowStart: execution.startedAt,
      windowEnd: createdAt,
      passed: true,
      checks: [
        { metric: "PACKET_LOSS_PCT", before: 21, after: 0.2, threshold: 1, passed: true },
        { metric: "LATENCY_MS", before: 242, after: 22, threshold: 50, passed: true },
      ],
    };
  }
}

export class DeterministicScenarioRuntime implements ScenarioRuntime {
  private current: Awaited<ReturnType<ScenarioRuntime["start"]>> | null = null;

  async start(speed: number): Promise<Awaited<ReturnType<ScenarioRuntime["start"]>>> {
    this.current = {
      scenarioId: "71717171-1717-4717-8717-171717171717",
      scenarioKey: "node17-degradation",
      state: "DEGRADED",
      startedAt: new Date().toISOString(),
      speed,
      targetNodeId: DEMO_NODE17_ID,
    };
    return this.current;
  }

  async status(scenarioId: string): Promise<Awaited<ReturnType<ScenarioRuntime["status"]>>> {
    return this.current?.scenarioId === scenarioId ? this.current : null;
  }

  async reset(): Promise<void> {
    if (this.current) this.current = { ...this.current, state: "RESET" };
  }
}

function stableExecutionId(proposalId: string, key: string): string {
  const value = proposalId.replace(/-/g, "").slice(0, 12) + key.replace(/-/g, "").slice(0, 20);
  const hex = (value + "0".repeat(32)).slice(0, 32).replace(/[^0-9a-f]/gi, "a").toLowerCase().split("");
  hex[12] = "4";
  hex[16] = "8";
  return `${hex.slice(0, 8).join("")}-${hex.slice(8, 12).join("")}-${hex.slice(12, 16).join("")}-${hex.slice(16, 20).join("")}-${hex.slice(20).join("")}`;
}
