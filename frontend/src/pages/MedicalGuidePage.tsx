import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { residentsApi } from '../api/residents';
import { medicationsApi } from '../api/medications';
import { useAuth } from '../contexts/AuthContext';
import { useFacility } from '../contexts/FacilityContext';
import { Input } from '../components/ui/Input';
import { Button } from '../components/ui/Button';
import { LoadingSpinner } from '../components/ui/LoadingSpinner';
import { ErrorMessage } from '../components/ui/ErrorMessage';
import { BottomNav } from '../components/layout/BottomNav';
import { parseMedicationInstructions } from '../utils/medicationInstructions';
import type { Resident } from '../types/residents';
import type { MedicationPlan } from '../types/medications';
import type { ApiError } from '../api/client';

function getPlanSortDate(plan: MedicationPlan): Date {
  return new Date(plan.start_date || plan.created_at);
}

export const MedicalGuidePage: React.FC = () => {
  const navigate = useNavigate();
  const { activeFacilityId } = useAuth();
  const { facility } = useFacility();

  const [searchQuery, setSearchQuery] = useState('');
  const [residents, setResidents] = useState<Resident[]>([]);
  const [loadingResidents, setLoadingResidents] = useState(false);
  const [selectedResident, setSelectedResident] = useState<Resident | null>(null);
  const [allPlans, setAllPlans] = useState<MedicationPlan[]>([]);
  const [loadingPlans, setLoadingPlans] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (activeFacilityId) {
      loadResidents();
    }
  }, [activeFacilityId]);

  useEffect(() => {
    if (selectedResident) {
      loadPlans();
    } else {
      setAllPlans([]);
    }
  }, [selectedResident]);

  const loadResidents = async () => {
    if (!activeFacilityId) return;

    try {
      setLoadingResidents(true);
      setError(null);
      const data = await residentsApi.list(activeFacilityId, {
        stay_status: 'ACTIVE',
      });
      setResidents(data);
    } catch (err) {
      const apiError = err as ApiError;
      setError(apiError.detail || 'Error al cargar pacientes');
    } finally {
      setLoadingResidents(false);
    }
  };

  const loadPlans = async () => {
    if (!selectedResident) return;

    try {
      setLoadingPlans(true);
      setError(null);
      const data = await medicationsApi.listPlans(selectedResident.id, false);
      setAllPlans(
        data.sort((a, b) => getPlanSortDate(b).getTime() - getPlanSortDate(a).getTime())
      );
    } catch (err) {
      const apiError = err as ApiError;
      setError(apiError.detail || 'Error al cargar indicaciones');
    } finally {
      setLoadingPlans(false);
    }
  };

  const activePlans = useMemo(
    () => allPlans.filter((p) => p.is_active),
    [allPlans]
  );

  const filteredResidents = useMemo(() => {
    if (!searchQuery.trim()) return [];
    const query = searchQuery.toLowerCase();
    return residents.filter(
      (r) =>
        (r.first_name ?? '').toLowerCase().includes(query) ||
        (r.last_name ?? '').toLowerCase().includes(query) ||
        (r.dni ?? '').toLowerCase().includes(query)
    );
  }, [residents, searchQuery]);

  const formatDate = (dateString: string | null | undefined): string => {
    if (!dateString) return '';
    try {
      return new Date(dateString).toLocaleDateString('es-AR');
    } catch {
      return '';
    }
  };

  const renderPlanCard = (plan: MedicationPlan) => {
    const { frequency, observations, legacyText } = parseMedicationInstructions(
      plan.instructions
    );

    return (
      <div key={plan.id} className="border border-gray-100 rounded-lg p-3 bg-gray-50">
        <div className="flex items-start justify-between mb-2">
          <div className="flex-1">
            <h4 className="font-semibold text-gray-900">{plan.med_name}</h4>
            <p className="text-sm text-gray-600 mt-1">
              <strong>Dosis:</strong> {plan.dose}
            </p>
            {plan.route && (
              <p className="text-sm text-gray-600 mt-1">
                <strong>Vía:</strong> {plan.route}
              </p>
            )}
            {frequency && (
              <p className="text-sm text-gray-600 mt-1">
                <strong>Frecuencia:</strong> {frequency}
              </p>
            )}
            {observations && (
              <p className="text-sm text-gray-600 mt-1">
                <strong>Observaciones:</strong> {observations}
              </p>
            )}
            {legacyText && !frequency && !observations && (
              <p className="text-sm text-gray-600 mt-2">{legacyText}</p>
            )}
            {plan.start_date && (
              <p className="text-xs text-gray-500 mt-2">
                Inicio: {formatDate(plan.start_date)}
              </p>
            )}
          </div>
          <span
            className={`inline-block px-2 py-1 text-xs rounded ml-2 shrink-0 ${
              plan.is_active ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
            }`}
          >
            {plan.is_active ? 'Activa' : 'Inactiva'}
          </span>
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      <div className="px-4 py-4 space-y-4">
        <div className="bg-white rounded-lg shadow-sm p-4">
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Guía médica</h1>
          <p className="text-sm text-gray-600">
            Buscar pacientes y consultar medicación activa e indicaciones registradas
          </p>
        </div>

        {error && <ErrorMessage message={error} onDismiss={() => setError(null)} />}

        <Input
          label="Buscar por nombre o DNI"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value ?? '')}
          placeholder="Buscar paciente..."
        />

        {loadingResidents ? (
          <div className="flex justify-center py-8">
            <LoadingSpinner />
          </div>
        ) : (
          <>
            {searchQuery && filteredResidents.length > 0 && (
              <div className="border border-gray-200 rounded-lg max-h-60 overflow-y-auto bg-white">
                {filteredResidents.map((resident) => (
                  <button
                    key={resident.id}
                    type="button"
                    onClick={() => {
                      setSelectedResident(resident);
                      setSearchQuery('');
                    }}
                    className={`w-full text-left px-4 py-3 hover:bg-gray-50 border-b border-gray-100 last:border-b-0 ${
                      selectedResident?.id === resident.id ? 'bg-primary-50' : ''
                    }`}
                  >
                    <div className="font-medium text-gray-900">
                      {resident.last_name}, {resident.first_name}
                    </div>
                    <div className="text-sm text-gray-600">DNI: {resident.dni ?? 'N/A'}</div>
                  </button>
                ))}
              </div>
            )}

            {searchQuery && filteredResidents.length === 0 && (
              <div className="text-center text-gray-500 py-4 bg-white rounded-lg border border-gray-200">
                No se encontraron pacientes
              </div>
            )}
          </>
        )}

        {selectedResident && (
          <div className="space-y-4">
            <div className="border border-gray-200 rounded-lg p-4 bg-white">
              <h2 className="font-semibold text-gray-900 mb-3 text-lg">Paciente</h2>
              <div className="text-sm text-gray-700 space-y-1">
                <p>
                  <strong>Nombre:</strong> {selectedResident.last_name},{' '}
                  {selectedResident.first_name}
                </p>
                <p>
                  <strong>DNI:</strong> {selectedResident.dni ?? 'N/A'}
                </p>
                {facility && (
                  <p>
                    <strong>Sede:</strong> {facility.name ?? ''}
                  </p>
                )}
              </div>
              <div className="mt-4 flex flex-wrap gap-2">
                <Button
                  variant="secondary"
                  onClick={() => navigate(`/prescriptions-history/${selectedResident.id}`)}
                >
                  Ver historial completo
                </Button>
                <Button
                  variant="secondary"
                  onClick={() => {
                    setSelectedResident(null);
                    setSearchQuery('');
                  }}
                >
                  Limpiar selección
                </Button>
              </div>
            </div>

            <div className="border border-gray-200 rounded-lg p-4 bg-white">
              <h3 className="font-semibold text-gray-900 mb-3">Medicación activa</h3>
              {loadingPlans ? (
                <div className="flex justify-center py-4">
                  <LoadingSpinner />
                </div>
              ) : activePlans.length === 0 ? (
                <p className="text-center text-gray-500 py-4 text-sm">
                  No hay indicaciones activas
                </p>
              ) : (
                <div className="space-y-3">{activePlans.map(renderPlanCard)}</div>
              )}
            </div>

            <div className="border border-gray-200 rounded-lg p-4 bg-white">
              <h3 className="font-semibold text-gray-900 mb-3">Indicaciones registradas</h3>
              {loadingPlans ? (
                <div className="flex justify-center py-4">
                  <LoadingSpinner />
                </div>
              ) : allPlans.length === 0 ? (
                <p className="text-center text-gray-500 py-4 text-sm">
                  Sin indicaciones registradas
                </p>
              ) : (
                <div className="space-y-3">{allPlans.map(renderPlanCard)}</div>
              )}
            </div>
          </div>
        )}

        {!selectedResident && !searchQuery && (
          <div className="text-center text-gray-500 py-12 bg-white rounded-lg border border-gray-200">
            <p className="text-lg font-medium mb-2">Buscar paciente</p>
            <p className="text-sm">Ingresá el nombre o DNI para comenzar</p>
          </div>
        )}
      </div>

      <BottomNav />
    </div>
  );
};
