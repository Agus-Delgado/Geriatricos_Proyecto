import React from 'react';

interface ResidentCertificatesTabProps {
  residentId: string;
}

export const ResidentCertificatesTab: React.FC<ResidentCertificatesTabProps> = ({
  residentId: _residentId,
}) => {
  return (
    <div className="space-y-4">
      <h3 className="font-semibold text-gray-900">Certificados</h3>
      <div className="text-center text-gray-500 py-8">
        Funcionalidad de certificados próximamente
      </div>
    </div>
  );
};
