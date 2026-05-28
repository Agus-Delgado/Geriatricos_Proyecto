export type DbClinicalSummaryRow = {
  id: string;
  resident_id: string;
  primary_diagnosis: string | null;
  secondary_diagnoses: string | null;
  allergies: string | null;
  current_medications: string | null;
  medical_history: string | null;
  family_history: string | null;
  updated_by_user_id: string | null;
  updated_at: string;
};

export type ClinicalSummaryResponse = {
  id: string;
  resident_id: string;
  primary_diagnosis: string | null;
  secondary_diagnoses: string | null;
  allergies: string | null;
  current_medications: string | null;
  medical_history: string | null;
  family_history: string | null;
  updated_by_user_id: string | null;
  updated_at: string;
};

export type DbClinicalNoteRow = {
  id: string;
  resident_id: string;
  facility_id: string;
  author_user_id: string;
  note_type: string;
  content: string;
  recorded_at: string;
  created_at: string;
};

export type ClinicalNoteResponse = {
  id: string;
  resident_id: string;
  facility_id: string;
  author_user_id: string;
  note_type: string;
  content: string;
  recorded_at: string;
  created_at: string;
};

export const SUMMARY_SELECT_COLUMNS = `
  id, resident_id, primary_diagnosis, secondary_diagnoses, allergies,
  current_medications, medical_history, family_history,
  updated_by_user_id, updated_at
`.trim();

export const NOTE_SELECT_COLUMNS = `
  id, resident_id, facility_id, author_user_id, note_type, content,
  recorded_at, created_at
`.trim();

export function toSummaryResponse(row: DbClinicalSummaryRow): ClinicalSummaryResponse {
  return {
    id: row.id,
    resident_id: row.resident_id,
    primary_diagnosis: row.primary_diagnosis,
    secondary_diagnoses: row.secondary_diagnoses,
    allergies: row.allergies,
    current_medications: row.current_medications,
    medical_history: row.medical_history,
    family_history: row.family_history,
    updated_by_user_id: row.updated_by_user_id,
    updated_at: row.updated_at
  };
}

export function toNoteResponse(row: DbClinicalNoteRow): ClinicalNoteResponse {
  return {
    id: row.id,
    resident_id: row.resident_id,
    facility_id: row.facility_id,
    author_user_id: row.author_user_id,
    note_type: row.note_type,
    content: row.content,
    recorded_at: row.recorded_at,
    created_at: row.created_at
  };
}
