import { Hono } from "hono";
import { requireAuth } from "../../middleware/auth";
import type { AppContext } from "../../types/env";
import { canMutateResidents } from "../residents/access";
import { insertScheduleTime } from "./db";
import { resolvePlanContext } from "./context";
import { TIME_HH_MM } from "./resident-routes";

const medicationPlansRouter = new Hono<AppContext>();

medicationPlansRouter.use("*", requireAuth);

medicationPlansRouter.post("/:planId/times", async (c) => {
  const ctx = await resolvePlanContext(c);
  if (!ctx.ok) {
    return ctx.response;
  }

  const canMutate = await canMutateResidents(
    c.env.DB!,
    ctx.userId,
    ctx.plan.facility_id,
    ctx.userRole
  );
  if (!canMutate) {
    return c.json({ detail: "No tiene permisos para esta acción" }, 403);
  }

  const body = await c.req
    .json<{ time?: string; day_of_week?: number | null }>()
    .catch(() => null);

  const time = body?.time?.trim();
  if (!time) {
    return c.json({ detail: "time es requerido" }, 422);
  }
  if (!TIME_HH_MM.test(time)) {
    return c.json({ detail: "time debe tener formato HH:MM" }, 422);
  }

  let dayOfWeek: number | null = null;
  if (body && "day_of_week" in body && body.day_of_week !== null && body.day_of_week !== undefined) {
    const dow = body.day_of_week;
    if (!Number.isInteger(dow) || dow < 0 || dow > 6) {
      return c.json({ detail: "day_of_week debe ser un entero entre 0 y 6" }, 422);
    }
    dayOfWeek = dow;
  }

  try {
    const scheduleTime = await insertScheduleTime(c.env.DB!, ctx.plan.id, time, dayOfWeek);
    return c.json(scheduleTime, 201);
  } catch (err) {
    const message = err instanceof Error ? err.message : "";
    if (message.includes("UNIQUE") || message.includes("unique")) {
      return c.json({ detail: "Ya existe un horario igual para este plan" }, 422);
    }
    throw err;
  }
});

export { medicationPlansRouter };
