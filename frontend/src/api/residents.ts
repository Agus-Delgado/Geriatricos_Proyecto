import { apiClient } from './client';
import type {
  Resident,
  ResidentCreate,
  ResidentUpdate,
} from '../types/residents';

export const residentsApi = {
  list: async (
    facilityId: string,
    params?: { q?: string; stay_status?: string; status?: string }
  ): Promise<Resident[]> => {
    const searchParams = new URLSearchParams({ facility_id: facilityId });
    if (params?.q) searchParams.append('q', params.q);
    if (params?.stay_status) searchParams.append('stay_status', params.stay_status);
    if (params?.status) searchParams.append('status', params.status);
    
    return apiClient.get<Resident[]>(`/residents?${searchParams.toString()}`);
  },

  get: async (residentId: string): Promise<Resident> => {
    return apiClient.get<Resident>(`/residents/${residentId}`);
  },

  create: async (data: ResidentCreate): Promise<Resident> => {
    return apiClient.post<Resident>('/residents', data);
  },

  update: async (residentId: string, data: ResidentUpdate): Promise<Resident> => {
    return apiClient.patch<Resident>(`/residents/${residentId}`, data);
  },

  delete: async (residentId: string): Promise<void> => {
    return apiClient.delete<void>(`/residents/${residentId}`);
  },
};
