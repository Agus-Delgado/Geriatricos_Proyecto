import React from 'react';
import { useParams } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

export const GeriatricDashboardPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const { user, getActiveMembership } = useAuth();
  const activeMembership = getActiveMembership();

  return (
    <div 
      className="min-h-screen p-8"
      style={{ background: 'var(--facility-bg, #f9fafb)' }}
    >
      <div className="max-w-4xl mx-auto">
        <div 
          className="rounded-lg shadow-lg p-6"
          style={{ backgroundColor: 'var(--facility-card, white)' }}
        >
          <h1 className="text-2xl font-bold text-gray-900 mb-4">
            Dashboard - {activeMembership?.facility_name || `Geriátrico ${id}`}
          </h1>
          
          <div className="space-y-4">
            <div>
              <p className="text-gray-600">Usuario: {user?.full_name}</p>
              <p className="text-gray-600">Rol: {activeMembership ? activeMembership.role : 'N/A'}</p>
            </div>
            
            <div className="mt-6 p-4 bg-blue-50 rounded">
              <p className="text-blue-900">
                Esta es la página de dashboard para administradores. 
                Funcionalidad completa pendiente de implementar.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
