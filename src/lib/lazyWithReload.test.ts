/**
 * Tests for `lazyWithReload` — Sprint 38 SWA stale-chunk fix.
 *
 * We do not mount the lazy component inside React (Suspense / `act` make
 * that noisy); instead we exercise the wrapper's factory directly. That's
 * exactly the part with our logic — `React.lazy` is upstream.
 */

import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';
import type { ComponentType } from 'react';
import {
  _resetReloadSentinel,
  isChunkLoadError,
  lazyWithReload,
} from './lazyWithReload';

// `React.lazy` returns an opaque object; the loader we hand in is invoked
// lazily by React when the component first renders. We never trigger that
// rendering — instead we re-invoke our own factory via the side-effect path
// to assert reload/throw behaviour. To do that we wrap the wrapper:
function callFactory<T extends ComponentType<unknown>>(
  factory: () => Promise<{ default: T }>,
): Promise<{ default: T }> {
  // lazyWithReload swallows the loader behind React.lazy, so the cleanest
  // way to exercise its inner async logic is to replicate it 1:1 here using
  // the same factory. Equivalent to React calling the loader on first
  // render. The wrapper's own implementation is exported as a closure, so
  // we re-derive it by calling `lazyWithReload(factory)` and triggering its
  // internal payload via `(component as any)._payload._result()` is brittle
  // across React versions. Easier: build a tiny mirror that uses the same
  // `isChunkLoadError` + sessionStorage contract.
  //
  // For these tests we route through the actual exported helper to be sure
  // we're testing the shipped code path. We simulate React invoking the
  // loader by reaching into the lazy component's internal payload.
  const lazyComponent = lazyWithReload(factory) as unknown as {
    _payload: { _result: () => Promise<{ default: T }> };
  };
  // React 19's lazy stores the loader in `_payload._result` until first call.
  // If the shape ever changes this test will fail loudly — fine, that's a
  // signal we need to revisit. We hold off on a more elaborate render-based
  // test until the underlying contract changes.
  const result = lazyComponent._payload._result();
  return result instanceof Promise ? result : Promise.resolve(result);
}

describe('isChunkLoadError', () => {
  test.each([
    ['Vite phrasing', new Error('Failed to fetch dynamically imported module: https://x/y.js')],
    ['Vite alt phrasing', new Error('error loading dynamically imported module: https://x/y.js')],
    ['Safari phrasing', new Error('Importing a module script failed.')],
    ['webpack ChunkLoadError', Object.assign(new Error('Loading chunk 123 failed.'), { name: 'ChunkLoadError' })],
    ['webpack message only', new Error('Loading chunk 7 failed.')],
  ])('matches %s', (_label, err) => {
    expect(isChunkLoadError(err)).toBe(true);
  });

  test.each([
    ['plain string', 'oops'],
    ['null', null],
    ['undefined', undefined],
    ['unrelated Error', new Error('Network request failed')],
    ['object without message', { foo: 'bar' }],
  ])('does not match %s', (_label, err) => {
    expect(isChunkLoadError(err)).toBe(false);
  });
});

describe('lazyWithReload', () => {
  const RELOAD_TS_KEY = 'tagpulse:chunk-reload-ts';
  let reloadSpy: ReturnType<typeof vi.fn>;
  let originalLocation: typeof window.location;

  beforeEach(() => {
    sessionStorage.clear();
    _resetReloadSentinel();
    reloadSpy = vi.fn();
    originalLocation = window.location;
    // jsdom's `Location.reload` is non-configurable, so a Proxy on the real
    // location object cannot intercept `reload`. Replace the whole
    // `window.location` with a plain stand-in carrying the props we touch.
    Object.defineProperty(window, 'location', {
      configurable: true,
      writable: true,
      value: { reload: reloadSpy, href: originalLocation.href },
    });
  });

  afterEach(() => {
    Object.defineProperty(window, 'location', {
      configurable: true,
      writable: true,
      value: originalLocation,
    });
    sessionStorage.clear();
  });

  test('passes through a successful import unchanged', async () => {
    const fakeModule = { default: () => null };
    const factory = vi.fn().mockResolvedValue(fakeModule);
    const result = await callFactory(factory);
    expect(result).toBe(fakeModule);
    expect(reloadSpy).not.toHaveBeenCalled();
    expect(sessionStorage.getItem(RELOAD_TS_KEY)).toBeNull();
  });

  test('reloads the page once when import fails with a chunk-load error', async () => {
    const factory = vi
      .fn()
      .mockRejectedValue(new Error('Failed to fetch dynamically imported module: https://x/A.js'));

    // The factory hangs forever after triggering reload — race against a
    // microtask so the test doesn't hang.
    const racing = Promise.race([
      callFactory(factory),
      new Promise((resolve) => setTimeout(() => resolve('TIMED_OUT'), 50)),
    ]);

    await expect(racing).resolves.toBe('TIMED_OUT');
    expect(reloadSpy).toHaveBeenCalledTimes(1);
    expect(sessionStorage.getItem(RELOAD_TS_KEY)).not.toBeNull();
  });

  test('rethrows on a second chunk-load failure within the throttle window', async () => {
    sessionStorage.setItem(RELOAD_TS_KEY, String(Date.now()));
    const err = new Error('Failed to fetch dynamically imported module: https://x/B.js');
    const factory = vi.fn().mockRejectedValue(err);

    await expect(callFactory(factory)).rejects.toThrow(
      /Failed to fetch dynamically imported module/,
    );
    expect(reloadSpy).not.toHaveBeenCalled();
  });

  test('reloads again once the throttle window has elapsed', async () => {
    // A stale-chunk event from a *previous* deploy, well outside the window.
    sessionStorage.setItem(RELOAD_TS_KEY, String(Date.now() - 60_000));
    const factory = vi
      .fn()
      .mockRejectedValue(new Error('Failed to fetch dynamically imported module: https://x/C.js'));

    const racing = Promise.race([
      callFactory(factory),
      new Promise((resolve) => setTimeout(() => resolve('TIMED_OUT'), 50)),
    ]);

    await expect(racing).resolves.toBe('TIMED_OUT');
    expect(reloadSpy).toHaveBeenCalledTimes(1);
  });

  test('rethrows non-chunk errors without reloading', async () => {
    const err = new Error('Network request failed');
    const factory = vi.fn().mockRejectedValue(err);

    await expect(callFactory(factory)).rejects.toThrow('Network request failed');
    expect(reloadSpy).not.toHaveBeenCalled();
    expect(sessionStorage.getItem(RELOAD_TS_KEY)).toBeNull();
  });
});
