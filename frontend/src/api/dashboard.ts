import { apiClient } from './client';
import type { DayStats } from '../types/dashboard';

export const dashboardApi = {
  getDaySummary: async (date: string): Promise<DayStats | null> => {
    try {
      return await apiClient.get<DayStats>(`/dashboard/summary?date=${date}`);
    } catch (error: any) {
      // Si el endpoint no existe o hay error, retornar null (degradación graceful)
      if (error?.status === 404 || error?.status === 500) {
        return null;
      }
      throw error;
    }
  },
};