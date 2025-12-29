import { apiClient } from './client';
import type { 
  LoginRequest, TokenResponse, User, SetActiveFacilityRequest,
  RegisterRequest, RegisterResponse, VerifyEmailRequest, VerifyEmailResponse,
  ResendVerificationRequest, ResendVerificationResponse
} from '../types/auth';

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

  register: async (data: RegisterRequest): Promise<RegisterResponse> => {
    return apiClient.post<RegisterResponse>('/auth/register', data);
  },

  verifyEmail: async (token: string): Promise<VerifyEmailResponse> => {
    return apiClient.post<VerifyEmailResponse>('/auth/verify-email', { token });
  },

  resendVerification: async (emailOrDni: string): Promise<ResendVerificationResponse> => {
    return apiClient.post<ResendVerificationResponse>('/auth/resend-verification', { 
      email_or_dni: emailOrDni 
    });
  },
};
