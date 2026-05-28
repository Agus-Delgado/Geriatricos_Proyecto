import type { Context } from "hono";
import type { AppContext } from "../../types/env";
import { listContactsByResident } from "../contacts/db";
import { listPlansByResident } from "../medications/db";
import { assertFacilityAccess } from "../residents/access";
import { toResidentResponse } from "../residents/mapper";
import { fetchResidentById } from "../residents/resident";
import { fetchSummaryByResidentId, listClinicalNotesAsc } from "./db";
import { toSummaryResponse } from "./mapper";

type ResidentContext =
  | { ok: false; response: Response }
  | {
      ok: true;
      residentId: string;
    };

async function resolveResidentContext(c: Context<AppContext>): Promise<ResidentContext> {
  if (!c.env.DB) {
    return {
      ok: false,
      response: c.json({ detail: "Database binding not configured" }, 500)
    };
  }

  const residentId = c.req.param("residentId")?.trim();
  if (!residentId) {
    return {
      ok: false,
      response: c.json({ detail: "Residente no encontrado" }, 404)
    };
  }

  const resident = await fetchResidentById(c.env.DB, residentId);
  if (!resident) {
    return {
      ok: false,
      response: c.json({ detail: "Residente no encontrado" }, 404)
    };
  }

  const userId = c.get("jwtPayload").sub;
  const access = await assertFacilityAccess(c.env.DB, userId, resident.facility_id);
  if (!access.ok) {
    return {
      ok: false,
      response: c.json({ detail: "No tiene acceso a esta sede" }, 403)
    };
  }

  return { ok: true, residentId };
}

export async function handleClinicalReport(c: Context<AppContext>): Promise<Response> {
  const ctx = await resolveResidentContext(c);
  if (!ctx.ok) {
    return ctx.response;
  }

  const db = c.env.DB!;
  const residentRow = await fetchResidentById(db, ctx.residentId);
  if (!residentRow) {
    return c.json({ detail: "Residente no encontrado" }, 404);
  }

  const [summaryRow, notes, medicationPlans, contacts] = await Promise.all([
    fetchSummaryByResidentId(db, ctx.residentId),
    listClinicalNotesAsc(db, ctx.residentId),
    listPlansByResident(db, ctx.residentId, true),
    listContactsByResident(db, ctx.residentId)
  ]);

  return c.json({
    generated_at: new Date().toISOString(),
    resident: toResidentResponse(residentRow),
    clinical_summary: summaryRow ? toSummaryResponse(summaryRow) : null,
    clinical_notes: notes,
    medication_plans: medicationPlans,
    contacts
  });
}
