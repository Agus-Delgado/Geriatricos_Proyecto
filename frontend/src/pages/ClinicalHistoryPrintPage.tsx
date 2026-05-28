import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { clinicalApi } from '../api/clinical';
import { LoadingSpinner } from '../components/ui/LoadingSpinner';
import type { ClinicalNote, ClinicalSummary } from '../types/clinical';
import type { MedicationPlan } from '../types/medications';
import type { Resident, ResidentContact } from '../types/residents';
import type { ApiError } from '../api/client';
import '../components/certificates/print.css';

const NOTE_TYPE_LABELS: Record<string, string> = {
  EVOLUTION: 'Evolución',
  INCIDENT: 'Incidente',
  GENERAL: 'Nota general',
};

function formatDate(dateString: string): string {
  return new Date(dateString).toLocaleDateString('es-AR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
}

function formatTime(dateString: string): string {
  return new Date(dateString).toLocaleTimeString('es-AR', {
    hour: '2-digit',
    minute: '2-digit',
  });
}

function formatDateTime(dateString: string): string {
  return `${formatDate(dateString)} - ${formatTime(dateString)}`;
}

function calculateAge(birthDate: string | null): number | null {
  if (!birthDate) return null;
  const today = new Date();
  const birth = new Date(birthDate);
  let age = today.getFullYear() - birth.getFullYear();
  const monthDiff = today.getMonth() - birth.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
    age--;
  }
  return age;
}

function formatGeneratedAt(iso: string): string {
  return new Date(iso).toLocaleString('es-AR');
}

