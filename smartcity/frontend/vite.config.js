import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    port: 3000,
    proxy: {
      '/api': {
        target: 'http://localhost:5000',
        changeOrigin: true,
        // SUPPRESSION DU REWRITE car Flask gère déjà le préfixe /api
        // rewrite: (path) => path.replace(/^\/api/, '')
      }
    }
  }
})
