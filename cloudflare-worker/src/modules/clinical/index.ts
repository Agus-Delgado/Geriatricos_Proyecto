import { Hono } from "hono";
import type { Context } from "hono";
import type { AppContext } from "../../types/env";
import { assertFacilityAccess, canMutateResidents } from "../residents/access";
import { fetchResidentById } from "../residents/resident";
import {
  CLINICAL_SUMMARY_FIELDS,
  fetchSummaryByResidentId,
  insertClinicalNote,
  listClinicalNotes,
  upsertClinicalSummary,
  type ClinicalSummaryField
} from "./db";
import { toSummaryResponse } from "./mapper";

type ResidentContext =
  | { ok: false; response: Response }
  | {
      ok: true;
      resident: { id: string; facility_id: string };
      userId: string;
      userRole: string | null;
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

  return {
    ok: true,
    resident: { id: resident.id, facility_id: resident.facility_id },
    userId,
    userRole: access.userRole
  };
}

function parseSummaryUpdateBody(
  body: Record<string, unknown> | null
): Partial<Record<ClinicalSummaryField, string | null | undefined>> {
  if (!body || typeof body !== "object") {
    return {};
  }

  const update: Partial<Record<ClinicalSummaryField, string | null | undefined>> = {};
  for (const field of CLINICAL_SUMMARY_FIELDS) {
    if (field in body) {
      const value = body[field];
      if (value === null) {
        update[field] = null;
      } else if (typeof value === "string") {
        update[field] = value;
      }
    }
  }
  return update;
}

const clinicalRouter = new Hono<AppContext>();

clinicalRouter.get("/clinical-summary", async (c) => {
  const ctx = await resolveResidentContext(c);
  if (!ctx.ok) {
    return ctx.response;
  }

  const summary = await fetchSummaryByResidentId(c.env.DB!, ctx.resident.id);
  if (!summary) {
    return c.json({ detail: "Resumen clínico no encontrado" }, 404);
  }

  return c.json(toSummaryResponse(summary));
});

clinicalRouter.put("/clinical-summary", async (c) => {
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

  const body = await c.req.json<Record<string, unknown>>().catch(() => null);
  const update = parseSummaryUpdateBody(body);

  const summary = await upsertClinicalSummary(
    c.env.DB!,
    ctx.resident.id,
    ctx.userId,
    update
  );

  return c.json(summary);
});

clinicalRouter.get("/clinical-notes", async (c) => {
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

  const notes = await listClinicalNotes(c.env.DB!, ctx.resident.id);
  return c.json(notes);
});

clinicalRouter.post("/clinical-notes", async (c) => {
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
    .json<{ note_type?: string; content?: string; recorded_at?: string }>()
    .catch(() => null);

  const content = body?.content?.trim();
  if (!content) {
    return c.json({ detail: "content es requerido" }, 422);
  }

  const note = await insertClinicalNote(c.env.DB!, ctx.resident.id, ctx.resident.facility_id, ctx.userId, {
    note_type: body?.note_type,
    content,
    recorded_at: body?.recorded_at
  });

  return c.json(note, 201);
});

export { clinicalRouter };
