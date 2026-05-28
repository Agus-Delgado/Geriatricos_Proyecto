import type { D1Database } from "@cloudflare/workers-types";
import {
  CERTIFICATE_SELECT_COLUMNS,
  serializeContentJson,
  toCertificateResponse,
  type CertificateResponse,
  type DbCertificateRow
} from "./mapper";

export type CertificateCreateInput = {
  resident_id: string;
  facility_id: string;
  certificate_type: string;
  body_text: string;
  issued_at: string;
  content_json?: Record<string, unknown> | null;
};

export type CertificateUpdateInput = {
  body_text?: string;
  issued_at?: string;
  content_json?: Record<string, unknown> | null;
};

export async function fetchCertificateById(
  db: D1Database,
  certificateId: string
): Promise<DbCertificateRow | null> {
  return db
    .prepare(
      `SELECT ${CERTIFICATE_SELECT_COLUMNS}
       FROM certificates
       WHERE id = ?1
       LIMIT 1`
    )
    .bind(certificateId)
    .first<DbCertificateRow>();
}

export async function insertCertificate(
  db: D1Database,
  issuedByUserId: string,
  input: CertificateCreateInput
): Promise<CertificateResponse> {
  const now = new Date().toISOString();
  const id = crypto.randomUUID();

  await db
    .prepare(
      `INSERT INTO certificates (
        id, resident_id, facility_id, certificate_type, issued_at,
        issued_by_user_id, body_text, content_json, pdf_url, created_at
      ) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, NULL, ?9)`
    )
    .bind(
      id,
      input.resident_id,
      input.facility_id,
      input.certificate_type.trim(),
      input.issued_at,
      issuedByUserId,
      input.body_text.trim(),
      serializeContentJson(input.content_json),
      now
    )
    .run();

  const row = await fetchCertificateById(db, id);
  if (!row) {
    throw new Error("Failed to load created certificate");
  }
  return toCertificateResponse(row);
}

export async function updateCertificate(
  db: D1Database,
  certificateId: string,
  input: CertificateUpdateInput
): Promise<CertificateResponse | null> {
  const existing = await fetchCertificateById(db, certificateId);
  if (!existing) {
    return null;
  }

  const updates: string[] = [];
  const binds: (string | null)[] = [];

  if (input.body_text !== undefined) {
    updates.push(`body_text = ?${binds.length + 1}`);
    binds.push(input.body_text.trim());
  }
  if (input.issued_at !== undefined) {
    updates.push(`issued_at = ?${binds.length + 1}`);
    binds.push(input.issued_at);
  }
  if (input.content_json !== undefined) {
    updates.push(`content_json = ?${binds.length + 1}`);
    binds.push(serializeContentJson(input.content_json));
  }

  if (updates.length === 0) {
    return toCertificateResponse(existing);
  }

  binds.push(certificateId);
  await db
    .prepare(`UPDATE certificates SET ${updates.join(", ")} WHERE id = ?${binds.length}`)
    .bind(...binds)
    .run();

  const updated = await fetchCertificateById(db, certificateId);
  if (!updated) {
    return null;
  }
  return toCertificateResponse(updated);
}

export type CertificateListFilters = {
  resident_id?: string;
  facility_id?: string;
  certificate_type?: string;
  facility_ids?: string[];
};

export async function listCertificates(
  db: D1Database,
  filters: CertificateListFilters
): Promise<CertificateResponse[]> {
  const conditions: string[] = [];
  const binds: (string | number)[] = [];

  if (filters.facility_id) {
    conditions.push(`facility_id = ?${binds.length + 1}`);
    binds.push(filters.facility_id);
  } else if (filters.facility_ids && filters.facility_ids.length > 0) {
    const placeholders = filters.facility_ids.map((_, index) => `?${binds.length + index + 1}`);
    conditions.push(`facility_id IN (${placeholders.join(", ")})`);
    binds.push(...filters.facility_ids);
  } else {
    return [];
  }

  if (filters.resident_id) {
    conditions.push(`resident_id = ?${binds.length + 1}`);
    binds.push(filters.resident_id);
  }

  if (filters.certificate_type) {
    conditions.push(`certificate_type = ?${binds.length + 1}`);
    binds.push(filters.certificate_type);
  }

  const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "";
  const sql = `SELECT ${CERTIFICATE_SELECT_COLUMNS}
    FROM certificates
    ${whereClause}
    ORDER BY issued_at DESC`;

  const result = await db.prepare(sql).bind(...binds).all<DbCertificateRow>();
  return (result.results ?? []).map(toCertificateResponse);
}
