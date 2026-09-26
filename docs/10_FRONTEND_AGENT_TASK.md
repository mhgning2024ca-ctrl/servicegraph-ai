# 10 — Frontend Agent A1 Task Contract

Agent ID: A1
Role: Frontend / PWA / UI
Branch: feature/frontend

## Owned paths

apps/web/**
packages/ui/**

## Read before coding

AGENTS.md
docs/00_MASTER_SPEC.md
docs/01_SYSTEM_ARCHITECTURE.md
docs/02_UI_UX_STANDARD.md
docs/03_API_DATA_CONTRACTS.md
docs/09_FRONTEND_IMPLEMENTATION_SPEC.md

## Task

Implement the complete responsive ServiceGraph AI frontend baseline.

Mandatory product surfaces:
1. landing page
2. citizen/customer PWA
3. operations/NOC dashboard
4. incident workspace

Mandatory viewport support:
- mobile
- tablet
- desktop
- large desktop

Mandatory localization:
FR | EN

## Do not interpret freely

Do not:
- change brand colors
- change product name
- change route contracts
- invent backend fields
- create a second localization system
- replace the causal graph concept
- make AI autonomous
- remove approval boundary
- use stock photography
- use emoji in NOC
- push directly to main

If a required value is not specified, use contract-valid mock data already defined by the canonical demo scenario or raise a blocker.

## Initial routes

/
 /citizen
 /ops
 /ops/incidents/INC-2048

## Required first visual state

Demo scenario:
- NODE-17 critical
- 37 related reports
- packet loss 21%
- latency approximately 242 ms
- affected users 1,284
- root-cause confidence 94%
- remediation proposal NODE-17 → NODE-12

These are deterministic demo values, not claimed live production data.

## Required handoff

At completion provide:
- branch name
- commit hashes
- exact files changed
- screenshots or viewport evidence for desktop and mobile
- npm install/build/typecheck results
- known limitations
- mock-to-API integration points
- any blocker requiring architecture decision

Do not self-merge.
