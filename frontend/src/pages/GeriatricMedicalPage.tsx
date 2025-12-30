import { useMemo, useEffect, useState } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { PatientList } from '../components/medical/PatientList';
import { DoctorBanner } from '../components/dashboard/DoctorBanner';
import { DaySummaryCards } from '../components/dashboard/DaySummaryCards';
import { getRandomMedicalQuote } from '../data/medicalQuotes';
import { useAuth } from '../contexts/AuthContext';

export default function GeriatricMedicalPage() {
  const { id } = useParams();
  const location = useLocation();
  const facilityId = useMemo(() => id ?? '', [id]);
  const { getMemberships, activeFacilityId, user } = useAuth();
  const memberships = getMemberships();
  const activeMembership = memberships.find(m => m.facility_id === (activeFacilityId ?? facilityId) && m.is_active);
  const facilityName = activeMembership?.facility_name ?? facilityId;
  
  // Frase médica rotativa - cambia cada vez que se navega al dashboard
  const [medicalQuote, setMedicalQuote] = useState(getRandomMedicalQuote());
  
  useEffect(() => {
    // Recalcular quote cuando se navega a esta ruta
    if (location.pathname.includes(`/g/${facilityId}/medical`)) {
      setMedicalQuote(getRandomMedicalQuote());
    }
  }, [location.pathname, facilityId]);

  const navigate = useNavigate();

  const handleQuickAction = (action: string) => {
    if (action === 'certificaciones') {
      navigate(`/g/${facilityId}/certificates`);
    } else if (action === 'carpeta-medica') {
      navigate('/medical-folder/search');
    } else if (action === 'historia-clinica') {
      navigate('/clinical-history/search');
    } else if (action === 'historial-recetas') {
      navigate('/prescriptions-history/search');
    }
  };

  return (
    <div className="min-h-screen" style={{ background: 'var(--facility-bg, #f9fafb)' }}>
      <div 
        className="p-4 md:p-8 relative"
        style={{ background: 'var(--facility-bg, #f9fafb)' }}
      >
        {/* Overlay violeta suave para módulo médico */}
        <div 
          className="absolute inset-0 pointer-events-none"
          style={{
            background: 'linear-gradient(135deg, rgba(102, 126, 234, 0.05) 0%, rgba(118, 75, 162, 0.05) 100%)',
          }}
        />
        
        <div className="max-w-6xl mx-auto relative z-10">
          {/* Banner con saludo y frase médica */}
          <DoctorBanner
            userName={user?.full_name}
            facilityName={facilityName}
            medicalQuote={medicalQuote}
          />

          {/* Resumen del día */}
          <DaySummaryCards
            facilityName={facilityName}
            date={new Date().toISOString().split('T')[0]}
            stats={undefined} // Por ahora undefined, se puede agregar cuando esté el endpoint
          />

          {/* Quick Actions */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
            {/* Carpeta Médica */}
            <button
              onClick={() => handleQuickAction('carpeta-medica')}
              className="group relative rounded-xl shadow-lg p-6 text-left hover:shadow-xl transition-all duration-300 transform hover:scale-105 border border-gray-200"
              style={{ backgroundColor: 'var(--facility-card, white)' }}
            >
              <div className="text-4xl mb-3">📁</div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Carpeta Médica</h3>
              <p className="text-sm text-gray-600">
                Acceder a carpetas médicas de pacientes
              </p>
            </button>

            {/* Historia Clínica */}
            <button
              onClick={() => handleQuickAction('historia-clinica')}
              className="group relative rounded-xl shadow-lg p-6 text-left hover:shadow-xl transition-all duration-300 transform hover:scale-105 border border-gray-200"
              style={{ backgroundColor: 'var(--facility-card, white)' }}
            >
              <div className="text-4xl mb-3">📋</div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Historia Clínica</h3>
              <p className="text-sm text-gray-600">
                Ver y gestionar historias clínicas
              </p>
            </button>

            {/* Historial de Recetas */}
            <button
              onClick={() => handleQuickAction('historial-recetas')}
              className="group relative rounded-xl shadow-lg p-6 text-left hover:shadow-xl transition-all duration-300 transform hover:scale-105 border border-gray-200"
              style={{ backgroundColor: 'var(--facility-card, white)' }}
            >
              <div className="text-4xl mb-3">💊</div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Historial de Recetas</h3>
              <p className="text-sm text-gray-600">
                Consultar historial de recetas (sin emitir)
              </p>
            </button>

            {/* Certificaciones */}
            <button
              onClick={() => handleQuickAction('certificaciones')}
              className="group relative rounded-xl shadow-lg p-6 text-left hover:shadow-xl transition-all duration-300 transform hover:scale-105 border border-gray-200"
              style={{ backgroundColor: 'var(--facility-card, white)' }}
            >
              <div className="text-4xl mb-3">📜</div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Certificaciones</h3>
              <p className="text-sm text-gray-600">
                Gestionar certificaciones médicas
              </p>
            </button>
          </div>


          {/* Sección Pacientes */}
          <div className="mt-8">
            <PatientList facilityId={facilityId} />
          </div>
        </div>
      </div>
    </div>
  );
}
