import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

import { semanticRoles, tokens } from './tokens';

const __dirname = dirname(fileURLToPath(import.meta.url));
const css = readFileSync(resolve(__dirname, 'tokens.css'), 'utf8');

// Map CSS var name (`--color-bg`) → SemanticTokens key (`colorBg`).
// chart-N rolls into chartSeries[N-1].
function semanticKey(cssVarName: string): { key: keyof typeof tokens.dark; index?: number } {
  const name = cssVarName.replace(/^--/, '');
  const chartMatch = /^color-chart-([1-6])$/.exec(name);
  if (chartMatch) return { key: 'chartSeries', index: Number(chartMatch[1]) - 1 };
  const camel = name.replace(/-([a-z])/g, (_, c: string) => c.toUpperCase());
  return { key: camel as keyof typeof tokens.dark };
}

function extractBlock(selector: string): Record<string, string> {
  // crude block extractor: take everything up to the matching closing brace.
  const idx = css.indexOf(selector);
  if (idx === -1) throw new Error(`selector not found: ${selector}`);
  const open = css.indexOf('{', idx);
  const close = css.indexOf('}', open);
  const body = css.slice(open + 1, close);
  const out: Record<string, string> = {};
  for (const line of body.split('\n')) {
    const m = /^\s*(--[a-z0-9-]+)\s*:\s*([^;]+);/.exec(line);
    if (m && m[1] && m[2]) out[m[1]] = m[2].trim();
  }
  return out;
}

const darkCss = extractBlock(":root[data-theme='dark']");
const lightCss = extractBlock(":root[data-theme='light']");

describe('design tokens parity (tokens.ts ↔ tokens.css)', () => {
  for (const role of semanticRoles) {
    it(`dark: ${role.name} matches CSS`, () => {
      const { key, index } = semanticKey(role.cssVar);
      const jsValue =
        index === undefined
          ? (tokens.dark[key] as string)
          : (tokens.dark.chartSeries[index] as string);
      expect(darkCss[role.cssVar]?.toLowerCase()).toBe(jsValue.toLowerCase());
    });
    it(`light: ${role.name} matches CSS`, () => {
      const { key, index } = semanticKey(role.cssVar);
      const jsValue =
        index === undefined
          ? (tokens.light[key] as string)
          : (tokens.light.chartSeries[index] as string);
      expect(lightCss[role.cssVar]?.toLowerCase()).toBe(jsValue.toLowerCase());
    });
  }
});
