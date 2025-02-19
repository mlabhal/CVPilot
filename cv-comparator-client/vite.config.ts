import { defineConfig, loadEnv, ConfigEnv, UserConfig } from 'vite';
import react from '@vitejs/plugin-react';

// https://vite.dev/config/
export default defineConfig(({ mode }: ConfigEnv): UserConfig => {
  // Charge les variables d'environnement selon le mode
  const env = loadEnv(mode, process.cwd());
  
  // Détermine l'URL de l'API selon l'environnement
  const apiUrl = mode === 'development' 
    ? (env.VITE_API_URL || 'http://localhost:3000')  // URL locale pour le développement
    : (env.VITE_API_URL || 'https://sea-turtle-app-xid5z.ondigitalocean.app');  // URL de production (DigitalOcean)
  
  console.log(`Mode: ${mode}, Using API URL: ${apiUrl}`);
  
  return {
    plugins: [react()],
    server: {
      proxy: {
        '/api': {
          target: apiUrl,
          changeOrigin: true,
          rewrite: (path) => path.replace(/^\/api/, '') // Enlève le premier /api
        }
      }
    },
    // Rend l'URL de l'API accessible dans le code client
    define: {
      'import.meta.env.VITE_API_URL': JSON.stringify(apiUrl)
    }
  };
});