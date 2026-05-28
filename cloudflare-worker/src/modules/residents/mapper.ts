export type DbResidentRow = {
  id: string;
  facility_id: string;
  first_name: string;
  last_name: string;
  dni: string | null;
  birth_date: string | null;
  sex: string | null;
  coverage_type: string | null;
  coverage_other: string | null;
  coverage_number: string | null;
  admission_date: string;
  stay_status: string;
  status: string;
  end_date: string | null;
  end_reason: string | null;
  notes: string | null;
  medical_notes: string | null;
  document_url: string | null;
  document_name: string | null;
  document_mime: string | null;
  document_size: number | null;
  created_at: string;
  updated_at: string;
  created_by_user_id: string | null;
  updated_by_user_id: string | null;
  deleted_at: string | null;
  deleted_by_user_id: string | null;
};

export type ResidentResponse = {
  id: string;
  facility_id: string;
  first_name: string;
  last_name: string;
  dni: string | null;
  birth_date: string | null;
  sex: string | null;
  coverage_type: string | null;
  coverage_other: string | null;
  coverage_number: string | null;
  admission_date: string;
  stay_status: string;
  status: string;
  end_date: string | null;
  end_reason: string | null;
  notes: string | null;
  document_url: string | null;
  document_name: string | null;
  document_mime: string | null;
  document_size: number | null;
  created_at: string;
  updated_at: string;
  created_by_user_id: string | null;
  updated_by_user_id: string | null;
  deleted_at: string | null;
  deleted_by_user_id: string | null;
};

export const RESIDENT_SELECT_COLUMNS = `
  id, facility_id, first_name, last_name, dni, birth_date,
  sex, coverage_type, coverage_other, coverage_number,
  admission_date, stay_status, status, end_date, end_reason,
  notes, medical_notes,
  document_url, document_name, document_mime, document_size,
  created_at, updated_at, created_by_user_id, updated_by_user_id,
  deleted_at, deleted_by_user_id
`.trim();

export function toResidentResponse(row: DbResidentRow): ResidentResponse {
  return {
    id: row.id,
    facility_id: row.facility_id,
    first_name: row.first_name,
    last_name: row.last_name,
    dni: row.dni,
    birth_date: row.birth_date,
    sex: row.sex,
    coverage_type: row.coverage_type,
    coverage_other: row.coverage_other,
    coverage_number: row.coverage_number,
    admission_date: row.admission_date,
    stay_status: row.stay_status,
    status: row.status,
    end_date: row.end_date,
    end_reason: row.end_reason,
    notes: row.notes ?? row.medical_notes,
    document_url: row.document_url,
    document_name: row.document_name,
    document_mime: row.document_mime,
    document_size: row.document_size,
    created_at: row.created_at,
    updated_at: row.updated_at,
    created_by_user_id: row.created_by_user_id,
    updated_by_user_id: row.updated_by_user_id,
    deleted_at: row.deleted_at,
    deleted_by_user_id: row.deleted_by_user_id
  };
}
