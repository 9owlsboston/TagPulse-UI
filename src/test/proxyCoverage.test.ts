/**
 * Regression test for vite.config.ts dev-proxy coverage (Sprint 35 / issue #21).
 *
 * Every URL the generated API client targets MUST have a corresponding
 * `server.proxy` entry in vite.config.ts, otherwise `npm run dev` returns
 * the SPA's index.html for the API call → JSON parse error → 3 retries
 * with exponential backoff → ~7s hang before the page errors out.
 *
 * This test diffs the URL prefixes used by `src/api/generated/services/*.ts`
 * against the keys of the proxy object in vite.config.ts, and fails loudly
 * if anything is missing.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(HERE, '../..');
const SERVICES_DIR = path.join(REPO_ROOT, 'src/api/generated/services');
const VITE_CONFIG = path.join(REPO_ROOT, 'vite.config.ts');

function extractServicePrefixes(): Set<string> {
  const prefixes = new Set<string>();
  for (const file of fs.readdirSync(SERVICES_DIR)) {
    if (!file.endsWith('.ts')) continue;
    const text = fs.readFileSync(path.join(SERVICES_DIR, file), 'utf8');
    for (const match of text.matchAll(/url:\s*'(\/[^/'{}]+)/g)) {
      if (match[1]) prefixes.add(match[1]);
    }
  }
  return prefixes;
}

function extractProxyKeys(): Set<string> {
  const text = fs.readFileSync(VITE_CONFIG, 'utf8');
  const keys = new Set<string>();
  // Match the `'/foo': 'http://...'` entries inside server.proxy.
  for (const match of text.matchAll(/'(\/[^']+)':\s*'http/g)) {
    if (match[1]) keys.add(match[1]);
  }
  return keys;
}

describe('vite dev proxy coverage', () => {
  it('every generated-service URL prefix has a matching proxy entry', () => {
    const servicePrefixes = extractServicePrefixes();
    const proxyKeys = extractProxyKeys();
    const missing = [...servicePrefixes].filter((p) => !proxyKeys.has(p)).sort();
    expect(missing, `Add these to server.proxy in vite.config.ts: ${missing.join(', ')}`).toEqual(
      [],
    );
  });
});
