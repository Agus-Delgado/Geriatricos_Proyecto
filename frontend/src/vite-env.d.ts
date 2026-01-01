/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_API_BASE_URL: string
  // más variables de entorno aquí si las hay
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}

/// <reference types="vite-plugin-pwa/client" />

declare module 'virtual:pwa-register' {
  export interface RegisterSWOptions {
    immediate?: boolean;
    onNeedRefresh?: () => void;
    onOfflineReady?: () => void;
    onRegisteredSW?: (swUrl: string, registration: ServiceWorkerRegistration | undefined) => void;
    onRegisterError?: (error: Error) => void;
  }
  
  export function registerSW(options?: RegisterSWOptions): (reloadPage?: boolean) => Promise<void>;


// PWA desactivado temporalmente para evitar loops de recarga
  import type { Dispatch, SetStateAction } from 'react';
  
  export interface RegisterSWOptions {
    immediate?: boolean;
    onNeedRefresh?: () => void;
    onOfflineReady?: () => void;
    onRegisteredSW?: (swUrl: string, registration: ServiceWorkerRegistration | undefined) => void;
    onRegisterError?: (error: Error) => void;
  }
  
  export function useRegisterSW(options?: RegisterSWOptions): {
    needRefresh: [boolean, Dispatch<SetStateAction<boolean>>];
    offlineReady: [boolean, Dispatch<SetStateAction<boolean>>];
    updateServiceWorker: (reloadPage?: boolean) => Promise<void>;
  };
}
// declare module 'virtual:pwa-register' {
//   export interface RegisterSWOptions {
//     immediate?: boolean
//     onNeedRefresh?: () => void
//     onOfflineReady?: () => void
//     onRegistered?: (registration: ServiceWorkerRegistration | undefined) => void
//     onRegisterError?: (error: any) => void
//   }
//
//   export function registerSW(options?: RegisterSWOptions): (reload?: boolean) => Promise<void>
// }
