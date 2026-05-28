import React from 'react';
import type { Resident } from '../../types/residents';
import { ClinicalSummarySection } from '../clinical/ClinicalSummarySection';

interface ResidentSummaryTabProps {
  resident: Resident;
  onUpdate: () => void;
}

export const ResidentSummaryTab: React.FC<ResidentSummaryTabProps> = ({
  resident,
  onUpdate,
}) => {
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('es-AR');
  };

  return (
    <div className="space-y-4">
      <div className="card">
        <h3 className="font-semibold text-gray-900 mb-4">Información personal</h3>
        <div className="space-y-2 text-sm">
          <div className="flex justify-between">
            <span className="text-gray-600">Nombre completo:</span>
            <span className="font-medium">
              {resident.first_name} {resident.last_name}
            </span>
          </div>
          {resident.dni && (
            <div className="flex justify-between">
              <span className="text-gray-600">DNI:</span>
              <span className="font-medium">{resident.dni}</span>
            </div>
          )}
          {resident.birth_date && (
            <div className="flex justify-between">
              <span className="text-gray-600">Fecha de nacimiento:</span>
              <span className="font-medium">{formatDate(resident.birth_date)}</span>
            </div>
          )}
          {resident.sex && (
            <div className="flex justify-between">
              <span className="text-gray-600">Sexo:</span>
              <span className="font-medium">
                {resident.sex === 'M' ? 'Masculino' : resident.sex === 'F' ? 'Femenino' : 'Otro'}
              </span>
            </div>
          )}
          <div className="flex justify-between">
            <span className="text-gray-600">Fecha de ingreso:</span>
            <span className="font-medium">{formatDate(resident.admission_date)}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-600">Estado:</span>
            <span
              className={`font-medium ${
                resident.stay_status === 'ACTIVE' ? 'text-green-600' : 'text-gray-600'
              }`}
            >
              {resident.stay_status === 'ACTIVE' ? 'Activo' : 'Finalizado'}
            </span>
          </div>
          {resident.coverage_type && (
            <div className="flex justify-between">
              <span className="text-gray-600">Cobertura:</span>
              <span className="font-medium">{resident.coverage_type}</span>
            </div>
          )}
        </div>
      </div>

      <div className="card">
        <ClinicalSummarySection residentId={resident.id} onUpdate={onUpdate} />
      </div>
    </div>
  );
};
