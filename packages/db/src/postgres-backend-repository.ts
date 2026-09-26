import type {
  ApprovalDecision,
  BlastRadiusSnapshot,
  CustomerCommunication,
  CustomerReport,
  IncidentEvidence,
  IncidentGraph,
  IncidentSummary,
  RemediationExecution,
  RemediationProposal,
  RootCauseHypothesis,
  TelemetrySample,
  VerificationSnapshot,
} from "@servicegraph/contracts";

/** The small surface used by the repository also makes it testable without a live database. */
export interface PostgresClient {
  query(query: { text: string; values?: readonly unknown[] }): Promise<{ rows: Record<string, unknown>[] }>;
}

export interface AuditEventInput {
  id: string;
  createdAt: string;
  correlationId: string;
  actorSubject: string | null;
  action: string;
  entityType: string;
  entityId: string | null;
  payload: Record<string, unknown>;
}

export interface IncidentListFilter {
  status?: IncidentSummary["status"];
  severity?: IncidentSummary["severity"];
  limit: number;
  cursor?: string;
}

export interface IntegrationHealthRecord {
  provider: string;
  state: "AVAILABLE" | "DEGRADED" | "UNAVAILABLE";
  checkedAt: string;
  reasonCode: string | null;
}

type Row = Record<string, unknown>;

/**
 * PostgreSQL implementation of the API's existing repository port.  It uses
 * only the committed physical-schema baseline and keeps all values bound.
 */
export class PostgresBackendRepository {
  constructor(private readonly client: PostgresClient) {}

  async isReady(): Promise<boolean> {
    try {
      const result = await this.client.query({ text: `
        SELECT to_regclass('public.customer_reports') AS reports,
               to_regclass('public.telemetry_samples') AS telemetry
      ` });
      return Boolean(result.rows[0]?.reports && result.rows[0]?.telemetry);
    } catch {
      return false;
    }
  }

  async createReport(report: CustomerReport): Promise<CustomerReport> {
    const row = await this.one("create report", `
      INSERT INTO customer_reports (
        id, client_report_id, created_at, channel, state, report_text, transcript,
        audio_asset_id, service_id, area_code, latitude, longitude, symptom_codes,
        citizen_subject, correlated_incident_id, source_language
      ) VALUES (
        $1::uuid, $2::uuid, $3::timestamptz, $4, $5, $6, $7, $8, $9::uuid,
        $10, $11, $12, $13::text[], $14, $15::uuid, $16
      )
      ON CONFLICT (client_report_id) DO UPDATE
        SET client_report_id = EXCLUDED.client_report_id
      RETURNING ${reportColumns}
    `, reportValues(report));
    return toReport(row);
  }

  async findReport(reportId: string): Promise<CustomerReport | null> {
    const row = await this.maybeOne(`SELECT ${reportColumns} FROM customer_reports WHERE id = $1::uuid`, [reportId]);
    return row ? toReport(row) : null;
  }

  async loadReportCorrelationContext(reportId: string): Promise<{
    report: CustomerReport;
    relatedReports: readonly CustomerReport[];
    topology: readonly { serviceId: string; nodeId: string; nodeCode: string; nodeStatus: string; areaCode: string | null }[];
    telemetry: readonly TelemetrySample[];
  } | null> {
    const report = await this.findReport(reportId);
    if (!report) return null;
    const topologyResult = await this.client.query({ text: `
      SELECT d.service_id, d.node_id, n.code AS node_code, n.status AS node_status, n.area_code
      FROM service_node_dependencies d
      JOIN infrastructure_nodes n ON n.id = d.node_id
      WHERE ($1::uuid IS NOT NULL AND d.service_id = $1::uuid)
         OR ($1::uuid IS NULL AND $2::text IS NOT NULL AND n.area_code = $2::text)
      ORDER BY d.service_id, d.node_id
    `, values: [report.serviceId, report.areaCode] });
    const topology = topologyResult.rows.map((row) => ({
      serviceId: string(row.service_id),
      nodeId: string(row.node_id),
      nodeCode: string(row.node_code),
      nodeStatus: string(row.node_status),
      areaCode: nullableString(row.area_code),
    }));
    const relatedResult = await this.client.query({ text: `
      SELECT ${reportColumns}
      FROM customer_reports
      WHERE id <> $1::uuid
        AND created_at BETWEEN $2::timestamptz - make_interval(mins => 30)
                           AND $2::timestamptz + make_interval(mins => 30)
        AND (($3::uuid IS NOT NULL AND service_id = $3::uuid)
          OR ($4::text IS NOT NULL AND area_code = $4::text))
      ORDER BY created_at ASC, id ASC
    `, values: [report.id, report.createdAt, report.serviceId, report.areaCode] });
    const nodeIds = topology.map((dependency) => dependency.nodeId);
    const telemetry = nodeIds.length === 0 ? [] : (await this.client.query({ text: `
      SELECT id,node_id,observed_at,metric,value,unit,source,scenario_id
      FROM telemetry_samples
      WHERE node_id = ANY($1::uuid[])
        AND observed_at BETWEEN $2::timestamptz - make_interval(mins => 30)
                            AND $2::timestamptz + make_interval(mins => 30)
        AND ((metric = 'LATENCY_MS' AND value >= 100)
          OR (metric = 'PACKET_LOSS_PCT' AND value >= 5))
      ORDER BY observed_at ASC, id ASC
    `, values: [nodeIds, report.createdAt] })).rows.map(toTelemetry);
    return { report, relatedReports: relatedResult.rows.map(toReport), topology, telemetry };
  }

