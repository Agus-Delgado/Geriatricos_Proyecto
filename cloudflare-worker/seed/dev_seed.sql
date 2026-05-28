PRAGMA foreign_keys = ON;

-- Development-only seed data for local D1.
-- Do not use real personal or production data.

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
  birth_date,
  sex,
  coverage_type,
  coverage_number,
  admission_date,
  stay_status,
  status,
  notes,
  created_by_user_id,
  updated_by_user_id,
  created_at,
  updated_at
) VALUES (
  'res-demo-001',
  'fac-demo-001',
  'Juan',
  'Demo',
  '11111111',
  '1940-05-15',
  NULL,
  'PARTICULAR',
  NULL,
  '2025-06-01',
  'ACTIVE',
  'ACTIVE',
  'Resident demo for local validation only.',
  'usr-admin-demo-001',
  'usr-admin-demo-001',
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
  address,
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
  NULL,
  'Contacto demo de desarrollo local.',
  1,
  '2026-01-01T00:00:00Z',
  '2026-01-01T00:00:00Z'
);

INSERT OR REPLACE INTO clinical_summaries (
  id,
  resident_id,
  primary_diagnosis,
  secondary_diagnoses,
  allergies,
  current_medications,
  medical_history,
  family_history,
  updated_by_user_id,
  updated_at
) VALUES (
  'cs-demo-001',
  'res-demo-001',
  'Hipertension arterial controlada',
  'Diabetes tipo 2',
  'Penicilina',
  'Metformina 500mg',
  'Antecedente de caida leve en 2024',
  'Sin antecedentes relevantes reportados',
  'usr-admin-demo-001',
  '2026-01-01T00:00:00Z'
);

INSERT OR REPLACE INTO clinical_notes (
  id,
  resident_id,
  facility_id,
  author_user_id,
  note_type,
  content,
  recorded_at,
  created_at
) VALUES (
  'cn-demo-001',
  'res-demo-001',
  'fac-demo-001',
  'usr-admin-demo-001',
  'EVOLUTION',
  'Paciente estable. Continua con controles rutinarios.',
  '2026-01-15T10:00:00Z',
  '2026-01-15T10:00:00Z'
);

INSERT OR REPLACE INTO medication_plans (
  id,
  resident_id,
  facility_id,
  med_name,
  dose,
  route,
  instructions,
  start_date,
  end_date,
  is_active,
  prescribed_by_user_id,
  created_at,
  updated_at
) VALUES (
  'mp-demo-001',
  'res-demo-001',
  'fac-demo-001',
  'Metformina',
  '500mg',
  'VO',
  'Tomar con las comidas',
  '2026-01-01',
  NULL,
  1,
  'usr-admin-demo-001',
  '2026-01-01T00:00:00Z',
  '2026-01-01T00:00:00Z'
);

INSERT OR REPLACE INTO medication_plans (
  id,
  resident_id,
  facility_id,
  med_name,
  dose,
  route,
  instructions,
  start_date,
  end_date,
  is_active,
  prescribed_by_user_id,
  created_at,
  updated_at
) VALUES (
  'mp-demo-inactive',
  'res-demo-001',
  'fac-demo-001',
  'Plan inactivo demo',
  '10mg',
  NULL,
  NULL,
  '2025-01-01',
  '2025-12-31',
  0,
  'usr-admin-demo-001',
  '2026-01-01T00:00:00Z',
  '2026-01-01T00:00:00Z'
);

INSERT OR REPLACE INTO medication_schedule_times (
  id,
  medication_plan_id,
  time,
  day_of_week,
  created_at
) VALUES (
  'mst-demo-001',
  'mp-demo-001',
  '08:00',
  -1,
  '2026-01-01T00:00:00Z'
);
