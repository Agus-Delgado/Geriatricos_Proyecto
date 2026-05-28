PRAGMA foreign_keys = ON;

-- Staging-only seed for remote D1 (geriatricos_d1_staging).
-- Fictional data only. Do not run against local dev or production.
-- Do not copy dev_seed.sql to remote; use this file with --env staging --remote.
--
-- Staging admin (after seed + JWT secret on Worker):
--   DNI: 90000001  or  email: admin.staging@invalid.test
--   Password: StagingOnly2026!  (staging disposable; rotate if exposed)

INSERT OR REPLACE INTO facilities (
  id,
  name,
  slug,
  is_active,
  created_at,
  updated_at
) VALUES (
  'fac-staging-001',
  'Hogar Staging Norte',
  'hogar-staging-norte',
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
  'usr-admin-staging-001',
  '90000001',
  'admin.staging@invalid.test',
  'Admin Staging',
  'scrypt$v1$16384$8$1$MvNI+zvuoliFmALUDsikXg==$gFKWBGojlZ0UeNFigaDs5HQjaHRDQnChMsX0tF9J18E=',
  'admin',
  'fac-staging-001',
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
  'fu-staging-001',
  'fac-staging-001',
  'usr-admin-staging-001',
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
  'res-staging-001',
  'fac-staging-001',
  'Ana',
  'Ficticia',
  '99999991',
  '1942-03-10',
  NULL,
  'PARTICULAR',
  NULL,
  '2025-08-01',
  'ACTIVE',
  'ACTIVE',
  'Residente ficticio solo para validacion staging remoto.',
  'usr-admin-staging-001',
  'usr-admin-staging-001',
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
  'rc-staging-001',
  'res-staging-001',
  'Contacto Ficticio Staging',
  'Familiar',
  '+54-11-9999-0000',
  'contacto.staging@invalid.test',
  NULL,
  'Contacto de prueba staging; sin datos reales.',
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
  'cs-staging-001',
  'res-staging-001',
  'Condicion ficticia de control',
  'Sin comorbilidades reportadas en seed',
  'Ninguna conocida en seed',
  'Medicacion ficticia de ejemplo',
  'Historial de prueba staging',
  'Sin antecedentes familiares en seed',
  'usr-admin-staging-001',
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
  'cn-staging-001',
  'res-staging-001',
  'fac-staging-001',
  'usr-admin-staging-001',
  'EVOLUTION',
  'Nota clinica ficticia para smoke tests en staging remoto.',
  '2026-01-20T10:00:00Z',
  '2026-01-20T10:00:00Z'
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
  'mp-staging-001',
  'res-staging-001',
  'fac-staging-001',
  'Medicamento Ficticio A',
  '5mg',
  'VO',
  'Solo para pruebas de staging',
  '2026-01-01',
  NULL,
  1,
  'usr-admin-staging-001',
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
  'mst-staging-001',
  'mp-staging-001',
  '08:00',
  -1,
  '2026-01-01T00:00:00Z'
);

INSERT OR REPLACE INTO certificates (
  id,
  resident_id,
  facility_id,
  certificate_type,
  issued_at,
  issued_by_user_id,
  body_text,
  content_json,
  pdf_url,
  created_at
) VALUES (
  'cert-staging-001',
  'res-staging-001',
  'fac-staging-001',
  'CONTROL_CLINICO',
  '2026-01-10T12:00:00Z',
  'usr-admin-staging-001',
  'Certifico que el/la paciente se encuentra bajo control clinico en esta institucion. Constancia ficticia para staging.',
  NULL,
  NULL,
  '2026-01-10T12:00:00Z'
);

INSERT OR REPLACE INTO certificates (
  id,
  resident_id,
  facility_id,
  certificate_type,
  issued_at,
  issued_by_user_id,
  body_text,
  content_json,
  pdf_url,
  created_at
) VALUES (
  'cert-staging-002',
  'res-staging-001',
  'fac-staging-001',
  'PRESENCIA',
  '2026-01-12T09:30:00Z',
  'usr-admin-staging-001',
  'Dejo constancia de presencia del paciente en la sede. Documento de prueba staging.',
  NULL,
  NULL,
  '2026-01-12T09:30:00Z'
);
