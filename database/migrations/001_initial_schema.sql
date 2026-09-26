BEGIN;

CREATE EXTENSION IF NOT EXISTS pgcrypto;

DO $$ BEGIN
  CREATE TYPE service_health_status AS ENUM ('HEALTHY', 'DEGRADED', 'CRITICAL', 'UNKNOWN');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  CREATE TYPE infrastructure_node_type AS ENUM ('ROUTER', 'SWITCH', 'EDGE', 'ACCESS', 'SERVICE');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  CREATE TYPE telemetry_metric AS ENUM ('LATENCY_MS', 'PACKET_LOSS_PCT', 'ERROR_RATE', 'THROUGHPUT_MBPS', 'AVAILABILITY');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  CREATE TYPE telemetry_source AS ENUM ('SIMULATOR', 'EXTERNAL');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  CREATE TYPE report_channel AS ENUM ('WEB_TEXT', 'WEB_VOICE', 'PUBLIC_API', 'SIMULATOR');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  CREATE TYPE report_processing_state AS ENUM ('RECEIVED', 'CLASSIFYING', 'CLASSIFIED', 'CORRELATED', 'NEEDS_REVIEW', 'FAILED');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  CREATE TYPE incident_status AS ENUM ('DETECTED', 'INVESTIGATING', 'CONFIRMED', 'REMEDIATION_PROPOSED', 'AWAITING_APPROVAL', 'REJECTED', 'REMEDIATING', 'VERIFYING', 'RESOLVED', 'CLOSED');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  CREATE TYPE incident_severity AS ENUM ('INFO', 'MINOR', 'MAJOR', 'CRITICAL');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  CREATE TYPE incident_evidence_type AS ENUM ('CUSTOMER_REPORT', 'TELEMETRY_ANOMALY', 'TOPOLOGY', 'HISTORICAL_INCIDENT', 'OPERATOR_NOTE');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  CREATE TYPE hypothesis_provider AS ENUM ('GEMINI', 'RULE_ENGINE');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  CREATE TYPE remediation_creator AS ENUM ('GEMINI', 'RULE_ENGINE', 'OPERATOR');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  CREATE TYPE remediation_action_type AS ENUM ('REROUTE_TRAFFIC', 'RESTART_SIMULATED_NODE', 'THROTTLE_LOAD', 'NO_ACTION');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  CREATE TYPE remediation_risk AS ENUM ('LOW', 'MEDIUM', 'HIGH');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  CREATE TYPE remediation_proposal_state AS ENUM ('DRAFT', 'PENDING_APPROVAL', 'APPROVED', 'REJECTED', 'EXECUTED', 'SUPERSEDED');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  CREATE TYPE approval_decision_type AS ENUM ('APPROVE', 'REJECT');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  CREATE TYPE approval_actor_role AS ENUM ('INCIDENT_MANAGER', 'ADMINISTRATOR');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  CREATE TYPE remediation_execution_state AS ENUM ('PENDING', 'RUNNING', 'SUCCEEDED', 'FAILED');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  CREATE TYPE communication_audience AS ENUM ('AFFECTED_USERS', 'PUBLIC');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  CREATE TYPE communication_language AS ENUM ('en', 'fr');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  CREATE TYPE communication_state AS ENUM ('DRAFT', 'READY', 'SENT', 'FAILED');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  CREATE TYPE integration_state AS ENUM ('AVAILABLE', 'DEGRADED', 'UNAVAILABLE');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE TABLE IF NOT EXISTS services (
  id uuid PRIMARY KEY,
  code text NOT NULL UNIQUE,
  name text NOT NULL,
  description text,
  public_visible boolean NOT NULL,
  status service_health_status NOT NULL
);

CREATE TABLE IF NOT EXISTS infrastructure_nodes (
  id uuid PRIMARY KEY,
  code text NOT NULL UNIQUE,
  name text NOT NULL,
  type infrastructure_node_type NOT NULL,
  status service_health_status NOT NULL,
  latitude double precision,
  longitude double precision,
  area_code text,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  CONSTRAINT infrastructure_nodes_metadata_object CHECK (jsonb_typeof(metadata) = 'object')
);

CREATE TABLE IF NOT EXISTS service_node_dependencies (
  service_id uuid NOT NULL REFERENCES services(id) ON DELETE CASCADE,
  node_id uuid NOT NULL REFERENCES infrastructure_nodes(id) ON DELETE CASCADE,
  PRIMARY KEY (service_id, node_id)
);