  async linkReportToIncident(
    reportId: string,
    incidentId: string,
    correlationScore: number,
    correlatedAt: string,
  ): Promise<CustomerReport> {
    const report = await this.one("correlate report", `
      UPDATE customer_reports
      SET state = 'CORRELATED', correlated_incident_id = $2::uuid
      WHERE id = $1::uuid
      RETURNING ${reportColumns}
    `, [reportId, incidentId]);
    await this.client.query({ text: `
      INSERT INTO incident_reports (incident_id, report_id, correlation_score, created_at)
      VALUES ($1::uuid, $2::uuid, $3::double precision, $4::timestamptz)
      ON CONFLICT (incident_id, report_id) DO UPDATE
        SET correlation_score = EXCLUDED.correlation_score
    `, values: [incidentId, reportId, correlationScore, correlatedAt] });
    return toReport(report);
  }

  async listIncidents(filter: IncidentListFilter): Promise<readonly IncidentSummary[]> {
    const values: unknown[] = [filter.status ?? null, filter.severity ?? null, filter.cursor ?? null, filter.limit];
    const result = await this.client.query({ text: `
      SELECT ${incidentColumns}
      FROM incidents i
      WHERE ($1::text IS NULL OR i.status = $1)
        AND ($2::text IS NULL OR i.severity = $2)
        AND ($3::timestamptz IS NULL OR i.updated_at < $3::timestamptz)
      ORDER BY i.updated_at DESC, i.id DESC
      LIMIT $4::integer
    `, values });
    return result.rows.map(toIncident);
  }

  async findIncident(incidentId: string): Promise<IncidentSummary | null> {
    const row = await this.maybeOne(`SELECT ${incidentColumns} FROM incidents i WHERE i.id = $1::uuid`, [incidentId]);
    return row ? toIncident(row) : null;
  }

  async findActiveIncidentByRootNode(nodeId: string): Promise<IncidentSummary | null> {
    const row = await this.maybeOne(`
      SELECT ${incidentColumns}
      FROM incidents i
      WHERE i.probable_root_node_id = $1::uuid
        AND i.status NOT IN ('RESOLVED', 'CLOSED')
      ORDER BY i.updated_at DESC, i.id DESC
      LIMIT 1
    `, [nodeId]);
    return row ? toIncident(row) : null;
  }

  async createIncident(incident: IncidentSummary): Promise<void> {
    await this.client.query({ text: `
      INSERT INTO incidents (
        id, incident_number, title, status, severity, created_at, updated_at,
        started_at, resolved_at, affected_users_estimate, probable_root_node_id,
        root_cause_confidence
      ) VALUES (
        $1::uuid, $2, $3, $4, $5, $6::timestamptz, $7::timestamptz,
        $8::timestamptz, $9::timestamptz, $10, $11::uuid, $12
      )
    `, values: [
      incident.id, incident.incidentNumber, incident.title, incident.status,
      incident.severity, incident.createdAt, incident.updatedAt, incident.startedAt,
      incident.resolvedAt, incident.affectedUsersEstimate,
      incident.probableRootNodeId, incident.rootCauseConfidence,
    ] });
  }

