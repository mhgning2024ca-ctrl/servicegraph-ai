# ServiceGraph AI data layer

This directory contains the PostgreSQL/TigerData schema and deterministic demo fixtures owned by A3.

## Apply migrations

```bash
for migration in database/migrations/*.sql; do
  psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -f "$migration"
done
```

The initial migration is repeatable. When the `timescaledb` extension is already enabled by the database provider, `telemetry_samples` is converted to a range hypertable on `observed_at`. Plain PostgreSQL remains a supported local fallback with the same table and indexes.

## Load deterministic fixtures

```bash
scripts/seed/run.sh
```

The seed is idempotent and uses stable UUIDs. The full `node17-degradation` fixture can be loaded separately after the base seed:

```bash
psql "$DATABASE_URL" -v ON_ERROR_STOP=1 \
  -f database/demo-scenarios/node17-degradation.sql
```

The scenario is explicitly simulator data. It contains a healthy baseline, an observable latency/packet-loss degradation on `NODE-17`, and recovery samples after the canonical simulated action.
