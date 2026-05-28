import { useState, useEffect, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { residentsApi } from '../api/residents';
import { medicationsApi } from '../api/medications';
import { LoadingSpinner } from '../components/ui/LoadingSpinner';
import { ErrorMessage } from '../components/ui/ErrorMessage';
import { MedicationPlanForm } from '../components/forms/MedicationPlanForm';
import { BackHeader } from '../components/ui/BackHeader';
import { Button } from '../components/ui/Button';
import { Modal } from '../components/ui/Modal';
import { copyToClipboard } from '../utils/clipboard';
import { openExternal } from '../utils/externalLinks';
import { parseMedicationInstructions } from '../utils/medicationInstructions';
import { trackPatientView } from '../utils/patientTracking';
import { useAuth } from '../contexts/AuthContext';
import type { Resident } from '../types/residents';
import type { MedicationPlan, MedicationPlanCreate } from '../types/medications';
import type { ApiError } from '../api/client';

type FilterPeriod = '30' | '90' | 'all';

function getPlanSortDate(plan: MedicationPlan): Date {
  return new Date(plan.start_date || plan.created_at);
}

export default function PrescriptionsHistoryPage() {
  const { patientId } = useParams<{ patientId: string }>();
  const navigate = useNavigate();
  const { activeFacilityId } = useAuth();
  const [patient, setPatient] = useState<Resident | null>(null);
  const [medicationPlans, setMedicationPlans] = useState<MedicationPlan[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filterPeriod, setFilterPeriod] = useState<FilterPeriod>('all');
  const [showModal, setShowModal] = useState(false);

  useEffect(() => {
    if (patientId) {
      loadData();
    }
  }, [patientId]);

  const loadData = async () => {
    if (!patientId) return;

    try {
      setLoading(true);
      setError(null);

      const [patientData, plansData] = await Promise.all([
        residentsApi.get(patientId),
        medicationsApi.listPlans(patientId, false),
      ]);

      setPatient(patientData);
      setMedicationPlans(
        plansData.sort((a, b) => getPlanSortDate(b).getTime() - getPlanSortDate(a).getTime())
      );

      if (activeFacilityId && patientId) {
        trackPatientView(activeFacilityId, patientId);
      }
    } catch (err) {
      const apiError = err as ApiError;
      setError(apiError.detail || 'Error al cargar indicaciones');
    } finally {
      setLoading(false);
    }
  };

  const filteredPlans = useMemo(() => {
    if (filterPeriod === 'all') return medicationPlans;

    const days = filterPeriod === '30' ? 30 : 90;
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - days);

    return medicationPlans.filter((plan) => getPlanSortDate(plan) >= cutoffDate);
  }, [medicationPlans, filterPeriod]);

  const handleCreateIndication = async (data: MedicationPlanCreate) => {
    if (!patientId) return;

    try {
      await medicationsApi.createPlan(patientId, data);
      setShowModal(false);
      await loadData();
    } catch (err) {
      const apiError = err as ApiError;
      setError(apiError.detail || 'Error al guardar la indicación');
      throw err;
    }
  };

  const formatDate = (dateString: string): string => {
    return new Date(dateString).toLocaleDateString('es-AR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    });
  };

  const calculateAge = (birthDate: string | null): number | null => {
    if (!birthDate) return null;
    const today = new Date();
    const birth = new Date(birthDate);
    let age = today.getFullYear() - birth.getFullYear();
    const monthDiff = today.getMonth() - birth.getMonth();
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
      age--;
    }
    return age;
  };

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-6 max-w-6xl">
        <div className="flex justify-center py-12">
          <LoadingSpinner />
        </div>
      </div>
    );
  }

  if (error && !patient) {
    return (
      <div className="container mx-auto px-4 py-6 max-w-6xl">
        <ErrorMessage
          message={error}
          onDismiss={() => navigate('/prescriptions-history/search')}
        />
      </div>
    );
  }

  if (!patient) {
    return (
      <div className="container mx-auto px-4 py-6 max-w-6xl">
        <ErrorMessage
          message="Paciente no encontrado"
          onDismiss={() => navigate('/prescriptions-history/search')}
        />
      </div>
    );
  }

  const age = calculateAge(patient.birth_date);

  return (
    <div className="container mx-auto px-4 py-6 max-w-6xl">
      <BackHeader
        title={`${patient.last_name}, ${patient.first_name}`}
        fallbackPath="/prescriptions-history/search"
      />

      {error && (
        <div className="mb-4">
          <ErrorMessage message={error} onDismiss={() => setError(null)} />
        </div>
      )}

      <div
        className="rounded-xl shadow-lg p-6 mb-6"
        style={{ backgroundColor: 'var(--facility-card, white)' }}
      >
        <h2 className="text-xl font-semibold text-gray-900 mb-2">Indicaciones guardadas</h2>
        <div className="text-sm text-gray-600 space-y-1">
          <p>DNI: {patient.dni || 'N/A'}</p>
          {age !== null && <p>Edad: {age} años</p>}
          {patient.coverage_type && <p>Cobertura: {patient.coverage_type}</p>}
        </div>
        <div className="mt-4 flex flex-wrap gap-2">
          <button
            type="button"
            onClick={async () => {
              if (patient.dni) {
                try {
                  await copyToClipboard(patient.dni);
                  alert('DNI copiado');
                } catch {
                  /* ignore */
                }
              }
            }}
            disabled={!patient.dni}
            className="text-xs px-3 py-1.5 rounded bg-gray-100 text-gray-700 hover:bg-gray-200 disabled:opacity-50"
          >
            Copiar DNI
          </button>
          <button
            type="button"
            onClick={() => patientId && navigate(`/prescriptions-history/${patientId}/print`)}
            className="text-xs px-3 py-1.5 rounded bg-gray-100 text-gray-700 hover:bg-gray-200"
          >
            Vista imprimible
          </button>
        </div>
      </div>

      <div
        className="rounded-xl shadow-lg p-6 mb-6"
        style={{ backgroundColor: 'var(--facility-card, white)' }}
      >
        <h3 className="text-lg font-semibold text-gray-900 mb-3">Enlaces externos</h3>
        <button
          type="button"
          onClick={() => openExternal('https://cup.pami.org.ar/')}
          className="w-full px-4 py-3 rounded-lg bg-blue-50 hover:bg-blue-100 border border-blue-200 text-blue-700 font-medium text-left"
        >
          Abrir PAMI (CUP)
        </button>
      </div>

      <div
        className="rounded-xl shadow-lg p-4 mb-6"
        style={{ backgroundColor: 'var(--facility-card, white)' }}
      >
        <div className="flex items-center gap-4 flex-wrap">
          <span className="text-sm font-medium text-gray-700">Filtrar por:</span>
          {(['30', '90', 'all'] as const).map((period) => (
            <button
              key={period}
              type="button"
              onClick={() => setFilterPeriod(period)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                filterPeriod === period ? 'text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
              style={
                filterPeriod === period
                  ? { backgroundColor: 'var(--facility-accent, #667eea)' }
                  : {}
              }
            >
              {period === '30' ? 'Últimos 30 días' : period === '90' ? 'Últimos 90 días' : 'Todo'}
            </button>
          ))}
        </div>
      </div>

      <div className="mb-6 flex justify-end">
        <Button
          onClick={() => setShowModal(true)}
          style={{ backgroundColor: 'var(--facility-accent, #667eea)' }}
        >
          Nueva indicación
        </Button>
      </div>

      <div
        className="rounded-xl shadow-lg p-6"
        style={{ backgroundColor: 'var(--facility-card, white)' }}
      >
        <h2
          className="text-xl font-semibold text-gray-900 mb-4"
          style={{ color: 'var(--facility-accent, #667eea)' }}
        >
          Indicaciones ({filteredPlans.length})
        </h2>

        {filteredPlans.length === 0 ? (
          <div className="text-center py-12 text-gray-500">
            <p className="text-lg font-medium mb-2">No hay indicaciones registradas</p>
            <p className="text-sm">
              {filterPeriod !== 'all'
                ? `No hay indicaciones en el período seleccionado.`
                : 'Las indicaciones medicamentosas aparecerán aquí cuando se registren.'}
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {filteredPlans.map((plan) => {
              const { frequency, observations, legacyText } = parseMedicationInstructions(
                plan.instructions
              );
              const sortDate = getPlanSortDate(plan);

              return (
                <div
                  key={plan.id}
                  className="bg-white border border-gray-200 rounded-lg p-5 hover:shadow-md transition-shadow"
                >
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2 flex-wrap">
                        <h3 className="text-lg font-semibold text-gray-900">{plan.med_name}</h3>
                        <span
                          className={`text-xs px-2 py-1 rounded font-medium ${
                            plan.is_active
                              ? 'bg-green-100 text-green-800'
                              : 'bg-gray-100 text-gray-800'
                          }`}
                        >
                          {plan.is_active ? 'Activa' : 'Inactiva'}
                        </span>
                      </div>
                      <div className="text-sm text-gray-600 space-y-1">
                        <p>
                          <span className="font-medium">Dosis:</span> {plan.dose}
                        </p>
                        {plan.route && (
                          <p>
                            <span className="font-medium">Vía:</span> {plan.route}
                          </p>
                        )}
                        {frequency && (
                          <p>
                            <span className="font-medium">Frecuencia:</span> {frequency}
                          </p>
                        )}
                        {observations && (
                          <p>
                            <span className="font-medium">Observaciones:</span> {observations}
                          </p>
                        )}
                        {legacyText && !frequency && !observations && (
                          <p>
                            <span className="font-medium">Indicaciones:</span> {legacyText}
                          </p>
                        )}
                      </div>
                    </div>
                    <div className="text-right text-sm text-gray-500 ml-4 shrink-0">
                      <p className="font-medium">{formatDate(sortDate.toISOString())}</p>
                      {plan.start_date && (
                        <p className="text-xs mt-1">Inicio: {formatDate(plan.start_date)}</p>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <Modal
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        title="Nueva indicación medicamentosa"
        size="lg"
      >
        <MedicationPlanForm
          onSubmit={handleCreateIndication}
          onCancel={() => setShowModal(false)}
          submitLabel="Guardar indicación"
        />
      </Modal>
    </div>
  );
}
