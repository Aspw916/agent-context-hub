import "@testing-library/jest-dom/vitest";

// jsdom does not provide EventSource — polyfill for SSE-based components
class MockEventSource {
  onmessage: ((e: MessageEvent) => void) | null = null;
  close() {}
}
globalThis.EventSource = MockEventSource as any;
