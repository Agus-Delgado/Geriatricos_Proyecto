import { Button } from '../ui/Button';

interface ResidentFormModalFooterProps {
  formId: string;
  loading: boolean;
  isEdit: boolean;
  onCancel: () => void;
}

export function ResidentFormModalFooter({
  formId,
  loading,
  isEdit,
  onCancel,
}: ResidentFormModalFooterProps) {
  return (
    <div className="flex flex-col-reverse sm:flex-row gap-3">
      <Button
        type="button"
        variant="secondary"
        onClick={onCancel}
        fullWidth
        disabled={loading}
      >
        Cancelar
      </Button>
      <Button type="submit" form={formId} fullWidth disabled={loading}>
        {loading ? 'Guardando...' : isEdit ? 'Actualizar paciente' : 'Crear paciente'}
      </Button>
    </div>
  );
}
