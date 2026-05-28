import { Hono } from "hono";
import { requireAuth } from "../../middleware/auth";
import type { AppContext } from "../../types/env";
import { insertResidentContact } from "../contacts/db";
import { contactsRouter } from "../contacts";
import { assertFacilityAccess, canMutateResidents } from "./access";
import {
  RESIDENT_SELECT_COLUMNS,
  toResidentResponse,
  type DbResidentRow
} from "./mapper";
import { fetchResidentById } from "./resident";

type ResidentContactCreateBody = {
  full_name: string;
  relationship_type?: string;
  phone?: string;
  email?: string;
  address?: string;
  is_primary?: boolean;
};

type ResidentCreateBody = {
  facility_id: string;
  first_name: string;
  last_name: string;
  dni?: string;
  birth_date?: string;
  sex?: string;
  coverage_type?: string;
  coverage_other?: string;
  coverage_number?: string;
  admission_date: string;
  notes?: string;
  contacts?: ResidentContactCreateBody[];
};

type ResidentUpdateBody = {
  first_name?: string;
  last_name?: string;
  dni?: string;
  birth_date?: string;
  sex?: string;
  coverage_type?: string;
  coverage_other?: string;
  coverage_number?: string;
  stay_status?: string;
  status?: string;
  end_date?: string;
  end_reason?: string;
  notes?: string;
};

const residentsRouter = new Hono<AppContext>();

residentsRouter.use("*", requireAuth);

residentsRouter.route("/:residentId/contacts", contactsRouter);

function validateCoverageOther(
  coverageType: string | null | undefined,
  coverageOther: string | null | undefined
): string | null {
  if (coverageType === "OTRA" && !coverageOther?.trim()) {
    return "coverage_other es requerido cuando coverage_type es 'OTRA'";
  }
  return null;
}

residentsRouter.get("/", async (c) => {
  if (!c.env.DB) {
    return c.json({ detail: "Database binding not configured" }, 500);
  }

  const facilityId = c.req.query("facility_id")?.trim();
  if (!facilityId) {
    return c.json({ detail: "facility_id es requerido" }, 422);
  }

  const userId = c.get("jwtPayload").sub;
  const access = await assertFacilityAccess(c.env.DB, userId, facilityId);
  if (!access.ok) {
    return c.json({ detail: "No tiene acceso a esta sede" }, 403);
  }

  const q = c.req.query("q")?.trim() || null;
  const stayStatus = c.req.query("stay_status")?.trim() || null;
  const status = c.req.query("status")?.trim() || null;

  let sql = `SELECT ${RESIDENT_SELECT_COLUMNS}
    FROM residents
    WHERE facility_id = ?1 AND deleted_at IS NULL`;
  const binds: (string | null)[] = [facilityId];

  if (stayStatus) {
    sql += ` AND stay_status = ?${binds.length + 1}`;
    binds.push(stayStatus);
  }
  if (status) {
    sql += ` AND status = ?${binds.length + 1}`;
    binds.push(status);
  }
  if (q) {
    const pattern = `%${q.toLowerCase()}%`;
    sql += ` AND (
      lower(first_name) LIKE ?${binds.length + 1}
      OR lower(last_name) LIKE ?${binds.length + 2}
      OR dni LIKE ?${binds.length + 3}
    )`;
    binds.push(pattern, pattern, `%${q}%`);
  }

  sql += " ORDER BY last_name, first_name";

  const stmt = c.env.DB.prepare(sql);
  const result = await stmt.bind(...binds).all<DbResidentRow>();
  const rows = result.results ?? [];

  return c.json(rows.map(toResidentResponse));
});

residentsRouter.get("/:residentId", async (c) => {
  if (!c.env.DB) {
    return c.json({ detail: "Database binding not configured" }, 500);
  }

  const residentId = c.req.param("residentId");
  const resident = await fetchResidentById(c.env.DB, residentId);
  if (!resident) {
    return c.json({ detail: "Residente no encontrado" }, 404);
  }

  const userId = c.get("jwtPayload").sub;
  const access = await assertFacilityAccess(c.env.DB, userId, resident.facility_id);
  if (!access.ok) {
    return c.json({ detail: "No tiene acceso a esta sede" }, 403);
  }

  return c.json(toResidentResponse(resident));
});

