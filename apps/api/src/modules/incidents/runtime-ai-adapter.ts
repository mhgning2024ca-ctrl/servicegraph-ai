import { randomUUID } from "node:crypto";

import {
  buildEvidencePacket,
  createGeminiClientFromEnv,
  type EvidencePacket,
  type EvidencePacketLimits,
  type GeminiClient,
  type RootCauseOutput,
} from "@servicegraph/ai";
import {
  createBackboardClientFromEnv,
  searchMemories,
  type BackboardRequester,
} from "@servicegraph/backboard";
import type {
  BlastRadiusSnapshot,
  IncidentEvidence,
  IncidentGraph,
  IncidentSummary,
  InfrastructureNodeStatus,
  Service,
} from "@servicegraph/contracts";

import type {
  BackendRepository,
  IncidentAnalysisAdapter,
  IncidentAnalysisResult,
  IntegrationResult,
} from "../../ports/backend-ports.js";

type IncidentGraphNode = IncidentGraph["nodes"][number];

const RUNTIME_PACKET_LIMITS: EvidencePacketLimits = {
  services: 25,
  candidateNodes: 25,
  reports: 50,
  telemetryAnomalies: 50,
  topologyEvidence: 100,
  historicalContext: 5,
};

const MAX_MEMORY_SUMMARY_LENGTH = 500;
const MAX_MEMORY_QUERY_LENGTH = 600;
const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

type RootCauseAnalyzer = Pick<GeminiClient, "analyzeRootCause">;

export interface RuntimeAiAdapterOptions {
  repository: BackendRepository;
  gemini: RootCauseAnalyzer;
  backboard: BackboardRequester;
  now?: () => Date;
  limits?: EvidencePacketLimits;
}

/**
 * API composition boundary for live AI analysis. It deliberately has no
 * deterministic fallback: a missing/failed provider is returned as degraded.
 */
export class RuntimeAiIncidentAnalysisAdapter implements IncidentAnalysisAdapter {
  private readonly now: () => Date;
  private readonly limits: EvidencePacketLimits;

  constructor(private readonly options: RuntimeAiAdapterOptions) {
    this.now = options.now ?? (() => new Date());
    this.limits = options.limits ?? RUNTIME_PACKET_LIMITS;
  }

  async analyze(
    incidentId: string,
    correlationId: string,
  ): Promise<IntegrationResult<IncidentAnalysisResult>> {
    const startedAt = Date.now();
    const incident = await this.options.repository.findIncident(incidentId);
    if (!incident) {
      return this.failure("AI_ORCHESTRATION", "INCIDENT_NOT_FOUND", false, startedAt);
    }

    const graph = await this.options.repository.findIncidentGraph(incidentId);
    if (!graph) {
      return this.failure("AI_ORCHESTRATION", "EVIDENCE_GRAPH_UNAVAILABLE", false, startedAt);
    }

    const evidence = await this.options.repository.listIncidentEvidence(incidentId);
    let packetResult: IntegrationResult<EvidencePacket>;
    try {
      packetResult = await this.buildPacket(incident, graph, evidence, correlationId);
    } catch {
      return this.failure("AI_ORCHESTRATION", "EVIDENCE_PACKET_INVALID", false, startedAt);
    }
    if (!packetResult.ok) return packetResult;

    const geminiResult = await this.options.gemini.analyzeRootCause({
      packet: packetResult.data,
      correlationId,
    });
    if (!geminiResult.ok) {
      return {
        ok: false,
        provider: geminiResult.provider,
        errorCode: geminiResult.errorCode,
        retryable: geminiResult.retryable,
        durationMs: elapsedSince(startedAt),
      };
    }

    const output = geminiResult.data.output;
    if (!isPersistableRootCause(output, packetResult.data)) {
      return this.failure("GEMINI", "AI_RESULT_CANNOT_PERSIST", false, startedAt);
    }

    const createdAt = geminiResult.data.provenance.responseTimestamp;
    const hypothesis = {
      id: randomUUID(),
      incidentId,
      createdAt,
      label: output.label,
      targetNodeId: output.targetNodeId,
      confidence: output.confidence,
      rationale: output.rationale,
      evidenceIds: output.evidenceIds,
      assumptions: output.assumptions,
      modelProvider: "GEMINI" as const,
      modelName: geminiResult.data.provenance.modelName,
      promptVersion: geminiResult.data.provenance.promptVersion,
    };
    const blastRadius = buildBlastRadius(incident, output.targetNodeId, createdAt);

    return {
      ok: true,
      provider: geminiResult.provider,
      durationMs: elapsedSince(startedAt),
      data: {
        hypothesis,
        blastRadius,
      },
    };
  }

