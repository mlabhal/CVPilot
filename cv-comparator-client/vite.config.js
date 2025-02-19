import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
// https://vite.dev/config/
export default defineConfig({
    plugins: [react()],
    server: {
        proxy: {
            '/api': {
                target: 'https://sea-turtle-app-xid5z.ondigitalocean.app',
                changeOrigin: true,
                rewrite: (path) => path.replace(/^\/api/, '') // Enlève le premier /api
            }
        }
    }
});
