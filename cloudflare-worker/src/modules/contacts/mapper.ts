export type DbContactRow = {
  id: string;
  resident_id: string;
  full_name: string;
  relationship: string | null;
  phone: string | null;
  email: string | null;
  address: string | null;
  is_primary: number;
  created_at: string;
  updated_at: string;
};

export type ContactResponse = {
  id: string;
  resident_id: string;
  full_name: string;
  relationship_type: string | null;
  phone: string | null;
  email: string | null;
  address: string | null;
  is_primary: boolean;
  created_at: string;
  updated_at: string;
};

export const CONTACT_SELECT_COLUMNS = `
  id, resident_id, full_name, relationship, phone, email, address,
  is_primary, created_at, updated_at
`.trim();

export function toContactResponse(row: DbContactRow): ContactResponse {
  return {
    id: row.id,
    resident_id: row.resident_id,
    full_name: row.full_name,
    relationship_type: row.relationship,
    phone: row.phone,
    email: row.email,
    address: row.address,
    is_primary: row.is_primary === 1,
    created_at: row.created_at,
    updated_at: row.updated_at
  };
}
