PRAGMA foreign_keys = ON;

-- Development-only seed data for local D1.
-- Do not use real personal or production data.
-- password_hash is a placeholder and must be replaced/validated in the auth block.

INSERT OR REPLACE INTO facilities (
  id,
  name,
  slug,
  is_active,
  created_at,
  updated_at
) VALUES (
  'fac-demo-001',
  'Hogar Demo Centro',
  'hogar-demo-centro',
  1,
  '2026-01-01T00:00:00Z',
  '2026-01-01T00:00:00Z'
);

INSERT OR REPLACE INTO users (
  id,
  dni,
  email,
  full_name,
  password_hash,
  role,
  active_facility_id,
  is_active,
  created_at,
  updated_at
) VALUES (
  'usr-admin-demo-001',
  '00000000',
  'admin.demo@local.invalid',
  'Admin Demo',
  'scrypt$v1$16384$8$1$6SmRSRPUeU0c3Esw5lSesQ==$+h43zkkVyGMXdA0m4Ov9h2HUZZc3A6XJMc0mvVMz9Oo=',
  'admin',
  'fac-demo-001',
  1,
  '2026-01-01T00:00:00Z',
  '2026-01-01T00:00:00Z'
);

INSERT OR REPLACE INTO facility_users (
  id,
  facility_id,
  user_id,
  role,
  is_active,
  created_at,
  updated_at
) VALUES (
  'fu-demo-001',
  'fac-demo-001',
  'usr-admin-demo-001',
  'admin',
  1,
  '2026-01-01T00:00:00Z',
  '2026-01-01T00:00:00Z'
);

INSERT OR REPLACE INTO residents (
  id,
  facility_id,
  first_name,
  last_name,
  dni,
  room,
  status,
  medical_notes,
  created_at,
  updated_at
) VALUES (
  'res-demo-001',
  'fac-demo-001',
  'Juan',
  'Demo',
  '11111111',
  '101',
  'ACTIVE',
  'Resident demo for local validation only.',
  '2026-01-01T00:00:00Z',
  '2026-01-01T00:00:00Z'
);

INSERT OR REPLACE INTO resident_contacts (
  id,
  resident_id,
  full_name,
  relationship,
  phone,
  email,
  notes,
  is_primary,
  created_at,
  updated_at
) VALUES (
  'rc-demo-001',
  'res-demo-001',
  'Maria Demo',
  'Hija',
  '+54-11-0000-0000',
  'contacto.demo@local.invalid',
  'Contacto demo de desarrollo local.',
  1,
  '2026-01-01T00:00:00Z',
  '2026-01-01T00:00:00Z'
);
