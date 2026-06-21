import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { App } from './App';
import './theme/tokens.css';
import './api/configureGenerated';
import { initTelemetry } from './lib/telemetry';
import { reloadForChunkError } from './lib/lazyWithReload';

// Sprint 25 C1: initialize App Insights before any component renders so the
// auto page-view + dependency tracking captures the very first paint.
initTelemetry();

// SWA stale-chunk fix (companion to `lazyWithReload`): Vite fires
// `vite:preloadError` when a `<link rel="modulepreload">` chunk fails to load
// — this happens independently of the dynamic `import()` factory (e.g. the
// browser preloads a route chunk the new deploy no longer ships). Prevent the
// default (which would otherwise throw) and recover with the same throttled
// hard reload so the user lands on the fresh build instead of a red error card.
window.addEventListener('vite:preloadError', (event) => {
  event.preventDefault();
  reloadForChunkError();
});

const root = document.getElementById('root');
if (!root) throw new Error('Root element not found');

createRoot(root).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
