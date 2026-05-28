import { Hono } from "hono";
import type { AppContext } from "../../types/env";
import { canMutateResidents } from "../residents/access";
import { insertMedicationPlan, listPlansByResident } from "./db";
import { resolveResidentContext } from "./context";

export const TIME_HH_MM = /^\d{2}:\d{2}$/;

function parseActiveOnly(value: string | undefined): boolean {
  return value === "true" || value === "1";
}

const medicationsResidentRouter = new Hono<AppContext>();

medicationsResidentRouter.get("/medication-plans", async (c) => {
  const ctx = await resolveResidentContext(c);
  if (!ctx.ok) {
    return ctx.response;
  }

  const activeOnly = parseActiveOnly(c.req.query("active_only"));
  const plans = await listPlansByResident(c.env.DB!, ctx.resident.id, activeOnly);
  return c.json(plans);
});

medicationsResidentRouter.post("/medication-plans", async (c) => {
  const ctx = await resolveResidentContext(c);
  if (!ctx.ok) {
    return ctx.response;
  }

  const canMutate = await canMutateResidents(
    c.env.DB!,
    ctx.userId,
    ctx.resident.facility_id,
    ctx.userRole
  );
  if (!canMutate) {
    return c.json({ detail: "No tiene permisos para esta acción" }, 403);
  }

  const body = await c.req
    .json<{
      med_name?: string;
      dose?: string;
      route?: string | null;
      instructions?: string | null;
      start_date?: string | null;
      end_date?: string | null;
    }>()
    .catch(() => null);

  const medName = body?.med_name?.trim();
  if (!medName) {
    return c.json({ detail: "med_name es requerido" }, 422);
  }

  const dose = body?.dose?.trim();
  if (!dose) {
    return c.json({ detail: "dose es requerido" }, 422);
  }

  const plan = await insertMedicationPlan(c.env.DB!, ctx.resident.id, ctx.resident.facility_id, ctx.userId, {
    med_name: medName,
    dose,
    route: body?.route,
    instructions: body?.instructions,
    start_date: body?.start_date,
    end_date: body?.end_date
  });

  return c.json(plan, 201);
});

export { medicationsResidentRouter };
