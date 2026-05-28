PRAGMA foreign_keys = ON;

-- Clinical phase (Bloque 13): column names aligned with frontend/src/types/clinical.ts

CREATE TABLE IF NOT EXISTS clinical_summaries (
  id TEXT PRIMARY KEY,
  resident_id TEXT NOT NULL UNIQUE,
  primary_diagnosis TEXT,
  secondary_diagnoses TEXT,
  allergies TEXT,
  current_medications TEXT,
  medical_history TEXT,
  family_history TEXT,
  updated_by_user_id TEXT,
  updated_at TEXT NOT NULL,
  FOREIGN KEY (resident_id) REFERENCES residents(id) ON DELETE CASCADE,
  FOREIGN KEY (updated_by_user_id) REFERENCES users(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS clinical_notes (
  id TEXT PRIMARY KEY,
  resident_id TEXT NOT NULL,
  facility_id TEXT NOT NULL,
  author_user_id TEXT NOT NULL,
  note_type TEXT NOT NULL DEFAULT 'EVOLUTION',
  content TEXT NOT NULL,
  recorded_at TEXT NOT NULL,
  created_at TEXT NOT NULL,
  FOREIGN KEY (resident_id) REFERENCES residents(id) ON DELETE CASCADE,
  FOREIGN KEY (facility_id) REFERENCES facilities(id) ON DELETE CASCADE,
  FOREIGN KEY (author_user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_clinical_summaries_resident_id ON clinical_summaries(resident_id);

CREATE INDEX IF NOT EXISTS idx_clinical_notes_resident_recorded ON clinical_notes(resident_id, recorded_at);
CREATE INDEX IF NOT EXISTS idx_clinical_notes_facility_recorded ON clinical_notes(facility_id, recorded_at);
