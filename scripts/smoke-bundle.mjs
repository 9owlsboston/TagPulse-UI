#!/usr/bin/env node
/**
 * Bundle-boot smoke test.
 *
 * Serves the current `dist/` build over a tiny in-process Node HTTP
 * server, opens the served page in headless Chromium, waits for the
 * React tree to mount, and fails if any JS error reaches the page
 * (console errors, uncaught exceptions, unhandled rejections, or
 * 404s on the eager chunk graph).
 *
 * This catches the entire family of ES-module cycle bugs that hit
 * Sprint 36 production three times in 48 hours (PRs #31, #32, #33):
 * `Cannot set properties of undefined (setting 'Activity')`,
 * `Cannot access 'un' before initialization`,
 * `Cannot read properties of undefined (reading 'primary')` — all
 * crashed at first paint while every test in `npm run check` stayed
 * green, because dev (`npm run dev`) serves source ESM directly and
 * vitest never loads the bundled output.
 *
 * We don't use `vite preview` because the project's dev proxy
 * intercepts `/assets/*` (a backend-API path that collides with
 * Vite's default `build.assetsDir`), so preview returns 500 for the
 * built JS chunks. A bare HTTP server avoids that entirely.
 *
 * Exit codes:
 *   0 — smoke passed
 *   1 — JS error or network failure detected
 *   2 — server / browser launch failed
 *
 * Usage:
 *   node scripts/smoke-bundle.mjs           # serves ./dist on a random port
 *   PORT=4173 node scripts/smoke-bundle.mjs # pin the port
 */
import { createServer } from 'node:http';
import { existsSync, statSync, createReadStream } from 'node:fs';
import { extname, join, normalize, resolve } from 'node:path';
import { setTimeout as sleep } from 'node:timers/promises';

const DIST = resolve('dist');
const PORT = Number(process.env.PORT ?? 0); // 0 = OS-assigned
const HOST = '127.0.0.1';
// How long to give the app to mount before we declare success. The
// eager bundle graph (entry → react-vendor → antd-core → first lazy
// page) settles in well under 2 s locally; we give it 5 s as
// headroom for slower CI runners.
const SETTLE_MS = 5_000;

if (!existsSync(DIST)) {
  console.error(`[smoke] no ${DIST}/ directory — run \`npm run build\` first`);
  process.exit(2);
}

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.mjs': 'application/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.ico': 'image/x-icon',
  '.webp': 'image/webp',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
  '.map': 'application/json',
  '.txt': 'text/plain; charset=utf-8',
};

const server = createServer((req, res) => {
  // Strip query string, decode, and confine the resolved path to
  // DIST to prevent path-traversal escapes.
  const reqPath = decodeURIComponent((req.url ?? '/').split('?')[0]);
  const rel = reqPath === '/' ? '/index.html' : reqPath;
  const filePath = normalize(join(DIST, rel));
  if (!filePath.startsWith(DIST)) {
    res.writeHead(403);
    res.end('forbidden');
    return;
  }
  try {
    const stat = statSync(filePath);
    if (stat.isDirectory()) throw new Error('isdir');
    res.writeHead(200, {
      'Content-Type': MIME[extname(filePath).toLowerCase()] ?? 'application/octet-stream',
      'Content-Length': stat.size,
      'Cache-Control': 'no-store',
    });
    createReadStream(filePath).pipe(res);
  } catch {
    // SWA-style fallback: serve index.html for anything that isn't
    // a real file. Mirrors `staticwebapp.config.json`'s
    // navigationFallback rule so client-side routes don't 404.
    try {
      const fallback = join(DIST, 'index.html');
      const stat = statSync(fallback);
      res.writeHead(200, {
        'Content-Type': MIME['.html'],
        'Content-Length': stat.size,
        'Cache-Control': 'no-store',
      });
      createReadStream(fallback).pipe(res);
    } catch {
      res.writeHead(404);
      res.end('not found');
    }
  }
});

await new Promise((r) => server.listen(PORT, HOST, r));
const addr = server.address();
const port = typeof addr === 'object' && addr ? addr.port : PORT;
const URL = `http://${HOST}:${port}/`;
console.log(`[smoke] serving ${DIST} at ${URL}`);

const { chromium } = await import('playwright');

console.log('[smoke] launching headless Chromium');
// `--disable-gpu` and `--disable-software-rasterizer` are required
// for WSL2 / sandboxed CI runners where chromium's GPU process
// crashes with `FATAL:check.cc NOTREACHED` on first frame paint.
// `--no-sandbox` is required because most CI containers (and WSL)
// can't grant CAP_SYS_ADMIN for the chrome-sandbox helper.
const browser = await chromium.launch({
  args: [
    '--no-sandbox',
    '--disable-gpu',
    '--disable-software-rasterizer',
    '--disable-dev-shm-usage',
  ],
});
const context = await browser.newContext();
const page = await context.newPage();

/** @type {string[]} */
const errors = [];

page.on('console', (msg) => {
  if (msg.type() === 'error') {
    const text = msg.text();
    // Ignore expected fetch failures for backend endpoints not
    // available under the static server (the smoke is about bundle
    // init, not API health). We only care about JS-level errors.
    if (/Failed to load resource/i.test(text)) return;
    errors.push(`[console.error] ${text}`);
  }
});
page.on('pageerror', (err) => {
  errors.push(`[pageerror] ${err.message}`);
});
page.on('requestfailed', (req) => {
  const url = req.url();
  // Only flag chunk-graph failures — backend XHRs (/auth, /devices,
  // /labels, /tenant, etc.) routinely fail under the static server
  // because there's no backend wired in.
  if (url.includes('/assets/') && url.endsWith('.js')) {
    errors.push(`[requestfailed] ${url} (${req.failure()?.errorText})`);
  }
});

console.log(`[smoke] navigating to ${URL}`);
try {
  // `domcontentloaded` resolves once the HTML is parsed and all
  // <script type="module"> tags have begun executing. That gives
  // any eager-graph TDZ cycle a chance to fire before we move on.
  await page.goto(URL, { waitUntil: 'domcontentloaded', timeout: 20_000 });
} catch (e) {
  errors.push(`[goto] ${e instanceof Error ? e.message : String(e)}`);
}

// Let React mount + Suspense fallback resolve + any lazy chunks in
// the initial-paint path execute. We don't navigate anywhere — the
// landing page is sufficient to evaluate the entire eager chunk
// graph, which is where every ESM cycle bug from this sprint lived.
console.log(`[smoke] waiting ${SETTLE_MS} ms for bundle to settle`);
await sleep(SETTLE_MS);

// Sanity-check: if the page literally rendered nothing, that's the
// classic "white screen of death" — confirm at least *something*
// was committed to the DOM under #root.
try {
  const rootHasContent = await page.evaluate(
    () => (document.getElementById('root')?.childElementCount ?? 0) > 0,
  );
  if (!rootHasContent) {
    errors.push('[smoke] #root rendered nothing — white-screen failure');
  }
} catch (e) {
  errors.push(`[evaluate] ${e instanceof Error ? e.message : String(e)}`);
}

await browser.close();
await new Promise((r) => server.close(r));

if (errors.length > 0) {
  console.error(`[smoke] FAIL — ${errors.length} error(s):`);
  for (const e of errors) console.error('  ' + e);
  process.exit(1);
}

console.log('[smoke] PASS — bundle boots cleanly');
process.exit(0);
