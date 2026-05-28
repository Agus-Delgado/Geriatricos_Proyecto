PRAGMA foreign_keys = ON;

-- Align residents with frontend Resident type (minimal contract fields).

ALTER TABLE residents ADD COLUMN sex TEXT;
ALTER TABLE residents ADD COLUMN coverage_type TEXT;
ALTER TABLE residents ADD COLUMN coverage_other TEXT;
ALTER TABLE residents ADD COLUMN coverage_number TEXT;
ALTER TABLE residents ADD COLUMN admission_date TEXT NOT NULL DEFAULT '2026-01-01';
ALTER TABLE residents ADD COLUMN stay_status TEXT NOT NULL DEFAULT 'ACTIVE';
ALTER TABLE residents ADD COLUMN end_date TEXT;
ALTER TABLE residents ADD COLUMN end_reason TEXT;
ALTER TABLE residents ADD COLUMN notes TEXT;
ALTER TABLE residents ADD COLUMN document_url TEXT;
ALTER TABLE residents ADD COLUMN document_name TEXT;
ALTER TABLE residents ADD COLUMN document_mime TEXT;
ALTER TABLE residents ADD COLUMN document_size INTEGER;
ALTER TABLE residents ADD COLUMN created_by_user_id TEXT;
ALTER TABLE residents ADD COLUMN updated_by_user_id TEXT;
ALTER TABLE residents ADD COLUMN deleted_by_user_id TEXT;

UPDATE residents SET notes = medical_notes WHERE notes IS NULL AND medical_notes IS NOT NULL;
UPDATE residents SET admission_date = substr(created_at, 1, 10) WHERE admission_date = '2026-01-01';

CREATE INDEX IF NOT EXISTS idx_residents_stay_status ON residents(stay_status);
CREATE INDEX IF NOT EXISTS idx_residents_status ON residents(status);

ALTER TABLE resident_contacts ADD COLUMN address TEXT;
