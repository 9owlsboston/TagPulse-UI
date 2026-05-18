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
  build: {
    // Sprint 35 / issue #22: split heavy single-use vendor libs into
    // their own chunks so the initial bundle (shell + Dashboard) stays
    // lean and vendor caches survive app-only deploys.
    rollupOptions: {
      output: {
        manualChunks: {
          recharts: ['recharts'],
          leaflet: ['leaflet', 'react-leaflet'],
          antd: ['antd'],
          'antd-icons': ['@ant-design/icons'],
          appinsights: [
            '@microsoft/applicationinsights-web',
            '@microsoft/applicationinsights-react-js',
          ],
        },
      },
    },
  },
  server: {
    port: 5173,
    proxy: {
      '/auth': 'http://localhost:8000',
      '/tag-reads': 'http://localhost:8000',
      '/device-registry': 'http://localhost:8000',
      '/device-health': 'http://localhost:8000',
      '/devices': 'http://localhost:8000',
      '/rules': 'http://localhost:8000',
      '/rule-templates': 'http://localhost:8000',
      '/alerts': 'http://localhost:8000',
      '/integrations': 'http://localhost:8000',
      '/analytics': 'http://localhost:8000',
      '/admin': 'http://localhost:8000',
      '/users': 'http://localhost:8000',
      '/tenant': 'http://localhost:8000',
      '/branding': 'http://localhost:8000',
      '/assets': 'http://localhost:8000',
      '/categories': 'http://localhost:8000',
      '/sites': 'http://localhost:8000',
      '/zones': 'http://localhost:8000',
      '/products': 'http://localhost:8000',
      '/lots': 'http://localhost:8000',
      '/stock-items': 'http://localhost:8000',
      '/stock-levels': 'http://localhost:8000',
      '/stock-movements': 'http://localhost:8000',
      '/tag-data-mappings': 'http://localhost:8000',
      '/telemetry-models': 'http://localhost:8000',
      '/telemetry': 'http://localhost:8000',
      '/metrics': 'http://localhost:8000',
      '/health': 'http://localhost:8000',
      '/openapi.json': 'http://localhost:8000',
      '/docs': 'http://localhost:8000',
    },
  },
});
