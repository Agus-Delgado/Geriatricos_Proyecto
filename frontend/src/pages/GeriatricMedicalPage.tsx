import { useMemo } from 'react';
import { useParams } from 'react-router-dom';
import { PatientList } from '../components/medical/PatientList';
import { MEDICAL_LINKS } from '../config/medicalLinks';
import { useAuth } from '../contexts/AuthContext';

export default function GeriatricMedicalPage() {
  const { id } = useParams();
  const facilityId = useMemo(() => id ?? '', [id]);
  const { getMemberships, activeFacilityId, user } = useAuth();
  const memberships = getMemberships();
  const activeMembership = memberships.find(m => m.facility_id === (activeFacilityId ?? facilityId) && m.is_active);
  const facilityName = activeMembership?.facility_name ?? facilityId;

  const handleQuickAction = (action: string) => {
    // TODO: Implementar acciones rápidas
    console.log('Acción rápida:', action);
    // Por ahora solo log, en el futuro navegar a rutas específicas
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
          {/* Hero superior */}
          <div 
            className="rounded-2xl shadow-lg mb-6 p-8"
            style={{ backgroundColor: 'var(--facility-card, white)' }}
          >
            <h1 className="text-3xl font-bold text-gray-900 mb-2">Módulo Médico</h1>
            <div className="flex items-center gap-2 text-sm text-gray-600">
              <span>{facilityName}</span>
              <span>•</span>
              <span>{user?.full_name}</span>
            </div>
          </div>

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

          {/* Recetar (Externo) */}
          <div 
            className="rounded-xl shadow-lg p-6 mb-6 border border-gray-200"
            style={{ backgroundColor: 'var(--facility-card, white)' }}
          >
            <div className="flex items-center gap-3 mb-4">
              <div className="text-3xl">🔗</div>
              <div>
                <h3 className="text-lg font-semibold text-gray-900">Recetar (Externo)</h3>
                <p className="text-sm text-gray-600">Links externos para emitir recetas</p>
              </div>
            </div>
            <div className="space-y-2">
              {MEDICAL_LINKS.map((link) => {
                const isInvalid = !link.isValid;
                return (
                  <div key={link.label}>
                    <a
                      href={link.isValid ? link.url : '#'}
                      target={link.isValid ? '_blank' : undefined}
                      rel={link.isValid ? 'noopener noreferrer' : undefined}
                      onClick={(e) => {
                        if (!link.isValid) {
                          e.preventDefault();
                        }
                      }}
                      className={`block px-4 py-3 rounded-lg text-sm font-medium transition-colors ${
                        link.isValid
                          ? 'bg-gray-100 hover:bg-gray-200 text-gray-700 cursor-pointer'
                          : 'bg-gray-50 text-gray-400 cursor-not-allowed'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span>{link.label} {link.isValid && '→'}</span>
                        {isInvalid && (
                          <span className="text-xs text-orange-600">
                            Configurar {link.envVar}
                          </span>
                        )}
                      </div>
                    </a>
                    {isInvalid && (
                      <p className="text-xs text-orange-600 mt-1 ml-4">
                        Link {link.label} pendiente de configuración ({link.envVar})
                      </p>
                    )}
                  </div>
                );
              })}
            </div>
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
