import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  server: {
    port: 5173,
    proxy: {
      '/tag-reads': 'http://localhost:8000',
      '/device-registry': 'http://localhost:8000',
      '/device-health': 'http://localhost:8000',
      '/rules': 'http://localhost:8000',
      '/alerts': 'http://localhost:8000',
      '/integrations': 'http://localhost:8000',
      '/analytics': 'http://localhost:8000',
      '/admin': 'http://localhost:8000',
      '/telemetry-models': 'http://localhost:8000',
      '/telemetry': 'http://localhost:8000',
      '/health': 'http://localhost:8000',
      '/openapi.json': 'http://localhost:8000',
      '/docs': 'http://localhost:8000',
    },
  },
});
