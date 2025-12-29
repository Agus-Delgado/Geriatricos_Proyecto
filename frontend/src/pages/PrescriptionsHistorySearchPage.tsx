import React from 'react';
import { useNavigate } from 'react-router-dom';
import { PatientSearchSelect } from '../components/patients/PatientSearchSelect';
import type { Resident } from '../types/residents';

export default function PrescriptionsHistorySearchPage() {
  const navigate = useNavigate();

  const handleSelectPatient = (patient: Resident) => {
    navigate(`/prescriptions-history/${patient.id}`);
  };

  return (
    <div className="container mx-auto px-4 py-6 max-w-4xl">
      <div
        className="rounded-xl shadow-lg p-6 mb-6"
        style={{ backgroundColor: 'var(--facility-card, white)' }}
      >
        <h1
          className="text-2xl font-bold text-gray-900 mb-6"
          style={{ color: 'var(--facility-accent, #667eea)' }}
        >
          Historial de Recetas
        </h1>
        <p className="text-gray-600 mb-6">
          Busque un paciente para ver su historial completo de recetas y planes de medicación.
        </p>
        <PatientSearchSelect onSelect={handleSelectPatient} />
      </div>
    </div>
  );
}
