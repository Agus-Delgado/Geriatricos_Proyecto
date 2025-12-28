export interface Staff {
  id: string;
  facility_id: string;
  first_name: string;
  last_name: string;
  dni: string | null;
  phone: string | null;
  email: string | null;
  position: string | null;
  hire_date: string | null;
  is_active: boolean;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface StaffCreate {
  facility_id: string;
  first_name: string;
  last_name: string;
  dni?: string;
  phone?: string;
  email?: string;
  position?: string;
  hire_date?: string;
  notes?: string;
}

export interface StaffUpdate {
  first_name?: string;
  last_name?: string;
  dni?: string;
  phone?: string;
  email?: string;
  position?: string;
  hire_date?: string;
  is_active?: boolean;
  notes?: string;
}