  async updateIncident(incident: IncidentSummary): Promise<void> {
    await this.client.query({ text: `
      UPDATE incidents SET title = $2, status = $3, severity = $4, updated_at = $5::timestamptz,
        started_at = $6::timestamptz, resolved_at = $7::timestamptz,
        affected_users_estimate = $8, probable_root_node_id = $9::uuid,
        root_cause_confidence = $10
      WHERE id = $1::uuid
    `, values: [incident.id, incident.title, incident.status, incident.severity, incident.updatedAt,
      incident.startedAt, incident.resolvedAt, incident.affectedUsersEstimate,
      incident.probableRootNodeId, incident.rootCauseConfidence] });
  }

  async findIncidentGraph(incidentId: string): Promise<IncidentGraph | null> {
    const incident = await this.findIncident(incidentId);
    if (!incident) return null;
    const nodes: IncidentGraph["nodes"] = [];
    const edges: IncidentGraph["edges"] = [];
    const addNode = (node: IncidentGraph["nodes"][number]) => {
      if (!nodes.some((item) => item.id === node.id)) nodes.push(node);
    };
    const reports = await this.client.query({ text: `
      SELECT r.id, r.area_code, r.service_id, s.name AS service_name
      FROM incident_reports ir JOIN customer_reports r ON r.id = ir.report_id
      LEFT JOIN services s ON s.id = r.service_id WHERE ir.incident_id = $1::uuid
    `, values: [incidentId] });
    for (const row of reports.rows) {
      const reportId = string(row.id); addNode({ id: reportId, category: "REPORT", label: "Customer report", status: "CORRELATED", metadata: {} });
      if (row.service_id) { const serviceId = string(row.service_id); addNode({ id: serviceId, category: "SERVICE", label: nullableString(row.service_name) ?? serviceId, status: null, metadata: {} }); edges.push({ id: `report-service:${reportId}`, source: reportId, target: serviceId, type: "REPORT_AFFECTS_SERVICE" }); }
      if (row.area_code) { const areaId = `area:${string(row.area_code)}`; addNode({ id: areaId, category: "AREA", label: string(row.area_code), status: null, metadata: {} }); edges.push({ id: `report-area:${reportId}`, source: reportId, target: areaId, type: "REPORT_LOCATED_IN_AREA" }); }
    }
    const serviceIds = [...new Set(reports.rows.flatMap((row) => row.service_id ? [string(row.service_id)] : []))];
    if (serviceIds.length > 0) {
      const dependencies = await this.client.query({ text: `
        SELECT d.service_id, n.id AS node_id, n.code, n.status
        FROM service_node_dependencies d
        JOIN infrastructure_nodes n ON n.id = d.node_id
        WHERE d.service_id = ANY($1::uuid[])
        ORDER BY d.service_id, n.id
      `, values: [serviceIds] });
      for (const dependency of dependencies.rows) {
        const serviceId = string(dependency.service_id);
        const nodeId = string(dependency.node_id);
        addNode({ id: nodeId, category: "INFRASTRUCTURE_NODE", label: string(dependency.code), status: string(dependency.status), metadata: {} });
        edges.push({ id: `service-node:${serviceId}:${nodeId}`, source: serviceId, target: nodeId, type: "SERVICE_DEPENDS_ON_NODE" });
      }
    }
    const telemetry = await this.client.query({ text: `
      SELECT e.source_id, t.node_id, t.metric, t.value, t.unit, n.code, n.status
      FROM incident_evidence e
      JOIN telemetry_samples t ON t.id = e.source_id
      LEFT JOIN infrastructure_nodes n ON n.id = t.node_id
      WHERE e.incident_id = $1::uuid AND e.evidence_type = 'TELEMETRY_ANOMALY'
      ORDER BY e.observed_at ASC, e.id ASC
    `, values: [incidentId] });
    for (const sample of telemetry.rows) {
      const sourceId = string(sample.source_id);
      const nodeId = string(sample.node_id);
      const telemetryId = `telemetry:${sourceId}`;
      addNode({ id: telemetryId, category: "TELEMETRY_ANOMALY", label: `${string(sample.metric)} ${Number(sample.value)}`, status: "ANOMALOUS", metadata: { value: Number(sample.value), unit: string(sample.unit) } });
      addNode({ id: nodeId, category: "INFRASTRUCTURE_NODE", label: nullableString(sample.code) ?? nodeId, status: nullableString(sample.status) ?? "UNKNOWN", metadata: {} });
      edges.push({ id: `telemetry-node:${sourceId}`, source: telemetryId, target: nodeId, type: "TELEMETRY_OBSERVED_ON_NODE" });
    }
    if (incident.probableRootNodeId) {
      const node = await this.maybeOne("SELECT id, code, status FROM infrastructure_nodes WHERE id = $1::uuid", [incident.probableRootNodeId]);
      if (node) addNode({ id: string(node.id), category: "INFRASTRUCTURE_NODE", label: string(node.code), status: string(node.status), metadata: {} });
    }
    const hypothesis = await this.findLatestHypothesis(incidentId);
    if (hypothesis) {
      const id = `hypothesis:${hypothesis.id}`;
      addNode({ id, category: "HYPOTHESIS", label: hypothesis.label, status: String(hypothesis.confidence), metadata: { confidence: hypothesis.confidence } });
      if (hypothesis.targetNodeId) edges.push({ id: `node-hypothesis:${hypothesis.id}`, source: hypothesis.targetNodeId, target: id, type: "EVIDENCE_SUPPORTS_HYPOTHESIS" });
    }
    const proposal = await this.findLatestProposalForIncident(incidentId);
    if (proposal) {
      const id = `remediation:${proposal.id}`;
      addNode({ id, category: "REMEDIATION", label: proposal.actionType, status: proposal.state, metadata: {} });
      if (proposal.targetNodeId) edges.push({ id: `proposal-node:${proposal.id}`, source: id, target: proposal.targetNodeId, type: "PROPOSAL_TARGETS_NODE" });
    }
    return { nodes, edges };
  }

