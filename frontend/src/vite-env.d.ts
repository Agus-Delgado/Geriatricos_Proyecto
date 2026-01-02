/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly DEV: boolean;
  readonly VITE_API_BASE_URL: string;
  // Agregar otras variables de entorno que uses
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
