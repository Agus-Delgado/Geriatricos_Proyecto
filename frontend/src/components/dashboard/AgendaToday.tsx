import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { agendaApi } from '../../api/agenda';
import { PatientSearchSelect } from '../patients/PatientSearchSelect';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import { LoadingSpinner } from '../ui/LoadingSpinner';
import type { AgendaEntry } from '../../types/agenda';
import type { Resident } from '../../types/residents';
import type { ApiError } from '../../api/client';

interface AgendaTodayProps {
  onRefreshStats?: () => void;
}

export const AgendaToday: React.FC<AgendaTodayProps> = ({ onRefreshStats }) => {
  const navigate = useNavigate();
  const { activeFacilityId } = useAuth();
  const [entries, setEntries] = useState<AgendaEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [addingPatient, setAddingPatient] = useState(false);

  const loadEntries = async () => {
    if (!activeFacilityId) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);
      const today = new Date().toISOString().split('T')[0];
      const data = await agendaApi.listToday(today);
      setEntries(data);
    } catch (err) {
      const apiError = err as ApiError;
      setError(apiError.detail || 'Error al cargar agenda');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadEntries();
  }, [activeFacilityId]);

  const handleAddPatient = async (patient: Resident) => {
    if (!activeFacilityId) return;

    try {
      setAddingPatient(true);
      await agendaApi.create({
        patient_id: patient.id,
        facility_id: activeFacilityId,
      });
      setShowAddModal(false);
      await loadEntries();
      // Refrescar stats si hay callback
      if (onRefreshStats) {
        onRefreshStats();
      }
    } catch (err) {
      const apiError = err as ApiError;
      alert(apiError.detail || 'Error al agregar paciente a la agenda');
    } finally {
      setAddingPatient(false);
    }
  };

  const handleQuickAction = (action: 'evolution' | 'prescription' | 'certificate' | 'notes', patientId: string) => {
    if (action === 'evolution') {
      navigate(`/clinical-history/${patientId}`);
    } else if (action === 'prescription') {
      navigate(`/prescriptions-history/${patientId}`);
    } else if (action === 'certificate') {
      // Navegar a certificados del paciente si existe la ruta
      // Por ahora, placeholder
      alert('Módulo de certificados por paciente en desarrollo');
    } else if (action === 'notes') {
      // Por ahora, placeholder - podría ser un modal para editar note de AgendaEntry
      alert('Edición de notas en desarrollo');
    }
  };

  const formatTime = (dateString: string): string => {
    return new Date(dateString).toLocaleTimeString('es-AR', {
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  if (!activeFacilityId) {
    return (
      <div
        className="rounded-xl shadow-lg p-6 mb-6"
        style={{ backgroundColor: 'var(--facility-card, white)' }}
      >
        <p className="text-gray-500 text-center">Seleccione un hogar para ver la agenda</p>
      </div>
    );
  }

  return (
    <>
      <div
        className="rounded-xl shadow-lg p-6 mb-6"
        style={{ backgroundColor: 'var(--facility-card, white)' }}
      >
        <div className="flex items-center justify-between mb-4">
          <h2
            className="text-xl font-semibold text-gray-900"
            style={{ color: 'var(--facility-accent, #667eea)' }}
          >
            Agenda de hoy
          </h2>
          <Button
            onClick={() => setShowAddModal(true)}
            style={{ backgroundColor: 'var(--facility-accent, #667eea)' }}
          >
            + Agregar paciente
          </Button>
        </div>

        {loading ? (
          <div className="flex justify-center py-8">
            <LoadingSpinner />
          </div>
        ) : error ? (
          <div className="text-center py-8 text-red-600">
            <p>{error}</p>
            <Button
              variant="secondary"
              onClick={loadEntries}
              className="mt-4"
            >
              Reintentar
            </Button>
          </div>
        ) : entries.length === 0 ? (
          <div className="text-center py-12 text-gray-500">
            <p className="text-lg font-medium mb-2">No hay pacientes en la agenda de hoy</p>
            <p className="text-sm">Agregue pacientes para comenzar a registrar atenciones</p>
          </div>
        ) : (
          <div className="space-y-3">
            {entries.map((entry) => (
              <div
                key={entry.id}
                className="bg-white border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow"
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-1">
                      <span className="text-sm font-medium text-gray-500">
                        {formatTime(entry.seen_at)}
                      </span>
                      <span className="text-base font-semibold text-gray-900">
                        {entry.patient_name || 'Paciente'}
                      </span>
                    </div>
                    {entry.note && (
                      <p className="text-sm text-gray-600 mt-1">{entry.note}</p>
                    )}
                  </div>
                </div>
                <div className="flex flex-wrap gap-2 pt-2 border-t border-gray-100">
                  <button
                    onClick={() => handleQuickAction('evolution', entry.patient_id)}
                    className="text-xs px-3 py-1.5 rounded bg-blue-100 text-blue-700 hover:bg-blue-200 transition-colors"
                    style={{ minHeight: '44px' }}
                  >
                    Evolución
                  </button>
                  <button
                    onClick={() => handleQuickAction('prescription', entry.patient_id)}
                    className="text-xs px-3 py-1.5 rounded bg-purple-100 text-purple-700 hover:bg-purple-200 transition-colors"
                    style={{ minHeight: '44px' }}
                  >
                    Receta
                  </button>
                  <button
                    onClick={() => handleQuickAction('certificate', entry.patient_id)}
                    className="text-xs px-3 py-1.5 rounded bg-green-100 text-green-700 hover:bg-green-200 transition-colors"
                    style={{ minHeight: '44px' }}
                  >
                    Certificado
                  </button>
                  <button
                    onClick={() => handleQuickAction('notes', entry.patient_id)}
                    className="text-xs px-3 py-1.5 rounded bg-gray-100 text-gray-700 hover:bg-gray-200 transition-colors"
                    style={{ minHeight: '44px' }}
                  >
                    Notas
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Modal para agregar paciente */}
      <Modal
        isOpen={showAddModal}
        onClose={() => !addingPatient && setShowAddModal(false)}
        title="Agregar paciente a agenda"
        size="lg"
      >
        <PatientSearchSelect
          onSelect={handleAddPatient}
          placeholder="Buscar paciente por DNI o nombre..."
        />
        {addingPatient && (
          <div className="mt-4 flex justify-center">
            <LoadingSpinner />
          </div>
        )}
      </Modal>
    </>
  );
};