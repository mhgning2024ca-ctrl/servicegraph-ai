BEGIN;

CREATE TABLE IF NOT EXISTS incidents (
  id uuid PRIMARY KEY,
  incident_number text NOT NULL UNIQUE,
  title text NOT NULL,
  status text NOT NULL,
  severity text NOT NULL,
  created_at timestamptz NOT NULL,
  updated_at timestamptz NOT NULL,
  started_at timestamptz,
  resolved_at timestamptz,
  affected_users_estimate integer NOT NULL DEFAULT 0 CHECK (affected_users_estimate >= 0),
  probable_root_node_id uuid REFERENCES infrastructure_nodes(id),
  root_cause_confidence double precision CHECK (root_cause_confidence BETWEEN 0 AND 1),
  CONSTRAINT incidents_resolution_time CHECK (resolved_at IS NULL OR started_at IS NULL OR resolved_at >= started_at)
);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'customer_reports_correlated_incident_id_fkey'
      AND conrelid = 'customer_reports'::regclass
  ) THEN
    ALTER TABLE customer_reports
      ADD CONSTRAINT customer_reports_correlated_incident_id_fkey
      FOREIGN KEY (correlated_incident_id) REFERENCES incidents(id) ON DELETE SET NULL;
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS incident_reports (
  incident_id uuid NOT NULL REFERENCES incidents(id) ON DELETE CASCADE,
  report_id uuid NOT NULL REFERENCES customer_reports(id) ON DELETE CASCADE,
  correlation_score double precision NOT NULL CHECK (correlation_score BETWEEN 0 AND 1),
  created_at timestamptz NOT NULL,
  PRIMARY KEY (incident_id, report_id)
);

CREATE TABLE IF NOT EXISTS incident_evidence (
  id uuid PRIMARY KEY,
  incident_id uuid NOT NULL REFERENCES incidents(id) ON DELETE CASCADE,
  evidence_type text NOT NULL,
  source_id uuid NOT NULL,
  summary text NOT NULL,
  observed_at timestamptz NOT NULL,
  weight double precision NOT NULL
);

CREATE TABLE IF NOT EXISTS root_cause_hypotheses (
  id uuid PRIMARY KEY,
  incident_id uuid NOT NULL REFERENCES incidents(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL,
  label text NOT NULL,
  target_node_id uuid REFERENCES infrastructure_nodes(id),
  confidence double precision NOT NULL CHECK (confidence BETWEEN 0 AND 1),
  rationale text NOT NULL,
  evidence_ids uuid[] NOT NULL,
  assumptions text[] NOT NULL DEFAULT ARRAY[]::text[],
  model_provider text NOT NULL,
  model_name text,
  prompt_version text
);

CREATE TABLE IF NOT EXISTS blast_radius_snapshots (
  id uuid PRIMARY KEY,
  incident_id uuid NOT NULL REFERENCES incidents(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL,
  affected_users_estimate integer NOT NULL CHECK (affected_users_estimate >= 0),
  affected_service_ids uuid[] NOT NULL,
  affected_area_codes text[] NOT NULL,
  affected_node_ids uuid[] NOT NULL
);

COMMIT;