CREATE TABLE IF NOT EXISTS telemetry_samples (
  id uuid NOT NULL,
  node_id uuid NOT NULL REFERENCES infrastructure_nodes(id),
  observed_at timestamptz NOT NULL,
  metric telemetry_metric NOT NULL,
  value double precision NOT NULL,
  unit text NOT NULL,
  source telemetry_source NOT NULL,
  scenario_id uuid,
  PRIMARY KEY (observed_at, id),
  CONSTRAINT telemetry_samples_finite_value CHECK (value NOT IN ('Infinity'::float8, '-Infinity'::float8) AND value <> 'NaN'::float8)
);

CREATE TABLE IF NOT EXISTS customer_reports (
  id uuid PRIMARY KEY,
  client_report_id uuid NOT NULL UNIQUE,
  created_at timestamptz NOT NULL,
  channel report_channel NOT NULL,
  state report_processing_state NOT NULL,
  text text NOT NULL,
  transcript text,
  audio_asset_id uuid,
  service_id uuid REFERENCES services(id),
  area_code text,
  latitude double precision,
  longitude double precision,
  symptom_codes text[] NOT NULL DEFAULT ARRAY[]::text[],
  citizen_id text,
  correlated_incident_id uuid,
  source_language text
);

CREATE TABLE IF NOT EXISTS incidents (
  id uuid PRIMARY KEY,
  incident_number text NOT NULL UNIQUE,
  title text NOT NULL,
  status incident_status NOT NULL,
  severity incident_severity NOT NULL,
  created_at timestamptz NOT NULL,
  updated_at timestamptz NOT NULL,
  started_at timestamptz,
  resolved_at timestamptz,
  affected_users_estimate integer NOT NULL DEFAULT 0 CHECK (affected_users_estimate >= 0),
  affected_service_ids uuid[] NOT NULL DEFAULT ARRAY[]::uuid[],
  affected_area_codes text[] NOT NULL DEFAULT ARRAY[]::text[],
  probable_root_node_id uuid REFERENCES infrastructure_nodes(id),
  root_cause_confidence double precision CHECK (root_cause_confidence BETWEEN 0 AND 1),
  CONSTRAINT incidents_resolution_time CHECK (resolved_at IS NULL OR started_at IS NULL OR resolved_at >= started_at)
);

ALTER TABLE customer_reports
  DROP CONSTRAINT IF EXISTS customer_reports_correlated_incident_id_fkey;
ALTER TABLE customer_reports
  ADD CONSTRAINT customer_reports_correlated_incident_id_fkey
  FOREIGN KEY (correlated_incident_id) REFERENCES incidents(id);

CREATE TABLE IF NOT EXISTS incident_reports (
  incident_id uuid NOT NULL REFERENCES incidents(id) ON DELETE CASCADE,
  report_id uuid NOT NULL REFERENCES customer_reports(id) ON DELETE CASCADE,
  PRIMARY KEY (incident_id, report_id),
  UNIQUE (report_id)
);

CREATE TABLE IF NOT EXISTS incident_evidence (
  id uuid PRIMARY KEY,
  incident_id uuid NOT NULL REFERENCES incidents(id) ON DELETE CASCADE,
  type incident_evidence_type NOT NULL,
  source_id uuid NOT NULL,
  summary text NOT NULL,
  observed_at timestamptz NOT NULL,
  weight double precision NOT NULL CHECK (weight BETWEEN 0 AND 1)
);

