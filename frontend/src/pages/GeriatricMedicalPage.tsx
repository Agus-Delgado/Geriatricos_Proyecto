import React from 'react';
import { useParams } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { MEDICAL_LINKS } from '../config/medicalLinks';
import { PatientList } from '../components/medical/PatientList';

export const GeriatricMedicalPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const { user, getActiveMembership } = useAuth();
  const activeMembership = getActiveMembership();

  const handleQuickAction = (action: string) => {
    // TODO: Implementar acciones rápidas
    console.log('Acción rápida:', action);
  };

  return (
    <div 
      className="min-h-screen p-4 md:p-8 relative"
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
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 mb-2">
                Módulo Médico
              </h1>
              <div className="flex items-center gap-2 text-sm text-gray-600">
                <span>{activeMembership?.facility_name || `Geriátrico ${id}`}</span>
                <span>•</span>
                <span>{user?.full_name}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-6">
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

          {/* Recetar (Externo) */}
          <div 
            className="rounded-xl shadow-lg p-6 border border-gray-200"
            style={{ backgroundColor: 'var(--facility-card, white)' }}
          >
            <div className="text-4xl mb-3">🔗</div>
            <h3 className="text-lg font-semibold text-gray-900 mb-3">Recetar (Externo)</h3>
            <div className="space-y-2">
              {MEDICAL_LINKS.map((link) => (
                <a
                  key={link.label}
                  href={link.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="block px-4 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg text-sm text-gray-700 transition-colors font-medium"
                >
                  {link.label} →
                </a>
              ))}
            </div>
            <p className="text-xs text-gray-500 mt-3">
              Links externos para emitir recetas
            </p>
          </div>
        </div>

        {/* Sección Pacientes */}
        {id && (
          <div className="mt-8">
            <PatientList facilityId={id} />
          </div>
        )}
      </div>
    </div>
  );
};
