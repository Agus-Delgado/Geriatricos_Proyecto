import { useState } from 'react';
import { Input } from '../ui/Input';
import { Button } from '../ui/Button';
import type { CertificateType, CertificateDraft } from '../../types/certificates';
import { buildDefaultBodyText, formatDateAR, formatTimeAR } from './templates';

interface CertificateEditorProps {
  draft: CertificateDraft;
  onSave?: (draft: CertificateDraft) => Promise<void>;
  onPreview?: (draft: CertificateDraft) => void;
  onPrint?: (draft: CertificateDraft) => void;
  onCancel?: () => void;
}

export const CertificateEditor = ({
  draft: initialDraft,
  onSave,
  onPreview,
  onPrint,
  onCancel,
}) => {
  const [draft, setDraft] = useState<CertificateDraft>(initialDraft);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const typeLabels: Record<CertificateType, string> = {
    CONTROL_CLINICO: 'Control Clínico',
    OBITO: 'Óbito',
    PRESENCIA: 'Supervivencia',
  };

  const handleDateChange = (dateStr: string) => {
    const [datePart, timePart] = dateStr.split('T');
    const [year, month, day] = datePart.split('-');
    const [hours = '00', minutes = '00'] = (timePart || '').split(':');
    
    const newDate = new Date(`${year}-${month}-${day}T${hours}:${minutes}`);
    setDraft({ ...draft, issuedAt: newDate.toISOString() });
  };

  const handleBodyTextChange = (text: string) => {
    setDraft({ ...draft, bodyText: text });
  };

  const handleResetTemplate = () => {
    const issuedAt = new Date(draft.issuedAt);
    const defaultText = buildDefaultBodyText({
      type: draft.type,
      patientFullName: draft.patientFullName,
      patientDni: draft.patientDni,
      issuedAt,
    });
    setDraft({ ...draft, bodyText: defaultText });
  };

  const validate = (): boolean => {
    const newErrors: Record<string, string> = {};
    
    if (!draft.bodyText.trim()) {
      newErrors.bodyText = 'El texto del cuerpo es requerido';
    }
    
    if (!draft.issuedAt) {
      newErrors.issuedAt = 'La fecha y hora son requeridas';
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSave = async () => {
    if (!validate()) return;
    if (!onSave) return;
    
    setLoading(true);
    try {
      await onSave(draft);
    } catch (error) {
      console.error('Error al guardar:', error);
    } finally {
      setLoading(false);
    }
  };

  const handlePreview = () => {
    if (!validate()) return;
    if (onPreview) {
      onPreview(draft);
    }
  };

  const handlePrint = () => {
    if (!validate()) return;
    if (onPrint) {
      onPrint(draft);
    }
  };

  const issuedAtDate = new Date(draft.issuedAt);
  const dateValue = issuedAtDate.toISOString().slice(0, 16); // YYYY-MM-DDTHH:mm

  return (
    <div className="space-y-6">
      {/* Tipo (readonly) */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Tipo de Constancia
        </label>
        <Input
          value={typeLabels[draft.type]}
          readOnly
          className="bg-gray-100 cursor-not-allowed"
        />
      </div>

      {/* Paciente (readonly) */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Paciente
        </label>
        <Input
          value={`${draft.patientFullName} - DNI: ${draft.patientDni}`}
          readOnly
          className="bg-gray-100 cursor-not-allowed"
        />
      </div>

      {/* Fecha y Hora (editable) */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Fecha y Hora
        </label>
        <Input
          type="datetime-local"
          value={dateValue}
          onChange={(e) => handleDateChange(e.target.value)}
          error={errors.issuedAt}
        />
        <p className="mt-1 text-xs text-gray-500">
          Fecha actual: {formatDateAR(issuedAtDate)} - Hora: {formatTimeAR(issuedAtDate)}
        </p>
      </div>

      {/* Cuerpo (textarea editable) */}
      <div>
        <div className="flex justify-between items-center mb-2">
          <label className="block text-sm font-medium text-gray-700">
            Cuerpo de la Constancia
          </label>
          <button
            type="button"
            onClick={handleResetTemplate}
            className="text-sm text-primary-600 hover:text-primary-700"
          >
            Restaurar plantilla
          </button>
        </div>
        <textarea
          value={draft.bodyText}
          onChange={(e) => handleBodyTextChange(e.target.value)}
          rows={8}
          className={`w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 ${
            errors.bodyText ? 'border-red-500 focus:ring-red-500' : ''
          }`}
          placeholder="Ingrese el texto de la constancia..."
        />
        {errors.bodyText && (
          <p className="mt-1 text-sm text-red-600">{errors.bodyText}</p>
        )}
      </div>

      {/* Botones */}
      <div className="flex gap-3 justify-end">
        {onCancel && (
          <Button variant="secondary" onClick={onCancel}>
            Cancelar
          </Button>
        )}
        {onPreview && (
          <Button variant="secondary" onClick={handlePreview}>
            Vista Previa
          </Button>
        )}
        {onPrint && (
          <Button variant="primary" onClick={handlePrint}>
            Imprimir
          </Button>
        )}
        {onSave && (
          <Button variant="primary" onClick={handleSave} disabled={loading}>
            {loading ? 'Guardando...' : 'Guardar'}
          </Button>
        )}
      </div>
    </div>
  );
};
