BEGIN;

CREATE TABLE IF NOT EXISTS services (
  id uuid PRIMARY KEY,
  code text NOT NULL UNIQUE,
  name text NOT NULL,
  description text,
  public_visible boolean NOT NULL DEFAULT TRUE,
  status text NOT NULL
);

CREATE TABLE IF NOT EXISTS infrastructure_nodes (
  id uuid PRIMARY KEY,
  code text NOT NULL UNIQUE,
  name text NOT NULL,
  node_type text NOT NULL,
  status text NOT NULL,
  latitude double precision,
  longitude double precision,
  area_code text,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  CONSTRAINT infrastructure_nodes_metadata_object CHECK (jsonb_typeof(metadata) = 'object')
);

CREATE TABLE IF NOT EXISTS service_node_dependencies (
  service_id uuid NOT NULL REFERENCES services(id) ON DELETE CASCADE,
  node_id uuid NOT NULL REFERENCES infrastructure_nodes(id) ON DELETE CASCADE,
  dependency_type text NOT NULL,
  PRIMARY KEY (service_id, node_id, dependency_type)
);

COMMIT;
