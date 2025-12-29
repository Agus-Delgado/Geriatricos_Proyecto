import React, { useState, useEffect, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { residentsApi } from '../api/residents';
import { medicationsApi } from '../api/medications';
import { Button } from '../components/ui/Button';
import { LoadingSpinner } from '../components/ui/LoadingSpinner';
import { ErrorMessage } from '../components/ui/ErrorMessage';
import type { Resident } from '../types/residents';
import type { ApiError } from '../api/client';

// Tipo temporal para MedicationPlan
interface MedicationPlan {
  id: string;
  resident_id: string;
  facility_id: string;
  med_name: string;
  dose: string;
  route?: string | null;
  instructions?: string | null;
  start_date?: string | null;
  end_date?: string | null;
  is_active: boolean;
  prescribed_by_user_id?: string | null;
  created_at: string;
  updated_at: string;
}

type FilterPeriod = '30' | '90' | 'all';

export default function PrescriptionsHistoryPage() {
  const { patientId } = useParams<{ patientId: string }>();
  const navigate = useNavigate();
  const [patient, setPatient] = useState<Resident | null>(null);
  const [prescriptions, setPrescriptions] = useState<MedicationPlan[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filterPeriod, setFilterPeriod] = useState<FilterPeriod>('all');

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

      const [patientData, prescriptionsData] = await Promise.all([
        residentsApi.get(patientId),
        medicationsApi.listPlans(patientId, false) as Promise<MedicationPlan[]>,
      ]);

      setPatient(patientData);
      setPrescriptions(
        prescriptionsData.sort((a, b) => 
          new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
        )
      );
    } catch (err) {
      const apiError = err as ApiError;
      setError(apiError.detail || 'Error al cargar datos');
    } finally {
      setLoading(false);
    }
  };

  const filteredPrescriptions = useMemo(() => {
    if (filterPeriod === 'all') return prescriptions;

    const days = filterPeriod === '30' ? 30 : 90;
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - days);

    return prescriptions.filter((prescription) => {
      const createdDate = new Date(prescription.created_at);
      return createdDate >= cutoffDate;
    });
  }, [prescriptions, filterPeriod]);

  const formatDate = (dateString: string): string => {
    return new Date(dateString).toLocaleDateString('es-AR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    });
  };

  const formatDateTime = (dateString: string): string => {
    return new Date(dateString).toLocaleString('es-AR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
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

  if (error || !patient) {
    return (
      <div className="container mx-auto px-4 py-6 max-w-6xl">
        <ErrorMessage
          message={error || 'Paciente no encontrado'}
          onDismiss={() => navigate('/prescriptions-history/search')}
        />
      </div>
    );
  }

  const age = calculateAge(patient.birth_date);

  return (
    <div className="container mx-auto px-4 py-6 max-w-6xl">
      {/* Header con datos del paciente */}
      <div
        className="rounded-xl shadow-lg p-6 mb-6"
        style={{ backgroundColor: 'var(--facility-card, white)' }}
      >
        <div className="flex items-start justify-between mb-4">
          <div>
            <h1
              className="text-2xl font-bold text-gray-900 mb-2"
              style={{ color: 'var(--facility-accent, #667eea)' }}
            >
              Historial de Recetas
            </h1>
            <h2 className="text-xl font-semibold text-gray-900">
              {patient.last_name}, {patient.first_name}
            </h2>
            <div className="mt-2 text-sm text-gray-600 space-y-1">
              <p>DNI: {patient.dni || 'N/A'}</p>
              {age !== null && <p>Edad: {age} años</p>}
              {patient.coverage_type && <p>Obra Social: {patient.coverage_type}</p>}
            </div>
          </div>
        </div>
      </div>

      {/* Filtros */}
      <div
        className="rounded-xl shadow-lg p-4 mb-6"
        style={{ backgroundColor: 'var(--facility-card, white)' }}
      >
        <div className="flex items-center gap-4">
          <span className="text-sm font-medium text-gray-700">Filtrar por:</span>
          <div className="flex gap-2">
            <button
              onClick={() => setFilterPeriod('30')}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                filterPeriod === '30'
                  ? 'text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
              style={
                filterPeriod === '30'
                  ? { backgroundColor: 'var(--facility-accent, #667eea)' }
                  : {}
              }
            >
              Últimos 30 días
            </button>
            <button
              onClick={() => setFilterPeriod('90')}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                filterPeriod === '90'
                  ? 'text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
              style={
                filterPeriod === '90'
                  ? { backgroundColor: 'var(--facility-accent, #667eea)' }
                  : {}
              }
            >
              Últimos 90 días
            </button>
            <button
              onClick={() => setFilterPeriod('all')}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                filterPeriod === 'all'
                  ? 'text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
              style={
                filterPeriod === 'all'
                  ? { backgroundColor: 'var(--facility-accent, #667eea)' }
                  : {}
              }
            >
              Todo
            </button>
          </div>
        </div>
      </div>

      {/* Listado de recetas */}
      <div
        className="rounded-xl shadow-lg p-6"
        style={{ backgroundColor: 'var(--facility-card, white)' }}
      >
        <h2
          className="text-xl font-semibold text-gray-900 mb-4"
          style={{ color: 'var(--facility-accent, #667eea)' }}
        >
          Recetas ({filteredPrescriptions.length})
        </h2>

        {filteredPrescriptions.length === 0 ? (
          <div className="text-center py-12 text-gray-500">
            <p className="text-lg font-medium mb-2">No hay recetas registradas</p>
            <p className="text-sm">
              {filterPeriod !== 'all'
                ? `No se encontraron recetas en los últimos ${filterPeriod} días.`
                : 'Las recetas aparecerán aquí cuando se registren.'}
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {filteredPrescriptions.map((prescription) => (
              <div
                key={prescription.id}
                className="bg-white border border-gray-200 rounded-lg p-5 hover:shadow-md transition-shadow"
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="text-lg font-semibold text-gray-900">
                        {prescription.med_name}
                      </h3>
                      <span
                        className={`text-xs px-2 py-1 rounded font-medium ${
                          prescription.is_active
                            ? 'bg-green-100 text-green-800'
                            : 'bg-gray-100 text-gray-800'
                        }`}
                      >
                        {prescription.is_active ? 'Activa' : 'Inactiva'}
                      </span>
                    </div>
                    <div className="text-sm text-gray-600 space-y-1">
                      <p>
                        <span className="font-medium">Dosis:</span> {prescription.dose}
                      </p>
                      {prescription.route && (
                        <p>
                          <span className="font-medium">Vía:</span> {prescription.route}
                        </p>
                      )}
                      {prescription.instructions && (
                        <p>
                          <span className="font-medium">Instrucciones:</span>{' '}
                          {prescription.instructions}
                        </p>
                      )}
                    </div>
                  </div>
                  <div className="text-right text-sm text-gray-500 ml-4">
                    <p className="font-medium">{formatDate(prescription.created_at)}</p>
                    <p className="text-xs">{formatDateTime(prescription.created_at).split(' - ')[1]}</p>
                  </div>
                </div>
                {prescription.start_date && (
                  <div className="mt-2 pt-2 border-t border-gray-100 text-xs text-gray-500">
                    <span className="font-medium">Período:</span> {formatDate(prescription.start_date)}
                    {prescription.end_date && ` - ${formatDate(prescription.end_date)}`}
                    {!prescription.end_date && ' (sin fecha de fin)'}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
