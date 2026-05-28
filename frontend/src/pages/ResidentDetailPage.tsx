import React, { useState, useEffect, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { residentsApi } from '../api/residents';
import { Tabs } from '../components/ui/Tabs';
import { LoadingSpinner } from '../components/ui/LoadingSpinner';
import { ErrorMessage } from '../components/ui/ErrorMessage';
import { BottomNav } from '../components/layout/BottomNav';
import { Modal } from '../components/ui/Modal';
import { ResidentForm } from '../components/forms/ResidentForm';
import { ResidentFormModalFooter } from '../components/forms/ResidentFormModalFooter';
import { ResidentSummaryTab } from '../components/resident/ResidentSummaryTab';
import { ResidentNotesTab } from '../components/resident/ResidentNotesTab';
import { ResidentMedicationsTab } from '../components/resident/ResidentMedicationsTab';
import { ResidentContactsTab } from '../components/resident/ResidentContactsTab';
import { ResidentCertificatesTab } from '../components/resident/ResidentCertificatesTab';
import { useFacility } from '../contexts/FacilityContext';
import type { Resident, ResidentCreate, ResidentUpdate } from '../types/residents';
import type { ApiError } from '../api/client';

const ALL_TABS = [
  { id: 'summary', label: 'Resumen' },
  { id: 'notes', label: 'Notas clínicas' },
  { id: 'medications', label: 'Medicación' },
  { id: 'contacts', label: 'Contactos' },
  { id: 'certificates', label: 'Certificados' },
];

export const ResidentDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { facility } = useFacility();
  const { isOwner, isDoctor, isPlatformAdmin, getActiveRole } = useAuth();
  const [resident, setResident] = useState<Resident | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState('summary');
  const [deleting, setDeleting] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editFormLoading, setEditFormLoading] = useState(false);
  const EDIT_FORM_ID = 'resident-detail-edit-form';

  const activeRole = getActiveRole();
  const isClinicalUser =
    isPlatformAdmin || isOwner || isDoctor || activeRole === 'MEDICO' || activeRole === 'ADMIN';
  const canEdit = isClinicalUser;
  const canDelete = canEdit;

  const availableTabs = useMemo(() => {
    if (!isClinicalUser) {
      return ALL_TABS.filter((t) => t.id === 'summary');
    }
    return ALL_TABS;
  }, [isClinicalUser]);

  useEffect(() => {
    if (availableTabs.length > 0 && !availableTabs.find((t) => t.id === activeTab)) {
      setActiveTab(availableTabs[0].id);
    }
  }, [availableTabs, activeTab]);

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
      setError(apiError.detail || 'Error al cargar paciente');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteResident = async () => {
    if (!resident) return;
    const ok = confirm(
      `¿Eliminar a ${resident.first_name} ${resident.last_name}?\n\nEsta acción ocultará al paciente de la lista activa.`
    );
    if (!ok) return;

    try {
      setDeleting(true);
      setError(null);
      await residentsApi.delete(resident.id);
      navigate('/residents');
    } catch (err) {
      const apiError = err as ApiError;
      setError(apiError.detail || 'Error al eliminar paciente');
    } finally {
      setDeleting(false);
    }
  };

  const handleUpdateResident = async (data: ResidentCreate | ResidentUpdate) => {
    const updateData = data as ResidentUpdate;
    if (!resident) return;
    await residentsApi.update(resident.id, updateData);
    setShowEditModal(false);
    await loadResident();
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="flex justify-center py-8">
          <LoadingSpinner />
        </div>
      </div>
    );
  }

  if (error || !resident) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="px-4 py-8">
          <ErrorMessage
            message={error || 'Paciente no encontrado'}
            onDismiss={() => navigate('/residents')}
          />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      <div className="px-4 py-4">
        <div className="mb-3">
          <h1 className="text-xl font-semibold text-gray-900">
            {resident.first_name} {resident.last_name}
          </h1>
          {resident.dni && <p className="text-sm text-gray-500">DNI: {resident.dni}</p>}
          {resident.home_label && (
            <p className="text-sm text-gray-600 mt-1">Hogar: {resident.home_label}</p>
          )}
          {resident.status === 'INACTIVE' && (
            <span className="inline-block mt-2 px-2 py-1 text-xs rounded bg-amber-100 text-amber-800">
              Paciente inactivo
            </span>
          )}
        </div>

        <div className="flex flex-wrap justify-end mb-2 gap-2">
          {canEdit && (
            <button
              onClick={() => setShowEditModal(true)}
              className="px-3 py-2 text-sm bg-white border border-gray-300 text-gray-800 rounded hover:bg-gray-50"
            >
              Editar datos
            </button>
          )}
          <button
            onClick={() => navigate(`/clinical-history/${resident.id}`)}
            className="px-3 py-2 text-sm bg-white border border-primary-200 text-primary-700 rounded hover:bg-primary-50"
          >
            Historia clínica
          </button>
          {isClinicalUser && facility && (
            <button
              onClick={() =>
                navigate(`/g/${facility.id}/certificates?resident_id=${resident.id}`)
              }
              className="px-3 py-2 text-sm bg-white border border-primary-200 text-primary-700 rounded hover:bg-primary-50"
            >
              Certificados del paciente
            </button>
          )}
          {canDelete && (
            <button
              onClick={handleDeleteResident}
              disabled={deleting}
              className="px-3 py-2 text-sm bg-red-600 text-white rounded hover:bg-red-700 disabled:opacity-60"
            >
              {deleting ? 'Eliminando...' : 'Eliminar'}
            </button>
          )}
          <button
            onClick={() => navigate(`/residents/${resident.id}/print`)}
            className="px-3 py-2 text-sm bg-primary-600 text-white rounded hover:bg-primary-700"
          >
            Imprimir ficha
          </button>
        </div>

        <Tabs
          tabs={availableTabs.map((t) => ({ id: t.id, label: t.label }))}
          activeTab={activeTab}
          onChange={setActiveTab}
        />

        <div className="mt-4">
          {activeTab === 'summary' && (
            <ResidentSummaryTab resident={resident} onUpdate={loadResident} />
          )}
          {activeTab === 'notes' && <ResidentNotesTab residentId={resident.id} />}
          {activeTab === 'medications' && <ResidentMedicationsTab residentId={resident.id} />}
          {activeTab === 'contacts' && <ResidentContactsTab residentId={resident.id} />}
          {activeTab === 'certificates' && (
            <ResidentCertificatesTab
              residentId={resident.id}
              facilityId={facility?.id}
            />
          )}
        </div>
      </div>

      <Modal
        isOpen={showEditModal}
        onClose={() => setShowEditModal(false)}
        title="Editar paciente"
        size="xl"
        footer={
          facility ? (
            <ResidentFormModalFooter
              formId={EDIT_FORM_ID}
              loading={editFormLoading}
              isEdit
              onCancel={() => setShowEditModal(false)}
            />
          ) : undefined
        }
      >
        {facility && (
          <ResidentForm
            formId={EDIT_FORM_ID}
            showFooterButtons={false}
            onLoadingChange={setEditFormLoading}
            resident={resident}
            onSubmit={handleUpdateResident}
            onCancel={() => setShowEditModal(false)}
            facilityId={facility.id}
          />
        )}
      </Modal>

      <BottomNav />
    </div>
  );
};
