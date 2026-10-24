import '@testing-library/jest-dom/vitest'

class ResizeObserverStub {
  constructor(_callback: ResizeObserverCallback) {}
  observe(_target: Element) {}
  unobserve(_target: Element) {}
  disconnect() {}
}

globalThis.ResizeObserver = ResizeObserverStub
