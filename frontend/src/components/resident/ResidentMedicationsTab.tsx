import React, { useState, useEffect } from 'react';
import { medicationsApi } from '../../api/medications';
import { Button } from '../ui/Button';
import { LoadingSpinner } from '../ui/LoadingSpinner';
import { ErrorMessage } from '../ui/ErrorMessage';
import { Modal } from '../ui/Modal';
import { ConfirmDialog } from '../ui/ConfirmDialog';
import { MedicationPlanForm } from '../forms/MedicationPlanForm';
import type { MedicationPlan } from '../../types/medications';
import type { ApiError } from '../../api/client';

interface ResidentMedicationsTabProps {
  residentId: string;
}

export const ResidentMedicationsTab: React.FC<ResidentMedicationsTabProps> = ({
  residentId,
}) => {
  const [plans, setPlans] = useState<MedicationPlan[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showTimesModal, setShowTimesModal] = useState(false);
  const [showDeleteTimeConfirm, setShowDeleteTimeConfirm] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState<MedicationPlan | null>(null);
  const [selectedTimeId, setSelectedTimeId] = useState<string | null>(null);
  const [newTime, setNewTime] = useState({ time: '', day_of_week: '' });
  const [timeError, setTimeError] = useState<string | null>(null);
  const [deletingTime, setDeletingTime] = useState(false);

  useEffect(() => {
    loadPlans();
  }, [residentId]);

  const loadPlans = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await medicationsApi.listPlans(residentId, false);
      setPlans(data);
    } catch (err) {
      const apiError = err as ApiError;
      setError(apiError.detail || 'Error al cargar planes de medicación');
    } finally {
      setLoading(false);
    }
  };

  const handleCreatePlan = async (data: any) => {
    try {
      await medicationsApi.createPlan(residentId, data);
      setShowCreateModal(false);
      loadPlans();
    } catch (err) {
      const apiError = err as ApiError;
      throw new Error(apiError.detail || 'Error al crear plan');
    }
  };

  const handleAddTime = async () => {
    if (!selectedPlan || !newTime.time) return;

    try {
      await medicationsApi.addScheduleTime(selectedPlan.id, {
        time: newTime.time,
        day_of_week: newTime.day_of_week ? parseInt(newTime.day_of_week) : null,
      });
      setShowTimesModal(false);
      setNewTime({ time: '', day_of_week: '' });
      loadPlans();
    } catch (err) {
      const apiError = err as ApiError;
      throw new Error(apiError.detail || 'Error al agregar horario');
    }
  };


  const handleDeleteTime = async () => {
    if (!selectedTimeId) return;

    try {
      setDeletingTime(true);
      await medicationsApi.deleteScheduleTime(selectedTimeId);
      setShowDeleteTimeConfirm(false);
      setSelectedTimeId(null);
      loadPlans();
    } catch (err) {
      const apiError = err as ApiError;
      setError(apiError.detail || 'Error al eliminar horario');
    } finally {
      setDeletingTime(false);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('es-AR');
  };


  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold text-gray-900">Planes de Medicación</h3>
        <Button onClick={() => setShowCreateModal(true)}>
          Nuevo Plan
        </Button>
      </div>

      {error && (
        <ErrorMessage message={error} onDismiss={() => setError(null)} />
      )}

      {loading ? (
        <div className="flex justify-center py-8">
          <LoadingSpinner />
        </div>
      ) : plans.length === 0 ? (
        <div className="text-center text-gray-500 py-8">
          No hay planes de medicación registrados
        </div>
      ) : (
        <div className="space-y-3">
          {plans.map((plan) => (
            <div key={plan.id} className="card">
              <div className="flex items-start justify-between mb-2">
                <div className="flex-1">
                  <h4 className="font-semibold text-gray-900">{plan.med_name}</h4>
                  <p className="text-sm text-gray-600 mt-1">
                    {plan.dose}
                    {plan.route && ` - Vía: ${plan.route}`}
                  </p>
                  {plan.start_date && (
                    <p className="text-xs text-gray-500 mt-1">
                      Desde: {formatDate(plan.start_date)}
                      {plan.end_date && ` - Hasta: ${formatDate(plan.end_date)}`}
                    </p>
                  )}
                  {!plan.start_date && plan.created_at && (
                    <p className="text-xs text-gray-500 mt-1">
                      Creado: {formatDate(plan.created_at)}
                    </p>
                  )}
                  <span
                    className={`inline-block mt-2 px-2 py-1 text-xs rounded ${
                      plan.is_active
                        ? 'bg-green-100 text-green-800'
                        : 'bg-gray-100 text-gray-800'
                    }`}
                  >
                    {plan.is_active ? 'Activo' : 'Inactivo'}
                  </span>
                </div>
              </div>


              {plan.instructions && (
                <p className="text-sm text-gray-600 mt-2">{plan.instructions}</p>
              )}
            </div>
          ))}
        </div>
      )}

      <Modal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        title="Nuevo Plan de Medicación"
        size="lg"
      >
        <MedicationPlanForm
          onSubmit={handleCreatePlan}
          onCancel={() => setShowCreateModal(false)}
        />
      </Modal>

      <Modal
        isOpen={showTimesModal}
        onClose={() => {
          setShowTimesModal(false);
          setSelectedPlan(null);
          setNewTime({ time: '', day_of_week: '' });
          setTimeError(null);
        }}
        title="Agregar Horario"
      >
        <div className="space-y-4">
          <div>
            <label className="label">Hora *</label>
            <input
              type="time"
              value={newTime.time}
              onChange={(e) => setNewTime({ ...newTime, time: e.target.value })}
              className="input-field"
              required
            />
          </div>
          <div>
            <label className="label">Día de la Semana</label>
            <select
              value={newTime.day_of_week}
              onChange={(e) => setNewTime({ ...newTime, day_of_week: e.target.value })}
              className="input-field"
            >
              <option value="">Diario</option>
              <option value="0">Domingo</option>
              <option value="1">Lunes</option>
              <option value="2">Martes</option>
              <option value="3">Miércoles</option>
              <option value="4">Jueves</option>
              <option value="5">Viernes</option>
              <option value="6">Sábado</option>
            </select>
          </div>
          {timeError && (
            <div className="text-sm text-red-600">{timeError}</div>
          )}
          <div className="flex space-x-3 pt-4">
            <Button
              variant="secondary"
              onClick={() => {
                setShowTimesModal(false);
                setSelectedPlan(null);
                setNewTime({ time: '', day_of_week: '' });
                setTimeError(null);
              }}
              fullWidth
            >
              Cancelar
            </Button>
            <Button onClick={handleAddTime} fullWidth disabled={!newTime.time}>
              Agregar
            </Button>
          </div>
        </div>
      </Modal>

      <ConfirmDialog
        isOpen={showDeleteTimeConfirm}
        onClose={() => {
          setShowDeleteTimeConfirm(false);
          setSelectedTimeId(null);
        }}
        onConfirm={handleDeleteTime}
        title="Eliminar Horario"
        message="¿Estás seguro de que deseas eliminar este horario? Esta acción no se puede deshacer."
        confirmText="Eliminar"
        cancelText="Cancelar"
        variant="danger"
        loading={deletingTime}
      />
    </div>
  );
};