  private async buildPacket(
    incident: IncidentSummary,
    graph: IncidentGraph,
    evidence: readonly IncidentEvidence[],
    correlationId: string,
  ): Promise<IntegrationResult<EvidencePacket>> {
    const services = graph.nodes
      .filter((node) => node.category === "SERVICE")
      .map(toService);
    const candidateNodes = graph.nodes
      .filter((node) => node.category === "INFRASTRUCTURE_NODE" && isUuid(node.id))
      .map(toInfrastructureNode);
    const topologyEvidence = graph.edges
      .filter((edge) => edge.type === "SERVICE_DEPENDS_ON_NODE")
      .map((edge) => ({ serviceId: edge.source, nodeId: edge.target, relation: edge.type }));

    const reports = evidence
      .filter((item) => item.type === "CUSTOMER_REPORT")
      .map((item) => ({
        id: item.id,
        createdAt: item.observedAt,
        text: item.summary,
        symptomCodes: [],
        areaCode: null,
        serviceId: null,
      }));
    const telemetryAnomalies = evidence
      .filter((item) => item.type === "TELEMETRY_ANOMALY")
      .flatMap((item) => toTelemetryAnomaly(item, candidateNodes));

    const historicalContext = await this.retrieveHistoricalContext(
      incident,
      evidence,
      correlationId,
    );
    const packet = buildEvidencePacket(
      {
        incidentId: incident.id,
        incidentStatus: incident.status,
        services,
        candidateNodes,
        reports,
        telemetryAnomalies,
        topologyEvidence,
        historicalContext,
      },
      this.limits,
    );
    return { ok: true, provider: "AI_ORCHESTRATION", durationMs: 0, data: packet };
  }

  private async retrieveHistoricalContext(
    incident: IncidentSummary,
    evidence: readonly IncidentEvidence[],
    correlationId: string,
  ): Promise<EvidencePacket["historicalContext"]> {
    const query = boundedMemoryQuery(incident, evidence);
    const result = await searchMemories(this.options.backboard, {
      query,
      limit: this.limits.historicalContext,
      correlationId,
    });
    if (!result.ok) {
      return [];
    }

    const historicalEvidence = result.data.map((memory) => ({
      id: randomUUID(),
      incidentId: incident.id,
      type: "HISTORICAL_INCIDENT" as const,
      // The physical contract permits a UUID source ID only. The Backboard
      // reference remains visible and usable in the bounded evidence summary.
      sourceId: randomUUID(),
      summary: `Backboard reference ${memory.referenceId}: ${memory.summary.slice(0, MAX_MEMORY_SUMMARY_LENGTH)}`,
      observedAt: this.now().toISOString(),
      weight: 0.25,
    }));
    for (const item of historicalEvidence) await this.options.repository.saveEvidence(item);
    return historicalEvidence.map((item) => ({
      source: "BACKBOARD" as const,
      referenceId: item.id,
      summary: item.summary,
    }));
  }

  private failure<T>(
    provider: string,
    errorCode: string,
    retryable: boolean,
    startedAt: number,
  ): IntegrationResult<T> {
    return { ok: false, provider, errorCode, retryable, durationMs: elapsedSince(startedAt) };
  }
}

/** Creates the live provider composition used by the HTTP server. */
export function createRuntimeAiIncidentAnalysisAdapter(
  repository: BackendRepository,
  environment: NodeJS.ProcessEnv = process.env,
): RuntimeAiIncidentAnalysisAdapter {
  return new RuntimeAiIncidentAnalysisAdapter({
    repository,
    gemini: createGeminiClientFromEnv(environment),
    backboard: createBackboardClientFromEnv(environment),
  });
}

function buildBlastRadius(
  incident: IncidentSummary,
  targetNodeId: string | null,
  createdAt: string,
): BlastRadiusSnapshot {
  return {
    id: randomUUID(),
    incidentId: incident.id,
    createdAt,
    affectedUsersEstimate: incident.affectedUsersEstimate,
    affectedServiceIds: incident.affectedServiceIds,
    affectedAreaCodes: incident.affectedAreaCodes,
    affectedNodeIds: targetNodeId ? [targetNodeId] : [],
  };
}

