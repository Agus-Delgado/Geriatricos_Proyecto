import React, { useState } from 'react';
import { Input } from '../ui/Input';
import { Select } from '../ui/Select';
import { Button } from '../ui/Button';
import type { Resident, ResidentCreate, ResidentUpdate } from '../../types/residents';

interface ResidentFormProps {
  resident?: Resident;
  onSubmit: (data: ResidentCreate | ResidentUpdate) => Promise<void>;
  onCancel: () => void;
  facilityId: string;
}

export const ResidentForm: React.FC<ResidentFormProps> = ({
  resident,
  onSubmit,
  onCancel,
  facilityId,
}) => {
  const [formData, setFormData] = useState({
    first_name: resident?.first_name || '',
    last_name: resident?.last_name || '',
    dni: resident?.dni || '',
    birth_date: resident?.birth_date || '',
    sex: resident?.sex || '',
    coverage_type: resident?.coverage_type || '',
    coverage_number: resident?.coverage_number || '',
    admission_date: resident?.admission_date || new Date().toISOString().split('T')[0],
    notes: resident?.notes || '',
  });

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);

  const validate = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.first_name.trim()) {
      newErrors.first_name = 'El nombre es requerido';
    }
    if (!formData.last_name.trim()) {
      newErrors.last_name = 'El apellido es requerido';
    }
    if (!formData.admission_date) {
      newErrors.admission_date = 'La fecha de ingreso es requerida';
    } else {
      // Validar que la fecha de ingreso no sea futura
      const admissionDate = new Date(formData.admission_date);
      const today = new Date();
      today.setHours(23, 59, 59, 999); // Fin del día de hoy
      if (admissionDate > today) {
        newErrors.admission_date = 'La fecha de ingreso no puede ser futura';
      }
    }

    // Validar fecha de nacimiento si está presente
    if (formData.birth_date) {
      const birthDate = new Date(formData.birth_date);
      const today = new Date();
      if (birthDate > today) {
        newErrors.birth_date = 'La fecha de nacimiento no puede ser futura';
      }
      // Validar que la fecha de nacimiento sea anterior a la de ingreso
      if (formData.admission_date) {
        const admissionDate = new Date(formData.admission_date);
        if (birthDate >= admissionDate) {
          newErrors.birth_date = 'La fecha de nacimiento debe ser anterior a la fecha de ingreso';
        }
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
      if (resident) {
        await onSubmit(formData as ResidentUpdate);
      } else {
        await onSubmit({ ...formData, facility_id: facilityId } as ResidentCreate);
      }
    } catch (error: any) {
      // Manejar errores de validación del backend
      if (error?.detail) {
        setErrors({ submit: error.detail });
      } else {
        setErrors({ submit: 'Error al guardar el residente' });
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <Input
          label="Nombre *"
          value={formData.first_name}
          onChange={(e) => setFormData({ ...formData, first_name: e.target.value })}
          error={errors.first_name}
          disabled={loading}
        />
        <Input
          label="Apellido *"
          value={formData.last_name}
          onChange={(e) => setFormData({ ...formData, last_name: e.target.value })}
          error={errors.last_name}
          disabled={loading}
        />
      </div>

      <Input
        label="DNI"
        value={formData.dni}
        onChange={(e) => setFormData({ ...formData, dni: e.target.value })}
        disabled={loading}
      />

      <Input
        label="Fecha de Nacimiento"
        type="date"
        value={formData.birth_date}
        onChange={(e) => setFormData({ ...formData, birth_date: e.target.value })}
        error={errors.birth_date}
        disabled={loading}
      />

      <Select
        label="Sexo"
        value={formData.sex}
        onChange={(e) => setFormData({ ...formData, sex: e.target.value })}
        options={[
          { value: '', label: 'Seleccionar...' },
          { value: 'M', label: 'Masculino' },
          { value: 'F', label: 'Femenino' },
          { value: 'O', label: 'Otro' },
        ]}
        disabled={loading}
      />

      <Select
        label="Tipo de Cobertura"
        value={formData.coverage_type}
        onChange={(e) => setFormData({ ...formData, coverage_type: e.target.value })}
        options={[
          { value: '', label: 'Seleccionar...' },
          { value: 'PAMI', label: 'PAMI' },
          { value: 'OS', label: 'Obra Social' },
          { value: 'PARTICULAR', label: 'Particular' },
        ]}
        disabled={loading}
      />

      <Input
        label="Número de Cobertura"
        value={formData.coverage_number}
        onChange={(e) => setFormData({ ...formData, coverage_number: e.target.value })}
        disabled={loading}
      />

      <Input
        label="Fecha de Ingreso *"
        type="date"
        value={formData.admission_date}
        onChange={(e) => setFormData({ ...formData, admission_date: e.target.value })}
        error={errors.admission_date}
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
          {loading ? 'Guardando...' : resident ? 'Actualizar' : 'Crear'}
        </Button>
      </div>
    </form>
  );
};
