PRAGMA foreign_keys = ON;

-- Medications phase (Bloque 14): column names aligned with frontend/src/types/medications.ts

CREATE TABLE IF NOT EXISTS medication_plans (
  id TEXT PRIMARY KEY,
  resident_id TEXT NOT NULL,
  facility_id TEXT NOT NULL,
  med_name TEXT NOT NULL,
  dose TEXT NOT NULL,
  route TEXT,
  instructions TEXT,
  start_date TEXT,
  end_date TEXT,
  is_active INTEGER NOT NULL DEFAULT 1,
  prescribed_by_user_id TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  FOREIGN KEY (resident_id) REFERENCES residents(id) ON DELETE CASCADE,
  FOREIGN KEY (facility_id) REFERENCES facilities(id) ON DELETE CASCADE,
  FOREIGN KEY (prescribed_by_user_id) REFERENCES users(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS medication_schedule_times (
  id TEXT PRIMARY KEY,
  medication_plan_id TEXT NOT NULL,
  time TEXT NOT NULL,
  day_of_week INTEGER NOT NULL DEFAULT -1,
  created_at TEXT NOT NULL,
  FOREIGN KEY (medication_plan_id) REFERENCES medication_plans(id) ON DELETE CASCADE,
  UNIQUE (medication_plan_id, time, day_of_week)
);

CREATE INDEX IF NOT EXISTS idx_medication_plans_resident_active ON medication_plans(resident_id, is_active);
CREATE INDEX IF NOT EXISTS idx_medication_plans_facility_id ON medication_plans(facility_id);
CREATE INDEX IF NOT EXISTS idx_medication_schedule_times_plan_id ON medication_schedule_times(medication_plan_id);
