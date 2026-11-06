import { defineConfig } from 'vite'
import path from 'path'
import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  // Porta fixa: precisa bater com CORS_ORIGIN do back-end (http://localhost:5173)
  server: {
    port: 5173,
    strictPort: true,
  },
  assetsInclude: ['**/*.svg', '**/*.csv'],
})