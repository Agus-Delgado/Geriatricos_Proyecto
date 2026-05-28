import { Hono } from "hono";
import { requireAuth } from "../../middleware/auth";
import type { AppContext } from "../../types/env";
import { assertFacilityAccess, canMutateResidents } from "../residents/access";
import { deleteScheduleTime, fetchPlanById, fetchScheduleTimeById } from "./db";

const medicationTimesRouter = new Hono<AppContext>();

medicationTimesRouter.use("*", requireAuth);

medicationTimesRouter.delete("/:timeId", async (c) => {
  if (!c.env.DB) {
    return c.json({ detail: "Database binding not configured" }, 500);
  }

  const timeId = c.req.param("timeId")?.trim();
  if (!timeId) {
    return c.json({ detail: "Horario no encontrado" }, 404);
  }

  const scheduleTime = await fetchScheduleTimeById(c.env.DB, timeId);
  if (!scheduleTime) {
    return c.json({ detail: "Horario no encontrado" }, 404);
  }

  const plan = await fetchPlanById(c.env.DB, scheduleTime.medication_plan_id);
  if (!plan) {
    return c.json({ detail: "Plan de medicación no encontrado" }, 404);
  }

  const userId = c.get("jwtPayload").sub;
  const access = await assertFacilityAccess(c.env.DB, userId, plan.facility_id);
  if (!access.ok) {
    return c.json({ detail: "No tiene acceso a esta sede" }, 403);
  }

  const canMutate = await canMutateResidents(
    c.env.DB,
    userId,
    plan.facility_id,
    access.userRole
  );
  if (!canMutate) {
    return c.json({ detail: "No tiene permisos para esta acción" }, 403);
  }

  const deleted = await deleteScheduleTime(c.env.DB, timeId);
  if (!deleted) {
    return c.json({ detail: "Horario no encontrado" }, 404);
  }

  return c.body(null, 204);
});

export { medicationTimesRouter };
