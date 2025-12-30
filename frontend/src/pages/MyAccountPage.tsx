import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { authApi } from '../api/auth';
import { Input } from '../components/ui/Input';
import { Button } from '../components/ui/Button';
import { LoadingSpinner } from '../components/ui/LoadingSpinner';
import { ErrorMessage } from '../components/ui/ErrorMessage';
import type { UpdateProfileRequest } from '../types/auth';
import type { ApiError } from '../api/client';

export default function MyAccountPage() {
  const { user, loadUser } = useAuth();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [requestingReset, setRequestingReset] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  
  // Separar full_name en first_name y last_name
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');

  useEffect(() => {
    if (user) {
      // Separar full_name
      const nameParts = (user.full_name || '').split(' ', 2);
      setFirstName(nameParts[0] || '');
      setLastName(nameParts[1] || '');
      setEmail(user.email || '');
      setLoading(false);
    }
  }, [user]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);
    setSaving(true);

    try {
      const updateData: UpdateProfileRequest = {};
      
      if (firstName.trim() !== (user?.full_name?.split(' ', 2)[0] || '')) {
        updateData.first_name = firstName.trim();
      }
      if (lastName.trim() !== (user?.full_name?.split(' ', 2)[1] || '')) {
        updateData.last_name = lastName.trim();
      }
      if (email.trim() !== (user?.email || '')) {
        updateData.email = email.trim();
      }

      if (Object.keys(updateData).length === 0) {
        setSuccess('No hay cambios para guardar');
        setSaving(false);
        return;
      }

      await authApi.updateProfile(updateData);
      await loadUser(); // Recargar datos del usuario
      setSuccess('Perfil actualizado correctamente');
    } catch (err) {
      const apiError = err as ApiError;
      setError(apiError.detail || 'Error al actualizar perfil');
    } finally {
      setSaving(false);
    }
  };

  const handleRequestPasswordReset = async () => {
    if (!email || !email.trim()) {
      setError('Para cambiar contraseña, primero registrá tu email');
      return;
    }

    setError(null);
    setRequestingReset(true);

    try {
      await authApi.requestPasswordReset(email);
      // Mostrar mensaje genérico
      alert('Si el email es válido, te enviaremos un enlace para restablecer tu contraseña.');
    } catch {
      alert('Si el email es válido, te enviaremos un enlace para restablecer tu contraseña.');
    } finally {
      setRequestingReset(false);
    }
  };

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-6 max-w-2xl">
        <div className="flex justify-center py-12">
          <LoadingSpinner />
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-6 max-w-2xl">
      <h1 className="text-2xl font-bold text-gray-900 mb-6" style={{ color: 'var(--facility-accent, #667eea)' }}>
        Mi cuenta
      </h1>

      {error && (
        <div className="mb-4">
          <ErrorMessage message={error} onDismiss={() => setError(null)} />
        </div>
      )}

      {success && (
        <div className="mb-4 bg-green-50 border border-green-200 text-green-800 px-4 py-3 rounded-lg">
          <span className="text-sm">{success}</span>
        </div>
      )}

      <div
        className="rounded-xl shadow-lg p-6 mb-6"
        style={{ backgroundColor: 'var(--facility-card, white)' }}
      >
        <form onSubmit={handleSave} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Input
              label="Nombre"
              value={firstName}
              onChange={(e) => setFirstName(e.target.value)}
              disabled={saving}
            />
            <Input
              label="Apellido"
              value={lastName}
              onChange={(e) => setLastName(e.target.value)}
              disabled={saving}
            />
          </div>

          <Input
            label="Email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            disabled={saving}
          />

          {!email || !email.trim() ? (
            <div className="bg-yellow-50 border border-yellow-200 text-yellow-800 px-4 py-3 rounded-lg text-sm">
              Para cambiar contraseña, primero registrá tu email.
            </div>
          ) : null}

          <div className="flex space-x-3 pt-4">
            <Button type="submit" fullWidth disabled={saving}>
              {saving ? 'Guardando...' : 'Guardar cambios'}
            </Button>
          </div>
        </form>
      </div>

      <div
        className="rounded-xl shadow-lg p-6"
        style={{ backgroundColor: 'var(--facility-card, white)' }}
      >
        <h2 className="text-xl font-semibold text-gray-900 mb-4" style={{ color: 'var(--facility-accent, #667eea)' }}>
          Cambiar contraseña
        </h2>
        <p className="text-sm text-gray-600 mb-4">
          Te enviaremos un enlace por email para restablecer tu contraseña.
        </p>
        <Button
          onClick={handleRequestPasswordReset}
          disabled={requestingReset || !email || !email.trim()}
          fullWidth
        >
          {requestingReset ? 'Enviando...' : 'Cambiar contraseña'}
        </Button>
      </div>
    </div>
  );
}
