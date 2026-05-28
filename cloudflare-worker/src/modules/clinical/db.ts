import type { D1Database } from "@cloudflare/workers-types";
import {
  NOTE_SELECT_COLUMNS,
  SUMMARY_SELECT_COLUMNS,
  toNoteResponse,
  toSummaryResponse,
  type ClinicalNoteResponse,
  type ClinicalSummaryResponse,
  type DbClinicalNoteRow,
  type DbClinicalSummaryRow
} from "./mapper";

export const CLINICAL_SUMMARY_FIELDS = [
  "primary_diagnosis",
  "secondary_diagnoses",
  "allergies",
  "current_medications",
  "medical_history",
  "family_history"
] as const;

export type ClinicalSummaryField = (typeof CLINICAL_SUMMARY_FIELDS)[number];

export type ClinicalSummaryUpdateInput = Partial<
  Record<ClinicalSummaryField, string | null | undefined>
>;

export async function fetchSummaryByResidentId(
  db: D1Database,
  residentId: string
): Promise<DbClinicalSummaryRow | null> {
  return db
    .prepare(
      `SELECT ${SUMMARY_SELECT_COLUMNS}
       FROM clinical_summaries
       WHERE resident_id = ?1
       LIMIT 1`
    )
    .bind(residentId)
    .first<DbClinicalSummaryRow>();
}

export async function upsertClinicalSummary(
  db: D1Database,
  residentId: string,
  userId: string,
  input: ClinicalSummaryUpdateInput
): Promise<ClinicalSummaryResponse> {
  const now = new Date().toISOString();
  const existing = await fetchSummaryByResidentId(db, residentId);

  if (!existing) {
    const id = crypto.randomUUID();
    await db
      .prepare(
        `INSERT INTO clinical_summaries (
          id, resident_id, primary_diagnosis, secondary_diagnoses, allergies,
          current_medications, medical_history, family_history,
          updated_by_user_id, updated_at
        ) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10)`
      )
      .bind(
        id,
        residentId,
        normalizeOptionalText(input.primary_diagnosis),
        normalizeOptionalText(input.secondary_diagnoses),
        normalizeOptionalText(input.allergies),
        normalizeOptionalText(input.current_medications),
        normalizeOptionalText(input.medical_history),
        normalizeOptionalText(input.family_history),
        userId,
        now
      )
      .run();

    const created = await fetchSummaryByResidentId(db, residentId);
    if (!created) {
      throw new Error("Failed to load created clinical summary");
    }
    return toSummaryResponse(created);
  }

  const updates: string[] = [];
  const binds: (string | null)[] = [];

  for (const field of CLINICAL_SUMMARY_FIELDS) {
    if (input[field] === undefined) {
      continue;
    }
    updates.push(`${field} = ?${binds.length + 1}`);
    binds.push(normalizeOptionalText(input[field]));
  }

  updates.push(`updated_by_user_id = ?${binds.length + 1}`);
  binds.push(userId);
  updates.push(`updated_at = ?${binds.length + 1}`);
  binds.push(now);
  binds.push(residentId);

  await db
    .prepare(`UPDATE clinical_summaries SET ${updates.join(", ")} WHERE resident_id = ?${binds.length}`)
    .bind(...binds)
    .run();

  const updated = await fetchSummaryByResidentId(db, residentId);
  if (!updated) {
    throw new Error("Failed to load updated clinical summary");
  }
  return toSummaryResponse(updated);
}

export async function listClinicalNotes(
  db: D1Database,
  residentId: string
): Promise<ClinicalNoteResponse[]> {
  const result = await db
    .prepare(
      `SELECT ${NOTE_SELECT_COLUMNS}
       FROM clinical_notes
       WHERE resident_id = ?1
       ORDER BY recorded_at DESC`
    )
    .bind(residentId)
    .all<DbClinicalNoteRow>();

  return (result.results ?? []).map(toNoteResponse);
}

export type ClinicalNoteCreateInput = {
  note_type?: string;
  content: string;
  recorded_at?: string;
};

export async function insertClinicalNote(
  db: D1Database,
  residentId: string,
  facilityId: string,
  authorUserId: string,
  input: ClinicalNoteCreateInput
): Promise<ClinicalNoteResponse> {
  const now = new Date().toISOString();
  const id = crypto.randomUUID();
  const noteType = (input.note_type?.trim() || "EVOLUTION").toUpperCase();
  const recordedAt = input.recorded_at?.trim() || now;

  await db
    .prepare(
      `INSERT INTO clinical_notes (
        id, resident_id, facility_id, author_user_id, note_type, content,
        recorded_at, created_at
      ) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8)`
    )
    .bind(id, residentId, facilityId, authorUserId, noteType, input.content.trim(), recordedAt, now)
    .run();

  const row = await db
    .prepare(
      `SELECT ${NOTE_SELECT_COLUMNS}
       FROM clinical_notes
       WHERE id = ?1
       LIMIT 1`
    )
    .bind(id)
    .first<DbClinicalNoteRow>();

  if (!row) {
    throw new Error("Failed to load created clinical note");
  }

  return toNoteResponse(row);
}

function normalizeOptionalText(value: string | null | undefined): string | null {
  if (value === undefined || value === null) {
    return null;
  }
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}
