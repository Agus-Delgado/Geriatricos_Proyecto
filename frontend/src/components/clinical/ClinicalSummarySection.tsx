import React, { useState, useEffect, useCallback } from 'react';
import { clinicalApi } from '../../api/clinical';
import { Button } from '../ui/Button';
import { LoadingSpinner } from '../ui/LoadingSpinner';
import { ErrorMessage } from '../ui/ErrorMessage';
import { Modal } from '../ui/Modal';
import { useAuth } from '../../contexts/AuthContext';
import type { ClinicalSummary } from '../../types/clinical';
import type { ApiError } from '../../api/client';

interface ClinicalSummarySectionProps {
  residentId: string;
  onUpdate?: () => void;
  /** Si el padre carga el resumen, pasar summary + loading */
  summary?: ClinicalSummary | null;
  loading?: boolean;
  onSummaryChange?: (summary: ClinicalSummary | null) => void;
  className?: string;
}

export const ClinicalSummarySection: React.FC<ClinicalSummarySectionProps> = ({
  residentId,
  onUpdate,
  summary: controlledSummary,
  loading: controlledLoading,
  onSummaryChange,
  className = '',
}) => {
  const { isOwner } = useAuth();
  const isControlled = controlledSummary !== undefined;

  const [internalSummary, setInternalSummary] = useState<ClinicalSummary | null>(null);
  const [internalLoading, setInternalLoading] = useState(!isControlled);
  const [error, setError] = useState<string | null>(null);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingSummary, setEditingSummary] = useState<Partial<ClinicalSummary>>({});
  const [saving, setSaving] = useState(false);

  const summary = isControlled ? controlledSummary ?? null : internalSummary;
  const loading = isControlled ? (controlledLoading ?? false) : internalLoading;

  const setSummary = useCallback(
    (value: ClinicalSummary | null) => {
      if (isControlled) {
        onSummaryChange?.(value);
      } else {
        setInternalSummary(value);
      }
    },
    [isControlled, onSummaryChange]
  );

  const loadSummary = useCallback(async () => {
    if (isControlled) return;

    try {
      setInternalLoading(true);
      setError(null);
      const data = await clinicalApi.getSummaryOrNull(residentId);
      setInternalSummary(data);
      setEditingSummary(data ?? {});
    } catch (err) {
      const apiError = err as ApiError;
      setError(apiError.detail || 'Error al cargar resumen clínico');
    } finally {
      setInternalLoading(false);
    }
  }, [residentId, isControlled]);

  useEffect(() => {
    if (!isControlled) {
      loadSummary();
    }
  }, [isControlled, loadSummary]);

  useEffect(() => {
    if (isControlled) {
      setEditingSummary(controlledSummary ?? {});
    }
  }, [isControlled, controlledSummary]);

  const handleSave = async () => {
    try {
      setSaving(true);
      setError(null);
      const updateData = {
        primary_diagnosis: editingSummary.primary_diagnosis ?? undefined,
        secondary_diagnoses: editingSummary.secondary_diagnoses ?? undefined,
        allergies: editingSummary.allergies ?? undefined,
        current_medications: editingSummary.current_medications ?? undefined,
        medical_history: editingSummary.medical_history ?? undefined,
        family_history: editingSummary.family_history ?? undefined,
      };
      const saved = await clinicalApi.updateSummary(residentId, updateData);
      setSummary(saved);
      setShowEditModal(false);
      onUpdate?.();
      if (!isControlled) {
        await loadSummary();
      }
    } catch (err) {
      const apiError = err as ApiError;
      setError(apiError.detail || 'Error al guardar resumen clínico');
    } finally {
      setSaving(false);
    }
  };

  const openEditModal = () => {
    setEditingSummary(summary ?? {});
    setShowEditModal(true);
  };

  const hasSummaryContent =
    summary &&
    Boolean(
      summary.primary_diagnosis ||
        summary.secondary_diagnoses ||
        summary.allergies ||
        summary.current_medications ||
        summary.medical_history ||
        summary.family_history
    );

  if (loading) {
    return (
      <div className={`flex justify-center py-6 ${className}`}>
        <LoadingSpinner />
      </div>
    );
  }

  return (
    <div className={className}>
      {error && (
        <div className="mb-3">
          <ErrorMessage message={error} onDismiss={() => setError(null)} />
        </div>
      )}

      <div className="flex items-center justify-between mb-4">
        <h2
          className="text-xl font-semibold text-gray-900"
          style={{ color: 'var(--facility-accent, #667eea)' }}
        >
          Resumen clínico
        </h2>
        {!isOwner && (
          <Button variant="secondary" onClick={openEditModal}>
            {hasSummaryContent ? 'Editar resumen' : 'Crear resumen'}
          </Button>
        )}
      </div>

      {hasSummaryContent && summary ? (
        <div className="space-y-3 text-sm">
          {summary.primary_diagnosis && (
            <div>
              <span className="text-gray-600 font-medium">Diagnóstico principal</span>
              <p className="text-gray-900 mt-1">{summary.primary_diagnosis}</p>
            </div>
          )}
          {summary.secondary_diagnoses && (
            <div>
              <span className="text-gray-600 font-medium">Diagnósticos secundarios</span>
              <p className="text-gray-900 mt-1">{summary.secondary_diagnoses}</p>
            </div>
          )}
          {summary.allergies && (
            <div>
              <span className="text-gray-600 font-medium">Alergias</span>
              <p className="text-gray-900 mt-1">{summary.allergies}</p>
            </div>
          )}
          {summary.current_medications && (
            <div>
              <span className="text-gray-600 font-medium">Medicación de referencia</span>
              <p className="text-gray-900 mt-1">{summary.current_medications}</p>
            </div>
          )}
          {summary.medical_history && (
            <div>
              <span className="text-gray-600 font-medium">Antecedentes</span>
              <p className="text-gray-900 mt-1 whitespace-pre-wrap">{summary.medical_history}</p>
            </div>
          )}
          {summary.family_history && (
            <div>
              <span className="text-gray-600 font-medium">Antecedentes familiares</span>
              <p className="text-gray-900 mt-1 whitespace-pre-wrap">{summary.family_history}</p>
            </div>
          )}
        </div>
      ) : (
        <p className="text-gray-500 text-sm">
          Aún no hay resumen clínico registrado. Puede crear uno para documentar diagnósticos,
          alergias y antecedentes del paciente.
        </p>
      )}

      <Modal
        isOpen={showEditModal}
        onClose={() => setShowEditModal(false)}
        title={summary ? 'Editar resumen clínico' : 'Crear resumen clínico'}
        size="lg"
      >
        <div className="space-y-4">
          <div>
            <label className="label">Diagnóstico principal</label>
            <textarea
              value={editingSummary.primary_diagnosis || ''}
              onChange={(e) =>
                setEditingSummary({ ...editingSummary, primary_diagnosis: e.target.value })
              }
              className="input-field"
              rows={2}
              disabled={saving}
            />
          </div>
          <div>
            <label className="label">Diagnósticos secundarios</label>
            <textarea
              value={editingSummary.secondary_diagnoses || ''}
              onChange={(e) =>
                setEditingSummary({ ...editingSummary, secondary_diagnoses: e.target.value })
              }
              className="input-field"
              rows={2}
              disabled={saving}
            />
          </div>
          <div>
            <label className="label">Alergias</label>
            <textarea
              value={editingSummary.allergies || ''}
              onChange={(e) =>
                setEditingSummary({ ...editingSummary, allergies: e.target.value })
              }
              className="input-field"
              rows={2}
              disabled={saving}
            />
          </div>
          <div>
            <label className="label">Medicación de referencia (texto libre)</label>
            <textarea
              value={editingSummary.current_medications || ''}
              onChange={(e) =>
                setEditingSummary({ ...editingSummary, current_medications: e.target.value })
              }
              className="input-field"
              rows={2}
              disabled={saving}
            />
          </div>
          <div>
            <label className="label">Antecedentes</label>
            <textarea
              value={editingSummary.medical_history || ''}
              onChange={(e) =>
                setEditingSummary({ ...editingSummary, medical_history: e.target.value })
              }
              className="input-field"
              rows={4}
              disabled={saving}
            />
          </div>
          <div>
            <label className="label">Antecedentes familiares</label>
            <textarea
              value={editingSummary.family_history || ''}
              onChange={(e) =>
                setEditingSummary({ ...editingSummary, family_history: e.target.value })
              }
              className="input-field"
              rows={4}
              disabled={saving}
            />
          </div>
          <div className="flex space-x-3 pt-4">
            <Button
              variant="secondary"
              onClick={() => setShowEditModal(false)}
              fullWidth
              disabled={saving}
            >
              Cancelar
            </Button>
            <Button onClick={handleSave} fullWidth disabled={saving}>
              {saving ? 'Guardando...' : 'Guardar'}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};
