import React, { createContext, useContext, useState, useEffect, useRef, ReactNode } from 'react';
import { facilitiesApi } from '../api/facilities';
import { useAuth } from './AuthContext';
import type { Facility } from '../types/auth';

interface FacilityContextType {
  facility: Facility | null;
  setFacility: (facility: Facility | null) => void;
  loading: boolean;
}

const FacilityContext = createContext<FacilityContextType | undefined>(undefined);

export const useFacility = () => {
  const context = useContext(FacilityContext);
  if (!context) {
    throw new Error('useFacility must be used within FacilityProvider');
  }
  return context;
};

interface FacilityProviderProps {
  children: ReactNode;
}

export const FacilityProvider: React.FC<FacilityProviderProps> = ({ children }) => {
  const { activeFacilityId, user } = useAuth();
  const [facility, setFacilityState] = useState<Facility | null>(null);
  const [loading, setLoading] = useState(true);
  const lastLoadedFacilityIdRef = useRef<string | null>(null);

  const loadFacility = async (facilityId: string) => {
    try {
      setLoading(true);
      const facilityData = await facilitiesApi.get(facilityId);
      setFacilityState(facilityData);
      lastLoadedFacilityIdRef.current = facilityId;
      // Sincronizar también localStorage para compatibilidad
      localStorage.setItem('facility_id', facilityId);
    } catch (error) {
      // Facility no encontrada o sin acceso, limpiar
      localStorage.removeItem('facility_id');
      setFacilityState(null);
      lastLoadedFacilityIdRef.current = null;
    } finally {
      setLoading(false);
    }
  };

  // Sincronizar con AuthContext.activeFacilityId
  useEffect(() => {
    // Priorizar activeFacilityId de AuthContext, luego user.active_facility_id, luego localStorage
    const facilityIdToUse = activeFacilityId ?? user?.active_facility_id ?? localStorage.getItem('facility_id');
    
    if (facilityIdToUse) {
      // Solo cargar si es diferente a la facility que ya cargamos
      if (lastLoadedFacilityIdRef.current !== facilityIdToUse) {
        loadFacility(facilityIdToUse);
      }
    } else {
      // No hay facility activa, limpiar
      if (lastLoadedFacilityIdRef.current !== null) {
        setFacilityState(null);
        localStorage.removeItem('facility_id');
        lastLoadedFacilityIdRef.current = null;
        setLoading(false);
      }
    }
  }, [activeFacilityId, user?.active_facility_id]);

  const setFacility = (newFacility: Facility | null) => {
    if (newFacility) {
      localStorage.setItem('facility_id', newFacility.id);
      setFacilityState(newFacility);
    } else {
      localStorage.removeItem('facility_id');
      setFacilityState(null);
    }
  };

  return (
    <FacilityContext.Provider
      value={{
        facility,
        setFacility,
        loading,
      }}
    >
      {children}
    </FacilityContext.Provider>
  );
};
