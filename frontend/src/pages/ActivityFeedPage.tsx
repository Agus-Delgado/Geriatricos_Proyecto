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
const EVENT_TYPES = [
  { type: 'PATIENT_CREATED', label: 'Alta de paciente' },
  { type: 'PATIENT_UPDATED', label: 'Edición de paciente' },
  { type: 'PATIENT_STATUS_CHANGED', label: 'Cambio de estado' },
  { type: 'MEDICATION_CHANGED', label: 'Cambio de medicación' },
];

export default function ActivityFeedPage() {
  const { facility } = useFacility();
  const navigate = useNavigate();
  const [events, setEvents] = useState<ActivityEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedTypes, setSelectedTypes] = useState<string[]>([]);
  const [retry, setRetry] = useState(0);

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
        } else if (e?.message) {
          setError('No se pudo cargar actividades: ' + e.message);
        } else {
          setError('Error al cargar actividades');
        }
      } finally {
        setLoading(false);
      }
    };
    void load();
  }, [facility?.id, selectedTypes, retry]);

  const toggleType = (t: string) => {
    setSelectedTypes((prev) => (prev.includes(t) ? prev.filter((x) => x !== t) : [...prev, t]));
  };

  const navigateToEntity = (ev: ActivityEvent) => {
    if (!ev.entity_id) return;
    if (ev.entity_type === 'Resident' || ev.entity_type === 'Patient') {
      window.location.assign(`/residents/${ev.entity_id}`);
    } else if (ev.entity_type === 'MedicationPlan' || ev.entity_type === 'MedicationAdministration') {
      window.location.assign(`/residents/${ev.metadata?.resident_id ?? ev.entity_id}?tab=medications`);
    }
    // Si no hay ruta asociada, no navegar
  };

  return (
    <div style={{ background: '#f9fafb', minHeight: '100vh' }}>
      <div style={{ maxWidth: 900, margin: '0 auto', padding: '32px 16px 80px 16px' }}>
        <div className="flex items-center mb-8">
          <button className="mr-3 text-primary-600 hover:underline text-lg" onClick={() => navigate(-1)} aria-label="Volver">←</button>
          <h1 className="text-3xl font-bold" style={{ color: '#1e40af' }}>Noticias diarias</h1>
        </div>
        <div className="flex gap-6 mb-8 flex-wrap">
          {EVENT_TYPES.map(({ type, label }) => (
            <label key={type} className="flex items-center gap-2 text-base font-medium">
              <input type="checkbox" checked={selectedTypes.includes(type)} onChange={() => toggleType(type)} />
              {label}
            </label>
          ))}
        </div>
        {error && (
          <div className="bg-yellow-100 border-l-4 border-yellow-500 text-yellow-800 p-4 rounded mb-6 flex items-center justify-between" style={{ maxWidth: 500 }}>
            <span>{error}</span>
            <button className="ml-4 px-3 py-1 bg-yellow-200 rounded text-yellow-900 hover:bg-yellow-300" onClick={() => setRetry(r => r + 1)}>Reintentar</button>
          </div>
        )}
        {loading ? (
          <div className="text-gray-500">Cargando...</div>
        ) : events.length === 0 ? (
          <div className="text-gray-500 text-lg font-medium py-12 text-center">Sin novedades recientes</div>
        ) : (
          <ul className="space-y-4">
            {events.map((ev) => (
              <li
                key={ev.id}
                className={`bg-white shadow-sm rounded-lg border-l-4 transition p-4 flex flex-col gap-1 ${ev.entity_id ? 'cursor-pointer border-blue-400 hover:shadow-md' : 'border-gray-200 cursor-default'}`}
                onClick={() => ev.entity_id && (ev.entity_type === 'Resident' || ev.entity_type === 'Patient' || ev.entity_type === 'MedicationPlan' || ev.entity_type === 'MedicationAdministration') && navigateToEntity(ev)}
                style={{ maxWidth: 700, margin: '0 auto' }}
              >
                <div className="font-semibold text-base" style={{ color: '#1e40af' }}>{EVENT_LABELS[ev.event_type] || ev.event_type}</div>
                <div className="text-sm text-gray-700">{ev.summary || `${ev.entity_type} ${ev.entity_id}`}</div>
                <div className="text-xs text-gray-400 mt-1">{new Date(ev.created_at).toLocaleString('es-AR')}</div>
              </li>
            ))}
          </ul>
        )}
      </div>
      <BottomNav />
    </div>
  );
}

