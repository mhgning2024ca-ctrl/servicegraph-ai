export interface SqlQuery {
  text: string;
  values: readonly unknown[];
}

export interface TelemetryWindowInput {
  nodeId: string;
  windowStart: string;
  windowEnd: string;
  metrics?: readonly string[];
}

export function telemetryWindowQuery(input: TelemetryWindowInput): SqlQuery {
  return {
    text: `
      SELECT id, node_id, observed_at, metric, value, unit, source, scenario_id
      FROM telemetry_samples
      WHERE node_id = $1::uuid
        AND observed_at >= $2::timestamptz
        AND observed_at <= $3::timestamptz
        AND ($4::text[] IS NULL OR metric = ANY($4::text[]))
      ORDER BY observed_at ASC, metric ASC
    `,
    values: [input.nodeId, input.windowStart, input.windowEnd, input.metrics?.length ? input.metrics : null],
  };
}

export interface CorrelationCandidatesInput {
  nodeId: string;
  referenceAt: string;
  windowMinutes: number;
  serviceId: string | null;
  areaCode: string | null;
  symptomCodes: readonly string[];
  latencyThreshold: number;
  packetLossThreshold: number;
}

export function correlationCandidatesQuery(input: CorrelationCandidatesInput): SqlQuery {
  return {
    text: `
      WITH anomaly_overlap AS (
        SELECT count(*)::integer AS anomaly_count
        FROM telemetry_samples t
        WHERE t.node_id = $1::uuid
          AND t.observed_at BETWEEN
            $2::timestamptz - make_interval(mins => $3::integer)
            AND $2::timestamptz + make_interval(mins => $3::integer)
          AND (
            (t.metric = 'LATENCY_MS' AND t.value >= $7::double precision)
            OR (t.metric = 'PACKET_LOSS_PCT' AND t.value >= $8::double precision)
          )
      )
      SELECT
        r.id AS report_id,
        r.created_at,
        r.service_id,
        r.area_code,
        r.symptom_codes,
        (r.service_id = $4::uuid) AS same_service,
        (r.area_code = $5::text) AS same_area,
        (r.symptom_codes && $6::text[]) AS symptom_overlap,
        EXISTS (
          SELECT 1
          FROM service_node_dependencies d
          WHERE d.service_id = r.service_id
            AND d.node_id = $1::uuid
        ) AS topology_overlap,
        anomaly_overlap.anomaly_count
      FROM customer_reports r
      CROSS JOIN anomaly_overlap
      WHERE r.created_at BETWEEN
        $2::timestamptz - make_interval(mins => $3::integer)
        AND $2::timestamptz + make_interval(mins => $3::integer)
        AND ($4::uuid IS NULL OR r.service_id = $4::uuid)
        AND ($5::text IS NULL OR r.area_code = $5::text)
      ORDER BY r.created_at ASC, r.id ASC
    `,
    values: [
      input.nodeId,
      input.referenceAt,
      input.windowMinutes,
      input.serviceId,
      input.areaCode,
      input.symptomCodes,
      input.latencyThreshold,
      input.packetLossThreshold,
    ],
  };
}

export interface BlastRadiusInput {
  rootNodeId: string;
  reportWindowStart: string;
  reportWindowEnd: string;
}

export function blastRadiusQuery(input: BlastRadiusInput): SqlQuery {
  return {
    text: `
      WITH affected_services AS (
        SELECT array_agg(d.service_id ORDER BY d.service_id) AS service_ids
        FROM service_node_dependencies d
        WHERE d.node_id = $1::uuid
      ), affected_reports AS (
        SELECT r.id, r.area_code
        FROM customer_reports r
        WHERE r.service_id = ANY(COALESCE((SELECT service_ids FROM affected_services), ARRAY[]::uuid[]))
          AND r.created_at BETWEEN $2::timestamptz AND $3::timestamptz
      )
      SELECT
        COALESCE((SELECT service_ids FROM affected_services), ARRAY[]::uuid[]) AS affected_service_ids,
        ARRAY[$1::uuid] AS affected_node_ids,
        COALESCE(array_agg(DISTINCT affected_reports.area_code)
          FILTER (WHERE affected_reports.area_code IS NOT NULL), ARRAY[]::text[]) AS affected_area_codes,
        count(DISTINCT affected_reports.id)::integer AS correlated_report_count
      FROM affected_reports
    `,
    values: [input.rootNodeId, input.reportWindowStart, input.reportWindowEnd],
  };
}

export interface VerificationMetricsInput {
  nodeId: string;
  executionStartedAt: string;
  beforeWindowStart: string;
  afterWindowEnd: string;
  metrics: readonly string[];
}

export function verificationMetricsQuery(input: VerificationMetricsInput): SqlQuery {
  return {
    text: `
      SELECT
        metric,
        avg(value) FILTER (
          WHERE observed_at >= $3::timestamptz AND observed_at < $2::timestamptz
        )::double precision AS before,
        avg(value) FILTER (
          WHERE observed_at >= $2::timestamptz AND observed_at <= $4::timestamptz
        )::double precision AS after,
        count(*) FILTER (
          WHERE observed_at >= $3::timestamptz AND observed_at < $2::timestamptz
        )::integer AS before_sample_count,
        count(*) FILTER (
          WHERE observed_at >= $2::timestamptz AND observed_at <= $4::timestamptz
        )::integer AS after_sample_count
      FROM telemetry_samples
      WHERE node_id = $1::uuid
        AND observed_at >= $3::timestamptz
        AND observed_at <= $4::timestamptz
        AND metric = ANY($5::text[])
      GROUP BY metric
      ORDER BY metric
    `,
    values: [
      input.nodeId,
      input.executionStartedAt,
      input.beforeWindowStart,
      input.afterWindowEnd,
      input.metrics,
    ],
  };
}

export interface VerificationMetricAggregate {
  metric: string;
  before: number | null;
  after: number | null;
  beforeSampleCount: number;
  afterSampleCount: number;
}

export interface VerificationThreshold {
  metric: string;
  maximum: number;
}

export interface VerificationCheck {
  metric: string;
  before: number;
  after: number;
  threshold: number;
  passed: boolean;
}

export function evaluateVerification(
  aggregates: readonly VerificationMetricAggregate[],
  thresholds: readonly VerificationThreshold[],
): { passed: boolean; checks: readonly VerificationCheck[] } {
  const byMetric = new Map(aggregates.map((aggregate) => [aggregate.metric, aggregate]));
  const checks = thresholds.map((threshold): VerificationCheck => {
    const aggregate = byMetric.get(threshold.metric);
    const hasBothWindows =
      aggregate !== undefined &&
      aggregate.before !== null &&
      aggregate.after !== null &&
      aggregate.beforeSampleCount > 0 &&
      aggregate.afterSampleCount > 0;
    return {
      metric: threshold.metric,
      before: aggregate?.before ?? Number.NaN,
      after: aggregate?.after ?? Number.NaN,
      threshold: threshold.maximum,
      passed: hasBothWindows && aggregate.after! <= threshold.maximum,
    };
  });

  return { passed: checks.length > 0 && checks.every((check) => check.passed), checks };
}
