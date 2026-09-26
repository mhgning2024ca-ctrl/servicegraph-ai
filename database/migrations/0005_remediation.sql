BEGIN;

CREATE TABLE IF NOT EXISTS remediation_proposals (
  id uuid PRIMARY KEY,
  incident_id uuid NOT NULL REFERENCES incidents(id) ON DELETE CASCADE,
  version integer NOT NULL CHECK (version > 0),
  created_at timestamptz NOT NULL,
  created_by text NOT NULL,
  action_type text NOT NULL,
  target_node_id uuid REFERENCES infrastructure_nodes(id),
  parameters jsonb NOT NULL DEFAULT '{}'::jsonb,
  rationale text NOT NULL,
  expected_effect text NOT NULL,
  risk text NOT NULL,
  evidence_ids uuid[] NOT NULL,
  state text NOT NULL,
  UNIQUE (incident_id, version),
  CONSTRAINT remediation_parameters_object CHECK (jsonb_typeof(parameters) = 'object')
);

CREATE TABLE IF NOT EXISTS approval_decisions (
  id uuid PRIMARY KEY,
  proposal_id uuid NOT NULL REFERENCES remediation_proposals(id) ON DELETE CASCADE,
  proposal_version integer NOT NULL,
  decided_at timestamptz NOT NULL,
  decision text NOT NULL,
  actor_subject text NOT NULL,
  actor_role text NOT NULL,
  comment text
);

CREATE TABLE IF NOT EXISTS remediation_executions (
  id uuid PRIMARY KEY,
  proposal_id uuid NOT NULL REFERENCES remediation_proposals(id),
  started_at timestamptz NOT NULL,
  completed_at timestamptz,
  state text NOT NULL,
  simulator_action_id text,
  result_summary text,
  CONSTRAINT remediation_execution_time CHECK (completed_at IS NULL OR completed_at >= started_at)
);

CREATE TABLE IF NOT EXISTS verification_snapshots (
  id uuid PRIMARY KEY,
  incident_id uuid NOT NULL REFERENCES incidents(id),
  execution_id uuid NOT NULL REFERENCES remediation_executions(id),
  created_at timestamptz NOT NULL,
  window_start timestamptz NOT NULL,
  window_end timestamptz NOT NULL,
  passed boolean NOT NULL,
  checks jsonb NOT NULL,
  CONSTRAINT verification_window CHECK (window_end >= window_start),
  CONSTRAINT verification_checks_array CHECK (jsonb_typeof(checks) = 'array')
);

COMMIT;
