import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { residentsApi } from '../api/residents';
import { clinicalApi } from '../api/clinical';
import { medicationsApi } from '../api/medications';
import { certificatesApi } from '../api/certificates';
import { LoadingSpinner } from '../components/ui/LoadingSpinner';
import type { Resident } from '../types/residents';
import type { ClinicalNote } from '../types/clinical';
import type { Certificate } from '../types/certificates';
import type { MedicationPlan } from '../types/medications';
import type { ApiError } from '../api/client';
import '../components/certificates/print.css';

export default function MedicalFolderPrintPage() {
  const { patientId } = useParams<{ patientId: string }>();
  const navigate = useNavigate();
  const [patient, setPatient] = useState<Resident | null>(null);
  const [evolutions, setEvolutions] = useState<ClinicalNote[]>([]);
  const [prescriptions, setPrescriptions] = useState<MedicationPlan[]>([]);
  const [certificates, setCertificates] = useState<Certificate[]>([]);
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

      const [patientData, evolutionsData, prescriptionsData, certificatesData] = await Promise.all([
        residentsApi.get(patientId),
        clinicalApi.listNotes(patientId),
        medicationsApi.listPlans(patientId, false),
        certificatesApi.list({ resident_id: patientId }),
      ]);

      setPatient(patientData);
      setEvolutions(
        evolutionsData.sort((a, b) => 
          new Date(b.recorded_at).getTime() - new Date(a.recorded_at).getTime()
        )
      );
      setPrescriptions(
        prescriptionsData.sort((a, b) => 
          new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
        )
      );
      setCertificates(
        certificatesData.sort((a, b) => 
          new Date(b.issued_at).getTime() - new Date(a.issued_at).getTime()
        )
      );
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

  const getCertificateTypeLabel = (type: string): string => {
    const labels: Record<string, string> = {
      CONTROL_CLINICO: 'Control Clínico',
      OBITO: 'Óbito',
      PRESENCIA: 'Presencia',
    };
    return labels[type] || type;
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
          <div className="print-title">CARPETA MÉDICA</div>

          {/* Datos del paciente */}
          <div className="print-body">
            <div style={{ marginBottom: '25px' }}>
              <h3 style={{ fontSize: '14pt', fontWeight: 600, marginBottom: '12px' }}>
                Datos del Paciente
              </h3>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                <div>
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
                </div>
                <div>
                  {patient.coverage_type && (
                    <p style={{ marginBottom: '5px' }}>
                      <strong>Obra Social:</strong> {patient.coverage_type}
                    </p>
                  )}
                  {patient.coverage_number && (
                    <p style={{ marginBottom: '5px' }}>
                      <strong>Número:</strong> {patient.coverage_number}
                    </p>
                  )}
                  <p style={{ marginBottom: '5px' }}>
                    <strong>Fecha Ingreso:</strong> {formatDate(patient.admission_date)}
                  </p>
                </div>
              </div>
            </div>

            {/* Evoluciones */}
            <div style={{ marginTop: '30px', marginBottom: '30px' }}>
              <h3 style={{ fontSize: '14pt', fontWeight: 600, marginBottom: '15px' }}>
                Evoluciones Clínicas ({evolutions.length})
              </h3>
              {evolutions.length === 0 ? (
                <p style={{ fontStyle: 'italic', color: '#666' }}>
                  No hay evoluciones registradas.
                </p>
              ) : (
                <div>
                  {evolutions.slice(0, 10).map((note, index) => (
                    <div
                      key={note.id}
                      style={{
                        marginBottom: '15px',
                        paddingBottom: '12px',
                        borderBottom: index < Math.min(evolutions.length, 10) - 1 ? '1px solid #ddd' : 'none',
                      }}
                    >
                      <p style={{ fontSize: '11pt', fontWeight: 600, marginBottom: '6px' }}>
                        {formatDateTime(note.recorded_at)}
                      </p>
                      <p
                        style={{
                          fontSize: '11pt',
                          lineHeight: '1.6',
                          whiteSpace: 'pre-wrap',
                        }}
                      >
                        {note.content}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Recetas */}
            <div style={{ marginTop: '30px', marginBottom: '30px' }}>
              <h3 style={{ fontSize: '14pt', fontWeight: 600, marginBottom: '15px' }}>
                Recetas ({prescriptions.length})
              </h3>
              {prescriptions.length === 0 ? (
                <p style={{ fontStyle: 'italic', color: '#666' }}>
                  No hay recetas registradas.
                </p>
              ) : (
                <div>
                  {prescriptions.slice(0, 10).map((prescription, index) => (
                    <div
                      key={prescription.id}
                      style={{
                        marginBottom: '15px',
                        paddingBottom: '12px',
                        borderBottom: index < Math.min(prescriptions.length, 10) - 1 ? '1px solid #ddd' : 'none',
                      }}
                    >
                      <p style={{ fontSize: '11pt', fontWeight: 600, marginBottom: '6px' }}>
                        {prescription.med_name} - {prescription.dose}
                        {prescription.route && ` (${prescription.route})`}
                        {prescription.is_active ? ' - Activa' : ' - Inactiva'}
                      </p>
                      <p style={{ fontSize: '10pt', color: '#666', marginBottom: '4px' }}>
                        Fecha: {formatDate(prescription.created_at)}
                      </p>
                      {prescription.instructions && (
                        <p style={{ fontSize: '10pt', color: '#666' }}>
                          {prescription.instructions}
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Constancias */}
            <div style={{ marginTop: '30px', marginBottom: '30px' }}>
              <h3 style={{ fontSize: '14pt', fontWeight: 600, marginBottom: '15px' }}>
                Constancias ({certificates.length})
              </h3>
              {certificates.length === 0 ? (
                <p style={{ fontStyle: 'italic', color: '#666' }}>
                  No hay constancias registradas.
                </p>
              ) : (
                <div>
                  {certificates.slice(0, 10).map((certificate, index) => (
                    <div
                      key={certificate.id}
                      style={{
                        marginBottom: '15px',
                        paddingBottom: '12px',
                        borderBottom: index < Math.min(certificates.length, 10) - 1 ? '1px solid #ddd' : 'none',
                      }}
                    >
                      <p style={{ fontSize: '11pt', fontWeight: 600, marginBottom: '6px' }}>
                        {getCertificateTypeLabel(certificate.certificate_type)} - {formatDate(certificate.issued_at)}
                      </p>
                      <p
                        style={{
                          fontSize: '10pt',
                          lineHeight: '1.6',
                          whiteSpace: 'pre-wrap',
                        }}
                      >
                        {certificate.body_text}
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
