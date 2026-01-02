import React, { useEffect, useState } from 'react';
import { activityApi } from '../../api/activity';
import { useFacility } from '../../contexts/FacilityContext';
import { useAuth } from '../../contexts/AuthContext';
import type { ActivityEvent } from '../../types/activity';
import { useNavigate } from 'react-router-dom';

const EVENT_LABELS: Record<string, string> = {
  PATIENT_CREATED: 'Alta de paciente',
  PATIENT_UPDATED: 'Edición de paciente',
  PATIENT_STATUS_CHANGED: 'Cambio de estado',
  MEDICATION_CHANGED: 'Cambio de medicación',
  CLINICAL_SUMMARY_UPDATED: 'Resumen clínico actualizado',
  CLINICAL_NOTE_CREATED: 'Nota clínica',
  INCIDENT_REPORTED: 'Incidente',
  STAFF_CREATED: 'Alta de personal',
  STAFF_UPDATED: 'Edición de personal',
  STAFF_ARCHIVED: 'Baja de personal',
  SHIFT_ASSIGNED: 'Turno asignado',
  SHIFT_UNASSIGNED: 'Turno removido',
  COVERAGE_UNDERSTAFFED: 'Cobertura insuficiente',
};

export const ActivityFeedWidget: React.FC = () => {
  const { facility } = useFacility();
  const { getActiveRole, isOwner } = useAuth();
  const [events, setEvents] = useState<ActivityEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();

  const role = getActiveRole();
  const canView = isOwner || role === 'ADMIN' || role === 'MEDICO';

  useEffect(() => {
    const load = async () => {
      if (!facility || !canView) return;
      try {
        setLoading(true);
        setError(null);
        const data = await activityApi.list(facility.id, { limit: 5 });
        setEvents(data);
      } catch (e: any) {
        if (e?.response?.status === 401 || e?.response?.status === 403) {
          setError('No autorizado para ver actividades');
        } else if (e?.response?.status === 404) {
          setError('No disponible');
        } else {
          setError('Error al cargar noticias');
        }
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [facility?.id, canView]);

  if (!canView) return null;

  return (
    <div className="rounded-lg shadow p-4 bg-white mb-6">
      <div className="flex items-center justify-between mb-2">
        <h2 className="text-lg font-semibold text-gray-900">Noticias diarias</h2>
        <button
          className="text-primary-600 hover:underline text-sm"
          onClick={() => navigate('/activity')}
        >
          Ver todas
        </button>
      </div>
      {loading ? (
        <div className="text-gray-500">Cargando...</div>
      ) : error ? (
        <div className="text-red-600">{error}</div>
      ) : events.length === 0 ? (
        <div className="text-gray-500">Sin novedades recientes</div>
      ) : (
        <ul className="divide-y divide-gray-100">
          {events.map(ev => (
            <li key={ev.id} className="py-2">
              <div className="font-medium text-gray-800">{EVENT_LABELS[ev.event_type] || ev.event_type}</div>
              <div className="text-sm text-gray-600">{ev.summary || `${ev.entity_type} ${ev.entity_id}`}</div>
              <div className="text-xs text-gray-400">{new Date(ev.created_at).toLocaleString('es-AR')}</div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};
