import { Hono } from "hono";
import { requireAuth } from "../../middleware/auth";
import { getJwtExpiresInSeconds, signJwt } from "./jwt";
import { verifyPassword } from "./password";
import type { AppContext } from "../../types/env";

type DbUser = {
  id: string;
  dni: string | null;
  email: string | null;
  full_name: string;
  password_hash: string;
  role: string | null;
  active_facility_id: string | null;
  is_active: number;
};

type DbMembership = {
  id: string;
  facility_id: string;
  facility_name: string | null;
  facility_slug: string | null;
  role: string | null;
  is_active: number;
};

function normalizeMembershipRole(rawRole: string | null): "ADMIN" | "MEDICO" | "STAFF" {
  const normalized = (rawRole ?? "").toLowerCase();
  if (normalized === "medico" || normalized === "doctor") {
    return "MEDICO";
  }
  if (normalized === "staff") {
    return "STAFF";
  }
  return "ADMIN";
}

function mapGlobalRoles(rawRole: string | null): Array<{ id: string; code: string; name: string }> {
  const normalized = (rawRole ?? "").toLowerCase();
  if (normalized === "owner" || normalized === "platform_admin") {
    return [{ id: "role-owner", code: "OWNER", name: "Owner" }];
  }
  if (normalized === "doctor" || normalized === "medico") {
    return [{ id: "role-doctor", code: "DOCTOR", name: "Doctor" }];
  }
  if (normalized === "staff") {
    return [{ id: "role-staff", code: "STAFF", name: "Staff" }];
  }
  if (normalized === "admin") {
    return [{ id: "role-admin", code: "ADMIN", name: "Admin" }];
  }
  return [];
}

const authRouter = new Hono<AppContext>();

authRouter.post("/login", async (c) => {
  if (!c.env.DB) {
    return c.json({ detail: "Database binding not configured" }, 500);
  }
  if (!c.env.JWT_SECRET) {
    return c.json({ detail: "Server auth config missing" }, 500);
  }

  const body = await c.req.json<{ username?: string; password?: string }>().catch(() => null);
  const username = body?.username?.trim() ?? "";
  const password = body?.password ?? "";
  if (!username || !password) {
    return c.json({ detail: "Credenciales inválidas" }, 401);
  }

  const userResult = await c.env.DB.prepare(
    `SELECT id, dni, email, full_name, password_hash, role, active_facility_id, is_active
     FROM users
     WHERE dni = ?1 OR lower(email) = lower(?1)
     LIMIT 1`
  )
    .bind(username)
    .first<DbUser>();

  if (!userResult) {
    return c.json({ detail: "Credenciales inválidas" }, 401);
  }
  if (userResult.is_active !== 1) {
    return c.json({ detail: "Usuario inactivo" }, 403);
  }
  if (!verifyPassword(password, userResult.password_hash)) {
    return c.json({ detail: "Credenciales inválidas" }, 401);
  }

  const expiresInSeconds = getJwtExpiresInSeconds(c.env.JWT_EXPIRES_IN_SECONDS);
  const exp = Math.floor(Date.now() / 1000) + expiresInSeconds;
  const token = await signJwt(
    {
      sub: userResult.id,
      exp,
      email: userResult.email ?? undefined,
      dni: userResult.dni ?? undefined,
      active_facility_id: userResult.active_facility_id ?? undefined,
      facility_id: userResult.active_facility_id ?? undefined
    },
    c.env.JWT_SECRET
  );

  return c.json({
    access_token: token,
    token_type: "bearer"
  });
});

authRouter.get("/me", requireAuth, async (c) => {
  if (!c.env.DB) {
    return c.json({ detail: "Database binding not configured" }, 500);
  }

  const jwtPayload = c.get("jwtPayload");
  const user = await c.env.DB.prepare(
    `SELECT id, dni, email, full_name, role, active_facility_id, is_active
     FROM users
     WHERE id = ?1
     LIMIT 1`
  )
    .bind(jwtPayload.sub)
    .first<Omit<DbUser, "password_hash">>();

  if (!user) {
    return c.json({ detail: "Could not validate credentials" }, 401);
  }
  if (user.is_active !== 1) {
    return c.json({ detail: "Usuario inactivo" }, 403);
  }

  const membershipsResult = await c.env.DB.prepare(
    `SELECT fu.id, fu.facility_id, f.name AS facility_name, f.slug AS facility_slug, fu.role, fu.is_active
     FROM facility_users fu
     JOIN facilities f ON f.id = fu.facility_id
     WHERE fu.user_id = ?1 AND fu.is_active = 1`
  )
    .bind(user.id)
    .all<DbMembership>();

  const memberships = (membershipsResult.results ?? []).map((membership) => ({
    id: membership.id,
    facility_id: membership.facility_id,
    facility_name: membership.facility_name ?? "Sin nombre",
    facility_code: membership.facility_slug ?? membership.facility_id,
    role: normalizeMembershipRole(membership.role),
    is_active: membership.is_active === 1
  }));

  const roles = mapGlobalRoles(user.role);
  const normalizedUserRole = (user.role ?? "").toLowerCase();
  const isPlatformAdmin = normalizedUserRole === "owner" || normalizedUserRole === "platform_admin";

  return c.json({
    id: user.id,
    email: user.email,
    dni: user.dni,
    phone: null,
    full_name: user.full_name,
    license_number: null,
    is_active: user.is_active === 1,
    is_verified: true,
    is_platform_admin: isPlatformAdmin,
    active_facility_id: user.active_facility_id,
    last_login_at: null,
    roles,
    memberships
  });
});

export { authRouter };
