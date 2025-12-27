import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { setUnauthorizedHandler } from '../../api/client';

/**
 * Componente que registra el handler global de errores 401.
 * Debe estar montado dentro del Router para tener acceso a useNavigate.
 */
export const UnauthorizedHandler: React.FC = () => {
  const navigate = useNavigate();
  const { logout } = useAuth();

  useEffect(() => {
    // Registrar el handler de 401
    setUnauthorizedHandler(() => {
      logout();
      navigate('/login', { replace: true });
    });

    // Cleanup: remover handler al desmontar
    return () => {
      setUnauthorizedHandler(() => {});
    };
  }, [navigate, logout]);

  return null;
};
