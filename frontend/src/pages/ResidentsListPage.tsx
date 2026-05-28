import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useFacility } from '../contexts/FacilityContext';
import { useAuth } from '../contexts/AuthContext';
import { residentsApi } from '../api/residents';
import { BottomNav } from '../components/layout/BottomNav';
import { MedicalPageShell } from '../components/layout/MedicalPageShell';
import { SearchBar } from '../components/ui/SearchBar';
import { LoadingSpinner } from '../components/ui/LoadingSpinner';
import { ErrorMessage } from '../components/ui/ErrorMessage';
import { Modal } from '../components/ui/Modal';
import { ResidentForm } from '../components/forms/ResidentForm';
import { ResidentFormModalFooter } from '../components/forms/ResidentFormModalFooter';
import type { Resident, ResidentCreate, ResidentUpdate } from '../types/residents';
import type { ApiError } from '../api/client';
import { RESIDENT_HOME_LABELS } from '../config/residentHomeLabels';

export const ResidentsListPage: React.FC = () => {
  const [residents, setResidents] = useState<Resident[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [stayStatusFilter, setStayStatusFilter] = useState<string>('ACTIVE');
  const [statusFilter, setStatusFilter] = useState<string>('ACTIVE');
  const [homeLabelFilter, setHomeLabelFilter] = useState<string>('');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingResident, setEditingResident] = useState<Resident | null>(null);
  const [createFormLoading, setCreateFormLoading] = useState(false);
  const [editFormLoading, setEditFormLoading] = useState(false);
  const CREATE_FORM_ID = 'resident-create-form';
  const EDIT_FORM_ID = 'resident-edit-form';
  const { facility } = useFacility();
  const { isDoctor, isOwner, isPlatformAdmin, getActiveRole } = useAuth();
  const navigate = useNavigate();
  const activeRole = getActiveRole();
  const canEdit =
    isPlatformAdmin || isOwner || isDoctor || activeRole === 'ADMIN' || activeRole === 'MEDICO';

  useEffect(() => {
    if (facility) {
      loadResidents();
    }
  }, [facility, searchQuery, stayStatusFilter, statusFilter, homeLabelFilter]);

  const loadResidents = async () => {
    if (!facility) return;

    try {
      setLoading(true);
      setError(null);
      const data = await residentsApi.list(facility.id, {
        q: searchQuery || undefined,
        stay_status: stayStatusFilter === '' ? undefined : stayStatusFilter,
        status: statusFilter === '' ? undefined : statusFilter,
        home_label: homeLabelFilter || undefined,
      });
      setResidents(data);
    } catch (err) {
      const apiError = err as ApiError;
      setError(apiError.detail || 'Error al cargar pacientes');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateResident = async (data: ResidentCreate | ResidentUpdate) => {
    const createData = data as ResidentCreate;
    try {
      const created = await residentsApi.create(createData);
      setShowCreateModal(false);
      loadResidents();
      return created;
    } catch (err) {
      const apiError = err as ApiError;
      throw new Error(apiError.detail || 'Error al crear paciente');
    }
  };

  const handleEditResident = async (resident: Resident) => {
    try {
      const residentData = await residentsApi.get(resident.id);
      setEditingResident(residentData);
      setShowEditModal(true);
    } catch (err) {
      const apiError = err as ApiError;
      setError(apiError.detail || 'Error al cargar paciente');
    }
  };

  const handleUpdateResident = async (data: ResidentCreate | ResidentUpdate) => {
    const updateData = data as ResidentUpdate;
    if (!editingResident) return;
    try {
      await residentsApi.update(editingResident.id, updateData);
      setShowEditModal(false);
      setEditingResident(null);
      loadResidents();
    } catch (err) {
      const apiError = err as ApiError;
      throw new Error(apiError.detail || 'Error al actualizar paciente');
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('es-AR');
  };

  return (
    <MedicalPageShell>
      <div className="px-4 py-4 space-y-4">
        <div className="flex items-center justify-between gap-2">
          <h1 className="text-xl font-semibold text-gray-900">Pacientes</h1>
          {canEdit && (
            <button
              onClick={() => setShowCreateModal(true)}
              className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors whitespace-nowrap text-sm font-medium"
            >
              Agregar paciente
            </button>
          )}
        </div>

        <SearchBar
          value={searchQuery}
          onChange={setSearchQuery}
          placeholder="Buscar por nombre o DNI..."
        />

        <div className="flex items-center gap-2">
          <select
            value={stayStatusFilter}
            onChange={(e) => setStayStatusFilter(e.target.value)}
            className="input-field flex-1"
          >
            <option value="ACTIVE">Estadía activa</option>
            <option value="ENDED">Estadía finalizada</option>
            <option value="">Todas las estadías</option>
          </select>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="input-field flex-1"
          >
            <option value="ACTIVE">Solo activos</option>
            <option value="">Incluir inactivos</option>
          </select>
        </div>
        <select
          value={homeLabelFilter}
          onChange={(e) => setHomeLabelFilter(e.target.value)}
          className="input-field w-full"
          aria-label="Filtrar por hogar"
        >
          <option value="">Todos los hogares</option>
          {RESIDENT_HOME_LABELS.map((label) => (
            <option key={label} value={label}>
              {label}
            </option>
          ))}
        </select>

        {error && <ErrorMessage message={error} onDismiss={() => setError(null)} />}

        {loading ? (
          <div className="flex justify-center py-8">
            <LoadingSpinner />
          </div>
        ) : residents.length === 0 ? (
          <div className="text-center text-gray-500 py-8">
            {searchQuery || stayStatusFilter
              ? 'No se encontraron pacientes'
              : 'No hay pacientes registrados. Usá «Agregar paciente» para comenzar.'}
          </div>
        ) : (
          <div className="space-y-3">
            {residents.map((resident) => (
              <div
                key={resident.id}
                className="card w-full hover:shadow-md transition-shadow"
              >
                <div className="flex items-start justify-between">
                  <button
                    onClick={() => navigate(`/residents/${resident.id}`)}
                    className="flex-1 text-left"
                  >
                    <h3 className="font-semibold text-gray-900">
                      {resident.first_name} {resident.last_name}
                    </h3>
                    {resident.dni && (
                      <p className="text-sm text-gray-500 mt-1">DNI: {resident.dni}</p>
                    )}
                    <p className="text-sm text-gray-500 mt-1">
                      Hogar: {resident.home_label || '—'}
                    </p>
                    <p className="text-sm text-gray-500 mt-1">
                      Ingreso: {formatDate(resident.admission_date)}
                    </p>
                    <div className="flex flex-wrap gap-2 mt-2">
                      <span
                        className={`inline-block px-2 py-1 text-xs rounded ${
                          resident.stay_status === 'ACTIVE'
                            ? 'bg-green-100 text-green-800'
                            : 'bg-gray-100 text-gray-800'
                        }`}
                      >
                        {resident.stay_status === 'ACTIVE' ? 'Estadía activa' : 'Estadía finalizada'}
                      </span>
                      {resident.status === 'INACTIVE' && (
                        <span className="inline-block px-2 py-1 text-xs rounded bg-amber-100 text-amber-800">
                          Inactivo
                        </span>
                      )}
                    </div>
                  </button>
                  <div className="flex gap-2 ml-2">
                    {canEdit && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleEditResident(resident);
                        }}
                        className="px-3 py-1 text-sm text-primary-600 hover:text-primary-700 hover:bg-primary-50 rounded transition-colors"
                        title="Editar paciente"
                      >
                        Editar
                      </button>
                    )}
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        window.open(`/residents/${resident.id}/print`, '_blank');
                      }}
                      className="px-3 py-1 text-sm text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded transition-colors"
                      title="Imprimir ficha"
                    >
                      Imprimir
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {facility && canEdit && (
          <div className="fixed bottom-24 right-4 z-30 md:hidden">
            <button
              onClick={() => setShowCreateModal(true)}
              className="bg-primary-600 text-white rounded-full p-4 shadow-lg hover:bg-primary-700 transition-colors"
              aria-label="Agregar paciente"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
            </button>
          </div>
        )}
      </div>

      <Modal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        title="Nuevo paciente"
        size="xl"
        footer={
          facility ? (
            <ResidentFormModalFooter
              formId={CREATE_FORM_ID}
              loading={createFormLoading}
              isEdit={false}
              onCancel={() => setShowCreateModal(false)}
            />
          ) : undefined
        }
      >
        {facility && (
          <ResidentForm
            formId={CREATE_FORM_ID}
            showFooterButtons={false}
            onLoadingChange={setCreateFormLoading}
            onSubmit={handleCreateResident}
            onCancel={() => setShowCreateModal(false)}
            facilityId={facility.id}
          />
        )}
      </Modal>

      <Modal
        isOpen={showEditModal}
        onClose={() => {
          setShowEditModal(false);
          setEditingResident(null);
        }}
        title="Editar paciente"
        size="xl"
        footer={
          editingResident && facility ? (
            <ResidentFormModalFooter
              formId={EDIT_FORM_ID}
              loading={editFormLoading}
              isEdit
              onCancel={() => {
                setShowEditModal(false);
                setEditingResident(null);
              }}
            />
          ) : undefined
        }
      >
        {editingResident && facility && (
          <ResidentForm
            formId={EDIT_FORM_ID}
            showFooterButtons={false}
            onLoadingChange={setEditFormLoading}
            resident={editingResident}
            onSubmit={handleUpdateResident}
            onCancel={() => {
              setShowEditModal(false);
              setEditingResident(null);
            }}
            facilityId={facility.id}
          />
        )}
      </Modal>

      <BottomNav />
    </MedicalPageShell>
  );
};
