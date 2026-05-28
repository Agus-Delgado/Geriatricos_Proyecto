import type { FacilityMembership } from '../types/auth';

export function getUniqueActiveFacilityIds(
  memberships: FacilityMembership[]
): string[] {
  const ids = memberships
    .filter((m) => m.is_active)
    .map((m) => m.facility_id);
  return [...new Set(ids)];
}

export function needsFacilityPicker(memberships: FacilityMembership[]): boolean {
  return getUniqueActiveFacilityIds(memberships).length > 1;
}

export function getSingleActiveFacilityId(
  memberships: FacilityMembership[]
): string | null {
  const unique = getUniqueActiveFacilityIds(memberships);
  return unique.length === 1 ? unique[0] : null;
}
