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
            // **Critical**: must live in the same chunk as `antd-core`.
            // `@ant-design/icons` does
            //   import { blue } from '@ant-design/colors';
            //   setTwoToneColor(blue.primary);
            // at module-init time, and the `blue` palette comes from
            // `@ant-design/colors` which lives inside antd-core. If
            // icons are in a separate chunk, the cycle
            //   antd-core → antd-icons → antd-core's `blue` (.primary)
            // puts the export in the TDZ window when an antd-core
            // component (e.g. anything that eagerly references an
            // icon) triggers antd-icons evaluation first. Production
            // symptom: `Uncaught TypeError: Cannot read properties of
            // undefined (reading 'primary')` at
            // `antd-icons-<hash>.js` (Sprint 36 Phase E hotfix #3).
            // Bundling icons into antd-core keeps the palette binding
            // intra-chunk so Rollup wraps both sides into the same
            // IIFE and the TDZ window disappears. Tree-shaking of
            // unused icons still works because each `@ant-design/icons/es/icons/<Name>`
            // is its own ES module.
            return 'antd-core';
          }
          // Collapse ALL of `antd/es/*` into a single `antd-core`
          // chunk. We previously split AntD by component (Sprint 36
          // issue #24) to keep lazy chunks lean, but this created a
          // class of ES-module-cycle / TDZ bugs that already triggered
          // FOUR production hotfixes in a row (PRs #31 React, #32
          // @rc-component, #33 @ant-design/icons, #34 antd-style /
          // antd-form). The root cause is that AntD's own shared
          // pieces — `_util/ContextIsolator`, `config-provider`,
          // `locale`, `modal`, `theme` — import back from many
          // component directories (`button`, `form`, `tour`,
          // `date-picker`, `pagination`, `popconfirm`, `table`,
          // `upload`, `watermark`, etc.). Any per-component chunk
          // therefore forms a cycle with `antd-core`, and Rollup's
          // evaluation order can put an exported binding in the TDZ
          // window when a component's module-init code accesses it
          // through the cycle. Symptoms have ranged from
          // `Cannot set properties of undefined (setting 'Activity')`
          // (React/antd-core) through `i is not a constructor`
          // (Keyframes/antd-style) to `Cannot access 'it' before
          // initialization` (`g` export/antd-form). The size cost of
          // collapsing is small in practice because most of those
          // per-component chunks were already in antd-core's *eager*
          // import graph (via `_util/ContextIsolator.js → form`,
          // `locale → date-picker/table/upload/...`,
          // `modal → button/watermark`, etc.), so the browser was
          // already fetching them on first paint. Tree-shaking still
          // works inside the single chunk: any `antd/es/<name>` we
          // never import is dead-code-eliminated. (Sprint 36 Phase E
          // hotfix #4 — replaces the per-component split.)
          if (id.includes('node_modules/antd/es/')) {
            return 'antd-core';
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
      '/tag-transfers': 'http://localhost:8000',
      '/tags': 'http://localhost:8000',
      '/bulk-operations': 'http://localhost:8000',
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
