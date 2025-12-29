import React from 'react';
import { useAuth } from '../contexts/AuthContext';

export const PlatformPage: React.FC = () => {
  const { user, logout } = useAuth();

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-4xl mx-auto">
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex justify-between items-center mb-6">
            <h1 className="text-2xl font-bold text-gray-900">Plataforma Admin</h1>
            <button
              onClick={logout}
              className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
            >
              Cerrar sesión
            </button>
          </div>
          
          <div className="space-y-4">
            <div>
              <p className="text-gray-600">Usuario: {user?.full_name}</p>
              <p className="text-gray-600">DNI: {user?.dni}</p>
              <p className="text-gray-600">Email: {user?.email || 'N/A'}</p>
            </div>
            
            <div className="mt-6 p-4 bg-blue-50 rounded">
              <p className="text-blue-900">
                Esta es la página de administración de plataforma. 
                Funcionalidad completa pendiente de implementar.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
