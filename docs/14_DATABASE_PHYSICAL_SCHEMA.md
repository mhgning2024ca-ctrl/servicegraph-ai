# 14 — Physical Database Baseline

Version: 0.1.0
Status: NORMATIVE / MIGRATION BASELINE

## General
Database: TigerData/PostgreSQL
Primary key type: UUID
Timestamp type: timestamptz
Naming: snake_case

## Migration naming
`NNNN_description.sql`

Initial sequence:
- 0001_extensions.sql
- 0002_core_services_nodes.sql
- 0003_reports.sql
- 0004_incidents_evidence.sql
- 0005_remediation.sql
- 0006_communications_audit.sql
- 0007_telemetry_hypertable.sql
- 0008_demo_indexes.sql
- 0009_demo_seed.sql only if migrations/seeds are intentionally combined; otherwise keep seed outside migrations

## Required tables and key constraints

### services
- id uuid PK
- code text UNIQUE NOT NULL
- name text NOT NULL
- description text NULL
- public_visible boolean NOT NULL default true
- status text NOT NULL

### infrastructure_nodes
- id uuid PK
- code text UNIQUE NOT NULL
- name text NOT NULL
- node_type text NOT NULL
- status text NOT NULL
- latitude double precision NULL
- longitude double precision NULL
- area_code text NULL
- metadata jsonb NOT NULL default '{}'

### service_node_dependencies
- service_id uuid FK services(id) ON DELETE CASCADE
- node_id uuid FK infrastructure_nodes(id) ON DELETE CASCADE
- dependency_type text NOT NULL
- PRIMARY KEY(service_id,node_id,dependency_type)

### customer_reports
- id uuid PK
- client_report_id uuid UNIQUE NOT NULL
- created_at timestamptz NOT NULL
- channel text NOT NULL
- state text NOT NULL
- report_text text NOT NULL
- transcript text NULL
- audio_asset_id text NULL
- service_id uuid NULL FK services(id)
- area_code text NULL
- latitude double precision NULL
- longitude double precision NULL
- symptom_codes text[] NOT NULL default '{}'
- citizen_subject text NULL
- correlated_incident_id uuid NULL
- source_language text NULL

### incidents
- id uuid PK
- incident_number text UNIQUE NOT NULL
- title text NOT NULL
- status text NOT NULL
- severity text NOT NULL
- created_at timestamptz NOT NULL
- updated_at timestamptz NOT NULL
- started_at timestamptz NULL
- resolved_at timestamptz NULL
- affected_users_estimate integer NOT NULL default 0
- probable_root_node_id uuid NULL FK infrastructure_nodes(id)
- root_cause_confidence double precision NULL CHECK between 0 and 1

After incidents exists:
customer_reports.correlated_incident_id FK incidents(id) ON DELETE SET NULL

### incident_reports
- incident_id uuid FK incidents(id) ON DELETE CASCADE
- report_id uuid FK customer_reports(id) ON DELETE CASCADE
- correlation_score double precision NOT NULL CHECK between 0 and 1
- created_at timestamptz NOT NULL
- PRIMARY KEY(incident_id,report_id)

### incident_evidence
- id uuid PK
- incident_id uuid FK incidents(id) ON DELETE CASCADE
- evidence_type text NOT NULL
- source_id uuid NOT NULL
- summary text NOT NULL
- observed_at timestamptz NOT NULL
- weight double precision NOT NULL

### root_cause_hypotheses
- id uuid PK
- incident_id uuid FK incidents(id) ON DELETE CASCADE
- created_at timestamptz NOT NULL
- label text NOT NULL
- target_node_id uuid NULL FK infrastructure_nodes(id)
- confidence double precision NOT NULL CHECK between 0 and 1
- rationale text NOT NULL
- evidence_ids uuid[] NOT NULL
- assumptions text[] NOT NULL default '{}'
- model_provider text NOT NULL
- model_name text NULL
- prompt_version text NULL

### blast_radius_snapshots
- id uuid PK
- incident_id uuid FK incidents(id) ON DELETE CASCADE
- created_at timestamptz NOT NULL
- affected_users_estimate integer NOT NULL
- affected_service_ids uuid[] NOT NULL
- affected_area_codes text[] NOT NULL
- affected_node_ids uuid[] NOT NULL

### remediation_proposals
- id uuid PK
- incident_id uuid FK incidents(id) ON DELETE CASCADE
- version integer NOT NULL
- created_at timestamptz NOT NULL
- created_by text NOT NULL
- action_type text NOT NULL
- target_node_id uuid NULL FK infrastructure_nodes(id)
- parameters jsonb NOT NULL default '{}'
- rationale text NOT NULL
- expected_effect text NOT NULL
- risk text NOT NULL
- evidence_ids uuid[] NOT NULL
- state text NOT NULL
- UNIQUE(incident_id,version)

### approval_decisions
- id uuid PK
- proposal_id uuid FK remediation_proposals(id) ON DELETE CASCADE
- proposal_version integer NOT NULL
- decided_at timestamptz NOT NULL
- decision text NOT NULL
- actor_subject text NOT NULL
- actor_role text NOT NULL
- comment text NULL

### remediation_executions
- id uuid PK
- proposal_id uuid FK remediation_proposals(id)
- started_at timestamptz NOT NULL
- completed_at timestamptz NULL
- state text NOT NULL
- simulator_action_id text NULL
- result_summary text NULL

### verification_snapshots
- id uuid PK
- incident_id uuid FK incidents(id)
- execution_id uuid FK remediation_executions(id)
- created_at timestamptz NOT NULL
- window_start timestamptz NOT NULL
- window_end timestamptz NOT NULL
- passed boolean NOT NULL
- checks jsonb NOT NULL

### customer_communications
- id uuid PK
- incident_id uuid FK incidents(id)
- created_at timestamptz NOT NULL
- audience text NOT NULL
- language text NOT NULL
- message_text text NOT NULL
- voice_asset_id text NULL
- state text NOT NULL

### audit_events
- id uuid PK
- created_at timestamptz NOT NULL
- correlation_id uuid NOT NULL
- actor_subject text NULL
- action text NOT NULL
- entity_type text NOT NULL
- entity_id uuid NULL
- payload jsonb NOT NULL default '{}'

### integration_health
- provider text PRIMARY KEY
- state text NOT NULL
- checked_at timestamptz NOT NULL
- reason_code text NULL

### telemetry_samples
- id uuid NOT NULL
- node_id uuid NOT NULL FK infrastructure_nodes(id)
- observed_at timestamptz NOT NULL
- metric text NOT NULL
- value double precision NOT NULL
- unit text NOT NULL
- source text NOT NULL
- scenario_id uuid NULL

TigerData hypertable time column:
`observed_at`

## Required indexes
- customer_reports(created_at desc)
- customer_reports(correlated_incident_id)
- incidents(status,severity,updated_at desc)
- incident_evidence(incident_id,observed_at desc)
- root_cause_hypotheses(incident_id,created_at desc)
- remediation_proposals(incident_id,version desc)
- audit_events(correlation_id)
- audit_events(entity_type,entity_id,created_at desc)
- telemetry_samples(node_id,metric,observed_at desc)

## Seed identifiers
Canonical demo codes:
- NODE-11
- NODE-12
- NODE-17
- NODE-21
- NODE-31
- scenario key: node17-degradation
- main incident display number: INC-2048
