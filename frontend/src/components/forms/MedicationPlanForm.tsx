import React, { useState, useMemo } from 'react';
import { Input } from '../ui/Input';
import { Button } from '../ui/Button';
import {
  formatMedicationInstructions,
  parseMedicationInstructions,
} from '../../utils/medicationInstructions';
import type { MedicationPlan, MedicationPlanCreate } from '../../types/medications';

interface MedicationPlanFormProps {
  plan?: MedicationPlan;
  onSubmit: (data: MedicationPlanCreate) => Promise<void>;
  onCancel: () => void;
  submitLabel?: string;
}

export const MedicationPlanForm: React.FC<MedicationPlanFormProps> = ({
  plan,
  onSubmit,
  onCancel,
  submitLabel,
}) => {
  const parsedInstructions = useMemo(
    () => parseMedicationInstructions(plan?.instructions),
    [plan?.instructions]
  );

  const [formData, setFormData] = useState({
    med_name: plan?.med_name || '',
    dose: plan?.dose || '',
    route: plan?.route || '',
    frequency: parsedInstructions.frequency || parsedInstructions.legacyText || '',
    observations: parsedInstructions.observations || '',
    start_date: plan?.start_date || new Date().toISOString().split('T')[0],
    end_date: plan?.end_date || '',
  });

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);

  const validate = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.med_name.trim()) {
      newErrors.med_name = 'El medicamento es requerido';
    }
    if (!formData.dose.trim()) {
      newErrors.dose = 'La dosis es requerida';
    }
    if (!formData.start_date) {
      newErrors.start_date = 'La fecha de inicio es requerida';
    }

    if (formData.end_date && formData.start_date) {
      const startDate = new Date(formData.start_date);
      const endDate = new Date(formData.end_date);
      if (endDate <= startDate) {
        newErrors.end_date = 'La fecha de fin debe ser posterior a la fecha de inicio';
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;

    setLoading(true);
    setErrors({});
    try {
      const instructions = formatMedicationInstructions({
        frequency: formData.frequency,
        observations: formData.observations,
      });

      await onSubmit({
        med_name: formData.med_name.trim(),
        dose: formData.dose.trim(),
        route: formData.route.trim() || null,
        instructions,
        start_date: formData.start_date,
        end_date: formData.end_date || null,
      });
    } catch (error: unknown) {
      const detail =
        error && typeof error === 'object' && 'detail' in error
          ? String((error as { detail: string }).detail)
          : error instanceof Error
            ? error.message
            : 'Error al guardar la indicación';
      setErrors({ submit: detail });
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <Input
        label="Medicamento *"
        value={formData.med_name}
        onChange={(e) => setFormData({ ...formData, med_name: e.target.value })}
        error={errors.med_name}
        disabled={loading}
      />

      <Input
        label="Dosis *"
        value={formData.dose}
        onChange={(e) => setFormData({ ...formData, dose: e.target.value })}
        error={errors.dose}
        placeholder="Ej: 500 mg, 1 comprimido"
        disabled={loading}
      />

      <Input
        label="Vía (opcional)"
        value={formData.route || ''}
        onChange={(e) => setFormData({ ...formData, route: e.target.value })}
        error={errors.route}
        placeholder="Ej: VO, IM, SC"
        disabled={loading}
      />

      <Input
        label="Frecuencia (opcional)"
        value={formData.frequency}
        onChange={(e) => setFormData({ ...formData, frequency: e.target.value })}
        placeholder="Ej: cada 8 horas, 1 vez al día"
        disabled={loading}
      />

      <div>
        <label className="label">Observaciones (opcional)</label>
        <textarea
          value={formData.observations}
          onChange={(e) => setFormData({ ...formData, observations: e.target.value })}
          className="input-field"
          rows={3}
          placeholder="Ej: con las comidas, controlar presión"
          disabled={loading}
        />
      </div>

      <Input
        label="Fecha de inicio *"
        type="date"
        value={formData.start_date}
        onChange={(e) => setFormData({ ...formData, start_date: e.target.value })}
        error={errors.start_date}
        disabled={loading}
      />

      <Input
        label="Fecha de fin (opcional)"
        type="date"
        value={formData.end_date}
        onChange={(e) => setFormData({ ...formData, end_date: e.target.value })}
        error={errors.end_date}
        disabled={loading}
      />

      {errors.submit && <div className="text-sm text-red-600">{errors.submit}</div>}

      <div className="flex space-x-3 pt-4">
        <Button type="button" variant="secondary" onClick={onCancel} fullWidth disabled={loading}>
          Cancelar
        </Button>
        <Button type="submit" fullWidth disabled={loading}>
          {loading
            ? 'Guardando...'
            : submitLabel || (plan ? 'Actualizar indicación' : 'Guardar indicación')}
        </Button>
      </div>
    </form>
  );
};