function toService(node: IncidentGraphNode): Service {
  return {
    id: node.id,
    code: metadataString(node, "code") ?? node.label,
    name: node.label,
    description: null,
    publicVisible: metadataBoolean(node, "publicVisible") ?? true,
    status: toNodeStatus(node.status),
  };
}

function toInfrastructureNode(node: IncidentGraphNode): EvidencePacket["candidateNodes"][number] {
  return {
    id: node.id,
    code: metadataString(node, "code") ?? node.label,
    name: node.label,
    type: metadataNodeType(node) ?? "ROUTER",
    status: toNodeStatus(node.status),
    latitude: metadataNumber(node, "latitude"),
    longitude: metadataNumber(node, "longitude"),
    areaCode: metadataString(node, "areaCode"),
    metadata: scalarMetadata(node.metadata),
  };
}

function toTelemetryAnomaly(
  item: IncidentEvidence,
  candidateNodes: EvidencePacket["candidateNodes"],
): EvidencePacket["telemetryAnomalies"] {
  const node = candidateNodes.find((candidate) =>
    item.summary.toLocaleUpperCase().includes(candidate.code.toLocaleUpperCase()),
  );
  if (!node) return [];
  const metric = item.summary.toLocaleUpperCase().includes("PACKET LOSS")
    ? "PACKET_LOSS_PCT"
    : item.summary.toLocaleUpperCase().includes("LATENCY")
      ? "LATENCY_MS"
      : null;
  const value = metric === "PACKET_LOSS_PCT"
    ? lastNumber(item.summary, /([0-9]+(?:\.[0-9]+)?)\s*%/g)
    : lastNumber(item.summary, /([0-9]+(?:\.[0-9]+)?)\s*ms/gi);
  if (!metric || value === null) return [];
  return [{
    id: item.id,
    nodeId: node.id,
    metric,
    value,
    // Declared local correlation thresholds; this is not provider telemetry.
    threshold: metric === "PACKET_LOSS_PCT" ? 5 : 100,
    observedAt: item.observedAt,
  }];
}

function isPersistableRootCause(output: RootCauseOutput, packet: EvidencePacket): boolean {
  const validEvidence = new Set<string>([
    ...packet.reports.map((item) => item.id),
    ...packet.telemetryAnomalies.map((item) => item.id),
    ...packet.historicalContext.map((item) => item.referenceId),
  ]);
  return (
    (output.targetNodeId === null || isUuid(output.targetNodeId)) &&
    output.evidenceIds.every((id) => isUuid(id) && validEvidence.has(id))
  );
}

function boundedMemoryQuery(incident: IncidentSummary, evidence: readonly IncidentEvidence[]): string {
  return [incident.title, ...evidence.slice(0, 8).map((item) => item.summary)]
    .join("\n")
    .slice(0, MAX_MEMORY_QUERY_LENGTH);
}

function lastNumber(value: string, pattern: RegExp): number | null {
  const matches = [...value.matchAll(pattern)];
  const parsed = matches.at(-1)?.[1];
  return parsed === undefined ? null : Number(parsed);
}

function toNodeStatus(status: string | null): InfrastructureNodeStatus {
  return status === "HEALTHY" || status === "DEGRADED" || status === "CRITICAL"
    ? status
    : "UNKNOWN";
}

function metadataString(node: IncidentGraphNode, key: string): string | null {
  const value = node.metadata[key];
  return typeof value === "string" ? value : null;
}

function metadataNumber(node: IncidentGraphNode, key: string): number | null {
  const value = node.metadata[key];
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

function metadataBoolean(node: IncidentGraphNode, key: string): boolean | null {
  const value = node.metadata[key];
  return typeof value === "boolean" ? value : null;
}

function metadataNodeType(
  node: IncidentGraphNode,
): EvidencePacket["candidateNodes"][number]["type"] | null {
  const value = metadataString(node, "type");
  return value === "ROUTER" || value === "SWITCH" || value === "EDGE" || value === "ACCESS" || value === "SERVICE"
    ? value
    : null;
}

function scalarMetadata(value: Record<string, unknown>): Record<string, string | number | boolean> {
  return Object.fromEntries(
    Object.entries(value).filter((entry): entry is [string, string | number | boolean] =>
      typeof entry[1] === "string" || typeof entry[1] === "number" || typeof entry[1] === "boolean",
    ),
  );
}

function isUuid(value: string): boolean {
  return UUID_PATTERN.test(value);
}

function elapsedSince(startedAt: number): number {
  return Math.max(0, Date.now() - startedAt);
}
