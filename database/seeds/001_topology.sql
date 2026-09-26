BEGIN;

INSERT INTO services (id, code, name, description, public_visible, status)
VALUES
  ('11111111-1111-4111-8111-111111111101', 'INTERNET', 'Residential Internet', 'Residential broadband service.', TRUE, 'HEALTHY'),
  ('11111111-1111-4111-8111-111111111102', 'VOICE', 'Voice Service', 'Managed voice and calling service.', TRUE, 'HEALTHY'),
  ('11111111-1111-4111-8111-111111111103', 'CIVIC-PORTAL', 'Civic Services Portal', 'Public access to civic digital services.', TRUE, 'HEALTHY')
ON CONFLICT (id) DO UPDATE SET
  code = EXCLUDED.code,
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  public_visible = EXCLUDED.public_visible,
  status = EXCLUDED.status;

INSERT INTO infrastructure_nodes (id, code, name, node_type, status, latitude, longitude, area_code, metadata)
VALUES
  ('17171717-1717-4717-8717-171717171717', 'NODE-17', 'Centretown Aggregation Router', 'ROUTER', 'HEALTHY', 45.4147, -75.6950, 'OTT-CENTRETOWN', '{"simulated":true,"tier":"aggregation"}'),
  ('12121212-1212-4212-8212-121212121212', 'NODE-12', 'Downtown Resiliency Router', 'ROUTER', 'HEALTHY', 45.4215, -75.6972, 'OTT-DOWNTOWN', '{"simulated":true,"tier":"aggregation"}'),
  ('21212121-2121-4121-8121-212121212121', 'NODE-21', 'Centretown Access Switch', 'ACCESS', 'HEALTHY', 45.4107, -75.6914, 'OTT-CENTRETOWN', '{"simulated":true,"tier":"access"}'),
  ('31313131-3131-4131-8131-313131313131', 'NODE-31', 'Glebe Edge', 'EDGE', 'HEALTHY', 45.4007, -75.6871, 'OTT-GLEBE', '{"simulated":true,"tier":"edge"}'),
  ('11111111-1111-4111-8111-111111111111', 'NODE-11', 'ByWard Access Switch', 'ACCESS', 'HEALTHY', 45.4286, -75.6928, 'OTT-BYWARD', '{"simulated":true,"tier":"access"}')
ON CONFLICT (id) DO UPDATE SET
  code = EXCLUDED.code,
  name = EXCLUDED.name,
  node_type = EXCLUDED.node_type,
  status = EXCLUDED.status,
  latitude = EXCLUDED.latitude,
  longitude = EXCLUDED.longitude,
  area_code = EXCLUDED.area_code,
  metadata = EXCLUDED.metadata;

INSERT INTO service_node_dependencies (service_id, node_id, dependency_type)
VALUES
  ('11111111-1111-4111-8111-111111111101', '17171717-1717-4717-8717-171717171717', 'PRIMARY'),
  ('11111111-1111-4111-8111-111111111102', '17171717-1717-4717-8717-171717171717', 'PRIMARY'),
  ('11111111-1111-4111-8111-111111111103', '17171717-1717-4717-8717-171717171717', 'PRIMARY'),
  ('11111111-1111-4111-8111-111111111101', '12121212-1212-4212-8212-121212121212', 'FAILOVER'),
  ('11111111-1111-4111-8111-111111111101', '21212121-2121-4121-8121-212121212121', 'ACCESS'),
  ('11111111-1111-4111-8111-111111111102', '31313131-3131-4131-8131-313131313131', 'ACCESS'),
  ('11111111-1111-4111-8111-111111111103', '11111111-1111-4111-8111-111111111111', 'ACCESS')
ON CONFLICT DO NOTHING;

COMMIT;
