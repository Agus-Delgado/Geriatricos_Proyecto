export type DbMedicationPlanRow = {
  id: string;
  resident_id: string;
  facility_id: string;
  med_name: string;
  dose: string;
  route: string | null;
  instructions: string | null;
  start_date: string | null;
  end_date: string | null;
  is_active: number;
  prescribed_by_user_id: string | null;
  created_at: string;
  updated_at: string;
};

export type MedicationPlanResponse = {
  id: string;
  resident_id: string;
  facility_id: string;
  med_name: string;
  dose: string;
  route: string | null;
  instructions: string | null;
  start_date: string | null;
  end_date: string | null;
  is_active: boolean;
  prescribed_by_user_id: string | null;
  created_at: string;
  updated_at: string;
};

export type DbMedicationScheduleTimeRow = {
  id: string;
  medication_plan_id: string;
  time: string;
  day_of_week: number | null;
  created_at: string;
};

export type MedicationScheduleTimeResponse = {
  id: string;
  medication_plan_id: string;
  time: string;
  day_of_week: number | null;
};

export const PLAN_SELECT_COLUMNS = `
  id, resident_id, facility_id, med_name, dose, route, instructions,
  start_date, end_date, is_active, prescribed_by_user_id, created_at, updated_at
`.trim();

export const TIME_SELECT_COLUMNS = `
  id, medication_plan_id, time, day_of_week, created_at
`.trim();

export function toPlanResponse(row: DbMedicationPlanRow): MedicationPlanResponse {
  return {
    id: row.id,
    resident_id: row.resident_id,
    facility_id: row.facility_id,
    med_name: row.med_name,
    dose: row.dose,
    route: row.route,
    instructions: row.instructions,
    start_date: row.start_date,
    end_date: row.end_date,
    is_active: row.is_active === 1,
    prescribed_by_user_id: row.prescribed_by_user_id,
    created_at: row.created_at,
    updated_at: row.updated_at
  };
}

export function toScheduleTimeResponse(
  row: DbMedicationScheduleTimeRow
): MedicationScheduleTimeResponse {
  return {
    id: row.id,
    medication_plan_id: row.medication_plan_id,
    time: row.time,
    day_of_week: row.day_of_week === -1 ? null : row.day_of_week
  };
}
