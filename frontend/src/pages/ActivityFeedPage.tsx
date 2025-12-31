import { useEffect, useState } from 'react';
import { activityApi } from '../api/activity';
import { useFacility } from '../contexts/FacilityContext';
import type { ActivityEvent } from '../types/activity';
import { BottomNav } from '../components/layout/BottomNav';
import { useNavigate } from 'react-router-dom';

const EVENT_LABELS: Record<string, string> = {
  PATIENT_CREATED: 'Alta de paciente',
  PATIENT_UPDATED: 'Edición de paciente',
  PATIENT_STATUS_CHANGED: 'Cambio de estado',
  MEDICATION_CHANGED: 'Cambio de medicación',
};

export default function ActivityFeedPage() {
  const { facility } = useFacility();
  const navigate = useNavigate();
  const [events, setEvents] = useState<ActivityEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedTypes, setSelectedTypes] = useState<string[]>([]);

  useEffect(() => {
    const load = async () => {
      if (!facility) return;
      try {
        setLoading(true);
        setError(null);
        const data = await activityApi.list(facility.id, {
          limit: 100,
          event_types: selectedTypes.length > 0 ? selectedTypes : undefined,
        });
        setEvents(data);
      } catch (e: any) {
        if (e?.response?.status === 401 || e?.response?.status === 403) {
          setError('No autorizado para ver actividades');
        } else if (e?.response?.status === 404) {
          setError('No disponible');
        } else {
          setError('Error al cargar actividades');
        }
      } finally {
        setLoading(false);
      }
    };
    void load();
  }, [facility?.id, selectedTypes]);

  const toggleType = (t: string) => {
    setSelectedTypes((prev) => (prev.includes(t) ? prev.filter((x) => x !== t) : [...prev, t]));
  };

  const navigateToEntity = (ev: ActivityEvent) => {
    if (!ev.entity_id) return;
    if (ev.entity_type === 'Resident') {
      window.location.assign(`/residents/${ev.entity_id}`);
    } else if (ev.entity_type === 'MedicationPlan' || ev.entity_type === 'MedicationAdministration') {
      window.location.assign(`/residents/${ev.metadata?.resident_id ?? ev.entity_id}?tab=medications`);
    }
    // Si no hay ruta asociada, no navegar
  };

  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      <div className="px-4 py-4">
        <div className="flex items-center mb-4">
          <button className="mr-2 text-primary-600 hover:underline text-lg" onClick={() => navigate(-1)} aria-label="Volver">←</button>
          <h1 className="text-2xl font-bold">Noticias diarias</h1>
        </div>

        <div className="flex gap-3 mb-4 flex-wrap">
          {Object.keys(EVENT_LABELS).map((t) => (
            <label key={t} className="flex items-center gap-2 text-sm">
              <input type="checkbox" checked={selectedTypes.includes(t)} onChange={() => toggleType(t)} />
              {EVENT_LABELS[t]}
            </label>
          ))}
        </div>

        {error && <div className="text-red-600 mb-4">{error}</div>}
        {loading ? (
          <div>Cargando...</div>
        ) : events.length === 0 ? (
          <div className="text-gray-500">Sin novedades recientes</div>
        ) : (
          <ul className="space-y-3">
            {events.map((ev) => (
              <li key={ev.id} className={`card hover:shadow-md transition p-4 ${ev.entity_id ? 'cursor-pointer' : 'cursor-default'}`} onClick={() => ev.entity_id && navigateToEntity(ev)}>
                <div className="flex items-center justify-between">
                  <div>
                    <div className="font-semibold">{EVENT_LABELS[ev.event_type] || ev.event_type}</div>
                    <div className="text-sm text-gray-600">{ev.summary || `${ev.entity_type} ${ev.entity_id}`}</div>
                  </div>
                  <div className="text-xs text-gray-400">{new Date(ev.created_at).toLocaleString('es-AR')}</div>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
      <BottomNav />
    </div>
  );
}

