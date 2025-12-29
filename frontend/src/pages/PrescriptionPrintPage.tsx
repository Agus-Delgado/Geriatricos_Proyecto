import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { residentsApi } from '../api/residents';
import { medicationsApi } from '../api/medications';
import { LoadingSpinner } from '../components/ui/LoadingSpinner';
import type { Resident } from '../types/residents';
import type { ApiError } from '../api/client';
import '../components/certificates/print.css';

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

export default function PrescriptionPrintPage() {
  const { patientId } = useParams<{ patientId: string }>();
  const navigate = useNavigate();
  const [patient, setPatient] = useState<Resident | null>(null);
  const [prescriptions, setPrescriptions] = useState<MedicationPlan[]>([]);
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
          <div className="print-title">HISTORIAL DE RECETAS</div>

          {/* Datos del paciente */}
          <div className="print-body">
            <div style={{ marginBottom: '25px' }}>
              <h3 style={{ fontSize: '14pt', fontWeight: 600, marginBottom: '12px' }}>
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

            {/* Recetas */}
            <div style={{ marginTop: '30px' }}>
              <h3 style={{ fontSize: '14pt', fontWeight: 600, marginBottom: '15px' }}>
                Recetas ({prescriptions.length})
              </h3>
              {prescriptions.length === 0 ? (
                <p style={{ fontStyle: 'italic', color: '#666' }}>
                  No hay recetas registradas.
                </p>
              ) : (
                <div>
                  {prescriptions.map((prescription, index) => (
                    <div
                      key={prescription.id}
                      style={{
                        marginBottom: '20px',
                        paddingBottom: '15px',
                        borderBottom: index < prescriptions.length - 1 ? '1px solid #ddd' : 'none',
                      }}
                    >
                      <p style={{ fontSize: '12pt', fontWeight: 600, marginBottom: '8px' }}>
                        {prescription.med_name}
                      </p>
                      <div style={{ fontSize: '11pt', lineHeight: '1.6', marginBottom: '5px' }}>
                        <p>
                          <strong>Dosis:</strong> {prescription.dose}
                        </p>
                        {prescription.route && (
                          <p>
                            <strong>Vía:</strong> {prescription.route}
                          </p>
                        )}
                        {prescription.instructions && (
                          <p>
                            <strong>Instrucciones:</strong> {prescription.instructions}
                          </p>
                        )}
                        <p>
                          <strong>Estado:</strong> {prescription.is_active ? 'Activa' : 'Inactiva'}
                        </p>
                        <p>
                          <strong>Fecha:</strong> {formatDate(prescription.created_at)}
                        </p>
                        {prescription.start_date && (
                          <p>
                            <strong>Período:</strong> {formatDate(prescription.start_date)}
                            {prescription.end_date && ` - ${formatDate(prescription.end_date)}`}
                            {!prescription.end_date && ' (sin fecha de fin)'}
                          </p>
                        )}
                      </div>
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
