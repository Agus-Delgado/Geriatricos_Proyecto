import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '../ui/Button';

interface ResidentCertificatesTabProps {
  residentId: string;
  facilityId?: string;
}

export const ResidentCertificatesTab: React.FC<ResidentCertificatesTabProps> = ({
  residentId,
  facilityId,
}) => {
  const navigate = useNavigate();

  const handleOpenCertificates = () => {
    if (!facilityId) return;
    navigate(`/g/${facilityId}/certificates?resident_id=${residentId}`);
  };

  if (!facilityId) {
    return (
      <div className="space-y-4">
        <h3 className="font-semibold text-gray-900">Certificados del paciente</h3>
        <p className="text-sm text-gray-600">
          Seleccione un geriátrico para gestionar los certificados de este paciente.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <h3 className="font-semibold text-gray-900">Certificados del paciente</h3>
      <p className="text-sm text-gray-600">
        Emita constancias y certificados médicos asociados a este paciente (control clínico,
        supervivencia, óbito, consentimiento informado).
      </p>
      <Button
        onClick={handleOpenCertificates}
        style={{ backgroundColor: 'var(--facility-accent, #667eea)' }}
      >
        Abrir certificados
      </Button>
    </div>
  );
};
