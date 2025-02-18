/// <reference types="vite/client" />

interface ImportMetaEnv {
    readonly VITE_API_URL: string
    // autres variables d'environnement...
  }
  
  interface ImportMeta {
    readonly env: ImportMetaEnv
  }