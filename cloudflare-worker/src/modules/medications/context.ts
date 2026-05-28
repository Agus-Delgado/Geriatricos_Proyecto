import type { Context } from "hono";
import type { AppContext } from "../../types/env";
import { assertFacilityAccess } from "../residents/access";
import { fetchResidentById } from "../residents/resident";
import { fetchPlanById } from "./db";

export type ResidentContext =
  | { ok: false; response: Response }
  | {
      ok: true;
      resident: { id: string; facility_id: string };
      userId: string;
      userRole: string | null;
    };

export type PlanContext =
  | { ok: false; response: Response }
  | {
      ok: true;
      plan: { id: string; facility_id: string; resident_id: string };
      userId: string;
      userRole: string | null;
    };

export async function resolveResidentContext(c: Context<AppContext>): Promise<ResidentContext> {
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

  return {
    ok: true,
    resident: { id: resident.id, facility_id: resident.facility_id },
    userId,
    userRole: access.userRole
  };
}

export async function resolvePlanContext(c: Context<AppContext>): Promise<PlanContext> {
  if (!c.env.DB) {
    return {
      ok: false,
      response: c.json({ detail: "Database binding not configured" }, 500)
    };
  }

  const planId = c.req.param("planId")?.trim();
  if (!planId) {
    return {
      ok: false,
      response: c.json({ detail: "Plan de medicación no encontrado" }, 404)
    };
  }

  const plan = await fetchPlanById(c.env.DB, planId);
  if (!plan) {
    return {
      ok: false,
      response: c.json({ detail: "Plan de medicación no encontrado" }, 404)
    };
  }

  const userId = c.get("jwtPayload").sub;
  const access = await assertFacilityAccess(c.env.DB, userId, plan.facility_id);
  if (!access.ok) {
    return {
      ok: false,
      response: c.json({ detail: "No tiene acceso a esta sede" }, 403)
    };
  }

  return {
    ok: true,
    plan: { id: plan.id, facility_id: plan.facility_id, resident_id: plan.resident_id },
    userId,
    userRole: access.userRole
  };
}
