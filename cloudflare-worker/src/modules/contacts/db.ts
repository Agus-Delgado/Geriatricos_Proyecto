import type { D1Database } from "@cloudflare/workers-types";
import {
  CONTACT_SELECT_COLUMNS,
  toContactResponse,
  type ContactResponse,
  type DbContactRow
} from "./mapper";

export type ResidentContactCreateInput = {
  full_name: string;
  relationship_type?: string;
  phone?: string;
  email?: string;
  address?: string;
  is_primary?: boolean;
};

export async function insertResidentContact(
  db: D1Database,
  residentId: string,
  input: ResidentContactCreateInput,
  now?: string
): Promise<ContactResponse> {
  const timestamp = now ?? new Date().toISOString();
  const contactId = crypto.randomUUID();
  const fullName = input.full_name.trim();

  await db
    .prepare(
      `INSERT INTO resident_contacts (
        id, resident_id, full_name, relationship, phone, email, address,
        is_primary, created_at, updated_at
      ) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?9)`
    )
    .bind(
      contactId,
      residentId,
      fullName,
      input.relationship_type?.trim() ?? null,
      input.phone?.trim() ?? null,
      input.email?.trim() ?? null,
      input.address?.trim() ?? null,
      input.is_primary ? 1 : 0,
      timestamp
    )
    .run();

  const row = await db
    .prepare(
      `SELECT ${CONTACT_SELECT_COLUMNS}
       FROM resident_contacts
       WHERE id = ?1
       LIMIT 1`
    )
    .bind(contactId)
    .first<DbContactRow>();

  if (!row) {
    throw new Error("Failed to load created contact");
  }

  return toContactResponse(row);
}

export async function listContactsByResident(
  db: D1Database,
  residentId: string
): Promise<ContactResponse[]> {
  const result = await db
    .prepare(
      `SELECT ${CONTACT_SELECT_COLUMNS}
       FROM resident_contacts
       WHERE resident_id = ?1 AND deleted_at IS NULL
       ORDER BY is_primary DESC, full_name`
    )
    .bind(residentId)
    .all<DbContactRow>();

  return (result.results ?? []).map(toContactResponse);
}

export async function fetchContactById(
  db: D1Database,
  residentId: string,
  contactId: string
): Promise<DbContactRow | null> {
  return db
    .prepare(
      `SELECT ${CONTACT_SELECT_COLUMNS}
       FROM resident_contacts
       WHERE id = ?1 AND resident_id = ?2 AND deleted_at IS NULL
       LIMIT 1`
    )
    .bind(contactId, residentId)
    .first<DbContactRow>();
}
