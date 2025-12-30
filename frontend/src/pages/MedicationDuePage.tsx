import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useFacility } from '../contexts/FacilityContext';
import { medicationsApi } from '../api/medications';
import { BottomNav } from '../components/layout/BottomNav';
import { Input } from '../components/ui/Input';
import { Button } from '../components/ui/Button';
import { LoadingSpinner } from '../components/ui/LoadingSpinner';
import { ErrorMessage } from '../components/ui/ErrorMessage';
import { Modal } from '../components/ui/Modal';
import type { MedicationDue, MedicationAdministrationCreate } from '../types/medications';
import type { ApiError } from '../api/client';

export const MedicationDuePage: React.FC = () => {
  const [medications, setMedications] = useState<MedicationDue[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [showAdminModal, setShowAdminModal] = useState(false);
  const [selectedMedication, setSelectedMedication] = useState<MedicationDue | null>(null);
  const [adminStatus, setAdminStatus] = useState('GIVEN');
  const [adminNotes, setAdminNotes] = useState('');
  const [adminning, setAdminning] = useState(false);
  const { facility } = useFacility();
  const navigate = useNavigate();

  useEffect(() => {
    if (facility) {
      loadMedications();
    }
  }, [facility, date]);

  const loadMedications = async () => {
    if (!facility) return;

    try {
      setLoading(true);
      setError(null);
      const data = await medicationsApi.getMedicationDue(facility.id, date);
      setMedications(data);
    } catch (err) {
      const apiError = err as ApiError;
      setError(apiError.detail || 'Error al cargar medicaciones');
    } finally {
      setLoading(false);
    }
  };

  const handleAdminister = async () => {
    if (!selectedMedication || !facility) return;

    try {
      setAdminning(true);
      const now = new Date().toISOString();
      const adminData: MedicationAdministrationCreate = {
        medication_plan_id: selectedMedication.medication_plan_id,
        scheduled_time: selectedMedication.scheduled_time,
        administered_at: now,
        status: adminStatus,
        notes: adminNotes || undefined,
      };

      // Necesitamos el resident_id, lo obtenemos del selectedMedication
      await medicationsApi.createAdministration(
        selectedMedication.resident_id,
        adminData
      );

      setShowAdminModal(false);
      setSelectedMedication(null);
      setAdminStatus('GIVEN');
      setAdminNotes('');
      loadMedications();
    } catch (err) {
      const apiError = err as ApiError;
      alert(apiError.detail || 'Error al registrar administración');
    } finally {
      setAdminning(false);
    }
  };

  const getStatusLabel = (status: string | null) => {
    if (!status) return 'Pendiente';
    const labels: Record<string, string> = {
      GIVEN: 'Administrada',
      MISSED: 'Perdida',
      REFUSED: 'Rechazada',
    };
    return labels[status] || status;
  };

  const getStatusColor = (status: string | null) => {
    if (!status) return 'bg-yellow-100 text-yellow-800';
    const colors: Record<string, string> = {
      GIVEN: 'bg-green-100 text-green-800',
      MISSED: 'bg-red-100 text-red-800',
      REFUSED: 'bg-orange-100 text-orange-800',
    };
    return colors[status] || 'bg-gray-100 text-gray-800';
  };

  const pendingMedications = medications.filter((m) => !m.status);
  const completedMedications = medications.filter((m) => m.status);

  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      <div className="px-4 py-4 space-y-4">
        <Input
          label="Fecha"
          type="date"
          value={date}
          onChange={(e) => setDate(e.target.value)}
        />

        {error && (
          <ErrorMessage message={error} onDismiss={() => setError(null)} />
        )}

        {loading ? (
          <div className="flex justify-center py-8">
            <LoadingSpinner />
          </div>
        ) : (
          <>
            {pendingMedications.length > 0 && (
              <div>
                <h3 className="font-semibold text-gray-900 mb-3">
                  Pendientes ({pendingMedications.length})
                </h3>
                <div className="space-y-3">
                  {pendingMedications.map((med, index) => (
                    <div key={index} className="card">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <button
                            onClick={() => navigate(`/residents/${med.resident_id}`)}
                            className="text-left"
                          >
                            <h4 className="font-semibold text-primary-600 hover:underline">
                              {med.resident_name}
                            </h4>
                          </button>
                          <p className="text-sm text-gray-900 mt-1">
                            {med.medication_name} - {med.dosage}
                          </p>
                          <p className="text-sm text-gray-600 mt-1">
                            Horario: {med.scheduled_time}
                          </p>
                        </div>
                        <Button
                          onClick={() => {
                            setSelectedMedication(med);
                            setShowAdminModal(true);
                          }}
                        >
                          Registrar
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {completedMedications.length > 0 && (
              <div>
                <h3 className="font-semibold text-gray-900 mb-3">
                  Completadas ({completedMedications.length})
                </h3>
                <div className="space-y-3">
                  {completedMedications.map((med, index) => (
                    <div key={index} className="card opacity-75">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <button
                            onClick={() => navigate(`/residents/${med.resident_id}`)}
                            className="text-left"
                          >
                            <h4 className="font-semibold text-gray-600 hover:underline">
                              {med.resident_name}
                            </h4>
                          </button>
                          <p className="text-sm text-gray-900 mt-1">
                            {med.medication_name} - {med.dosage}
                          </p>
                          <p className="text-sm text-gray-600 mt-1">
                            Horario: {med.scheduled_time}
                          </p>
                          <span
                            className={`inline-block mt-2 px-2 py-1 text-xs rounded ${getStatusColor(
                              med.status
                            )}`}
                          >
                            {getStatusLabel(med.status)}
                          </span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {medications.length === 0 && (
              <div className="text-center text-gray-500 py-8">
                No hay medicaciones programadas para esta fecha
              </div>
            )}
          </>
        )}
      </div>

      <Modal
        isOpen={showAdminModal}
        onClose={() => {
          setShowAdminModal(false);
          setSelectedMedication(null);
          setAdminStatus('GIVEN');
          setAdminNotes('');
        }}
        title="Registrar Administración"
      >
        <div className="space-y-4">
          {selectedMedication && (
            <>
              <div>
                <p className="text-sm text-gray-600">Residente:</p>
                <p className="font-medium">{selectedMedication.resident_name}</p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Medicación:</p>
                <p className="font-medium">
                  {selectedMedication.medication_name} - {selectedMedication.dosage}
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Horario programado:</p>
                <p className="font-medium">{selectedMedication.scheduled_time}</p>
              </div>
            </>
          )}

          <div>
            <label className="label">Estado *</label>
            <select
              value={adminStatus}
              onChange={(e) => setAdminStatus(e.target.value)}
              className="input-field"
            >
              <option value="GIVEN">Administrada</option>
              <option value="MISSED">Perdida</option>
              <option value="REFUSED">Rechazada</option>
            </select>
          </div>

          <div>
            <label className="label">Notas</label>
            <textarea
              value={adminNotes}
              onChange={(e) => setAdminNotes(e.target.value)}
              className="input-field"
              rows={3}
            />
          </div>

          <div className="flex space-x-3 pt-4">
            <Button
              variant="secondary"
              onClick={() => {
                setShowAdminModal(false);
                setSelectedMedication(null);
                setAdminStatus('GIVEN');
                setAdminNotes('');
              }}
              fullWidth
              disabled={adminning}
            >
              Cancelar
            </Button>
            <Button onClick={handleAdminister} fullWidth disabled={adminning}>
              {adminning ? 'Guardando...' : 'Registrar'}
            </Button>
          </div>
        </div>
      </Modal>

      <BottomNav />
    </div>
  );
};
