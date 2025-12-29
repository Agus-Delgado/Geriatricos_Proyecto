import { useMemo } from 'react';
import { useParams } from 'react-router-dom';
import { PatientList } from '../components/medical/PatientList';
import { MEDICAL_LINKS } from '../config/medicalLinks';
import { useAuth } from '../contexts/AuthContext';

export default function GeriatricMedicalPage() {
  const { id } = useParams();
  const facilityId = useMemo(() => id ?? '', [id]);
  const { getMemberships, activeFacilityId } = useAuth();
  const memberships = getMemberships();
  const activeMembership = memberships.find(m => m.facility_id === (activeFacilityId ?? facilityId) && m.is_active);
  const facilityName = activeMembership?.facility_name ?? facilityId;

  return (
    <div style={{ padding: 24 }}>
      <div
        style={{
          borderRadius: 16,
          padding: 24,
          background: 'rgba(102, 126, 234, 0.12)',
          boxShadow: '0 10px 30px rgba(0,0,0,0.08)',
        }}
      >
        <h1 style={{ margin: 0 }}>Módulo Médico</h1>
        <p style={{ marginTop: 8, opacity: 0.8 }}>
          Hogar activo: <strong>{facilityName}</strong>
        </p>

        <div style={{ marginTop: 16, display: 'flex', gap: 12, flexWrap: 'wrap' }}>
          {MEDICAL_LINKS.map((l) => (
            <a
              key={l.label}
              href={l.url}
              target="_blank"
              rel="noopener noreferrer"
              style={{
                padding: '10px 14px',
                borderRadius: 12,
                background: 'var(--facility-card)',
                textDecoration: 'none',
                color: 'inherit',
                boxShadow: '0 6px 16px rgba(0,0,0,0.06)',
              }}
            >
              {l.label}
            </a>
          ))}
        </div>

        <div style={{ marginTop: 18 }}>
          <PatientList facilityId={facilityId} />
        </div>
      </div>
    </div>
  );
}
