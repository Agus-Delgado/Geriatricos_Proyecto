import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { trackPatientView } from '../utils/patientTracking';
import { residentsApi } from '../api/residents';
import { clinicalApi } from '../api/clinical';
import { EvolutionsList } from '../components/clinical/EvolutionsList';
import { BackHeader } from '../components/ui/BackHeader';
import { Button } from '../components/ui/Button';
import { LoadingSpinner } from '../components/ui/LoadingSpinner';
import { ErrorMessage } from '../components/ui/ErrorMessage';
import type { Resident } from '../types/residents';
import type { ClinicalNote } from '../types/clinical';
import type { ApiError } from '../api/client';

export default function ClinicalHistoryPage() {
  const { patientId } = useParams<{ patientId: string }>();
  const navigate = useNavigate();
  const { activeFacilityId } = useAuth();
  const [patient, setPatient] = useState<Resident | null>(null);
  const [notes, setNotes] = useState<ClinicalNote[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

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

      const [patientData, notesData] = await Promise.all([
        residentsApi.get(patientId),
        clinicalApi.listNotes(patientId),
      ]);

      setPatient(patientData);
      setNotes(notesData.sort((a, b) => 
        new Date(b.recorded_at).getTime() - new Date(a.recorded_at).getTime()
      ));

      // Track patient view (localStorage fallback)
      if (activeFacilityId && patientId) {
        trackPatientView(activeFacilityId, patientId);
      }
    } catch (err) {
      const apiError = err as ApiError;
      setError(apiError.detail || 'Error al cargar datos');
    } finally {
      setLoading(false);
    }
  };

  const handlePrint = () => {
    if (patientId) {
      navigate(`/clinical-history/${patientId}/print`);
    }
  };

  const handleViewMedicalFolder = () => {
    if (patientId) {
      navigate(`/medical-folder/${patientId}`);
    }
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
          onDismiss={() => navigate('/clinical-history/search')}
        />
      </div>
    );
  }

  const age = calculateAge(patient.birth_date);

  return (
    <div className="container mx-auto px-4 py-6 max-w-6xl">
      <BackHeader
        title={`${patient.last_name}, ${patient.first_name}`}
        fallbackPath="/clinical-history/search"
        rightActions={
          <>
            <Button
              variant="secondary"
              onClick={handleViewMedicalFolder}
              style={{ borderColor: 'var(--facility-accent, #667eea)' }}
            >
              Carpeta
            </Button>
            <Button
              onClick={handlePrint}
              style={{ backgroundColor: 'var(--facility-accent, #667eea)' }}
            >
              Imprimir
            </Button>
          </>
        }
      />

      {/* Header con datos del paciente */}
      <div
        className="rounded-xl shadow-lg p-6 mb-6"
        style={{ backgroundColor: 'var(--facility-card, white)' }}
      >
        <div className="mb-4">
          <h2 className="text-xl font-semibold text-gray-900 mb-2">
            Historia Clínica
          </h2>
          <div className="text-sm text-gray-600 space-y-1">
            <p>DNI: {patient.dni || 'N/A'}</p>
            {age !== null && <p>Edad: {age} años</p>}
            {patient.coverage_type && <p>Obra Social: {patient.coverage_type}</p>}
          </div>
        </div>
      </div>

      {/* Lista de evoluciones */}
      <div
        className="rounded-xl shadow-lg p-6"
        style={{ backgroundColor: 'var(--facility-card, white)' }}
      >
        <h2
          className="text-xl font-semibold text-gray-900 mb-4"
          style={{ color: 'var(--facility-accent, #667eea)' }}
        >
          Últimas Evoluciones
        </h2>
        <EvolutionsList notes={notes} loading={false} />
      </div>
    </div>
  );
}
