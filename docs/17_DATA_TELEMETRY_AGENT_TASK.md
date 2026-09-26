# 17 — Data / TigerData / Simulator Agent A3 Task Contract

Agent ID: A3
Role: Data, TigerData, Telemetry, Simulator
Branch: feature/data-telemetry
Status: READY

## Owned paths
- database/**
- packages/db/**
- services/network-simulator/**
- scripts/seed/**

## Read before coding
- AGENTS.md
- docs/00_MASTER_SPEC.md
- docs/01_SYSTEM_ARCHITECTURE.md
- docs/03_API_DATA_CONTRACTS.md
- docs/14_DATABASE_PHYSICAL_SCHEMA.md
- docs/15_SHARED_FILES_RUNTIME.md

## Mandatory deliverables
1. SQL migrations 0001+ in documented order.
2. TigerData-compatible telemetry hypertable.
3. indexes and foreign keys.
4. deterministic seeds.
5. deterministic NODE-17 degradation scenario.
6. deterministic recovery after approved simulated reroute.
7. repository/data-access functions required by A2.
8. telemetry window queries.
9. blast-radius supporting queries.
10. verification queries.

## Canonical demo data
Nodes:
NODE-11, NODE-12, NODE-17, NODE-21, NODE-31

Scenario:
node17-degradation

Expected degraded peak:
- packet loss around 21%
- latency around 242 ms

Main incident:
INC-2048

## Simulator constraints
- deterministic
- repeatable reset
- no random demo outcome
- simulator output uses canonical TelemetrySample contract
- execution actions are idempotent

## Acceptance
- clean database can migrate from zero
- seed can run repeatedly in documented manner
- scenario can start/reset
- telemetry query returns expected NODE-17 anomaly
- recovery data exists after approved action simulation
- no DB port/public credential exposure
- no secrets committed

## Forbidden
- adding undocumented tables/columns
- changing incident enums
- embedding Gemini logic in DB layer
- direct push to main
