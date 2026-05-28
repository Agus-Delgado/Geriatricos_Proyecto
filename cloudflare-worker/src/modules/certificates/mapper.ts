export type DbCertificateRow = {
  id: string;
  resident_id: string;
  facility_id: string;
  certificate_type: string;
  issued_at: string;
  issued_by_user_id: string;
  body_text: string;
  content_json: string | null;
  pdf_url: string | null;
  created_at: string;
};

export type CertificateResponse = {
  id: string;
  resident_id: string;
  facility_id: string;
  certificate_type: string;
  issued_at: string;
  issued_by_user_id: string;
  body_text: string;
  content_json: Record<string, unknown> | null;
  pdf_url: string | null;
  created_at: string;
};

export const CERTIFICATE_SELECT_COLUMNS = `
  id, resident_id, facility_id, certificate_type, issued_at,
  issued_by_user_id, body_text, content_json, pdf_url, created_at
`.trim();

export function toCertificateResponse(row: DbCertificateRow): CertificateResponse {
  let content_json: Record<string, unknown> | null = null;
  if (row.content_json) {
    try {
      const parsed = JSON.parse(row.content_json) as unknown;
      if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
        content_json = parsed as Record<string, unknown>;
      }
    } catch {
      content_json = null;
    }
  }

  return {
    id: row.id,
    resident_id: row.resident_id,
    facility_id: row.facility_id,
    certificate_type: row.certificate_type,
    issued_at: row.issued_at,
    issued_by_user_id: row.issued_by_user_id,
    body_text: row.body_text,
    content_json,
    pdf_url: row.pdf_url,
    created_at: row.created_at
  };
}

export function serializeContentJson(
  value: Record<string, unknown> | null | undefined
): string | null {
  if (value === undefined || value === null) {
    return null;
  }
  return JSON.stringify(value);
}
