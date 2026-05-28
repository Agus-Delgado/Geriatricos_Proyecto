import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { trackPatientView } from '../utils/patientTracking';
import { residentsApi } from '../api/residents';
import { clinicalApi } from '../api/clinical';
import { ClinicalSummarySection } from '../components/clinical/ClinicalSummarySection';
import { EvolutionsList } from '../components/clinical/EvolutionsList';
import { BackHeader } from '../components/ui/BackHeader';
import { Button } from '../components/ui/Button';
import { LoadingSpinner } from '../components/ui/LoadingSpinner';
import { ErrorMessage } from '../components/ui/ErrorMessage';
import { Modal } from '../components/ui/Modal';
import type { Resident } from '../types/residents';
import type { ClinicalNote, ClinicalNoteCreate, ClinicalSummary } from '../types/clinical';
import type { ApiError } from '../api/client';

export default function ClinicalHistoryPage() {
  const { patientId } = useParams<{ patientId: string }>();
  const navigate = useNavigate();
  const { activeFacilityId } = useAuth();
  const [patient, setPatient] = useState<Resident | null>(null);
  const [summary, setSummary] = useState<ClinicalSummary | null>(null);
  const [notes, setNotes] = useState<ClinicalNote[]>([]);
  const [loading, setLoading] = useState(true);
  const [pageError, setPageError] = useState<string | null>(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [content, setContent] = useState('');
  const [recordedAt, setRecordedAt] = useState('');
  const [saving, setSaving] = useState(false);
  const [modalError, setModalError] = useState<string | null>(null);

  useEffect(() => {
    if (patientId) {
      loadData();
    }
  }, [patientId]);

  const loadData = async () => {
    if (!patientId) return;

    try {
      setLoading(true);
      setPageError(null);

      const [patientData, summaryData, notesData] = await Promise.all([
        residentsApi.get(patientId),
        clinicalApi.getSummaryOrNull(patientId),
        clinicalApi.listNotes(patientId),
      ]);

      setPatient(patientData);
      setSummary(summaryData);
      setNotes(
        notesData.sort(
          (a, b) => new Date(b.recorded_at).getTime() - new Date(a.recorded_at).getTime()
        )
      );

      if (activeFacilityId && patientId) {
        trackPatientView(activeFacilityId, patientId);
      }
    } catch (err) {
      const apiError = err as ApiError;
      setPageError(apiError.detail || 'Error al cargar la historia clínica');
    } finally {
      setLoading(false);
    }
  };

  const handlePrint = () => {
    if (patientId) {
      navigate(clinicalApi.getPrintPath(patientId));
    }
  };

  const handlePrintOrSavePdf = () => {
    if (patientId) {
      navigate(clinicalApi.getPrintPath(patientId, true));
    }
  };

  const handleViewMedicalFolder = () => {
    if (patientId) {
      navigate(`/medical-folder/${patientId}`);
    }
  };

  const calculateAge = (birthDate: string | null): number | null => {
    if (!birthDate) return null;
    const now = new Date();
    const birth = new Date(birthDate);
    let age = now.getFullYear() - birth.getFullYear();
    const monthDiff = now.getMonth() - birth.getMonth();
    if (monthDiff < 0 || (monthDiff === 0 && now.getDate() < birth.getDate())) {
      age--;
    }
    return age;
  };

  const handleOpenAddModal = () => {
    setContent('');
    setModalError(null);
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    const hours = String(now.getHours()).padStart(2, '0');
    const minutes = String(now.getMinutes()).padStart(2, '0');
    setRecordedAt(`${year}-${month}-${day}T${hours}:${minutes}`);
    setShowAddModal(true);
  };

  const handleSaveEvolution = async () => {
    if (!patientId || !content.trim()) {
      setModalError('El contenido de la evolución es obligatorio');
      return;
    }

    try {
      setSaving(true);
      setModalError(null);

      const payload: ClinicalNoteCreate = {
        note_type: 'EVOLUTION',
        content: content.trim(),
        recorded_at: recordedAt ? new Date(recordedAt).toISOString() : undefined,
      };

      await clinicalApi.createNote(patientId, payload);
      setShowAddModal(false);
      setContent('');
      setRecordedAt('');
      await loadData();
    } catch (err) {
      const apiError = err as ApiError;
      setModalError(apiError.detail || 'Error al registrar la evolución');
    } finally {
      setSaving(false);
    }
  };

  const handleCancelAdd = () => {
    setShowAddModal(false);
    setContent('');
    setRecordedAt('');
    setModalError(null);
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

  if (pageError || !patient) {
    return (
      <div className="container mx-auto px-4 py-6 max-w-6xl">
        <ErrorMessage
          message={pageError || 'Paciente no encontrado'}
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
              variant="secondary"
              onClick={handlePrintOrSavePdf}
              style={{ borderColor: 'var(--facility-accent, #667eea)' }}
            >
              Imprimir / guardar PDF
            </Button>
            <Button
              onClick={handlePrint}
              style={{ backgroundColor: 'var(--facility-accent, #667eea)' }}
            >
              Vista imprimible
            </Button>
          </>
        }
      />

      <div
        className="rounded-xl shadow-lg p-6 mb-6"
        style={{ backgroundColor: 'var(--facility-card, white)' }}
      >
        <div className="mb-2">
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Historia clínica</h2>
          <div className="text-sm text-gray-600 space-y-1">
            <p>DNI: {patient.dni || 'N/A'}</p>
            {age !== null && <p>Edad: {age} años</p>}
            {patient.coverage_type && <p>Cobertura: {patient.coverage_type}</p>}
          </div>
        </div>
      </div>

      <div
        className="rounded-xl shadow-lg p-6 mb-6"
        style={{ backgroundColor: 'var(--facility-card, white)' }}
      >
        <ClinicalSummarySection
          residentId={patientId!}
          summary={summary}
          loading={false}
          onSummaryChange={setSummary}
          onUpdate={loadData}
        />
      </div>

      <div
        className="rounded-xl shadow-lg p-6"
        style={{ backgroundColor: 'var(--facility-card, white)' }}
      >
        <div className="flex items-center justify-between mb-4">
          <h2
            className="text-xl font-semibold text-gray-900"
            style={{ color: 'var(--facility-accent, #667eea)' }}
          >
            Evoluciones clínicas
          </h2>
          <Button
            onClick={handleOpenAddModal}
            style={{ backgroundColor: 'var(--facility-accent, #667eea)' }}
          >
            + Registrar evolución
          </Button>
        </div>
        <EvolutionsList notes={notes} loading={false} />
      </div>

      <Modal
        isOpen={showAddModal}
        onClose={handleCancelAdd}
        title="Registrar evolución"
        size="md"
      >
        <div className="space-y-4">
          {modalError && (
            <div className="bg-red-50 border border-red-200 text-red-800 px-4 py-3 rounded-lg text-sm">
              {modalError}
            </div>
          )}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Evolución <span className="text-red-500">*</span>
            </label>
            <textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="Describa la evolución clínica del paciente..."
              rows={8}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
              disabled={saving}
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Fecha y hora (opcional)
            </label>
            <input
              type="datetime-local"
              value={recordedAt}
              onChange={(e) => setRecordedAt(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              disabled={saving}
            />
            <p className="text-xs text-gray-500 mt-1">
              Si no se indica, se usará la fecha y hora actual
            </p>
          </div>
          <div className="flex justify-end gap-3 pt-4">
            <Button variant="secondary" onClick={handleCancelAdd} disabled={saving}>
              Cancelar
            </Button>
            <Button
              onClick={handleSaveEvolution}
              disabled={saving || !content.trim()}
              style={{ backgroundColor: 'var(--facility-accent, #667eea)' }}
            >
              {saving ? 'Guardando...' : 'Guardar evolución'}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};
