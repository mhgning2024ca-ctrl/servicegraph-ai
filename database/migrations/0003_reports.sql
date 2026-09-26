BEGIN;

CREATE TABLE IF NOT EXISTS customer_reports (
  id uuid PRIMARY KEY,
  client_report_id uuid NOT NULL UNIQUE,
  created_at timestamptz NOT NULL,
  channel text NOT NULL,
  state text NOT NULL,
  report_text text NOT NULL,
  transcript text,
  audio_asset_id text,
  service_id uuid REFERENCES services(id),
  area_code text,
  latitude double precision,
  longitude double precision,
  symptom_codes text[] NOT NULL DEFAULT ARRAY[]::text[],
  citizen_subject text,
  correlated_incident_id uuid,
  source_language text
);

COMMIT;
