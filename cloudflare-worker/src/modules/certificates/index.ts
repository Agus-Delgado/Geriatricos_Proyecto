import { Hono } from "hono";
import { requireAuth } from "../../middleware/auth";
import type { AppContext } from "../../types/env";
import {
  canAccessFacility,
  getUserRole,
  listAccessibleFacilityIds
} from "../facilities/access";
import { assertFacilityAccess, canMutateResidents } from "../residents/access";
import { fetchResidentById } from "../residents/resident";
import {
  fetchCertificateById,
  insertCertificate,
  listCertificates,
  updateCertificate
} from "./db";
import { toCertificateResponse } from "./mapper";

type CertificateCreateBody = {
  resident_id?: string;
  facility_id?: string;
  certificate_type?: string;
  body_text?: string;
  issued_at?: string;
  content_json?: Record<string, unknown> | null;
};

type CertificateUpdateBody = {
  body_text?: string;
  issued_at?: string;
  content_json?: Record<string, unknown> | null;
};

const certificatesRouter = new Hono<AppContext>();

certificatesRouter.use("*", requireAuth);

certificatesRouter.post("/", async (c) => {
  if (!c.env.DB) {
    return c.json({ detail: "Database binding not configured" }, 500);
  }

  const body = await c.req.json<CertificateCreateBody>().catch(() => null);
  const residentId = body?.resident_id?.trim();
  const facilityId = body?.facility_id?.trim();
  const certificateType = body?.certificate_type?.trim();
  const bodyText = body?.body_text?.trim();
  const issuedAt = body?.issued_at?.trim();

  if (!residentId || !facilityId || !certificateType || !bodyText || !issuedAt) {
    return c.json(
      {
        detail:
          "resident_id, facility_id, certificate_type, body_text e issued_at son requeridos"
      },
      422
    );
  }

  const resident = await fetchResidentById(c.env.DB, residentId);
  if (!resident || resident.deleted_at) {
    return c.json({ detail: "Residente no encontrado" }, 404);
  }

  if (resident.facility_id !== facilityId) {
    return c.json({ detail: "El residente no pertenece a la facility especificada" }, 400);
  }

  const userId = c.get("jwtPayload").sub;
  const access = await assertFacilityAccess(c.env.DB, userId, facilityId);
  if (!access.ok) {
    return c.json({ detail: "No tiene acceso a esta sede" }, 403);
  }

  const canMutate = await canMutateResidents(
    c.env.DB,
    userId,
    facilityId,
    access.userRole
  );
  if (!canMutate) {
    return c.json({ detail: "No tiene permisos para esta acción" }, 403);
  }

  const certificate = await insertCertificate(c.env.DB, userId, {
    resident_id: residentId,
    facility_id: facilityId,
    certificate_type: certificateType,
    body_text: bodyText,
    issued_at: issuedAt,
    content_json: body?.content_json
  });

  return c.json(certificate, 201);
});

certificatesRouter.get("/", async (c) => {
  if (!c.env.DB) {
    return c.json({ detail: "Database binding not configured" }, 500);
  }

  const userId = c.get("jwtPayload").sub;
  const userRole = await getUserRole(c.env.DB, userId);
  const residentId = c.req.query("resident_id")?.trim();
  const facilityId = c.req.query("facility_id")?.trim();
  const certificateType = c.req.query("certificate_type")?.trim();

  if (facilityId) {
    const allowed = await canAccessFacility(c.env.DB, userId, facilityId, userRole);
    if (!allowed) {
      return c.json({ detail: "No tiene acceso a esta sede" }, 403);
    }
  }

  if (residentId) {
    const resident = await fetchResidentById(c.env.DB, residentId);
    if (!resident || resident.deleted_at) {
      return c.json({ detail: "Residente no encontrado" }, 404);
    }

    const allowed = await canAccessFacility(c.env.DB, userId, resident.facility_id, userRole);
    if (!allowed) {
      return c.json({ detail: "No tiene acceso a esta sede" }, 403);
    }
  }

  let facilityIds: string[] | undefined;
  if (!facilityId) {
    facilityIds = await listAccessibleFacilityIds(c.env.DB, userId, userRole);
    if (facilityIds.length === 0) {
      return c.json([]);
    }
  }

  const certificates = await listCertificates(c.env.DB, {
    resident_id: residentId,
    facility_id: facilityId,
    certificate_type: certificateType,
    facility_ids: facilityIds
  });

  return c.json(certificates);
});

certificatesRouter.get("/:certificateId", async (c) => {
  if (!c.env.DB) {
    return c.json({ detail: "Database binding not configured" }, 500);
  }

  const certificateId = c.req.param("certificateId")?.trim();
  const row = await fetchCertificateById(c.env.DB, certificateId);
  if (!row) {
    return c.json({ detail: "Constancia no encontrada" }, 404);
  }

  const userId = c.get("jwtPayload").sub;
  const access = await assertFacilityAccess(c.env.DB, userId, row.facility_id);
  if (!access.ok) {
    return c.json({ detail: "No tiene acceso a esta sede" }, 403);
  }

  return c.json(toCertificateResponse(row));
});

certificatesRouter.patch("/:certificateId", async (c) => {
  if (!c.env.DB) {
    return c.json({ detail: "Database binding not configured" }, 500);
  }

  const certificateId = c.req.param("certificateId")?.trim();
  const row = await fetchCertificateById(c.env.DB, certificateId);
  if (!row) {
    return c.json({ detail: "Constancia no encontrada" }, 404);
  }

  const userId = c.get("jwtPayload").sub;
  const access = await assertFacilityAccess(c.env.DB, userId, row.facility_id);
  if (!access.ok) {
    return c.json({ detail: "No tiene acceso a esta sede" }, 403);
  }

  const canMutate = await canMutateResidents(
    c.env.DB,
    userId,
    row.facility_id,
    access.userRole
  );
  if (!canMutate) {
    return c.json({ detail: "No tiene permisos para esta acción" }, 403);
  }

  const body = await c.req.json<CertificateUpdateBody>().catch(() => null);
  if (!body || typeof body !== "object") {
    return c.json({ detail: "Cuerpo de solicitud inválido" }, 422);
  }

  if (body.body_text !== undefined && !body.body_text.trim()) {
    return c.json({ detail: "body_text no puede estar vacío" }, 422);
  }

  const updated = await updateCertificate(c.env.DB, certificateId, {
    body_text: body.body_text,
    issued_at: body.issued_at?.trim(),
    content_json: body.content_json
  });

  if (!updated) {
    return c.json({ detail: "Constancia no encontrada" }, 404);
  }

  return c.json(updated);
});

export { certificatesRouter };
