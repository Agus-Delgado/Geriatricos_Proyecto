import { useState, useEffect, useMemo } from 'react';
import { useParams, useSearchParams } from 'react-router-dom';
import { residentsApi } from '../api/residents';
import { certificatesApi } from '../api/certificates';
import { facilitiesApi } from '../api/facilities';
import { useAuth } from '../contexts/AuthContext';
import type { Resident } from '../types/residents';
import type { Certificate, CertificateType, CertificateDraft } from '../types/certificates';
import type { Facility } from '../types/auth';
import type { User } from '../types/auth';
import { SearchBar } from '../components/ui/SearchBar';
import { Button } from '../components/ui/Button';
import { LoadingSpinner } from '../components/ui/LoadingSpinner';
import { ErrorMessage } from '../components/ui/ErrorMessage';
import { Modal } from '../components/ui/Modal';
import { CertificateEditor } from '../components/certificates/CertificateEditor';
import { buildDefaultBodyText } from '../components/certificates/templates';
import {
  CERTIFICATE_TYPE_LABELS,
  getCertificateTypeLabel,
} from '../utils/certificateLabels';
import type { ApiError } from '../api/client';

function buildDraftFromCertificate(
  cert: Certificate,
  patient: Resident,
  facility: Facility,
  user: User
): CertificateDraft {
  return {
    type: cert.certificate_type as CertificateType,
    patientId: cert.resident_id,
    patientFullName: `${patient.first_name} ${patient.last_name}`,
    patientDni: patient.dni || '',
    hogarId: facility.id,
    hogarName: facility.name,
    hogarAddress: facility.address || '',
    issuedAt: cert.issued_at,
    bodyText: cert.body_text,
    doctorDisplayName: user.full_name,
    doctorLicenseNumber: user.license_number,
  };
}

const typeOptions: { value: CertificateType; label: string }[] = (
  Object.entries(CERTIFICATE_TYPE_LABELS) as [CertificateType, string][]
).map(([value, label]) => ({ value, label }));