CREATE TABLE IF NOT EXISTS root_cause_hypotheses (
  id uuid PRIMARY KEY,
  incident_id uuid NOT NULL REFERENCES incidents(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL,
  label text NOT NULL,
  target_node_id uuid REFERENCES infrastructure_nodes(id),
  confidence double precision NOT NULL CHECK (confidence BETWEEN 0 AND 1),
  rationale text NOT NULL,
  evidence_ids uuid[] NOT NULL DEFAULT ARRAY[]::uuid[],
  assumptions text[] NOT NULL DEFAULT ARRAY[]::text[],
  model_provider hypothesis_provider NOT NULL,
  model_name text,
  prompt_version text
);

CREATE TABLE IF NOT EXISTS blast_radius_snapshots (
  id uuid PRIMARY KEY,
  incident_id uuid NOT NULL REFERENCES incidents(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL,
  affected_users_estimate integer NOT NULL CHECK (affected_users_estimate >= 0),
  affected_service_ids uuid[] NOT NULL DEFAULT ARRAY[]::uuid[],
  affected_area_codes text[] NOT NULL DEFAULT ARRAY[]::text[],
  affected_node_ids uuid[] NOT NULL DEFAULT ARRAY[]::uuid[]
);

CREATE TABLE IF NOT EXISTS remediation_proposals (
  id uuid PRIMARY KEY,
  incident_id uuid NOT NULL REFERENCES incidents(id) ON DELETE CASCADE,
  version integer NOT NULL CHECK (version > 0),
  created_at timestamptz NOT NULL,
  created_by remediation_creator NOT NULL,
  action_type remediation_action_type NOT NULL,
  target_node_id uuid REFERENCES infrastructure_nodes(id),
  parameters jsonb NOT NULL DEFAULT '{}'::jsonb,
  rationale text NOT NULL,
  expected_effect text NOT NULL,
  risk remediation_risk NOT NULL,
  evidence_ids uuid[] NOT NULL DEFAULT ARRAY[]::uuid[],
  state remediation_proposal_state NOT NULL,
  UNIQUE (id, version),
  CONSTRAINT remediation_parameters_object CHECK (jsonb_typeof(parameters) = 'object')
);

CREATE TABLE IF NOT EXISTS approval_decisions (
  id uuid PRIMARY KEY,
  proposal_id uuid NOT NULL,
  proposal_version integer NOT NULL CHECK (proposal_version > 0),
  decided_at timestamptz NOT NULL,
  decision approval_decision_type NOT NULL,
  actor_subject text NOT NULL,
  actor_role approval_actor_role NOT NULL,
  comment text,
  FOREIGN KEY (proposal_id, proposal_version) REFERENCES remediation_proposals(id, version)
);

CREATE TABLE IF NOT EXISTS remediation_executions (
  id uuid PRIMARY KEY,
  proposal_id uuid NOT NULL REFERENCES remediation_proposals(id),
  started_at timestamptz NOT NULL,
  completed_at timestamptz,
  state remediation_execution_state NOT NULL,
  simulator_action_id uuid,
  result_summary text,
  CONSTRAINT remediation_execution_time CHECK (completed_at IS NULL OR completed_at >= started_at)
);

CREATE TABLE IF NOT EXISTS verification_snapshots (
  id uuid PRIMARY KEY,
  incident_id uuid NOT NULL REFERENCES incidents(id) ON DELETE CASCADE,
  execution_id uuid NOT NULL REFERENCES remediation_executions(id),
  created_at timestamptz NOT NULL,
  window_start timestamptz NOT NULL,
  window_end timestamptz NOT NULL,
  passed boolean NOT NULL,
  checks jsonb NOT NULL,
  CONSTRAINT verification_window CHECK (window_end >= window_start),
  CONSTRAINT verification_checks_array CHECK (jsonb_typeof(checks) = 'array')
);

CREATE TABLE IF NOT EXISTS customer_communications (
  id uuid PRIMARY KEY,
  incident_id uuid NOT NULL REFERENCES incidents(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL,
  audience communication_audience NOT NULL,
  language communication_language NOT NULL,
  text text NOT NULL,
  voice_asset_id uuid,
  state communication_state NOT NULL
);

CREATE TABLE IF NOT EXISTS audit_events (
  id uuid PRIMARY KEY,
  occurred_at timestamptz NOT NULL,
  correlation_id uuid NOT NULL,
  actor_subject text,
  incident_id uuid REFERENCES incidents(id),
  report_id uuid REFERENCES customer_reports(id),
  event_type text NOT NULL,
  outcome text NOT NULL,
  payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  CONSTRAINT audit_payload_object CHECK (jsonb_typeof(payload) = 'object')
);

CREATE TABLE IF NOT EXISTS integration_health (
  integration_name text PRIMARY KEY,
  state integration_state NOT NULL,
  checked_at timestamptz NOT NULL,
  detail text
);

CREATE INDEX IF NOT EXISTS telemetry_samples_node_metric_observed_idx
  ON telemetry_samples (node_id, metric, observed_at DESC);
CREATE INDEX IF NOT EXISTS telemetry_samples_scenario_observed_idx
  ON telemetry_samples (scenario_id, observed_at) WHERE scenario_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS customer_reports_correlation_idx
  ON customer_reports (service_id, area_code, created_at DESC);
CREATE INDEX IF NOT EXISTS customer_reports_incident_idx
  ON customer_reports (correlated_incident_id);
CREATE INDEX IF NOT EXISTS incidents_queue_idx
  ON incidents (status, severity, updated_at DESC);
CREATE INDEX IF NOT EXISTS incident_evidence_incident_time_idx
  ON incident_evidence (incident_id, observed_at DESC);
CREATE INDEX IF NOT EXISTS blast_radius_latest_idx
  ON blast_radius_snapshots (incident_id, created_at DESC);
CREATE INDEX IF NOT EXISTS verification_latest_idx
  ON verification_snapshots (incident_id, created_at DESC);
CREATE UNIQUE INDEX IF NOT EXISTS remediation_executions_simulator_action_idx
  ON remediation_executions (simulator_action_id) WHERE simulator_action_id IS NOT NULL;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'timescaledb') THEN
    PERFORM create_hypertable('telemetry_samples', by_range('observed_at'), if_not_exists => TRUE, migrate_data => TRUE);
  END IF;
END $$;

COMMIT;
