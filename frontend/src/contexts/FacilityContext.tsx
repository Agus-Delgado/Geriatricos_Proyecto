import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { facilitiesApi } from '../api/facilities';
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
  const [facility, setFacilityState] = useState<Facility | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Cargar facility_id del localStorage al iniciar
    const storedFacilityId = localStorage.getItem('facility_id');
    if (storedFacilityId) {
      loadFacility(storedFacilityId);
    } else {
      setLoading(false);
    }
  }, []);

  const loadFacility = async (facilityId: string) => {
    try {
      const facilityData = await facilitiesApi.get(facilityId);
      setFacilityState(facilityData);
    } catch (error) {
      // Facility no encontrada o sin acceso, limpiar
      localStorage.removeItem('facility_id');
      setFacilityState(null);
    } finally {
      setLoading(false);
    }
  };

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
