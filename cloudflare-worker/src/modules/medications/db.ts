import type { D1Database } from "@cloudflare/workers-types";
import {
  PLAN_SELECT_COLUMNS,
  TIME_SELECT_COLUMNS,
  toPlanResponse,
  toScheduleTimeResponse,
  type DbMedicationPlanRow,
  type DbMedicationScheduleTimeRow,
  type MedicationPlanResponse,
  type MedicationScheduleTimeResponse
} from "./mapper";

export type MedicationPlanCreateInput = {
  med_name: string;
  dose: string;
  route?: string | null;
  instructions?: string | null;
  start_date?: string | null;
  end_date?: string | null;
};

export async function fetchPlanById(
  db: D1Database,
  planId: string
): Promise<DbMedicationPlanRow | null> {
  return db
    .prepare(
      `SELECT ${PLAN_SELECT_COLUMNS}
       FROM medication_plans
       WHERE id = ?1
       LIMIT 1`
    )
    .bind(planId)
    .first<DbMedicationPlanRow>();
}

export async function fetchScheduleTimeById(
  db: D1Database,
  timeId: string
): Promise<DbMedicationScheduleTimeRow | null> {
  return db
    .prepare(
      `SELECT ${TIME_SELECT_COLUMNS}
       FROM medication_schedule_times
       WHERE id = ?1
       LIMIT 1`
    )
    .bind(timeId)
    .first<DbMedicationScheduleTimeRow>();
}

export async function listPlansByResident(
  db: D1Database,
  residentId: string,
  activeOnly: boolean
): Promise<MedicationPlanResponse[]> {
  let sql = `SELECT ${PLAN_SELECT_COLUMNS}
    FROM medication_plans
    WHERE resident_id = ?1`;
  if (activeOnly) {
    sql += " AND is_active = 1";
  }
  sql += " ORDER BY created_at DESC";

  const result = await db.prepare(sql).bind(residentId).all<DbMedicationPlanRow>();
  return (result.results ?? []).map(toPlanResponse);
}

export async function insertMedicationPlan(
  db: D1Database,
  residentId: string,
  facilityId: string,
  prescribedByUserId: string,
  input: MedicationPlanCreateInput
): Promise<MedicationPlanResponse> {
  const now = new Date().toISOString();
  const id = crypto.randomUUID();

  await db
    .prepare(
      `INSERT INTO medication_plans (
        id, resident_id, facility_id, med_name, dose, route, instructions,
        start_date, end_date, is_active, prescribed_by_user_id, created_at, updated_at
      ) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, 1, ?10, ?11, ?11)`
    )
    .bind(
      id,
      residentId,
      facilityId,
      input.med_name.trim(),
      input.dose.trim(),
      normalizeOptionalText(input.route),
      normalizeOptionalText(input.instructions),
      normalizeOptionalDate(input.start_date),
      normalizeOptionalDate(input.end_date),
      prescribedByUserId,
      now
    )
    .run();

  const row = await fetchPlanById(db, id);
  if (!row) {
    throw new Error("Failed to load created medication plan");
  }
  return toPlanResponse(row);
}

export async function insertScheduleTime(
  db: D1Database,
  planId: string,
  time: string,
  dayOfWeek: number | null
): Promise<MedicationScheduleTimeResponse> {
  const now = new Date().toISOString();
  const id = crypto.randomUUID();

  await db
    .prepare(
      `INSERT INTO medication_schedule_times (
        id, medication_plan_id, time, day_of_week, created_at
      ) VALUES (?1, ?2, ?3, ?4, ?5)`
    )
    .bind(id, planId, time, dayOfWeek === null ? -1 : dayOfWeek, now)
    .run();

  const row = await db
    .prepare(
      `SELECT ${TIME_SELECT_COLUMNS}
       FROM medication_schedule_times
       WHERE id = ?1
       LIMIT 1`
    )
    .bind(id)
    .first<DbMedicationScheduleTimeRow>();

  if (!row) {
    throw new Error("Failed to load created schedule time");
  }
  return toScheduleTimeResponse(row);
}

export async function deleteScheduleTime(db: D1Database, timeId: string): Promise<boolean> {
  const result = await db
    .prepare("DELETE FROM medication_schedule_times WHERE id = ?1")
    .bind(timeId)
    .run();
  return (result.meta.changes ?? 0) > 0;
}

function normalizeOptionalText(value: string | null | undefined): string | null {
  if (value === undefined || value === null) {
    return null;
  }
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function normalizeOptionalDate(value: string | null | undefined): string | null {
  if (value === undefined || value === null) {
    return null;
  }
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}
