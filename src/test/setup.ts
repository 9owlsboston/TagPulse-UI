import '@testing-library/jest-dom/vitest';

// Sprint 36 / #26 — Ant Design's rc-table (under <Table>) calls
// `window.getComputedStyle(elt, pseudoElt)` to measure scrollbar size,
// which trips jsdom's "Not implemented" handler. jsdom prints the message
// to stderr via its virtual console BEFORE the call returns, so a
// try/catch around the result cannot suppress it — the only fix is to
// never let jsdom see the 2-arg form. Drop the second argument unless it
// is explicitly null/undefined (which jsdom accepts).
const originalGetComputedStyle = window.getComputedStyle;
window.getComputedStyle = (elt: Element, pseudoElt?: string | null) => {
  if (pseudoElt) {
    // Ignore pseudo-element selectors — rc-table only uses the 2-arg
    // form as a measurement helper, not as a real :before/:after lookup.
    return originalGetComputedStyle(elt);
  }
  return originalGetComputedStyle(elt);
};

// Mock matchMedia for Ant Design responsive components
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: (query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: () => {},
    removeListener: () => {},
    addEventListener: () => {},
    removeEventListener: () => {},
    dispatchEvent: () => false,
  }),
});
