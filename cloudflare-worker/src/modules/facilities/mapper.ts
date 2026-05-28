export type DbFacilityRow = {
  id: string;
  name: string;
  slug: string | null;
  is_active: number;
};

export type FacilityResponse = {
  id: string;
  name: string;
  code: string;
  slug: string | null;
  address: string | null;
  is_active: boolean;
};

export function toFacilityResponse(row: DbFacilityRow): FacilityResponse {
  return {
    id: row.id,
    name: row.name,
    code: row.slug ?? row.id,
    slug: row.slug,
    address: null,
    is_active: row.is_active === 1
  };
}