  async listIncidentEvidence(incidentId: string): Promise<readonly IncidentEvidence[]> {
    const result = await this.client.query({ text: `SELECT id, incident_id, evidence_type, source_id, summary, observed_at, weight FROM incident_evidence WHERE incident_id = $1::uuid ORDER BY observed_at ASC, id ASC`, values: [incidentId] });
    return result.rows.map(toEvidence);
  }
  async saveEvidence(e: IncidentEvidence): Promise<void> { await this.client.query({ text: `INSERT INTO incident_evidence (id, incident_id, evidence_type, source_id, summary, observed_at, weight) VALUES ($1::uuid,$2::uuid,$3,$4::uuid,$5,$6::timestamptz,$7)`, values: [e.id,e.incidentId,e.type,e.sourceId,e.summary,e.observedAt,e.weight] }); }
  async saveHypothesis(h: RootCauseHypothesis): Promise<void> { await this.client.query({ text: `INSERT INTO root_cause_hypotheses (id,incident_id,created_at,label,target_node_id,confidence,rationale,evidence_ids,assumptions,model_provider,model_name,prompt_version) VALUES ($1::uuid,$2::uuid,$3::timestamptz,$4,$5::uuid,$6,$7,$8::uuid[],$9::text[],$10,$11,$12)`, values: [h.id,h.incidentId,h.createdAt,h.label,h.targetNodeId,h.confidence,h.rationale,h.evidenceIds,h.assumptions,h.modelProvider,h.modelName,h.promptVersion] }); }
  async findLatestHypothesis(incidentId: string): Promise<RootCauseHypothesis | null> { const row = await this.maybeOne(`SELECT id,incident_id,created_at,label,target_node_id,confidence,rationale,evidence_ids,assumptions,model_provider,model_name,prompt_version FROM root_cause_hypotheses WHERE incident_id = $1::uuid ORDER BY created_at DESC,id DESC LIMIT 1`, [incidentId]); return row ? toHypothesis(row) : null; }
  async saveBlastRadius(s: BlastRadiusSnapshot): Promise<void> { await this.client.query({ text: `INSERT INTO blast_radius_snapshots (id,incident_id,created_at,affected_users_estimate,affected_service_ids,affected_area_codes,affected_node_ids) VALUES ($1::uuid,$2::uuid,$3::timestamptz,$4,$5::uuid[],$6::text[],$7::uuid[])`, values: [s.id,s.incidentId,s.createdAt,s.affectedUsersEstimate,s.affectedServiceIds,s.affectedAreaCodes,s.affectedNodeIds] }); }
  async findLatestBlastRadius(incidentId: string): Promise<BlastRadiusSnapshot | null> { const row = await this.maybeOne(`SELECT id,incident_id,created_at,affected_users_estimate,affected_service_ids,affected_area_codes,affected_node_ids FROM blast_radius_snapshots WHERE incident_id = $1::uuid ORDER BY created_at DESC,id DESC LIMIT 1`, [incidentId]); return row ? toBlastRadius(row) : null; }
  async saveProposal(p: RemediationProposal): Promise<void> { await this.client.query({ text: `INSERT INTO remediation_proposals (id,incident_id,version,created_at,created_by,action_type,target_node_id,parameters,rationale,expected_effect,risk,evidence_ids,state) VALUES ($1::uuid,$2::uuid,$3,$4::timestamptz,$5,$6,$7::uuid,$8::jsonb,$9,$10,$11,$12::uuid[],$13)`, values: proposalValues(p) }); }
  async findProposal(id: string): Promise<RemediationProposal | null> { const row = await this.maybeOne(`SELECT id,incident_id,version,created_at,created_by,action_type,target_node_id,parameters,rationale,expected_effect,risk,evidence_ids,state FROM remediation_proposals WHERE id = $1::uuid`, [id]); return row ? toProposal(row) : null; }
  async findLatestProposalForIncident(incidentId: string): Promise<RemediationProposal | null> { const row = await this.maybeOne(`SELECT id,incident_id,version,created_at,created_by,action_type,target_node_id,parameters,rationale,expected_effect,risk,evidence_ids,state FROM remediation_proposals WHERE incident_id = $1::uuid ORDER BY version DESC LIMIT 1`, [incidentId]); return row ? toProposal(row) : null; }
  async updateProposal(p: RemediationProposal): Promise<void> { await this.client.query({ text: `UPDATE remediation_proposals SET version=$2,created_by=$3,action_type=$4,target_node_id=$5::uuid,parameters=$6::jsonb,rationale=$7,expected_effect=$8,risk=$9,evidence_ids=$10::uuid[],state=$11 WHERE id=$1::uuid`, values: [p.id,p.version,p.createdBy,p.actionType,p.targetNodeId,JSON.stringify(p.parameters),p.rationale,p.expectedEffect,p.risk,p.evidenceIds,p.state] }); }
  async saveDecision(d: ApprovalDecision): Promise<void> { await this.client.query({ text: `INSERT INTO approval_decisions (id,proposal_id,proposal_version,decided_at,decision,actor_subject,actor_role,comment) VALUES ($1::uuid,$2::uuid,$3,$4::timestamptz,$5,$6,$7,$8)`, values: [d.id,d.proposalId,d.proposalVersion,d.decidedAt,d.decision,d.actorSubject,d.actorRole,d.comment] }); }
  async findExecutionByProposal(proposalId: string): Promise<RemediationExecution | null> { const row = await this.maybeOne(`SELECT id,proposal_id,started_at,completed_at,state,simulator_action_id,result_summary FROM remediation_executions WHERE proposal_id=$1::uuid ORDER BY started_at DESC,id DESC LIMIT 1`, [proposalId]); return row ? toExecution(row) : null; }
  async saveExecution(e: RemediationExecution): Promise<void> { await this.client.query({ text: `INSERT INTO remediation_executions (id,proposal_id,started_at,completed_at,state,simulator_action_id,result_summary) VALUES ($1::uuid,$2::uuid,$3::timestamptz,$4::timestamptz,$5,$6,$7) ON CONFLICT (id) DO UPDATE SET completed_at=EXCLUDED.completed_at,state=EXCLUDED.state,simulator_action_id=EXCLUDED.simulator_action_id,result_summary=EXCLUDED.result_summary`, values: [e.id,e.proposalId,e.startedAt,e.completedAt,e.state,e.simulatorActionId,e.resultSummary] }); }
  async saveVerification(s: VerificationSnapshot): Promise<void> { await this.client.query({ text: `INSERT INTO verification_snapshots (id,incident_id,execution_id,created_at,window_start,window_end,passed,checks) VALUES ($1::uuid,$2::uuid,$3::uuid,$4::timestamptz,$5::timestamptz,$6::timestamptz,$7,$8::jsonb)`, values: [s.id,s.incidentId,s.executionId,s.createdAt,s.windowStart,s.windowEnd,s.passed,JSON.stringify(s.checks)] }); }
  async saveCommunication(c: CustomerCommunication): Promise<void> { await this.client.query({ text: `INSERT INTO customer_communications (id,incident_id,created_at,audience,language,message_text,voice_asset_id,state) VALUES ($1::uuid,$2::uuid,$3::timestamptz,$4,$5,$6,$7,$8)`, values: [c.id,c.incidentId,c.createdAt,c.audience,c.language,c.text,c.voiceAssetId,c.state] }); }
  async listIntegrationHealth(): Promise<readonly IntegrationHealthRecord[]> { const result = await this.client.query({ text: `SELECT provider,state,checked_at,reason_code FROM integration_health ORDER BY provider` }); return result.rows.map((r) => ({ provider:string(r.provider),state:string(r.state) as IntegrationHealthRecord["state"],checkedAt:iso(r.checked_at),reasonCode:nullableString(r.reason_code) })); }
  async appendAudit(e: AuditEventInput): Promise<void> { await this.client.query({ text: `INSERT INTO audit_events (id,created_at,correlation_id,actor_subject,action,entity_type,entity_id,payload) VALUES ($1::uuid,$2::timestamptz,$3::uuid,$4,$5,$6,$7::uuid,$8::jsonb)`, values: [e.id,e.createdAt,e.correlationId,e.actorSubject,e.action,e.entityType,e.entityId,JSON.stringify(e.payload)] }); }
  async saveTelemetrySamples(samples: readonly TelemetrySample[]): Promise<void> { if (!samples.length) return; const values: unknown[] = []; const records = samples.map((s,index) => { const base=index*8; values.push(s.id,s.nodeId,s.observedAt,s.metric,s.value,s.unit,s.source,s.scenarioId); return `($${base+1}::uuid,$${base+2}::uuid,$${base+3}::timestamptz,$${base+4},$${base+5},$${base+6},$${base+7},$${base+8}::uuid)`; }); await this.client.query({ text: `INSERT INTO telemetry_samples (id,node_id,observed_at,metric,value,unit,source,scenario_id) VALUES ${records.join(",")}`, values }); }

