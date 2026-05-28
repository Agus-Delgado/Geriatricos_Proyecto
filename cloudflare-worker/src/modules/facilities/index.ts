import { Hono } from "hono";
import { requireAuth } from "../../middleware/auth";
import { canAccessFacility, getUserRole, isPlatformAdmin } from "./access";
import { toFacilityResponse, type DbFacilityRow } from "./mapper";
import type { AppContext } from "../../types/env";

const facilitiesRouter = new Hono<AppContext>();

facilitiesRouter.use("*", requireAuth);

facilitiesRouter.get("/", async (c) => {
  if (!c.env.DB) {
    return c.json({ detail: "Database binding not configured" }, 500);
  }

  const userId = c.get("jwtPayload").sub;
  const role = await getUserRole(c.env.DB, userId);

  let rows: DbFacilityRow[];
  if (isPlatformAdmin(role)) {
    const result = await c.env.DB.prepare(
      `SELECT id, name, slug, is_active
       FROM facilities
       WHERE is_active = 1
       ORDER BY name`
    ).all<DbFacilityRow>();
    rows = result.results ?? [];
  } else {
    const result = await c.env.DB.prepare(
      `SELECT DISTINCT f.id, f.name, f.slug, f.is_active
       FROM facilities f
       INNER JOIN facility_users fu ON fu.facility_id = f.id
       WHERE fu.user_id = ?1 AND fu.is_active = 1 AND f.is_active = 1
       ORDER BY f.name`
    )
      .bind(userId)
      .all<DbFacilityRow>();
    rows = result.results ?? [];
  }

  return c.json(rows.map(toFacilityResponse));
});

facilitiesRouter.get("/by-slug/:slug", async (c) => {
  if (!c.env.DB) {
    return c.json({ detail: "Database binding not configured" }, 500);
  }

  const slug = c.req.param("slug");
  const facility = await c.env.DB.prepare(
    `SELECT id, name, slug, is_active
     FROM facilities
     WHERE slug = ?1
     LIMIT 1`
  )
    .bind(slug)
    .first<DbFacilityRow>();

  if (!facility || facility.is_active !== 1) {
    return c.json({ detail: "Geriátrico no encontrado" }, 404);
  }

  const userId = c.get("jwtPayload").sub;
  const role = await getUserRole(c.env.DB, userId);
  const allowed = await canAccessFacility(c.env.DB, userId, facility.id, role);
  if (!allowed) {
    return c.json({ detail: "No tiene acceso a esta sede" }, 403);
  }

  return c.json(toFacilityResponse(facility));
});

facilitiesRouter.get("/:facilityId", async (c) => {
  if (!c.env.DB) {
    return c.json({ detail: "Database binding not configured" }, 500);
  }

  const facilityId = c.req.param("facilityId");
  const userId = c.get("jwtPayload").sub;
  const role = await getUserRole(c.env.DB, userId);

  const allowed = await canAccessFacility(c.env.DB, userId, facilityId, role);
  if (!allowed) {
    return c.json({ detail: "No tiene acceso a esta sede" }, 403);
  }

  const facility = await c.env.DB.prepare(
    `SELECT id, name, slug, is_active
     FROM facilities
     WHERE id = ?1
     LIMIT 1`
  )
    .bind(facilityId)
    .first<DbFacilityRow>();

  if (!facility || facility.is_active !== 1) {
    return c.json({ detail: "Sede no encontrada" }, 404);
  }

  return c.json(toFacilityResponse(facility));
});

export { facilitiesRouter };
