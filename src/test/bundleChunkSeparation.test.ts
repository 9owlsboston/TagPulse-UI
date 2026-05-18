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

  it('manualChunks routes @rc-component/* into antd-core, not a separate chunk', () => {
    // Sprint 36 Phase E hotfix #2 — production showed
    //
    //   rc-component-<hash>.js: Uncaught ReferenceError:
    //   Cannot access 'un' before initialization
    //
    // because `@rc-component/color-picker` (which lives in our
    // `rc-component` chunk) imported the `FastColor` class from
    // `antd-core` and then used it as `(function(r){...})(un)` at
    // module-init time. antd-core in turn imported other things
    // from `@rc-component/*` (trigger / mutate-observer / tour /
    // qrcode), forming an ES-module cycle through `_util`,
    // `select`, `dropdown`, `color-picker`, `qr-code`, `tour`, and
    // `watermark`. The class binding therefore landed in the TDZ
    // window on the importer side and crashed every page.
    //
    // The fix collapses `@rc-component/*` into the same chunk as
    // antd-core so the binding is intra-chunk and Rollup can wrap
    // it safely. This test pins the rule so a future split doesn't
    // re-introduce the cycle.
    const text = fs.readFileSync(VITE_CONFIG, 'utf8');
    expect(text).toMatch(/node_modules\/@rc-component\//);
    // The @rc-component branch must return 'antd-core' (not
    // 'rc-component' or anything else).
    const branch = text.match(
      /node_modules\/@rc-component\/[\s\S]*?return\s+'([^']+)'/,
    );
    expect(branch?.[1]).toBe('antd-core');
  });

  it('manualChunks routes @ant-design/icons into antd-core, not a separate chunk', () => {
    // Sprint 36 Phase E hotfix #3 — production showed
    //
    //   antd-icons-<hash>.js:58:1301 Uncaught TypeError:
    //   Cannot read properties of undefined (reading 'primary')
    //
    // because `@ant-design/icons` does
    //   import { blue } from '@ant-design/colors';
    //   setTwoToneColor(blue.primary);
    // at module-init time. The `blue` palette comes from
    // `@ant-design/colors`, which lives inside `antd-core`. When
    // `antd-icons` was in its own chunk, the cycle
    //   antd-core → antd-icons → antd-core's `blue` (.primary)
    // put the export in the TDZ window on every page load and
    // crashed the entry graph before React mounted.
    //
    // Fix: route `@ant-design/icons` into `antd-core` so the
    // palette binding is intra-chunk. This test pins the rule so a
    // future refactor can't quietly re-introduce the cycle.
    const text = fs.readFileSync(VITE_CONFIG, 'utf8');
    expect(text).toMatch(/node_modules\/@ant-design\/icons/);
    const branch = text.match(
      /node_modules\/@ant-design\/icons[\s\S]*?return\s+'([^']+)'/,
    );
    expect(branch?.[1]).toBe('antd-core');
  });

  it('manualChunks collapses all of antd/es/* into antd-core (no per-component split)', () => {
    // Sprint 36 Phase E hotfix #4 — two consecutive production
    // failures exposed the structural cycle between antd-core and
    // any per-component chunk:
    //
    //   antd-style-<hash>.js: Uncaught TypeError:
    //   i is not a constructor          (Keyframes cycle)
    //
    //   antd-form-<hash>.js: ReferenceError:
    //   Cannot access 'it' before initialization   (g export cycle)
    //
    // AntD's own shared pieces — `_util/ContextIsolator`,
    // `config-provider`, `locale`, `modal`, `theme` — import from
    // many component directories (`button`, `form`, `tour`,
    // `date-picker`, `pagination`, `popconfirm`, `table`,
    // `upload`, `watermark`, etc.). Every per-component chunk
    // therefore forms a cycle with antd-core; whichever binding
    // antd-core's eager init touches first puts the cyclic
    // importer's bindings in the TDZ window. Three previous
    // hotfixes (#31, #32, #33) plus this fourth one only
    // addressed the specific cycle that happened to trip up that
    // build's evaluation order. The robust fix is to route every
    // `antd/es/*` file into a single `antd-core` chunk so all
    // cycles become intra-chunk (Rollup wraps them in one IIFE).
    //
    // This test enforces the rule statically so a future split
    // can't reintroduce the bug class.
    const text = fs.readFileSync(VITE_CONFIG, 'utf8');
    expect(text).toMatch(/node_modules\/antd\/es\//);
    const branch = text.match(
      /node_modules\/antd\/es\/[\s\S]{0,400}?return\s+'([^']+)'/,
    );
    expect(branch?.[1]).toBe('antd-core');
    // And the legacy `antd-${name}` per-component fallback must
    // not be present (regression guard).
    expect(text).not.toMatch(/return\s+`antd-\$\{name\}`/);
  });
});
