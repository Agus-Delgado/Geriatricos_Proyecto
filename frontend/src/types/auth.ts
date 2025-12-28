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

export interface User {
  id: string;
  email: string | null;
  dni: string | null;
  phone: string | null;
  full_name: string;
  is_active: boolean;
  is_verified: boolean;
  last_login_at: string | null;
  roles: Role[];
  facilities: FacilityAccess[];
}

export interface LoginRequest {
  username: string; // DNI o email
  password: string;
  facility_slug?: string; // Slug del geriátrico (opcional por ahora)
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
