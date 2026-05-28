import { Link } from 'react-router-dom';
import { Button } from '../ui/Button';

const WELCOME_ITEMS = [
  { title: 'Pacientes', description: 'Cargar y gestionar pacientes.' },
  { title: 'Historia clínica', description: 'Registrar resumen y evoluciones.' },
  { title: 'Indicaciones', description: 'Guardar medicación e indicaciones por fecha.' },
  { title: 'Certificados', description: 'Crear e imprimir certificados.' },
  { title: 'Accesos médicos', description: 'Links externos configurados.' },
  { title: 'Mi cuenta', description: 'Completar DNI y cambiar contraseña.' },
] as const;

function getDismissKey(userId: string): string {
  return `medical_welcome_dismissed:${userId}`;
}

export function isMedicalWelcomeVisible(userId: string, dni: string | null | undefined): boolean {
  const hasDni = Boolean(dni?.trim());
  if (!hasDni) return true;
  return localStorage.getItem(getDismissKey(userId)) !== '1';
}

export function dismissMedicalWelcome(userId: string): void {
  localStorage.setItem(getDismissKey(userId), '1');
}

interface MedicalWelcomeCardProps {
  userId: string;
  dni: string | null | undefined;
  onDismiss: () => void;
}

export function MedicalWelcomeCard({ userId, dni, onDismiss }: MedicalWelcomeCardProps) {
  const hasDni = Boolean(dni?.trim());

  const handleDismiss = () => {
    dismissMedicalWelcome(userId);
    onDismiss();
  };

  return (
    <div className="mb-6 rounded-xl border border-indigo-100 bg-white/90 shadow-sm p-5">
      <h2 className="text-lg font-semibold text-gray-900 mb-1">Bienvenido al módulo médico</h2>
      <p className="text-sm text-gray-600 mb-4">
        Resumen rápido de las secciones principales:
      </p>
      {!hasDni && (
        <div className="mb-4 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          Completá tu DNI en{' '}
          <Link to="/mi-cuenta" className="font-medium underline">
            Mi cuenta
          </Link>{' '}
          para poder iniciar sesión con DNI además de email.
        </div>
      )}
      <ul className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-5">
        {WELCOME_ITEMS.map((item) => (
          <li key={item.title} className="text-sm">
            <span className="font-medium text-gray-900">{item.title}:</span>{' '}
            <span className="text-gray-600">{item.description}</span>
          </li>
        ))}
      </ul>
      <Button type="button" onClick={handleDismiss}>
        Entendido
      </Button>
    </div>
  );
}
