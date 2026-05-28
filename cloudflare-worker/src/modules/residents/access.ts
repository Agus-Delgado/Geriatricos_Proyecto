import type { D1Database } from "@cloudflare/workers-types";
import {
  canAccessFacility,
  getUserRole,
  isPlatformAdmin
} from "../facilities/access";

export async function assertFacilityAccess(
  db: D1Database,
  userId: string,
  facilityId: string
): Promise<{ ok: true; userRole: string | null } | { ok: false; status: 403 }> {
  const userRole = await getUserRole(db, userId);
  const allowed = await canAccessFacility(db, userId, facilityId, userRole);
  if (!allowed) {
    return { ok: false, status: 403 };
  }
  return { ok: true, userRole };
}

function normalizeMembershipRole(rawRole: string | null): string {
  return (rawRole ?? "").toLowerCase();
}

export async function getFacilityMembershipRole(
  db: D1Database,
  userId: string,
  facilityId: string
): Promise<string | null> {
  const row = await db
    .prepare(
      `SELECT role FROM facility_users
       WHERE user_id = ?1 AND facility_id = ?2 AND is_active = 1
       LIMIT 1`
    )
    .bind(userId, facilityId)
    .first<{ role: string | null }>();
  return row?.role ?? null;
}

export async function canMutateResidents(
  db: D1Database,
  userId: string,
  facilityId: string,
  userRole?: string | null
): Promise<boolean> {
  const globalRole = userRole ?? (await getUserRole(db, userId));
  if (isPlatformAdmin(globalRole)) {
    return true;
  }

  const membershipRole = normalizeMembershipRole(
    await getFacilityMembershipRole(db, userId, facilityId)
  );
  return membershipRole === "admin" || membershipRole === "medico" || membershipRole === "doctor";
}
