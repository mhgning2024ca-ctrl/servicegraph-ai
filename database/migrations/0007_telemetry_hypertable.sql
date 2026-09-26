BEGIN;

CREATE TABLE IF NOT EXISTS telemetry_samples (
  id uuid NOT NULL,
  node_id uuid NOT NULL REFERENCES infrastructure_nodes(id),
  observed_at timestamptz NOT NULL,
  metric text NOT NULL,
  value double precision NOT NULL,
  unit text NOT NULL,
  source text NOT NULL,
  scenario_id uuid,
  CONSTRAINT telemetry_samples_finite_value CHECK (value NOT IN ('Infinity'::float8, '-Infinity'::float8) AND value <> 'NaN'::float8)
);

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'timescaledb') THEN
    PERFORM create_hypertable('telemetry_samples', by_range('observed_at'), if_not_exists => TRUE, migrate_data => TRUE);
  END IF;
END $$;

COMMIT;