export default function ClinicalHistoryPrintPage() {
  const { patientId } = useParams<{ patientId: string }>();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const autoPrint = searchParams.get('auto') === '1';
  const printTriggeredRef = useRef(false);

  const [patient, setPatient] = useState<Resident | null>(null);
  const [summary, setSummary] = useState<ClinicalSummary | null>(null);
  const [notes, setNotes] = useState<ClinicalNote[]>([]);
  const [medicationPlans, setMedicationPlans] = useState<MedicationPlan[]>([]);
  const [contacts, setContacts] = useState<ResidentContact[]>([]);
  const [generatedAt, setGeneratedAt] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (patientId) {
      loadData();
    }
  }, [patientId]);

  useEffect(() => {
    if (!autoPrint || loading || error || !patient || printTriggeredRef.current) {
      return;
    }

    const timer = window.setTimeout(() => {
      printTriggeredRef.current = true;
      window.print();
    }, 400);

    return () => window.clearTimeout(timer);
  }, [autoPrint, loading, error, patient]);

  const loadData = async () => {
    if (!patientId) return;

    try {
      setLoading(true);
      setError(null);
      printTriggeredRef.current = false;

      const report = await clinicalApi.getClinicalReport(patientId);

      setPatient(report.resident);
      setSummary(report.clinical_summary);
      setNotes(report.clinical_notes);
      setMedicationPlans(report.medication_plans);
      setContacts(report.contacts ?? []);
      setGeneratedAt(report.generated_at);
    } catch (err) {
      const apiError = err as ApiError;
      setError(apiError.detail || 'Error al cargar datos');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-screen no-print">
        <LoadingSpinner />
      </div>
    );
  }

  if (error || !patient) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen p-4 no-print">
        <p className="text-gray-600 mb-4">{error || 'Paciente no encontrado'}</p>
        <button
          type="button"
          onClick={() => navigate(-1)}
          className="px-4 py-2 bg-primary-600 text-white rounded hover:bg-primary-700"
        >
          Volver
        </button>
      </div>
    );
  }

  const age = calculateAge(patient.birth_date);
  const displayGeneratedAt = generatedAt
    ? formatGeneratedAt(generatedAt)
    : new Date().toLocaleString('es-AR');

  return (
    <div style={{ minHeight: '100vh', background: '#fff' }}>
      <div className="no-print" style={{ padding: 16, background: '#f5f5f5', borderBottom: '1px solid #ddd' }}>
        <div className="max-w-4xl mx-auto flex gap-3">
          <button
            type="button"
            onClick={() => window.print()}
            className="px-4 py-2 bg-primary-600 text-white rounded hover:bg-primary-700"
          >
            Imprimir / guardar PDF
          </button>
          <button
            type="button"
            onClick={() => navigate(-1)}
            className="px-4 py-2 bg-gray-200 text-gray-800 rounded hover:bg-gray-300"
          >
            Volver
          </button>
        </div>
      </div>

      <div className="paper">
        <div className="print-root">
          <div className="print-title">HISTORIA CLÍNICA</div>

          <div className="print-meta">
            <div>
              <strong>Paciente:</strong> {patient.last_name}, {patient.first_name}
            </div>
            <div>
              <strong>Generado:</strong> {displayGeneratedAt}
            </div>
          </div>

          <div className="print-body">
            <div className="print-card" style={{ marginBottom: 16 }}>
              <div className="print-section-title">Datos del paciente</div>
              <div className="print-kv-grid">
                <div className="print-kv">
                  <div className="print-kv-label">Nombre</div>
                  <div className="print-kv-value">
                    {patient.last_name}, {patient.first_name}
                  </div>
                </div>
                <div className="print-kv">
                  <div className="print-kv-label">DNI</div>
                  <div className="print-kv-value">{patient.dni || 'N/A'}</div>
                </div>
                <div className="print-kv">
                  <div className="print-kv-label">Edad</div>
                  <div className="print-kv-value">{age !== null ? `${age} años` : 'N/A'}</div>
                </div>
                <div className="print-kv">
                  <div className="print-kv-label">Obra social</div>
                  <div className="print-kv-value">{patient.coverage_type || 'N/A'}</div>
                </div>
              </div>
            </div>

            {summary && (
              <div className="print-card" style={{ marginBottom: 16 }}>
                <div className="print-section-title">Resumen clínico</div>
                <div className="print-kv-grid">
                  {summary.primary_diagnosis && (
                    <div className="print-kv">
                      <div className="print-kv-label">Diagnóstico principal</div>
                      <div className="print-kv-value">{summary.primary_diagnosis}</div>
                    </div>
                  )}
                  {summary.secondary_diagnoses && (
                    <div className="print-kv">
                      <div className="print-kv-label">Diagnósticos secundarios</div>
                      <div className="print-kv-value">{summary.secondary_diagnoses}</div>
                    </div>
                  )}
                  {summary.allergies && (
                    <div className="print-kv">
                      <div className="print-kv-label">Alergias</div>
                      <div className="print-kv-value">{summary.allergies}</div>
                    </div>
                  )}
                  {summary.current_medications && (
                    <div className="print-kv">
                      <div className="print-kv-label">Medicación actual (resumen)</div>
                      <div className="print-kv-value">{summary.current_medications}</div>
                    </div>
                  )}
                  {summary.medical_history && (
                    <div className="print-kv">
                      <div className="print-kv-label">Antecedentes</div>
                      <div className="print-kv-value">{summary.medical_history}</div>
                    </div>
                  )}
                  {summary.family_history && (
                    <div className="print-kv">
                      <div className="print-kv-label">Antecedentes familiares</div>
                      <div className="print-kv-value">{summary.family_history}</div>
                    </div>
                  )}
                </div>
              </div>
            )}

            <div style={{ marginTop: 18, marginBottom: 16 }}>
              <div className="print-section-title">Medicación activa</div>
              {medicationPlans.length === 0 ? (
                <p style={{ fontStyle: 'italic', color: '#666' }}>
                  No hay planes de medicación activos.
                </p>
              ) : (
                <div className="print-card">
                  {medicationPlans.map((plan) => (
                    <div key={plan.id} className="print-entry">
                      <div className="print-entry-header">
                        <div>
                          <strong>{plan.med_name}</strong> — {plan.dose}
                          {plan.route ? ` (${plan.route})` : ''}
                        </div>
                      </div>
                      {plan.instructions && (
                        <div className="print-entry-body">{plan.instructions}</div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div style={{ marginTop: 18, marginBottom: 16 }}>
              <div className="print-section-title">Evoluciones clínicas</div>
              {notes.length === 0 ? (
                <p style={{ fontStyle: 'italic', color: '#666' }}>
                  No hay evoluciones registradas.
                </p>
              ) : (
                <div className="print-card">
                  {notes.map((note) => (
                    <div key={note.id} className="print-entry">
                      <div className="print-entry-header">
                        <div>
                          {formatDateTime(note.recorded_at)}
                          {' — '}
                          {NOTE_TYPE_LABELS[note.note_type] ?? note.note_type}
                        </div>
                      </div>
                      <div className="print-entry-body">{note.content}</div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {contacts.length > 0 && (
              <div style={{ marginTop: 18 }}>
                <div className="print-section-title">Contactos / familiares</div>
                <div className="print-card">
                  {contacts.map((contact) => (
                    <div key={contact.id} className="print-entry">
                      <div className="print-entry-header">
                        <div>
                          <strong>{contact.full_name}</strong>
                          {contact.is_primary ? ' (principal)' : ''}
                        </div>
                      </div>
                      <div className="print-entry-body">
                        {contact.relationship_type && (
                          <div>Vínculo: {contact.relationship_type}</div>
                        )}
                        {contact.phone && <div>Tel: {contact.phone}</div>}
                        {contact.email && <div>Email: {contact.email}</div>}
                        {contact.address && <div>Dirección: {contact.address}</div>}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
