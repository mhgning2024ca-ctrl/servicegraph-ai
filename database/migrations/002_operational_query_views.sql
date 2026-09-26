BEGIN;

CREATE OR REPLACE VIEW latest_node_telemetry AS
SELECT DISTINCT ON (node_id, metric)
  id,
  node_id,
  observed_at,
  metric,
  value,
  unit,
  source,
  scenario_id
FROM telemetry_samples
ORDER BY node_id, metric, observed_at DESC, id DESC;

CREATE OR REPLACE VIEW incident_blast_radius_current AS
SELECT DISTINCT ON (incident_id)
  id,
  incident_id,
  created_at,
  affected_users_estimate,
  affected_service_ids,
  affected_area_codes,
  affected_node_ids
FROM blast_radius_snapshots
ORDER BY incident_id, created_at DESC, id DESC;

CREATE OR REPLACE VIEW incident_verification_current AS
SELECT DISTINCT ON (incident_id)
  id,
  incident_id,
  execution_id,
  created_at,
  window_start,
  window_end,
  passed,
  checks
FROM verification_snapshots
ORDER BY incident_id, created_at DESC, id DESC;

COMMIT;
