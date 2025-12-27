import React, { useState } from 'react';
import { Input } from '../ui/Input';
import { Button } from '../ui/Button';
import type {
  ResidentContact,
  ResidentContactCreate,
  ResidentContactUpdate,
} from '../../types/residents';

interface ContactFormProps {
  contact?: ResidentContact;
  onSubmit: (data: ResidentContactCreate | ResidentContactUpdate) => Promise<void>;
  onCancel: () => void;
}

export const ContactForm: React.FC<ContactFormProps> = ({
  contact,
  onSubmit,
  onCancel,
}) => {
  const [formData, setFormData] = useState({
    full_name: contact?.full_name || '',
    relationship: contact?.relationship || '',
    phone: contact?.phone || '',
    email: contact?.email || '',
    address: contact?.address || '',
    is_emergency_contact: contact?.is_emergency_contact || false,
    notes: contact?.notes || '',
  });

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);

  const validate = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.full_name.trim()) {
      newErrors.full_name = 'El nombre completo es requerido';
    }
    if (!formData.relationship.trim()) {
      newErrors.relationship = 'La relación es requerida';
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
      if (contact) {
        await onSubmit(formData as ResidentContactUpdate);
      } else {
        await onSubmit(formData as ResidentContactCreate);
      }
    } catch (error: any) {
      // Manejar errores de validación del backend
      if (error?.detail) {
        setErrors({ submit: error.detail });
      } else {
        setErrors({ submit: 'Error al guardar el contacto' });
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <Input
        label="Nombre Completo *"
        value={formData.full_name}
        onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
        error={errors.full_name}
        disabled={loading}
      />

      <Input
        label="Relación *"
        value={formData.relationship}
        onChange={(e) => setFormData({ ...formData, relationship: e.target.value })}
        error={errors.relationship}
        placeholder="Ej: Hijo/a, Esposo/a, etc."
        disabled={loading}
      />

      <Input
        label="Teléfono"
        type="tel"
        value={formData.phone}
        onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
        disabled={loading}
      />

      <Input
        label="Email"
        type="email"
        value={formData.email}
        onChange={(e) => setFormData({ ...formData, email: e.target.value })}
        disabled={loading}
      />

      <Input
        label="Dirección"
        value={formData.address}
        onChange={(e) => setFormData({ ...formData, address: e.target.value })}
        disabled={loading}
      />

      <div className="flex items-center">
        <input
          type="checkbox"
          id="emergency"
          checked={formData.is_emergency_contact}
          onChange={(e) =>
            setFormData({ ...formData, is_emergency_contact: e.target.checked })
          }
          className="w-4 h-4 text-primary-600 border-gray-300 rounded focus:ring-primary-500"
          disabled={loading}
        />
        <label htmlFor="emergency" className="ml-2 text-sm text-gray-700">
          Contacto de emergencia
        </label>
      </div>

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
          {loading ? 'Guardando...' : contact ? 'Actualizar' : 'Crear'}
        </Button>
      </div>
    </form>
  );
};
