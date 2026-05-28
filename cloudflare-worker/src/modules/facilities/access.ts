import type { D1Database } from "@cloudflare/workers-types";

export function isPlatformAdmin(role: string | null | undefined): boolean {
  const normalized = (role ?? "").toLowerCase();
  return normalized === "owner" || normalized === "platform_admin";
}

export async function getUserRole(db: D1Database, userId: string): Promise<string | null> {
  const row = await db
    .prepare(`SELECT role FROM users WHERE id = ?1 LIMIT 1`)
    .bind(userId)
    .first<{ role: string | null }>();
  return row?.role ?? null;
}

export async function hasFacilityMembership(
  db: D1Database,
  userId: string,
  facilityId: string
): Promise<boolean> {
  const row = await db
    .prepare(
      `SELECT 1 AS ok
       FROM facility_users
       WHERE user_id = ?1 AND facility_id = ?2 AND is_active = 1
       LIMIT 1`
    )
    .bind(userId, facilityId)
    .first<{ ok: number }>();
  return row != null;
}

export async function canAccessFacility(
  db: D1Database,
  userId: string,
  facilityId: string,
  userRole?: string | null
): Promise<boolean> {
  const role = userRole ?? (await getUserRole(db, userId));
  if (isPlatformAdmin(role)) {
    return true;
  }
  return hasFacilityMembership(db, userId, facilityId);
}
