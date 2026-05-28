import { useMemo, useEffect, useState } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { PatientList } from '../components/medical/PatientList';
import { DoctorBanner } from '../components/dashboard/DoctorBanner';
import {
  MedicalWelcomeCard,
  isMedicalWelcomeVisible,
} from '../components/medical/MedicalWelcomeCard';
import { MedicalExternalLinksPanel } from '../components/medical/MedicalExternalLinksPanel';
import { BottomNav } from '../components/layout/BottomNav';
import { getRandomMedicalQuote } from '../data/medicalQuotes';
import { getPatientsViewedCount } from '../utils/patientTracking';
import { useAuth } from '../contexts/AuthContext';

export default function GeriatricMedicalPage() {
  const { id } = useParams();
  const location = useLocation();
  const facilityId = useMemo(() => id ?? '', [id]);
  const { getMemberships, activeFacilityId, user } = useAuth();
  const memberships = getMemberships();
  const activeMembership = memberships.find(
    (m) => m.facility_id === (activeFacilityId ?? facilityId) && m.is_active
  );
  const facilityName = activeMembership?.facility_name;

  const [medicalQuote, setMedicalQuote] = useState(getRandomMedicalQuote());
  const [showWelcome, setShowWelcome] = useState(false);

  useEffect(() => {
    if (user?.id) {
      setShowWelcome(isMedicalWelcomeVisible(user.id, user.dni));
    }
  }, [user?.id, user?.dni]);
  const patientsViewedToday = useMemo(() => {
    const fid = activeFacilityId ?? facilityId;
    if (!fid) return 0;
    const today = new Date().toISOString().split('T')[0];
    return getPatientsViewedCount(fid, today);
  }, [activeFacilityId, facilityId, location.pathname]);

  useEffect(() => {
    if (location.pathname.includes(`/g/${facilityId}/medical`)) {
      setMedicalQuote(getRandomMedicalQuote());
    }
  }, [location.pathname, facilityId]);

  const navigate = useNavigate();

  const handleQuickAction = (action: string) => {
    switch (action) {
      case 'certificaciones':
        navigate(`/g/${facilityId}/certificates`);
        break;
      case 'historia-clinica':
        navigate('/clinical-history/search');
        break;
      case 'historial-recetas':
        navigate('/prescriptions-history/search');
        break;
      case 'residents':
        navigate('/residents');
        break;
      case 'medical-guide':
        navigate('/medical-guide');
        break;
      case 'carpeta-medica':
        navigate('/medical-folder/search');
        break;
      default:
        break;
    }
  };

  const quickActions = [
    {
      id: 'residents',
      emoji: '👥',
      title: 'Pacientes',
      description: 'Listar, crear y editar pacientes',
      action: 'residents',
    },
    {
      id: 'historia-clinica',
      emoji: '📋',
      title: 'Historia clínica',
      description: 'Evoluciones y resumen clínico',
      action: 'historia-clinica',
    },
    {
      id: 'historial-recetas',
      emoji: '💊',
      title: 'Indicaciones guardadas',
      description: 'Registrar y consultar indicaciones medicamentosas',
      action: 'historial-recetas',
    },
    {
      id: 'certificaciones',
      emoji: '📜',
      title: 'Certificados',
      description: 'Constancias y certificados del paciente',
      action: 'certificaciones',
    },
    {
      id: 'carpeta-medica',
      emoji: '📁',
      title: 'Carpeta médica',
      description: 'Vista integrada del paciente',
      action: 'carpeta-medica',
    },
    {
      id: 'medical-guide',
      emoji: '🔍',
      title: 'Guía médica',
      description: 'Buscar paciente y ver medicación',
      action: 'medical-guide',
    },
  ];

  return (
    <div className="min-h-screen pb-20" style={{ background: 'var(--facility-bg, #f9fafb)' }}>
      <div className="p-4 md:p-8 relative" style={{ background: 'var(--facility-bg, #f9fafb)' }}>
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            background:
              'linear-gradient(135deg, rgba(102, 126, 234, 0.05) 0%, rgba(118, 75, 162, 0.05) 100%)',
          }}
        />

        <div className="max-w-6xl mx-auto relative z-10">
          <DoctorBanner
            userName={user?.full_name}
            facilityName={facilityName}
            medicalQuote={medicalQuote}
            medicalMode
          />

          {showWelcome && user?.id && (
            <MedicalWelcomeCard
              userId={user.id}
              dni={user.dni}
              onDismiss={() => setShowWelcome(false)}
            />
          )}

          {patientsViewedToday > 0 && (
            <p className="text-sm text-gray-600 mb-4 rounded-lg bg-white/80 shadow px-4 py-3 border border-gray-100">
              Pacientes vistos hoy: {patientsViewedToday}
            </p>
          )}

          <MedicalExternalLinksPanel />

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
            {quickActions.map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => handleQuickAction(item.action)}
                className="group relative rounded-xl shadow-lg p-6 text-left hover:shadow-xl transition-all duration-300 border border-gray-200"
                style={{ backgroundColor: 'var(--facility-card, white)' }}
              >
                <div className="text-4xl mb-3">{item.emoji}</div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">{item.title}</h3>
                <p className="text-sm text-gray-600">{item.description}</p>
              </button>
            ))}
          </div>

          <div className="mt-8">
            <h2 className="text-lg font-semibold text-gray-900 mb-3">Pacientes recientes</h2>
            <PatientList facilityId={facilityId} />
          </div>
        </div>
      </div>
      <BottomNav />
    </div>
  );
}
