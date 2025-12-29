export interface Role {
  id: string;
  code: string;
  name: string;
}

export interface FacilityAccess {
  id: string;
  facility_id: string;
  facility_name: string;
  facility_code: string;
  access_level: string;
}

export interface FacilityMembership {
  id: string;
  facility_id: string;
  facility_name: string;
  facility_code: string;
  role: 'ADMIN' | 'MEDICO' | 'STAFF';
  is_active: boolean;
}

export interface User {
  id: string;
  email: string | null;
  dni: string | null;
  phone: string | null;
  full_name: string;
  is_active: boolean;
  is_verified: boolean;
  is_platform_admin: boolean;
  active_facility_id: string | null;
  last_login_at: string | null;
  roles: Role[];
  memberships: FacilityMembership[];
}

export interface LoginRequest {
  username: string; // DNI o email
  password: string;
}

export interface SetActiveFacilityRequest {
  facility_id: string;
}

export interface TokenResponse {
  access_token: string;
  token_type: string;
}

export interface Facility {
  id: string;
  name: string;
  code: string;
  slug: string | null;
  is_active: boolean;
}

/**
 * Helper para mapear roles cortos a labels legibles en UI
 */
export function getRoleLabel(role: 'ADMIN' | 'MEDICO' | 'STAFF'): string {
  const labels: Record<'ADMIN' | 'MEDICO' | 'STAFF', string> = {
    ADMIN: 'Administrador',
    MEDICO: 'Médico',
    STAFF: 'Operador',
  };
  return labels[role] || role;
}
