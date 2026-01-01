import { useEffect, useState } from 'react';
import { activityApi } from '../api/activity';
import { useFacility } from '../contexts/FacilityContext';
import type { ActivityEvent } from '../types/activity';
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

const FACILITY_THEMES: Record<string, { primaryColor: string; bgLight: string; textDark: string; textMuted: string }> = {
  amanecer: {
    primaryColor: '#f97316',
    bgLight: '#fff7ed',
    textDark: '#7c2d12',
    textMuted: '#a16207',
  },
  trebol: {
    primaryColor: '#22c55e',
    bgLight: '#f0fdf4',
    textDark: '#14532d',
    textMuted: '#166534',
  },
  estaciones: {
    primaryColor: '#3b82f6',
    bgLight: '#eff6ff',
    textDark: '#1e3a8a',
    textMuted: '#2563eb',
  },
  luz: {
    primaryColor: '#3b82f6',
    bgLight: '#eff6ff',
    textDark: '#1e3a8a',
    textMuted: '#2563eb',
  },
  estrella: {
    primaryColor: '#3b82f6',
    bgLight: '#eff6ff',
    textDark: '#1e3a8a',
    textMuted: '#2563eb',
  },
  default: {
    primaryColor: '#2563eb',
    bgLight: '#f9fafb',
    textDark: '#1e293b',
    textMuted: '#64748b',
  },
};

function normalizeFacilityName(name?: string): string {
  if (!name) return 'default';
  return name
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toLowerCase();
}

function resolveThemeKey(name?: string): string {
  const n = normalizeFacilityName(name);
  if (n.includes('amanecer')) return 'amanecer';
  if (n.includes('trebol')) return 'trebol';
  if (n.includes('estaciones')) return 'estaciones';
  if (n.includes('luz')) return 'luz';
  if (n.includes('estrella')) return 'estrella';
  return 'default';
}

export default function ActivityFeedPage() {
  const { facility } = useFacility();
  // Derivar clave de theme: usar name, si no id, si no default
  const themeKey = resolveThemeKey(facility?.name);
  const theme = FACILITY_THEMES[themeKey] || FACILITY_THEMES['default'];
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
      const residentId = (ev.metadata as any)?.resident_id;
      window.location.assign(`/residents/${residentId ?? ev.entity_id}?tab=medications`);
    }
    // Si no hay ruta asociada, no navegar
  };

  return (
    <div style={{ background: theme.bgLight, minHeight: '100vh', width: '100%', boxSizing: 'border-box' }}>
      <div style={{ maxWidth: 900, margin: '0 auto', padding: '40px 30px 80px 30px' }}>
        <div className="flex items-center mb-8">
          <button className="mr-3 text-lg" style={{ color: theme.primaryColor }} onClick={() => navigate(-1)} aria-label="Volver">←</button>
          <h1 className="text-3xl font-bold flex items-center" style={{ color: theme.primaryColor }}>
            <span style={{ fontSize: 32, marginRight: 10 }}>📰</span>Noticias diarias
          </h1>
        </div>
        <div className="flex gap-3 mb-8 flex-wrap">
          {EVENT_TYPES.map(({ type, label }) => (
            <label key={type} style={{
              display: 'flex', alignItems: 'center', gap: 8, fontWeight: 500, fontSize: 16,
              background: '#fff', border: `2px solid ${selectedTypes.includes(type) ? theme.primaryColor : '#e5e7eb'}`,
              borderRadius: 8, padding: '7px 18px', cursor: 'pointer', boxShadow: selectedTypes.includes(type) ? '0 2px 8px #0001' : 'none',
              color: selectedTypes.includes(type) ? theme.primaryColor : theme.textDark,
              transition: 'border 0.2s, color 0.2s',
            }}>
              <input
                type="checkbox"
                checked={selectedTypes.includes(type)}
                onChange={() => toggleType(type)}
                style={{ accentColor: theme.primaryColor, width: 18, height: 18, marginRight: 8 }}
              />
              {label}
            </label>
          ))}
        </div>
        {error && (
          <div style={{ background: '#fef9c3', borderLeft: '4px solid #facc15', color: '#92400e', padding: 18, borderRadius: 8, marginBottom: 30, maxWidth: 500, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span>{error}</span>
            <button style={{ marginLeft: 18, padding: '7px 18px', background: '#fde68a', color: '#92400e', borderRadius: 6, fontWeight: 500, border: 'none', cursor: 'pointer' }} onClick={() => setRetry(r => r + 1)}>Reintentar</button>
          </div>
        )}
        {loading ? (
          <div style={{ color: theme.textMuted, fontSize: 18, textAlign: 'center', margin: '40px 0' }}>Cargando...</div>
        ) : events.length === 0 ? (
          <div style={{ color: theme.textMuted, fontSize: 20, textAlign: 'center', margin: '60px 0' }}>Sin novedades recientes</div>
        ) : (
          <ul style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
            {events.map((ev) => (
              <li
                key={ev.id}
                style={{
                  background: '#fff', boxShadow: '0 2px 8px #0001', borderRadius: 6,
                  borderLeft: `4px solid ${theme.primaryColor}`,
                  padding: '18px 22px', maxWidth: 700, margin: '0 auto', cursor: ev.entity_id ? 'pointer' : 'default',
                  transition: 'box-shadow 0.2s',
                }}
                onClick={() => ev.entity_id && (ev.entity_type === 'Resident' || ev.entity_type === 'Patient' || ev.entity_type === 'MedicationPlan' || ev.entity_type === 'MedicationAdministration') && navigateToEntity(ev)}
              >
                <div style={{ fontWeight: 600, fontSize: 18, color: theme.primaryColor }}>{EVENT_LABELS[ev.event_type] || ev.event_type}</div>
                <div style={{ fontSize: 15, color: theme.textDark, marginTop: 2 }}>{ev.summary || `${ev.entity_type} ${ev.entity_id}`}</div>
                <div style={{ fontSize: 13, color: theme.textMuted, marginTop: 6 }}>{new Date(ev.created_at).toLocaleString('es-AR')}</div>
              </li>
            ))}
          </ul>
        )}
      </div>
      {/* BottomNav eliminado para esta página */}
    </div>
  );
}