  private async maybeOne(text: string, values: readonly unknown[] = []): Promise<Row | null> { const result = await this.client.query({ text, values }); return result.rows[0] ?? null; }
  private async one(action: string, text: string, values: readonly unknown[]): Promise<Row> { const row = await this.maybeOne(text, values); if (!row) throw new Error(`PostgreSQL did not return a row for ${action}.`); return row; }
}

const reportColumns = `id,client_report_id,created_at,channel,state,report_text,transcript,audio_asset_id,service_id,area_code,latitude,longitude,symptom_codes,citizen_subject,correlated_incident_id,source_language`;
const incidentColumns = `i.id,i.incident_number,i.title,i.status,i.severity,i.created_at,i.updated_at,i.started_at,i.resolved_at,i.affected_users_estimate,i.probable_root_node_id,i.root_cause_confidence,COALESCE((SELECT b.affected_service_ids FROM blast_radius_snapshots b WHERE b.incident_id=i.id ORDER BY b.created_at DESC,b.id DESC LIMIT 1),ARRAY[]::uuid[]) AS affected_service_ids,COALESCE((SELECT b.affected_area_codes FROM blast_radius_snapshots b WHERE b.incident_id=i.id ORDER BY b.created_at DESC,b.id DESC LIMIT 1),ARRAY[]::text[]) AS affected_area_codes`;
const reportValues = (r: CustomerReport) => [r.id,r.clientReportId,r.createdAt,r.channel,r.state,r.text,r.transcript,r.audioAssetId,r.serviceId,r.areaCode,r.latitude,r.longitude,r.symptomCodes,r.citizenId,r.correlatedIncidentId,r.sourceLanguage];
const proposalValues = (p: RemediationProposal) => [p.id,p.incidentId,p.version,p.createdAt,p.createdBy,p.actionType,p.targetNodeId,JSON.stringify(p.parameters),p.rationale,p.expectedEffect,p.risk,p.evidenceIds,p.state];
const string = (value: unknown): string => String(value);
const nullableString = (value: unknown): string | null => value == null ? null : String(value);
const iso = (value: unknown): string => value instanceof Date ? value.toISOString() : String(value);
const array = (value: unknown): string[] => Array.isArray(value) ? value.map(String) : [];
const object = (value: unknown): Record<string, string | number | boolean> => typeof value === "object" && value !== null && !Array.isArray(value) ? value as Record<string, string | number | boolean> : {};
const toReport = (r: Row): CustomerReport => ({ id:string(r.id),clientReportId:string(r.client_report_id),createdAt:iso(r.created_at),channel:string(r.channel) as CustomerReport["channel"],state:string(r.state) as CustomerReport["state"],text:string(r.report_text),transcript:nullableString(r.transcript),audioAssetId:nullableString(r.audio_asset_id),serviceId:nullableString(r.service_id),areaCode:nullableString(r.area_code),latitude:r.latitude == null ? null : Number(r.latitude),longitude:r.longitude == null ? null : Number(r.longitude),symptomCodes:array(r.symptom_codes),citizenId:nullableString(r.citizen_subject),correlatedIncidentId:nullableString(r.correlated_incident_id),sourceLanguage:nullableString(r.source_language) });
const toTelemetry = (r: Row): TelemetrySample => ({ id:string(r.id),nodeId:string(r.node_id),observedAt:iso(r.observed_at),metric:string(r.metric) as TelemetrySample["metric"],value:Number(r.value),unit:string(r.unit),source:string(r.source) as TelemetrySample["source"],scenarioId:nullableString(r.scenario_id) });
const toIncident = (r: Row): IncidentSummary => ({ id:string(r.id),incidentNumber:string(r.incident_number),title:string(r.title),status:string(r.status) as IncidentSummary["status"],severity:string(r.severity) as IncidentSummary["severity"],createdAt:iso(r.created_at),updatedAt:iso(r.updated_at),startedAt:nullableString(r.started_at),resolvedAt:nullableString(r.resolved_at),affectedUsersEstimate:Number(r.affected_users_estimate),affectedServiceIds:array(r.affected_service_ids),affectedAreaCodes:array(r.affected_area_codes),probableRootNodeId:nullableString(r.probable_root_node_id),rootCauseConfidence:r.root_cause_confidence == null ? null : Number(r.root_cause_confidence) });
const toEvidence = (r: Row): IncidentEvidence => ({ id:string(r.id),incidentId:string(r.incident_id),type:string(r.evidence_type) as IncidentEvidence["type"],sourceId:string(r.source_id),summary:string(r.summary),observedAt:iso(r.observed_at),weight:Number(r.weight) });
const toHypothesis = (r: Row): RootCauseHypothesis => ({ id:string(r.id),incidentId:string(r.incident_id),createdAt:iso(r.created_at),label:string(r.label),targetNodeId:nullableString(r.target_node_id),confidence:Number(r.confidence),rationale:string(r.rationale),evidenceIds:array(r.evidence_ids),assumptions:array(r.assumptions),modelProvider:string(r.model_provider) as RootCauseHypothesis["modelProvider"],modelName:nullableString(r.model_name),promptVersion:nullableString(r.prompt_version) });
const toBlastRadius = (r: Row): BlastRadiusSnapshot => ({ id:string(r.id),incidentId:string(r.incident_id),createdAt:iso(r.created_at),affectedUsersEstimate:Number(r.affected_users_estimate),affectedServiceIds:array(r.affected_service_ids),affectedAreaCodes:array(r.affected_area_codes),affectedNodeIds:array(r.affected_node_ids) });
const toProposal = (r: Row): RemediationProposal => ({ id:string(r.id),incidentId:string(r.incident_id),version:Number(r.version),createdAt:iso(r.created_at),createdBy:string(r.created_by) as RemediationProposal["createdBy"],actionType:string(r.action_type) as RemediationProposal["actionType"],targetNodeId:nullableString(r.target_node_id),parameters:object(r.parameters),rationale:string(r.rationale),expectedEffect:string(r.expected_effect),risk:string(r.risk) as RemediationProposal["risk"],evidenceIds:array(r.evidence_ids),state:string(r.state) as RemediationProposal["state"] });
const toExecution = (r: Row): RemediationExecution => ({ id:string(r.id),proposalId:string(r.proposal_id),startedAt:iso(r.started_at),completedAt:nullableString(r.completed_at),state:string(r.state) as RemediationExecution["state"],simulatorActionId:nullableString(r.simulator_action_id),resultSummary:nullableString(r.result_summary) });
