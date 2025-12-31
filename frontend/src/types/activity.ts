export interface ActivityEvent {
  id: string;
  facility_id: string;
  actor_user_id: string;
  event_type: string;
  entity_type: string;
  entity_id: string;
  summary?: string | null;
  meta?: any;
  created_at: string;
}
