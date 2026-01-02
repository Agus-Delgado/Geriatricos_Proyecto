import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { residentsApi } from '../api/residents';
import { clinicalApi } from '../api/clinical';
import { LoadingSpinner } from '../components/ui/LoadingSpinner';
import type { Resident } from '../types/residents';
import type { ClinicalNote } from '../types/clinical';
import type { ApiError } from '../api/client';
import '../components/certificates/print.css';

export default function ClinicalHistoryPrintPage() {
  const { patientId } = useParams<{ patientId: string }>();
  const navigate = useNavigate();
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
    } catch (err) {
      const apiError = err as ApiError;
      setError(apiError.detail || 'Error al cargar datos');
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString: string): string => {
    return new Date(dateString).toLocaleDateString('es-AR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    });
  };

  const formatTime = (dateString: string): string => {
    return new Date(dateString).toLocaleTimeString('es-AR', {
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const formatDateTime = (dateString: string): string => {
    return `${formatDate(dateString)} - ${formatTime(dateString)}`;
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
      <div className="flex justify-center items-center min-h-screen">
        <LoadingSpinner />
      </div>
    );
  }

  if (error || !patient) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen p-4">
        <p className="text-gray-600 mb-4">{error || 'Paciente no encontrado'}</p>
        <button
          onClick={() => navigate(-1)}
          className="px-4 py-2 bg-primary-600 text-white rounded hover:bg-primary-700"
        >
          Volver
        </button>
      </div>
    );
  }

  const age = calculateAge(patient.birth_date);

  return (
    <div style={{ minHeight: '100vh', background: '#fff' }}>
      {/* Controles ocultos en impresión */}
      <div className="no-print" style={{ padding: 16, background: '#f5f5f5', borderBottom: '1px solid #ddd' }}>
        <div className="max-w-4xl mx-auto flex gap-3">
          <button
            onClick={() => window.print()}
            className="px-4 py-2 bg-primary-600 text-white rounded hover:bg-primary-700"
          >
            Imprimir
          </button>
          <button
            onClick={() => navigate(-1)}
            className="px-4 py-2 bg-gray-200 text-gray-800 rounded hover:bg-gray-300"
          >
            Volver
          </button>
        </div>
      </div>

      <div className="paper">
        <div className="print-root">
          {/* Título */}
          <div className="print-title">HISTORIA CLÍNICA</div>

          {/* Datos del paciente */}
          <div className="print-body">
            <div style={{ marginBottom: '20px' }}>
              <h3 style={{ fontSize: '14pt', fontWeight: 600, marginBottom: '10px' }}>
                Datos del Paciente
              </h3>
              <p style={{ marginBottom: '5px' }}>
                <strong>Nombre:</strong> {patient.last_name}, {patient.first_name}
              </p>
              <p style={{ marginBottom: '5px' }}>
                <strong>DNI:</strong> {patient.dni || 'N/A'}
              </p>
              {age !== null && (
                <p style={{ marginBottom: '5px' }}>
                  <strong>Edad:</strong> {age} años
                </p>
              )}
              {patient.coverage_type && (
                <p style={{ marginBottom: '5px' }}>
                  <strong>Obra Social:</strong> {patient.coverage_type}
                </p>
              )}
            </div>

            {/* Evoluciones */}
            <div style={{ marginTop: '30px' }}>
              <h3 style={{ fontSize: '14pt', fontWeight: 600, marginBottom: '15px' }}>
                Evoluciones Clínicas
              </h3>
              {notes.length === 0 ? (
                <p style={{ fontStyle: 'italic', color: '#666' }}>
                  No hay evoluciones registradas.
                </p>
              ) : (
                <div>
                  {notes.map((note, index) => (
                    <div
                      key={note.id}
                      style={{
                        marginBottom: '20px',
                        paddingBottom: '15px',
                        borderBottom: index < notes.length - 1 ? '1px solid #ddd' : 'none',
                      }}
                    >
                      <p style={{ fontSize: '11pt', fontWeight: 600, marginBottom: '8px' }}>
                        {formatDateTime(note.recorded_at)}
                      </p>
                      <p
                        style={{
                          fontSize: '11pt',
                          lineHeight: '1.6',
                          whiteSpace: 'pre-wrap',
                          marginTop: '5px',
                        }}
                      >
                        {note.content}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
