import { apiClient } from './client';
import type { Staff, StaffCreate, StaffUpdate } from '../types/staff';

export const staffApi = {
  list: async (facilityId: string, params?: { active_only?: boolean; q?: string }): Promise<Staff[]> => {
    const queryParams = new URLSearchParams();
    queryParams.append('facility_id', facilityId);
    if (params?.active_only !== undefined) {
      queryParams.append('active_only', params.active_only.toString());
    }
    if (params?.q) {
      queryParams.append('q', params.q);
    }
    return apiClient.get<Staff[]>(`/staff?${queryParams.toString()}`);
  },

  get: async (staffId: string): Promise<Staff> => {
    return apiClient.get<Staff>(`/staff/${staffId}`);
  },

  create: async (data: StaffCreate): Promise<Staff> => {
    return apiClient.post<Staff>('/staff', data);
  },

  update: async (staffId: string, data: StaffUpdate): Promise<Staff> => {
    return apiClient.patch<Staff>(`/staff/${staffId}`, data);
  },

  transfer: async (staffId: string, toFacilityId: string): Promise<Staff> => {
    const queryParams = new URLSearchParams();
    queryParams.append('to_facility_id', toFacilityId);
    return apiClient.post<Staff>(`/staff/${staffId}/transfer?${queryParams.toString()}`);
  },
};
