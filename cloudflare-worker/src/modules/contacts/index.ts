import { Hono } from "hono";
import type { Context } from "hono";
import type { AppContext } from "../../types/env";
import { assertFacilityAccess, canMutateResidents } from "../residents/access";
import { fetchResidentById } from "../residents/resident";
import { fetchContactById, insertResidentContact } from "./db";
import {
  CONTACT_SELECT_COLUMNS,
  toContactResponse,
  type DbContactRow
} from "./mapper";

type ResidentContactCreateBody = {
  full_name: string;
  relationship_type?: string;
  phone?: string;
  email?: string;
  address?: string;
  is_primary?: boolean;
};

type ResidentContactUpdateBody = {
  full_name?: string;
  relationship_type?: string;
  phone?: string;
  email?: string;
  address?: string;
  is_primary?: boolean;
};

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

const contactsRouter = new Hono<AppContext>();

contactsRouter.get("/", async (c) => {
  const ctx = await resolveResidentContext(c);
  if (!ctx.ok) {
    return ctx.response;
  }

  const result = await c.env.DB!.prepare(
    `SELECT ${CONTACT_SELECT_COLUMNS}
     FROM resident_contacts
     WHERE resident_id = ?1 AND deleted_at IS NULL
     ORDER BY is_primary DESC, full_name`
  )
    .bind(ctx.resident.id)
    .all<DbContactRow>();

  const rows = result.results ?? [];
  return c.json(rows.map(toContactResponse));
});

contactsRouter.post("/", async (c) => {
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

  const body = await c.req.json<ResidentContactCreateBody>().catch(() => null);
  const fullName = body?.full_name?.trim();
  if (!fullName) {
    return c.json({ detail: "full_name es requerido" }, 422);
  }

  const created = await insertResidentContact(c.env.DB!, ctx.resident.id, {
    full_name: fullName,
    relationship_type: body?.relationship_type,
    phone: body?.phone,
    email: body?.email,
    address: body?.address,
    is_primary: body?.is_primary
  });

  return c.json(created, 201);
});

contactsRouter.patch("/:contactId", async (c) => {
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

  const contactId = c.req.param("contactId");
  const contact = await fetchContactById(c.env.DB!, ctx.resident.id, contactId);
  if (!contact) {
    return c.json({ detail: "Contacto no encontrado" }, 404);
  }

  const body = await c.req.json<ResidentContactUpdateBody>().catch(() => null);
  if (!body || typeof body !== "object") {
    return c.json({ detail: "Cuerpo de solicitud inválido" }, 422);
  }

  if (body.full_name !== undefined && !body.full_name.trim()) {
    return c.json({ detail: "full_name no puede estar vacío" }, 422);
  }

  const updates: string[] = [];
  const binds: (string | number | null)[] = [];

  const setField = (column: string, value: string | number | null | undefined) => {
    if (value === undefined) {
      return;
    }
    updates.push(`${column} = ?${binds.length + 1}`);
    binds.push(value);
  };

  setField("full_name", body.full_name !== undefined ? body.full_name.trim() : undefined);
  setField(
    "relationship",
    body.relationship_type !== undefined ? (body.relationship_type?.trim() ?? null) : undefined
  );
  setField("phone", body.phone !== undefined ? (body.phone?.trim() ?? null) : undefined);
  setField("email", body.email !== undefined ? (body.email?.trim() ?? null) : undefined);
  setField("address", body.address !== undefined ? (body.address?.trim() ?? null) : undefined);
  if (body.is_primary !== undefined) {
    setField("is_primary", body.is_primary ? 1 : 0);
  }

  if (updates.length === 0) {
    return c.json(toContactResponse(contact));
  }

  const now = new Date().toISOString();
  updates.push(`updated_at = ?${binds.length + 1}`);
  binds.push(now);
  binds.push(contactId);
  binds.push(ctx.resident.id);

  await c.env.DB!.prepare(
    `UPDATE resident_contacts SET ${updates.join(", ")}
     WHERE id = ?${binds.length - 1} AND resident_id = ?${binds.length}`
  )
    .bind(...binds)
    .run();

  const updated = await fetchContactById(c.env.DB!, ctx.resident.id, contactId);
  if (!updated) {
    return c.json({ detail: "Contacto no encontrado" }, 404);
  }

  return c.json(toContactResponse(updated));
});

contactsRouter.delete("/:contactId", async (c) => {
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

  const contactId = c.req.param("contactId");
  const contact = await fetchContactById(c.env.DB!, ctx.resident.id, contactId);
  if (!contact) {
    return c.json({ detail: "Contacto no encontrado" }, 404);
  }

  await c.env.DB!.prepare(
    `DELETE FROM resident_contacts WHERE id = ?1 AND resident_id = ?2`
  )
    .bind(contactId, ctx.resident.id)
    .run();

  return c.body(null, 204);
});

export { contactsRouter };
