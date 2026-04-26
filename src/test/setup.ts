import '@testing-library/jest-dom/vitest';

// Ant Design's rc-table uses getComputedStyle which jsdom doesn't fully implement
const originalGetComputedStyle = window.getComputedStyle;
window.getComputedStyle = (elt: Element, pseudoElt?: string | null) => {
  try {
    return originalGetComputedStyle(elt, pseudoElt);
  } catch {
    return {} as CSSStyleDeclaration;
  }
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
