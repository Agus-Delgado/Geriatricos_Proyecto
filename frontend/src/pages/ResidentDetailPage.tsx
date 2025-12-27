import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { residentsApi } from '../api/residents';
import { Header } from '../components/layout/Header';
import { Tabs } from '../components/ui/Tabs';
import { LoadingSpinner } from '../components/ui/LoadingSpinner';
import { ErrorMessage } from '../components/ui/ErrorMessage';
import { ResidentSummaryTab } from '../components/resident/ResidentSummaryTab';
import { ResidentNotesTab } from '../components/resident/ResidentNotesTab';
import { ResidentMedicationsTab } from '../components/resident/ResidentMedicationsTab';
import { ResidentContactsTab } from '../components/resident/ResidentContactsTab';
import { ResidentDocumentsTab } from '../components/resident/ResidentDocumentsTab';
import { ResidentCertificatesTab } from '../components/resident/ResidentCertificatesTab';
import type { Resident } from '../types/residents';
import type { ApiError } from '../api/client';

const TABS = [
  { id: 'summary', label: 'Resumen' },
  { id: 'notes', label: 'Notas' },
  { id: 'medications', label: 'Medicaciones' },
  { id: 'contacts', label: 'Contactos' },
  { id: 'documents', label: 'Documentos' },
  { id: 'certificates', label: 'Certificados' },
];

export const ResidentDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [resident, setResident] = useState<Resident | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState('summary');

  useEffect(() => {
    if (id) {
      loadResident();
    }
  }, [id]);

  const loadResident = async () => {
    if (!id) return;

    try {
      setLoading(true);
      setError(null);
      const data = await residentsApi.get(id);
      setResident(data);
    } catch (err) {
      const apiError = err as ApiError;
      setError(apiError.detail || 'Error al cargar residente');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Header title="Residente" showBack />
        <div className="flex justify-center py-8">
          <LoadingSpinner />
        </div>
      </div>
    );
  }

  if (error || !resident) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Header title="Residente" showBack />
        <div className="px-4 py-8">
          <ErrorMessage
            message={error || 'Residente no encontrado'}
            onDismiss={() => navigate('/residents')}
          />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      <Header
        title={`${resident.first_name} ${resident.last_name}`}
        showBack
      />

      <div className="px-4 py-4">
        <Tabs tabs={TABS} activeTab={activeTab} onChange={setActiveTab} />

        <div className="mt-4">
          {activeTab === 'summary' && (
            <ResidentSummaryTab resident={resident} onUpdate={loadResident} />
          )}
          {activeTab === 'notes' && <ResidentNotesTab residentId={resident.id} />}
          {activeTab === 'medications' && (
            <ResidentMedicationsTab residentId={resident.id} />
          )}
          {activeTab === 'contacts' && <ResidentContactsTab residentId={resident.id} />}
          {activeTab === 'documents' && <ResidentDocumentsTab residentId={resident.id} />}
          {activeTab === 'certificates' && (
            <ResidentCertificatesTab residentId={resident.id} />
          )}
        </div>
      </div>
    </div>
  );
};
