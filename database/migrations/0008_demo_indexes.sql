BEGIN;

CREATE INDEX IF NOT EXISTS customer_reports_created_idx
  ON customer_reports (created_at DESC);
CREATE INDEX IF NOT EXISTS customer_reports_incident_idx
  ON customer_reports (correlated_incident_id);
CREATE INDEX IF NOT EXISTS incidents_queue_idx
  ON incidents (status, severity, updated_at DESC);
CREATE INDEX IF NOT EXISTS incident_evidence_incident_time_idx
  ON incident_evidence (incident_id, observed_at DESC);
CREATE INDEX IF NOT EXISTS root_cause_hypotheses_incident_time_idx
  ON root_cause_hypotheses (incident_id, created_at DESC);
CREATE INDEX IF NOT EXISTS remediation_proposals_incident_version_idx
  ON remediation_proposals (incident_id, version DESC);
CREATE INDEX IF NOT EXISTS audit_events_correlation_idx
  ON audit_events (correlation_id);
CREATE INDEX IF NOT EXISTS audit_events_entity_time_idx
  ON audit_events (entity_type, entity_id, created_at DESC);
CREATE INDEX IF NOT EXISTS telemetry_samples_node_metric_observed_idx
  ON telemetry_samples (node_id, metric, observed_at DESC);
CREATE INDEX IF NOT EXISTS telemetry_samples_scenario_observed_idx
  ON telemetry_samples (scenario_id, observed_at) WHERE scenario_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS blast_radius_latest_idx
  ON blast_radius_snapshots (incident_id, created_at DESC);
CREATE INDEX IF NOT EXISTS verification_latest_idx
  ON verification_snapshots (incident_id, created_at DESC);
CREATE UNIQUE INDEX IF NOT EXISTS remediation_executions_simulator_action_idx
  ON remediation_executions (simulator_action_id) WHERE simulator_action_id IS NOT NULL;

CREATE OR REPLACE VIEW latest_node_telemetry AS
SELECT DISTINCT ON (node_id, metric)
  id, node_id, observed_at, metric, value, unit, source, scenario_id
FROM telemetry_samples
ORDER BY node_id, metric, observed_at DESC, id DESC;

CREATE OR REPLACE VIEW incident_blast_radius_current AS
SELECT DISTINCT ON (incident_id)
  id, incident_id, created_at, affected_users_estimate,
  affected_service_ids, affected_area_codes, affected_node_ids
FROM blast_radius_snapshots
ORDER BY incident_id, created_at DESC, id DESC;

CREATE OR REPLACE VIEW incident_verification_current AS
SELECT DISTINCT ON (incident_id)
  id, incident_id, execution_id, created_at, window_start, window_end, passed, checks
FROM verification_snapshots
ORDER BY incident_id, created_at DESC, id DESC;

COMMIT;
