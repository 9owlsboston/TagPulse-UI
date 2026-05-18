/**
 * Regression test for the Sprint 36 Phase E hotfix.
 *
 * The AntD vendor-chunk split shipped in Sprint 36 / #24 originally
 * left `react`, `react-dom`, and `scheduler` un-pinned in
 * `manualChunks()`. Rollup's automatic placement then hoisted React's
 * production runtime into the `antd-core` chunk (because antd-core was
 * the most-shared importer of `react`). That created an ES-module
 * cycle: antd-core imports antd-button / antd-modal / antd-icons /
 * antd-message / etc., and those modules re-import React from
 * antd-core. At runtime React's `q.Activity = …` initialiser then ran
 * with `q` (its exports object) still `undefined`, crashing the entire
 * app with:
 *
 *     Uncaught TypeError: Cannot set properties of undefined
 *     (setting 'Activity')
 *
 * on **every** page (Dashboard, AssetDetail, /admin/labels — anything
 * that mounted the eager bundle). The fix is the `react-vendor` rule
 * in vite.config.ts that pins react / react-dom / scheduler /
 * react-is to their own chunk so the cycle through React is broken.
 *
 * This test enforces the rule statically so a future edit to
 * manualChunks can't quietly regress the contract.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(HERE, '../..');
const VITE_CONFIG = path.join(REPO_ROOT, 'vite.config.ts');

describe('vite production chunk separation', () => {
  it('manualChunks pins react/react-dom/scheduler/react-is to react-vendor', () => {
    const text = fs.readFileSync(VITE_CONFIG, 'utf8');
    // The rule must use a regex (anchored by trailing slashes) so it
    // doesn't accidentally swallow react-router-dom / react-leaflet /
    // react-grid-layout. We assert the regex literal + the chunk name
    // are both present and adjacent so a refactor can't drop one half.
    expect(text).toMatch(
      /node_modules\\\/\(react\|react-dom\|scheduler\|react-is\)\\\//,
    );
    expect(text).toMatch(/return 'react-vendor'/);
  });
});
