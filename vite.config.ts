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
    //
    // Sprint 36 / issue #24: replace the `antd: ['antd']` object form
    // (which collapsed the entire AntD library into one 378 KB gz
    // chunk loaded eagerly because at least one eager module imports
    // from 'antd') with a function form that splits AntD by component
    // and `rc-*` package. Heavy components (Table, DatePicker, Select,
    // Tree, …) and their `rc-*` internals become their own chunks so
    // Rollup only pulls them into the reachable graph of the lazy page
    // chunks that actually use them. Small / always-eager components
    // (Layout, Menu, Button, Typography, …) collapse into one shared
    // `antd-core` chunk that everything reuses.
    rollupOptions: {
      output: {
        manualChunks(id) {
          // Pin React + its runtime deps to a dedicated `react-vendor`
          // chunk. **Critical**: without this rule, Rollup's automatic
          // chunk placement can hoist React's prod-mode runtime into
          // `antd-core` (because antd-core is the most-shared importer
          // of `react`). That creates an ES-module cycle — antd-core
          // imports antd-button/antd-modal/antd-message/etc., which
          // re-import React from antd-core — and at evaluation time
          // React's `q.Activity = …` initializer runs with `q` still
          // undefined, crashing the entire app with
          // `Uncaught TypeError: Cannot set properties of undefined
          //  (setting 'Activity')` on **every** page (Sprint 36 Phase E
          // hotfix). The match is anchored with a trailing slash so we
          // don't accidentally swallow `react-router-dom`,
          // `react-grid-layout`, `react-leaflet`, etc.
          if (
            /node_modules\/(react|react-dom|scheduler|react-is)\//.test(id)
          ) {
            return 'react-vendor';
          }
          if (
            id.includes('node_modules/recharts') ||
            id.includes('node_modules/d3-')
          ) {
            return 'recharts';
          }
          if (
            id.includes('node_modules/leaflet') ||
            id.includes('node_modules/react-leaflet')
          ) {
            return 'leaflet';
          }
          if (id.includes('node_modules/@microsoft/applicationinsights')) {
            return 'appinsights';
          }
          if (id.includes('node_modules/@ant-design/icons')) {
            return 'antd-icons';
          }
          // Split AntD components: every component that is meaningfully
          // sized (>~3 KB gz) gets its own chunk so it caches
          // independently (an AntD patch invalidates only changed
          // chunks). Tiny common-case primitives stay in `antd-core`
          // alongside the shared `_util` infrastructure.
          //
          // Source files were converted to direct `antd/es/<name>`
          // imports in this sprint, so Rollup tree-shakes the
          // cross-component dependencies that the AntD barrel used to
          // drag in (e.g. Dashboard no longer pulls `Table` into its
          // chunk just because it imported `Statistic`).
          if (id.includes('node_modules/antd/es/')) {
            const match = id.match(/node_modules\/antd\/es\/([^/]+)/);
            if (!match) return 'antd-core';
            const name = match[1];
            const core = new Set([
              '_util',
              'index.js',
              'locale',
              'theme',
              'config-provider',
              'app',
              'tag',
              'space',
              'grid',
              'row',
              'col',
              'divider',
              'flex',
              'empty',
              'skeleton',
              'badge',
              'avatar',
              'switch',
              'breadcrumb',
              'anchor',
              'affix',
              'back-top',
              'float-button',
              'watermark',
              'version',
              'radio',
              'checkbox',
              'rate',
              'qr-code',
              'progress',
              'segmented',
              'time-picker',
              'auto-complete',
              'mentions',
              'calendar',
              'transfer',
              'color-picker',
            ]);
            if (name.startsWith('_') || core.has(name)) return 'antd-core';
            return `antd-${name}`;
          }
          // Split each rc-* internal package into its own chunk so
          // Rollup only preloads the ones actually reachable from the
          // eager entry graph. Page-specific ones (rc-table, rc-tree,
          // rc-upload, rc-image, rc-rate, rc-slider, …) ride along
          // with the lazy page chunks that need them.
          if (id.includes('node_modules/rc-')) {
            const match = id.match(/node_modules\/(rc-[^/]+)/);
            if (!match) return 'rc-misc';
            return match[1];
          }
          if (id.includes('node_modules/@rc-component/')) {
            // **Critical**: must live in the same chunk as antd-core,
            // not a separate `rc-component` chunk. AntD's `_util`,
            // `select`, `dropdown`, `color-picker`, `qr-code`,
            // `tour`, and `watermark` all import from
            // `@rc-component/*`, and several `@rc-component/*`
            // packages (notably `@rc-component/color-picker`'s
            // `Color` class re-exported via `antd/es/color-picker`)
            // import back from antd-core. Putting them in separate
            // chunks creates an ES-module cycle that triggers a TDZ
            // error at first paint: `Uncaught ReferenceError: Cannot
            // access 'un' before initialization` (Sprint 36 Phase E
            // hotfix #2 — same family of bug as the React/antd-core
            // cycle fixed in PR #31).
            return 'antd-core';
          }
          return undefined;
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
      '/labels': 'http://localhost:8000',
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
