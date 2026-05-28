import { apiClient } from './client';
import type {
  ClinicalSummary,
  ClinicalSummaryUpdate,
  ClinicalNote,
  ClinicalNoteCreate,
  ClinicalReport,
} from '../types/clinical';

export const clinicalApi = {
  getSummary: async (residentId: string): Promise<ClinicalSummary> => {
    return apiClient.get<ClinicalSummary>(
      `/residents/${residentId}/clinical-summary`
    );
  },

  updateSummary: async (
    residentId: string,
    data: ClinicalSummaryUpdate
  ): Promise<ClinicalSummary> => {
    return apiClient.put<ClinicalSummary>(
      `/residents/${residentId}/clinical-summary`,
      data
    );
  },

  listNotes: async (residentId: string): Promise<ClinicalNote[]> => {
    return apiClient.get<ClinicalNote[]>(
      `/residents/${residentId}/clinical-notes`
    );
  },

  createNote: async (
    residentId: string,
    data: ClinicalNoteCreate
  ): Promise<ClinicalNote> => {
    return apiClient.post<ClinicalNote>(
      `/residents/${residentId}/clinical-notes`,
      data
    );
  },

  getClinicalReport: async (residentId: string): Promise<ClinicalReport> => {
    return apiClient.get<ClinicalReport>(
      `/residents/${residentId}/clinical-report`
    );
  },

  /** Ruta interna para vista imprimible (guardar como PDF vía diálogo del navegador). */
  getPrintPath: (residentId: string, autoPrint = false): string => {
    const suffix = autoPrint ? '?auto=1' : '';
    return `/clinical-history/${residentId}/print${suffix}`;
  },
};
