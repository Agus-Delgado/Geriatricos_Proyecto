export interface Resident {
  id: string;
  facility_id: string;
  first_name: string;
  last_name: string;
  dni: string | null;
  birth_date: string | null;
  sex: string | null;
  coverage_type: string | null;
  coverage_number: string | null;
  admission_date: string;
  stay_status: string;
  end_date: string | null;
  end_reason: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
  created_by_user_id: string | null;
  updated_by_user_id: string | null;
}

export interface ResidentCreate {
  facility_id: string;
  first_name: string;
  last_name: string;
  dni?: string;
  birth_date?: string;
  sex?: string;
  coverage_type?: string;
  coverage_number?: string;
  admission_date: string;
  notes?: string;
}

export interface ResidentUpdate {
  first_name?: string;
  last_name?: string;
  dni?: string;
  birth_date?: string;
  sex?: string;
  coverage_type?: string;
  coverage_number?: string;
  stay_status?: string;
  end_date?: string;
  end_reason?: string;
  notes?: string;
}

export interface ResidentContact {
  id: string;
  resident_id: string;
  full_name: string;
  relationship: string;
  phone: string | null;
  email: string | null;
  address: string | null;
  is_emergency_contact: boolean;
  notes: string | null;
}

export interface ResidentContactCreate {
  full_name: string;
  relationship: string;
  phone?: string;
  email?: string;
  address?: string;
  is_emergency_contact?: boolean;
  notes?: string;
}

export interface ResidentContactUpdate {
  full_name?: string;
  relationship?: string;
  phone?: string;
  email?: string;
  address?: string;
  is_emergency_contact?: boolean;
  notes?: string;
}