export default function CertificatesPage() {
  const { id } = useParams<{ id: string }>();
  const [searchParams] = useSearchParams();
  const { user, activeFacilityId } = useAuth();
  const facilityId = id ?? activeFacilityId ?? '';

  const [patients, setPatients] = useState<Resident[]>([]);
  const [selectedPatient, setSelectedPatient] = useState<Resident | null>(null);
  const [certificates, setCertificates] = useState<Certificate[]>([]);
  const [facility, setFacility] = useState<Facility | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [certificatesError, setCertificatesError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [showTypeModal, setShowTypeModal] = useState(false);
  const [showEditorModal, setShowEditorModal] = useState(false);
  const [editingDraft, setEditingDraft] = useState<CertificateDraft | null>(null);
  const [editingCertificate, setEditingCertificate] = useState<Certificate | null>(null);

  useEffect(() => {
    if (facilityId) {
      loadData();
    }
  }, [facilityId]);

  useEffect(() => {
    const residentId = searchParams.get('resident_id');
    if (residentId && patients.length > 0 && !selectedPatient) {
      const patient = patients.find((p) => p.id === residentId);
      if (patient) {
        setSelectedPatient(patient);
      }
    }
  }, [patients, searchParams, selectedPatient]);

  useEffect(() => {
    if (selectedPatient) {
      loadCertificates();
    } else {
      setCertificates([]);
      setCertificatesError(null);
    }
  }, [selectedPatient, facilityId]);

  const loadData = async () => {
    try {
      setLoading(true);
      setError(null);

      const facilityData = await facilitiesApi.get(facilityId);
      setFacility(facilityData);

      const patientsData = await residentsApi.list(facilityId, {
        stay_status: 'ACTIVE',
      });
      setPatients(patientsData);
    } catch (err) {
      const apiError = err as ApiError;
      setError(apiError.detail || 'Error al cargar datos');
    } finally {
      setLoading(false);
    }
  };

  const loadCertificates = async () => {
    if (!selectedPatient) return;

    try {
      setCertificatesError(null);
      const data = await certificatesApi.list({
        resident_id: selectedPatient.id,
        facility_id: facilityId,
      });
      setCertificates(data);
    } catch (err) {
      const apiError = err as ApiError;
      setCertificatesError(apiError.detail || 'Error al cargar certificados');
    }
  };

  const filteredPatients = useMemo(() => {
    if (!searchQuery) return patients;
    const query = searchQuery.toLowerCase();
    return patients.filter(
      (p) =>
        p.first_name.toLowerCase().includes(query) ||
        p.last_name.toLowerCase().includes(query) ||
        p.dni?.toLowerCase().includes(query)
    );
  }, [patients, searchQuery]);

  const handleSelectPatient = (patient: Resident) => {
    setSelectedPatient(patient);
    setSearchQuery('');
  };

  const handleNewCertificate = (type: CertificateType) => {
    if (!selectedPatient || !facility || !user) return;

    const issuedAt = new Date();
    const patientFullName = `${selectedPatient.first_name} ${selectedPatient.last_name}`;
    const patientDni = selectedPatient.dni || '';

    const draft: CertificateDraft = {
      type,
      patientId: selectedPatient.id,
      patientFullName,
      patientDni,
      hogarId: facility.id,
      hogarName: facility.name,
      hogarAddress: facility.address || '',
      issuedAt: issuedAt.toISOString(),
      bodyText: buildDefaultBodyText({
        type,
        patientFullName,
        patientDni,
        issuedAt,
        hogarName: facility.name,
        hogarAddress: facility.address || undefined,
      }),
      doctorDisplayName: user.full_name,
      doctorLicenseNumber: user.license_number,
    };

    setEditingDraft(draft);
    setEditingCertificate(null);
    setShowTypeModal(false);
    setShowEditorModal(true);
  };

  const handleEditCertificate = (cert: Certificate) => {
    if (!facility || !user) return;

    const patient = patients.find((p) => p.id === cert.resident_id);
    if (!patient) return;

    setEditingDraft(buildDraftFromCertificate(cert, patient, facility, user));
    setEditingCertificate(cert);
    setShowEditorModal(true);
  };

  const handlePrintCertificate = (cert: Certificate) => {
    if (!facility || !user) return;

    const patient = patients.find((p) => p.id === cert.resident_id);
    if (!patient) return;

    handlePrint(buildDraftFromCertificate(cert, patient, facility, user));
  };

  const handleSave = async (draft: CertificateDraft) => {
    if (!facility || !user) return;

    try {
      if (editingCertificate) {
        await certificatesApi.update(editingCertificate.id, {
          body_text: draft.bodyText,
          issued_at: draft.issuedAt,
        });
      } else {
        await certificatesApi.create({
          resident_id: draft.patientId,
          facility_id: draft.hogarId,
          certificate_type: draft.type,
          body_text: draft.bodyText,
          issued_at: draft.issuedAt,
        });
      }

      setShowEditorModal(false);
      setEditingDraft(null);
      setEditingCertificate(null);
      await loadCertificates();
    } catch (err) {
      const apiError = err as ApiError;
      throw new Error(apiError.detail || 'Error al guardar certificado');
    }
  };

  const handlePreview = () => {
    // Preview handled inside CertificateEditor
  };

  const handlePrint = (draft: CertificateDraft) => {
    sessionStorage.setItem('printDraft', JSON.stringify(draft));
    window.open('/certificates/print', '_blank');
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString('es-AR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <LoadingSpinner />
      </div>
    );
  }

  return (
    <div className="min-h-screen" style={{ background: 'var(--facility-bg, #f9fafb)' }}>
      <div className="p-4 md:p-8">
        <div className="max-w-6xl mx-auto">
          <div
            className="rounded-2xl shadow-lg mb-6 p-8"
            style={{ backgroundColor: 'var(--facility-card, white)' }}
          >
            <h1 className="text-3xl font-bold text-gray-900 mb-2">Certificados</h1>
            <p className="text-sm text-gray-600">{facility?.name}</p>
          </div>

          {error && (
            <div className="mb-4">
              <ErrorMessage message={error} onDismiss={() => setError(null)} />
            </div>
          )}

          <div
            className="rounded-xl shadow-lg p-6 mb-6"
            style={{ backgroundColor: 'var(--facility-card, white)' }}
          >
            <h2 className="text-xl font-semibold text-gray-900 mb-4">Seleccionar paciente</h2>
            <SearchBar
              value={searchQuery}
              onChange={setSearchQuery}
              placeholder="Buscar por DNI o nombre..."
            />
            {searchQuery && filteredPatients.length > 0 && (
              <div className="mt-4 border border-gray-200 rounded-lg max-h-60 overflow-y-auto">
                {filteredPatients.map((patient) => (
                  <button
                    key={patient.id}
                    onClick={() => handleSelectPatient(patient)}
                    className="w-full text-left px-4 py-3 hover:bg-gray-50 border-b border-gray-100 last:border-b-0"
                  >
                    <div className="font-medium text-gray-900">
                      {patient.last_name}, {patient.first_name}
                    </div>
                    <div className="text-sm text-gray-600">DNI: {patient.dni || 'N/A'}</div>
                  </button>
                ))}
              </div>
            )}
            {selectedPatient && (
              <div className="mt-4 p-4 bg-primary-50 rounded-lg">
                <div className="font-medium text-gray-900">
                  Paciente seleccionado: {selectedPatient.last_name}, {selectedPatient.first_name}
                </div>
                <div className="text-sm text-gray-600">DNI: {selectedPatient.dni || 'N/A'}</div>
                <p className="text-xs text-gray-500 mt-2">
                  Para cambiar de paciente, busque otro en el campo de búsqueda arriba
                </p>
              </div>
            )}
          </div>

          {!selectedPatient && (
            <div
              className="rounded-xl shadow-lg p-8 mb-6 text-center text-gray-500"
              style={{ backgroundColor: 'var(--facility-card, white)' }}
            >
              Seleccione un paciente para ver o emitir certificados
            </div>
          )}

          {selectedPatient && (
            <div
              className="rounded-xl shadow-lg p-6 mb-6"
              style={{ backgroundColor: 'var(--facility-card, white)' }}
            >
              <div className="flex flex-wrap justify-between items-center gap-3 mb-4">
                <h2 className="text-xl font-semibold text-gray-900">Certificados del paciente</h2>
                <Button
                  onClick={() => setShowTypeModal(true)}
                  style={{ backgroundColor: 'var(--facility-accent, #667eea)' }}
                >
                  Nueva constancia / certificado
                </Button>
              </div>

              {certificatesError && (
                <div className="mb-4">
                  <ErrorMessage
                    message={certificatesError}
                    onDismiss={() => setCertificatesError(null)}
                  />
                </div>
              )}

              {certificates.length === 0 && !certificatesError ? (
                <div className="text-center py-8 text-gray-500">
                  No hay certificados emitidos para este paciente
                </div>
              ) : (
                <div className="space-y-3">
                  {certificates.map((cert) => (
                    <div
                      key={cert.id}
                      className="border border-gray-200 rounded-lg p-4 hover:bg-gray-50 cursor-pointer"
                      onClick={() => handleEditCertificate(cert)}
                    >
                      <div className="flex flex-wrap justify-between items-start gap-2">
                        <div>
                          <div className="font-medium text-gray-900">
                            {getCertificateTypeLabel(cert.certificate_type)}
                          </div>
                          <div className="text-sm text-gray-600 mt-1">
                            Emitido: {formatDate(cert.issued_at)}
                          </div>
                        </div>
                        <div className="flex gap-2">
                          <button
                            type="button"
                            className="text-sm px-3 py-1 bg-white border border-gray-300 text-gray-800 rounded hover:bg-gray-50"
                            onClick={(e) => {
                              e.stopPropagation();
                              handlePrintCertificate(cert);
                            }}
                          >
                            Imprimir
                          </button>
                          <button
                            type="button"
                            className="text-sm px-3 py-1 bg-gray-200 text-gray-800 rounded hover:bg-gray-300"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleEditCertificate(cert);
                            }}
                          >
                            Ver / editar
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      <Modal
        isOpen={showTypeModal}
        onClose={() => setShowTypeModal(false)}
        title="Nuevo certificado"
        size="md"
      >
        <p className="text-sm text-gray-600 mb-4">Seleccione el tipo de certificado a emitir</p>
        <div className="space-y-3">
          {typeOptions.map((option) => (
            <Button
              key={option.value}
              fullWidth
              onClick={() => handleNewCertificate(option.value)}
              style={{ backgroundColor: 'var(--facility-accent, #667eea)' }}
            >
              {option.label}
            </Button>
          ))}
        </div>
      </Modal>

      {editingDraft && (
        <Modal
          isOpen={showEditorModal}
          onClose={() => {
            setShowEditorModal(false);
            setEditingDraft(null);
            setEditingCertificate(null);
          }}
          title={editingCertificate ? 'Editar certificado' : 'Nueva constancia / certificado'}
          size="lg"
        >
          <CertificateEditor
            initialDraft={editingDraft}
            onSave={handleSave}
            onPreview={handlePreview}
            onPrint={handlePrint}
            onCancel={() => {
              setShowEditorModal(false);
              setEditingDraft(null);
              setEditingCertificate(null);
            }}
          />
        </Modal>
      )}
    </div>
  );
}
