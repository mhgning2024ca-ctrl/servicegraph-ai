BEGIN;

CREATE TABLE IF NOT EXISTS customer_communications (
  id uuid PRIMARY KEY,
  incident_id uuid NOT NULL REFERENCES incidents(id),
  created_at timestamptz NOT NULL,
  audience text NOT NULL,
  language text NOT NULL,
  message_text text NOT NULL,
  voice_asset_id text,
  state text NOT NULL
);

CREATE TABLE IF NOT EXISTS audit_events (
  id uuid PRIMARY KEY,
  created_at timestamptz NOT NULL,
  correlation_id uuid NOT NULL,
  actor_subject text,
  action text NOT NULL,
  entity_type text NOT NULL,
  entity_id uuid,
  payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  CONSTRAINT audit_payload_object CHECK (jsonb_typeof(payload) = 'object')
);

CREATE TABLE IF NOT EXISTS integration_health (
  provider text PRIMARY KEY,
  state text NOT NULL,
  checked_at timestamptz NOT NULL,
  reason_code text
);

COMMIT;
