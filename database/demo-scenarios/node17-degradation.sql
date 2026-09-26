BEGIN;

-- Canonical deterministic fixture. All rows are explicitly SIMULATOR sourced.
-- Virtual timeline: healthy 12:00-12:04, degradation 12:05-12:09,
-- sustained impact 12:10-12:11, approved-action recovery 12:12-12:16.
WITH scenario AS (
  SELECT
    '71717171-1717-4717-8717-171717171717'::uuid AS scenario_id,
    '17171717-1717-4717-8717-171717171717'::uuid AS node_id,
    '2026-09-26T12:00:00Z'::timestamptz AS started_at
), samples(offset_minute, metric, value, unit) AS (
  VALUES
    (0, 'LATENCY_MS'::telemetry_metric, 18.0, 'ms'),
    (0, 'PACKET_LOSS_PCT'::telemetry_metric, 0.1, 'percent'),
    (1, 'LATENCY_MS'::telemetry_metric, 19.0, 'ms'),
    (1, 'PACKET_LOSS_PCT'::telemetry_metric, 0.1, 'percent'),
    (2, 'LATENCY_MS'::telemetry_metric, 18.0, 'ms'),
    (2, 'PACKET_LOSS_PCT'::telemetry_metric, 0.2, 'percent'),
    (3, 'LATENCY_MS'::telemetry_metric, 20.0, 'ms'),
    (3, 'PACKET_LOSS_PCT'::telemetry_metric, 0.1, 'percent'),
    (4, 'LATENCY_MS'::telemetry_metric, 19.0, 'ms'),
    (4, 'PACKET_LOSS_PCT'::telemetry_metric, 0.2, 'percent'),
    (5, 'LATENCY_MS'::telemetry_metric, 42.0, 'ms'),
    (5, 'PACKET_LOSS_PCT'::telemetry_metric, 1.8, 'percent'),
    (6, 'LATENCY_MS'::telemetry_metric, 78.0, 'ms'),
    (6, 'PACKET_LOSS_PCT'::telemetry_metric, 4.2, 'percent'),
    (7, 'LATENCY_MS'::telemetry_metric, 126.0, 'ms'),
    (7, 'PACKET_LOSS_PCT'::telemetry_metric, 8.4, 'percent'),
    (8, 'LATENCY_MS'::telemetry_metric, 181.0, 'ms'),
    (8, 'PACKET_LOSS_PCT'::telemetry_metric, 12.6, 'percent'),
    (9, 'LATENCY_MS'::telemetry_metric, 224.0, 'ms'),
    (9, 'PACKET_LOSS_PCT'::telemetry_metric, 17.8, 'percent'),
    (10, 'LATENCY_MS'::telemetry_metric, 238.0, 'ms'),
    (10, 'PACKET_LOSS_PCT'::telemetry_metric, 19.1, 'percent'),
    (11, 'LATENCY_MS'::telemetry_metric, 231.0, 'ms'),
    (11, 'PACKET_LOSS_PCT'::telemetry_metric, 18.5, 'percent'),
    (12, 'LATENCY_MS'::telemetry_metric, 142.0, 'ms'),
    (12, 'PACKET_LOSS_PCT'::telemetry_metric, 9.0, 'percent'),
    (13, 'LATENCY_MS'::telemetry_metric, 74.0, 'ms'),
    (13, 'PACKET_LOSS_PCT'::telemetry_metric, 3.1, 'percent'),
    (14, 'LATENCY_MS'::telemetry_metric, 36.0, 'ms'),
    (14, 'PACKET_LOSS_PCT'::telemetry_metric, 0.9, 'percent'),
    (15, 'LATENCY_MS'::telemetry_metric, 22.0, 'ms'),
    (15, 'PACKET_LOSS_PCT'::telemetry_metric, 0.3, 'percent'),
    (16, 'LATENCY_MS'::telemetry_metric, 19.0, 'ms'),
    (16, 'PACKET_LOSS_PCT'::telemetry_metric, 0.2, 'percent')
)
INSERT INTO telemetry_samples (id, node_id, observed_at, metric, value, unit, source, scenario_id)
SELECT
  md5(s.scenario_id::text || ':' || samples.offset_minute::text || ':' || samples.metric::text)::uuid,
  s.node_id,
  s.started_at + make_interval(mins => samples.offset_minute),
  samples.metric,
  samples.value,
  samples.unit,
  'SIMULATOR',
  s.scenario_id
FROM scenario s
CROSS JOIN samples
ON CONFLICT (observed_at, id) DO UPDATE SET
  value = EXCLUDED.value,
  unit = EXCLUDED.unit,
  source = EXCLUDED.source,
  scenario_id = EXCLUDED.scenario_id;

COMMIT;
