import type { D1Database } from "@cloudflare/workers-types";
import { RESIDENT_SELECT_COLUMNS, type DbResidentRow } from "./mapper";

export async function fetchResidentById(
  db: D1Database,
  residentId: string,
  includeDeleted = false
): Promise<DbResidentRow | null> {
  const deletedClause = includeDeleted ? "" : " AND deleted_at IS NULL";
  return db
    .prepare(
      `SELECT ${RESIDENT_SELECT_COLUMNS}
       FROM residents
       WHERE id = ?1${deletedClause}
       LIMIT 1`
    )
    .bind(residentId)
    .first<DbResidentRow>();
}