residentsRouter.post("/", async (c) => {
  if (!c.env.DB) {
    return c.json({ detail: "Database binding not configured" }, 500);
  }

  const body = await c.req.json<ResidentCreateBody>().catch(() => null);
  if (
    !body?.facility_id?.trim() ||
    !body.first_name?.trim() ||
    !body.last_name?.trim() ||
    !body.admission_date?.trim()
  ) {
    return c.json({ detail: "Datos de residente incompletos" }, 422);
  }

  const facilityId = body.facility_id.trim();
  const userId = c.get("jwtPayload").sub;
  const access = await assertFacilityAccess(c.env.DB, userId, facilityId);
  if (!access.ok) {
    return c.json({ detail: "No tiene acceso a esta sede" }, 403);
  }

  const canMutate = await canMutateResidents(c.env.DB, userId, facilityId, access.userRole);
  if (!canMutate) {
    return c.json({ detail: "No tiene permisos para esta acción" }, 403);
  }

  const coverageError = validateCoverageOther(body.coverage_type, body.coverage_other);
  if (coverageError) {
    return c.json({ detail: coverageError }, 422);
  }

  const now = new Date().toISOString();
  const id = crypto.randomUUID();

  await c.env.DB.prepare(
    `INSERT INTO residents (
      id, facility_id, first_name, last_name, dni, birth_date,
      sex, coverage_type, coverage_other, coverage_number,
      admission_date, stay_status, status, notes,
      created_by_user_id, updated_by_user_id, created_at, updated_at
    ) VALUES (
      ?1, ?2, ?3, ?4, ?5, ?6,
      ?7, ?8, ?9, ?10,
      ?11, 'ACTIVE', 'ACTIVE', ?12,
      ?13, ?13, ?14, ?14
    )`
  )
    .bind(
      id,
      facilityId,
      body.first_name.trim(),
      body.last_name.trim(),
      body.dni?.trim() ?? null,
      body.birth_date?.trim() ?? null,
      body.sex?.trim() ?? null,
      body.coverage_type?.trim() ?? null,
      body.coverage_other?.trim() ?? null,
      body.coverage_number?.trim() ?? null,
      body.admission_date.trim(),
      body.notes?.trim() ?? null,
      userId,
      now
    )
    .run();

  const contacts = body.contacts ?? [];
  for (const contact of contacts) {
    const name = contact.full_name?.trim();
    if (!name) {
      continue;
    }
    await insertResidentContact(
      c.env.DB,
      id,
      {
        full_name: name,
        relationship_type: contact.relationship_type,
        phone: contact.phone,
        email: contact.email,
        address: contact.address,
        is_primary: contact.is_primary
      },
      now
    );
  }

  const created = await fetchResidentById(c.env.DB, id);
  if (!created) {
    return c.json({ detail: "Error al crear residente" }, 500);
  }

  return c.json(toResidentResponse(created), 201);
});

