import { isMedicalAppMode } from '../config/appMode';

export function getMedicalHubPath(facilityId: string): string {
  return `/g/${facilityId}/medical`;
}

export function resolvePostLoginPath(options: {
  activeFacilityId: string | null;
  membershipRole?: 'ADMIN' | 'MEDICO' | 'STAFF' | null;
  isPlatformAdmin?: boolean;
  hasMemberships: boolean;
}): string {
  const { activeFacilityId, membershipRole, hasMemberships } = options;

  if (!hasMemberships) {
    return '/login';
  }

  if (!activeFacilityId) {
    return '/select-facility';
  }

  if (isMedicalAppMode()) {
    return getMedicalHubPath(activeFacilityId);
  }

  if (options.isPlatformAdmin) {
    return '/platform';
  }

  switch (membershipRole) {
    case 'MEDICO':
      return getMedicalHubPath(activeFacilityId);
    case 'STAFF':
      return `/g/${activeFacilityId}/tasks`;
    case 'ADMIN':
    default:
      return `/g/${activeFacilityId}/dashboard`;
  }
}
