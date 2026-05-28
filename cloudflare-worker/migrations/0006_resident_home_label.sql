-- B7: hogar visible del paciente (atributo de filtro/display, no facility técnica)
ALTER TABLE residents ADD COLUMN home_label TEXT;
CREATE INDEX IF NOT EXISTS idx_residents_home_label ON residents(home_label);
