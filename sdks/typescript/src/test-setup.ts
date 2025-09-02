/**
 * @fileoverview Jest test setup for Candlefish Claude Config SDK
 */

import { TextEncoder, TextDecoder } from 'util';

// Polyfill for Node.js environment
if (typeof global.TextEncoder === 'undefined') {
  global.TextEncoder = TextEncoder;
}

if (typeof global.TextDecoder === 'undefined') {
  global.TextDecoder = TextDecoder;
}

// Mock WebSocket for testing
class MockWebSocket {
  static CONNECTING = 0;
  static OPEN = 1;
  static CLOSING = 2;
  static CLOSED = 3;

  readyState = MockWebSocket.CONNECTING;
  onopen?: (event: Event) => void;
  onmessage?: (event: MessageEvent) => void;
  onclose?: (event: CloseEvent) => void;
  onerror?: (event: Event) => void;

  constructor(public url: string) {
    setTimeout(() => {
      this.readyState = MockWebSocket.OPEN;
      this.onopen?.(new Event('open'));
    }, 0);
  }

  send(data: string): void {
    // Mock implementation
  }

  close(code?: number, reason?: string): void {
    this.readyState = MockWebSocket.CLOSED;
    setTimeout(() => {
      this.onclose?.(new CloseEvent('close', { code, reason, wasClean: true }));
    }, 0);
  }
}

// Setup global WebSocket mock
global.WebSocket = MockWebSocket as any;

// Suppress console warnings in tests
const originalWarn = console.warn;
const originalError = console.error;

console.warn = (...args) => {
  if (args[0]?.includes && (
    args[0].includes('React') ||
    args[0].includes('Warning')
  )) {
    return;
  }
  originalWarn.apply(console, args);
};

console.error = (...args) => {
  if (args[0]?.includes && (
    args[0].includes('Warning') ||
    args[0].includes('React')
  )) {
    return;
  }
  originalError.apply(console, args);
};