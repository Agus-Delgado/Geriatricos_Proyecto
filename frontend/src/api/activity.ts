import { apiClient } from './client';
import type { ActivityEvent } from '../types/activity';

export const activityApi = {
  list: async (
    facilityId: string,
    params?: { since?: string; limit?: number; event_types?: string[] }
  ): Promise<ActivityEvent[]> => {
    const sp = new URLSearchParams({ facility_id: facilityId });
    if (params?.since) sp.append('since', params.since);
    if (params?.limit) sp.append('limit', String(params.limit));
    if (params?.event_types) params.event_types.forEach((t) => sp.append('event_types', t));
    return apiClient.get<ActivityEvent[]>(`/activity?${sp.toString()}`);
  },
};
