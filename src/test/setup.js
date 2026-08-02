import '@testing-library/jest-dom/vitest';

// jsdom doesn't implement matchMedia (antd v6 uses it for responsive
// components) or ResizeObserver. Stub only what this first-wave suite
// actually touches - add more here if a later test needs them, don't
// pre-stub for code paths nothing exercises yet.
if (!window.matchMedia) {
  window.matchMedia = (query) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: () => {},
    removeListener: () => {},
    addEventListener: () => {},
    removeEventListener: () => {},
    dispatchEvent: () => false,
  });
}

if (!window.ResizeObserver) {
  window.ResizeObserver = class ResizeObserver {
    observe() {}
    unobserve() {}
    disconnect() {}
  };
}