residentsRouter.patch("/:residentId", async (c) => {
  if (!c.env.DB) {
    return c.json({ detail: "Database binding not configured" }, 500);
  }

  const residentId = c.req.param("residentId");
  const resident = await fetchResidentById(c.env.DB, residentId);
  if (!resident) {
    return c.json({ detail: "Residente no encontrado" }, 404);
  }

  const userId = c.get("jwtPayload").sub;
  const access = await assertFacilityAccess(c.env.DB, userId, resident.facility_id);
  if (!access.ok) {
    return c.json({ detail: "No tiene acceso a esta sede" }, 403);
  }

  const canMutate = await canMutateResidents(
    c.env.DB,
    userId,
    resident.facility_id,
    access.userRole
  );
  if (!canMutate) {
    return c.json({ detail: "No tiene permisos para esta acción" }, 403);
  }

  const body = await c.req.json<ResidentUpdateBody>().catch(() => null);
  if (!body || typeof body !== "object") {
    return c.json({ detail: "Cuerpo de solicitud inválido" }, 422);
  }

  const coverageType =
    body.coverage_type !== undefined ? body.coverage_type : resident.coverage_type;
  const coverageOther =
    body.coverage_other !== undefined ? body.coverage_other : resident.coverage_other;
  const coverageError = validateCoverageOther(coverageType, coverageOther);
  if (coverageError) {
    return c.json({ detail: coverageError }, 422);
  }

  if (body.stay_status && body.stay_status !== "ACTIVE" && body.stay_status !== "ENDED") {
    return c.json({ detail: "stay_status inválido" }, 422);
  }
  if (body.status && body.status !== "ACTIVE" && body.status !== "INACTIVE") {
    return c.json({ detail: "status inválido" }, 422);
  }
  if (
    body.end_reason &&
    body.end_reason !== "DISCHARGE" &&
    body.end_reason !== "PASSING" &&
    body.end_reason !== "TRANSFER"
  ) {
    return c.json({ detail: "end_reason inválido" }, 422);
  }

  const updates: string[] = [];
  const binds: (string | null)[] = [];

  const setField = (column: string, value: string | null | undefined) => {
    if (value === undefined) {
      return;
    }
    updates.push(`${column} = ?${binds.length + 1}`);
    binds.push(value === null ? null : value);
  };

  setField("first_name", body.first_name?.trim());
  setField("last_name", body.last_name?.trim());
  setField("dni", body.dni !== undefined ? (body.dni?.trim() ?? null) : undefined);
  setField("birth_date", body.birth_date !== undefined ? (body.birth_date?.trim() ?? null) : undefined);
  setField("sex", body.sex !== undefined ? (body.sex?.trim() ?? null) : undefined);
  setField(
    "coverage_type",
    body.coverage_type !== undefined ? (body.coverage_type?.trim() ?? null) : undefined
  );
  setField(
    "coverage_other",
    body.coverage_other !== undefined ? (body.coverage_other?.trim() ?? null) : undefined
  );
  setField(
    "coverage_number",
    body.coverage_number !== undefined ? (body.coverage_number?.trim() ?? null) : undefined
  );
  setField("stay_status", body.stay_status);
  setField("status", body.status);
  setField("end_date", body.end_date !== undefined ? (body.end_date?.trim() ?? null) : undefined);
  setField(
    "end_reason",
    body.end_reason !== undefined ? (body.end_reason?.trim() ?? null) : undefined
  );
  setField("notes", body.notes !== undefined ? (body.notes?.trim() ?? null) : undefined);

  if (updates.length === 0) {
    return c.json(toResidentResponse(resident));
  }

  const now = new Date().toISOString();
  updates.push(`updated_at = ?${binds.length + 1}`);
  binds.push(now);
  updates.push(`updated_by_user_id = ?${binds.length + 1}`);
  binds.push(userId);
  binds.push(residentId);

  await c.env.DB.prepare(`UPDATE residents SET ${updates.join(", ")} WHERE id = ?${binds.length}`)
    .bind(...binds)
    .run();

  const updated = await fetchResidentById(c.env.DB, residentId);
  if (!updated) {
    return c.json({ detail: "Residente no encontrado" }, 404);
  }

  return c.json(toResidentResponse(updated));
});

residentsRouter.delete("/:residentId", async (c) => {
  if (!c.env.DB) {
    return c.json({ detail: "Database binding not configured" }, 500);
  }

  const residentId = c.req.param("residentId");
  const resident = await fetchResidentById(c.env.DB, residentId);
  if (!resident) {
    return c.json({ detail: "Residente no encontrado" }, 404);
  }

  const userId = c.get("jwtPayload").sub;
  const access = await assertFacilityAccess(c.env.DB, userId, resident.facility_id);
  if (!access.ok) {
    return c.json({ detail: "No tiene acceso a esta sede" }, 403);
  }

  const canMutate = await canMutateResidents(
    c.env.DB,
    userId,
    resident.facility_id,
    access.userRole
  );
  if (!canMutate) {
    return c.json({ detail: "No tiene permisos para esta acción" }, 403);
  }

  if (resident.deleted_at) {
    return c.json({ detail: "El residente ya está eliminado" }, 400);
  }

  const now = new Date().toISOString();
  await c.env.DB.prepare(
    `UPDATE residents
     SET deleted_at = ?1, deleted_by_user_id = ?2, updated_at = ?1, updated_by_user_id = ?2
     WHERE id = ?3`
  )
    .bind(now, userId, residentId)
    .run();

  return c.body(null, 204);
});

export { residentsRouter };
