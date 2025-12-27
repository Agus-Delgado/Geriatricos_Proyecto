import React, { useState } from 'react';
import { Input } from '../ui/Input';
import { Button } from '../ui/Button';
import type { MedicationPlan, MedicationPlanCreate } from '../../types/medications';

interface MedicationPlanFormProps {
  plan?: MedicationPlan;
  onSubmit: (data: MedicationPlanCreate) => Promise<void>;
  onCancel: () => void;
}

export const MedicationPlanForm: React.FC<MedicationPlanFormProps> = ({
  plan,
  onSubmit,
  onCancel,
}) => {
  const [formData, setFormData] = useState({
    medication_name: plan?.medication_name || '',
    dosage: plan?.dosage || '',
    frequency: plan?.frequency || '',
    start_date: plan?.start_date || new Date().toISOString().split('T')[0],
    end_date: plan?.end_date || '',
    notes: plan?.notes || '',
  });

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);

  const validate = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.medication_name.trim()) {
      newErrors.medication_name = 'El nombre del medicamento es requerido';
    }
    if (!formData.dosage.trim()) {
      newErrors.dosage = 'La dosis es requerida';
    }
    if (!formData.frequency.trim()) {
      newErrors.frequency = 'La frecuencia es requerida';
    }
    if (!formData.start_date) {
      newErrors.start_date = 'La fecha de inicio es requerida';
    } else {
      // Validar que la fecha de inicio no sea futura (opcional, puede ser futura para planes programados)
      // No validamos esto ya que puede ser un plan futuro
    }

    // Validar que end_date sea posterior a start_date si ambas están presentes
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
      await onSubmit(formData);
    } catch (error: any) {
      // Manejar errores de validación del backend
      if (error?.detail) {
        setErrors({ submit: error.detail });
      } else {
        setErrors({ submit: 'Error al guardar el plan de medicación' });
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <Input
        label="Nombre del Medicamento *"
        value={formData.medication_name}
        onChange={(e) => setFormData({ ...formData, medication_name: e.target.value })}
        error={errors.medication_name}
        disabled={loading}
      />

      <Input
        label="Dosis *"
        value={formData.dosage}
        onChange={(e) => setFormData({ ...formData, dosage: e.target.value })}
        error={errors.dosage}
        placeholder="Ej: 500mg, 1 comprimido"
        disabled={loading}
      />

      <Input
        label="Frecuencia *"
        value={formData.frequency}
        onChange={(e) => setFormData({ ...formData, frequency: e.target.value })}
        error={errors.frequency}
        placeholder="Ej: Cada 8 horas, 2 veces al día"
        disabled={loading}
      />

      <Input
        label="Fecha de Inicio *"
        type="date"
        value={formData.start_date}
        onChange={(e) => setFormData({ ...formData, start_date: e.target.value })}
        error={errors.start_date}
        disabled={loading}
      />

      <Input
        label="Fecha de Fin (opcional)"
        type="date"
        value={formData.end_date}
        onChange={(e) => setFormData({ ...formData, end_date: e.target.value })}
        error={errors.end_date}
        disabled={loading}
      />

      <div>
        <label className="label">Notas</label>
        <textarea
          value={formData.notes}
          onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
          className="input-field"
          rows={3}
          disabled={loading}
        />
      </div>

      {errors.submit && (
        <div className="text-sm text-red-600">{errors.submit}</div>
      )}

      <div className="flex space-x-3 pt-4">
        <Button type="button" variant="secondary" onClick={onCancel} fullWidth disabled={loading}>
          Cancelar
        </Button>
        <Button type="submit" fullWidth disabled={loading}>
          {loading ? 'Guardando...' : plan ? 'Actualizar' : 'Crear Plan'}
        </Button>
      </div>
    </form>
  );
};
