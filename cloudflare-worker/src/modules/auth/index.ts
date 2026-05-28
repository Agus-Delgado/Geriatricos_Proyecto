import { Hono } from "hono";
import { requireAuth } from "../../middleware/auth";
import {
  getUserRole,
  hasFacilityMembership,
  isPlatformAdmin
} from "../facilities/access";
import { getJwtExpiresInSeconds, signJwt } from "./jwt";
import { hashPassword, verifyPassword } from "./password";
import type { AppContext } from "../../types/env";
import type { D1Database } from "@cloudflare/workers-types";

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

type DbUserPublic = Omit<DbUser, "password_hash">;

type DbMembership = {
  id: string;
  facility_id: string;
  facility_name: string | null;
  facility_slug: string | null;
  role: string | null;
  is_active: number;
};

type UpdateProfileBody = {
  first_name?: string;
  last_name?: string;
  full_name?: string;
  email?: string;
  dni?: string;
  current_password?: string;
};

type ChangePasswordBody = {
  current_password?: string;
  new_password?: string;
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

function isUserPlatformAdmin(role: string | null): boolean {
  const normalized = (role ?? "").toLowerCase();
  return normalized === "owner" || normalized === "platform_admin";
}

async function buildMeResponse(db: D1Database, user: DbUserPublic) {
  const membershipsResult = await db
    .prepare(
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

  return {
    id: user.id,
    email: user.email,
    dni: user.dni,
    phone: null,
    full_name: user.full_name,
    license_number: null,
    is_active: user.is_active === 1,
    is_verified: true,
    is_platform_admin: isUserPlatformAdmin(user.role),
    active_facility_id: user.active_facility_id,
    last_login_at: null,
    roles,
    memberships
  };
}

async function fetchUserById(db: D1Database, userId: string): Promise<DbUser | null> {
  return db
    .prepare(
      `SELECT id, dni, email, full_name, password_hash, role, active_facility_id, is_active
     FROM users
     WHERE id = ?1
     LIMIT 1`
    )
    .bind(userId)
    .first<DbUser>();
}

async function fetchUserPublicById(db: D1Database, userId: string): Promise<DbUserPublic | null> {
  return db
    .prepare(
      `SELECT id, dni, email, full_name, role, active_facility_id, is_active
     FROM users
     WHERE id = ?1
     LIMIT 1`
    )
    .bind(userId)
    .first<DbUserPublic>();
}

function validateDni(dni: string): string | null {
  if (!dni || dni.length < 7 || dni.length > 16) {
    return "DNI inválido (debe tener entre 7 y 16 caracteres)";
  }
  if (!/^\d+$/.test(dni)) {
    return "DNI debe contener solo números";
  }
  return null;
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
  const user = await fetchUserPublicById(c.env.DB, jwtPayload.sub);

  if (!user) {
    return c.json({ detail: "Could not validate credentials" }, 401);
  }
  if (user.is_active !== 1) {
    return c.json({ detail: "Usuario inactivo" }, 403);
  }

  return c.json(await buildMeResponse(c.env.DB, user));
});

authRouter.put("/me", requireAuth, async (c) => {
  if (!c.env.DB) {
    return c.json({ detail: "Database binding not configured" }, 500);
  }

  const userId = c.get("jwtPayload").sub;
  const currentUser = await fetchUserById(c.env.DB, userId);
  if (!currentUser) {
    return c.json({ detail: "Could not validate credentials" }, 401);
  }
  if (currentUser.is_active !== 1) {
    return c.json({ detail: "Usuario inactivo" }, 403);
  }

  const body = await c.req.json<UpdateProfileBody>().catch(() => ({} as UpdateProfileBody));

  let nextFullName = currentUser.full_name;
  let nextEmail = currentUser.email;
  let nextDni = currentUser.dni;

  if (body.full_name !== undefined) {
    const trimmed = body.full_name.trim();
    if (trimmed) {
      nextFullName = trimmed;
    }
  } else if (body.first_name !== undefined || body.last_name !== undefined) {
    const nameParts = (currentUser.full_name || "").split(" ", 2);
    const currentFirst = nameParts[0] ?? "";
    const currentLast = nameParts[1] ?? "";
    const newFirst =
      body.first_name !== undefined ? body.first_name.trim() : currentFirst;
    const newLast = body.last_name !== undefined ? body.last_name.trim() : currentLast;
    if (newFirst && newLast) {
      nextFullName = `${newFirst} ${newLast}`;
    } else if (newFirst) {
      nextFullName = newFirst;
    } else if (newLast) {
      nextFullName = newLast;
    }
  }

  if (body.email !== undefined) {
    const emailNormalized = body.email.trim().toLowerCase();
    if (!emailNormalized) {
      return c.json({ detail: "Email inválido" }, 400);
    }
    const existingEmail = await c.env.DB.prepare(
      `SELECT id FROM users WHERE lower(email) = lower(?1) AND id != ?2 LIMIT 1`
    )
      .bind(emailNormalized, userId)
      .first<{ id: string }>();
    if (existingEmail) {
      return c.json({ detail: "Email ya registrado" }, 409);
    }
    nextEmail = emailNormalized;
  }

  if (body.dni !== undefined) {
    const dniNormalized = body.dni.trim();
    const currentDni = (currentUser.dni ?? "").trim();

    if (dniNormalized !== currentDni) {
      const dniError = validateDni(dniNormalized);
      if (dniError) {
        return c.json({ detail: dniError }, 400);
      }

      const hadDni = currentDni.length > 0;
      if (hadDni) {
        if (!body.current_password) {
          return c.json(
            { detail: "Se requiere contraseña actual para cambiar el DNI" },
            400
          );
        }
        if (!verifyPassword(body.current_password, currentUser.password_hash)) {
          return c.json({ detail: "Contraseña actual incorrecta" }, 401);
        }
      }

      const existingDni = await c.env.DB.prepare(
        `SELECT id FROM users WHERE dni = ?1 AND id != ?2 LIMIT 1`
      )
        .bind(dniNormalized, userId)
        .first<{ id: string }>();
      if (existingDni) {
        return c.json({ detail: "DNI ya registrado" }, 409);
      }

      nextDni = dniNormalized;
    }
  }

  const now = new Date().toISOString();
  await c.env.DB.prepare(
    `UPDATE users
     SET full_name = ?1, email = ?2, dni = ?3, updated_at = ?4
     WHERE id = ?5`
  )
    .bind(nextFullName, nextEmail, nextDni, now, userId)
    .run();

  const updatedUser = await fetchUserPublicById(c.env.DB, userId);
  if (!updatedUser) {
    return c.json({ detail: "Could not validate credentials" }, 401);
  }

  return c.json(await buildMeResponse(c.env.DB, updatedUser));
});

authRouter.post("/change-password", requireAuth, async (c) => {
  if (!c.env.DB) {
    return c.json({ detail: "Database binding not configured" }, 500);
  }

  const userId = c.get("jwtPayload").sub;
  const currentUser = await fetchUserById(c.env.DB, userId);
  if (!currentUser) {
    return c.json({ detail: "Could not validate credentials" }, 401);
  }
  if (currentUser.is_active !== 1) {
    return c.json({ detail: "Usuario inactivo" }, 403);
  }

  const body = await c.req.json<ChangePasswordBody>().catch(() => ({} as ChangePasswordBody));
  const currentPassword = body.current_password ?? "";
  const newPassword = body.new_password ?? "";

  if (!currentPassword) {
    return c.json({ detail: "Contraseña actual requerida" }, 400);
  }
  if (!verifyPassword(currentPassword, currentUser.password_hash)) {
    return c.json({ detail: "Contraseña actual incorrecta" }, 401);
  }
  if (newPassword.length < 8) {
    return c.json(
      { detail: "La nueva contraseña debe tener al menos 8 caracteres" },
      400
    );
  }

  const now = new Date().toISOString();
  const passwordHash = hashPassword(newPassword);
  await c.env.DB.prepare(
    `UPDATE users SET password_hash = ?1, updated_at = ?2 WHERE id = ?3`
  )
    .bind(passwordHash, now, userId)
    .run();

  return c.json({ message: "Contraseña actualizada" });
});

authRouter.post("/active-facility", requireAuth, async (c) => {
  if (!c.env.DB) {
    return c.json({ detail: "Database binding not configured" }, 500);
  }

  const body = await c.req.json<{ facility_id?: string }>().catch(() => null);
  const facilityId = body?.facility_id?.trim() ?? "";
  if (!facilityId) {
    return c.json({ detail: "facility_id es requerido" }, 422);
  }

  const facility = await c.env.DB.prepare(
    `SELECT id, is_active
     FROM facilities
     WHERE id = ?1
     LIMIT 1`
  )
    .bind(facilityId)
    .first<{ id: string; is_active: number }>();

  if (!facility || facility.is_active !== 1) {
    return c.json({ detail: "Geriátrico no encontrado" }, 404);
  }

  const userId = c.get("jwtPayload").sub;
  const role = await getUserRole(c.env.DB, userId);
  if (!isPlatformAdmin(role)) {
    const hasMembership = await hasFacilityMembership(c.env.DB, userId, facilityId);
    if (!hasMembership) {
      return c.json({ detail: "No tiene acceso a este geriátrico" }, 403);
    }
  }

  const now = new Date().toISOString();
  await c.env.DB.prepare(
    `UPDATE users
     SET active_facility_id = ?1, updated_at = ?2
     WHERE id = ?3`
  )
    .bind(facilityId, now, userId)
    .run();

  return c.json({ active_facility_id: facilityId });
});

export { authRouter };
