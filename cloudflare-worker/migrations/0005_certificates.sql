PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS certificates (
  id TEXT PRIMARY KEY,
  resident_id TEXT NOT NULL,
  facility_id TEXT NOT NULL,
  certificate_type TEXT NOT NULL,
  issued_at TEXT NOT NULL,
  issued_by_user_id TEXT NOT NULL,
  body_text TEXT NOT NULL,
  content_json TEXT,
  pdf_url TEXT,
  created_at TEXT NOT NULL,
  FOREIGN KEY (resident_id) REFERENCES residents(id),
  FOREIGN KEY (facility_id) REFERENCES facilities(id),
  FOREIGN KEY (issued_by_user_id) REFERENCES users(id)
);

CREATE INDEX IF NOT EXISTS idx_certificates_resident_type
  ON certificates(resident_id, certificate_type);

CREATE INDEX IF NOT EXISTS idx_certificates_facility_issued
  ON certificates(facility_id, issued_at);
