import { apiClient } from './client';
import type { LoginRequest, TokenResponse, User, SetActiveFacilityRequest } from '../types/auth';

export const authApi = {
  login: async (credentials: LoginRequest): Promise<TokenResponse> => {
    return apiClient.post<TokenResponse>('/auth/login', credentials);
  },

  getCurrentUser: async (): Promise<User> => {
    return apiClient.get<User>('/auth/me');
  },

  setActiveFacility: async (request: SetActiveFacilityRequest): Promise<{ active_facility_id: string }> => {
    return apiClient.post<{ active_facility_id: string }>('/auth/active-facility', request);
  },
};
