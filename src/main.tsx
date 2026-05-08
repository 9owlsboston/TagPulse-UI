import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { App } from './App';
import './api/configureGenerated';
import { initTelemetry } from './lib/telemetry';

// Sprint 25 C1: initialize App Insights before any component renders so the
// auto page-view + dependency tracking captures the very first paint.
initTelemetry();

const root = document.getElementById('root');
if (!root) throw new Error('Root element not found');

createRoot(root).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
