import React, { useState } from 'react';
import { useParams } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { MEDICAL_LINKS } from '../config/medicalLinks';

export const GeriatricMedicalPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const { user, getActiveMembership } = useAuth();
  const activeMembership = getActiveMembership();
  const [searchQuery, setSearchQuery] = useState('');

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    // TODO: Implementar búsqueda de pacientes
    console.log('Buscar paciente:', searchQuery);
  };

  const handleQuickAction = (action: string) => {
    // TODO: Implementar acciones rápidas
    console.log('Acción rápida:', action);
  };

  return (
    <div className="min-h-screen bg-gray-50 p-4 md:p-8">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="bg-white rounded-lg shadow mb-6 p-6">
          <h1 className="text-2xl font-bold text-gray-900 mb-2">
            Módulo Médico
          </h1>
          <p className="text-gray-600">
            {activeMembership?.facility_name || `Geriátrico ${id}`}
          </p>
          <p className="text-sm text-gray-500 mt-1">Usuario: {user?.full_name}</p>
        </div>

        {/* Search Bar */}
        <div className="bg-white rounded-lg shadow mb-6 p-6">
          <form onSubmit={handleSearch} className="flex gap-4">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Buscar paciente por DNI o nombre..."
              className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <button
              type="submit"
              className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              Buscar
            </button>
          </form>
          <p className="text-xs text-gray-500 mt-2">
            Funcionalidad de búsqueda pendiente de implementar
          </p>
        </div>

        {/* Quick Actions */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
          {/* Carpeta Médica */}
          <button
            onClick={() => handleQuickAction('carpeta-medica')}
            className="bg-white rounded-lg shadow p-6 text-left hover:shadow-md transition-shadow border border-gray-200"
          >
            <div className="text-blue-600 text-2xl mb-2">📁</div>
            <h3 className="font-semibold text-gray-900 mb-1">Carpeta Médica</h3>
            <p className="text-sm text-gray-600">
              Acceder a carpetas médicas de pacientes
            </p>
          </button>

          {/* Historia Clínica */}
          <button
            onClick={() => handleQuickAction('historia-clinica')}
            className="bg-white rounded-lg shadow p-6 text-left hover:shadow-md transition-shadow border border-gray-200"
          >
            <div className="text-green-600 text-2xl mb-2">📋</div>
            <h3 className="font-semibold text-gray-900 mb-1">Historia Clínica</h3>
            <p className="text-sm text-gray-600">
              Ver y gestionar historias clínicas
            </p>
          </button>

          {/* Historial de Recetas */}
          <button
            onClick={() => handleQuickAction('historial-recetas')}
            className="bg-white rounded-lg shadow p-6 text-left hover:shadow-md transition-shadow border border-gray-200"
          >
            <div className="text-purple-600 text-2xl mb-2">💊</div>
            <h3 className="font-semibold text-gray-900 mb-1">Historial de Recetas</h3>
            <p className="text-sm text-gray-600">
              Consultar historial de recetas (sin emitir)
            </p>
          </button>

          {/* Certificaciones */}
          <button
            onClick={() => handleQuickAction('certificaciones')}
            className="bg-white rounded-lg shadow p-6 text-left hover:shadow-md transition-shadow border border-gray-200"
          >
            <div className="text-orange-600 text-2xl mb-2">📜</div>
            <h3 className="font-semibold text-gray-900 mb-1">Certificaciones</h3>
            <p className="text-sm text-gray-600">
              Gestionar certificaciones médicas
            </p>
          </button>

          {/* Recetar (Externo) */}
          <div className="bg-white rounded-lg shadow p-6 border border-gray-200">
            <div className="text-red-600 text-2xl mb-2">🔗</div>
            <h3 className="font-semibold text-gray-900 mb-3">Recetar (Externo)</h3>
            <div className="space-y-2">
              {MEDICAL_LINKS.map((link) => (
                <a
                  key={link.name}
                  href={link.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="block px-4 py-2 bg-gray-100 hover:bg-gray-200 rounded text-sm text-gray-700 transition-colors"
                >
                  {link.name} →
                </a>
              ))}
            </div>
            <p className="text-xs text-gray-500 mt-3">
              Links externos para emitir recetas
            </p>
          </div>
        </div>

        {/* Placeholder Info */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <p className="text-blue-900 text-sm">
            <strong>Nota:</strong> Este es un módulo médico MVP. Las funcionalidades completas 
            (búsqueda de pacientes, carpetas médicas, historias clínicas, etc.) están pendientes 
            de implementar en próximas iteraciones.
          </p>
        </div>
      </div>
    </div>
  );
};
