/**
 * Jest Setup File
 * Global test configuration and mock setup
 */

// Mock jest-chrome if not available
if (!global.chrome) {
  global.chrome = {
    tabs: {},
    scripting: {},
    storage: { local: {}, sync: {} },
    runtime: {},
    alarms: {},
    permissions: {},
    identity: {},
    action: {}
  };
}

// Suppress console errors in tests unless needed
const originalError = console.error;
beforeAll(() => {
  console.error = (...args) => {
    if (
      typeof args[0] === 'string' &&
      (args[0].includes('Not implemented') ||
        args[0].includes('Chrome API') ||
        args[0].includes('is not a function'))
    ) {
      return;
    }
    originalError.call(console, ...args);
  };
});

afterAll(() => {
  console.error = originalError;
});

// Setup global test utilities
global.sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

// Mock fetch if needed
if (!global.fetch) {
  global.fetch = jest.fn();
}

// Setup DOM-related globals
if (typeof global.document === 'undefined') {
  const { JSDOM } = require('jsdom');
  const dom = new JSDOM('<!DOCTYPE html><html><body></body></html>');
  global.document = dom.window.document;
  global.window = dom.window;
  global.navigator = dom.window.navigator;
}

// Reset mocks before each test
beforeEach(() => {
  jest.clearAllMocks();
  // Clear chrome mock state
  if (global.chrome) {
    jest.clearAllMocks();
  }
});

console.log('Jest setup initialized');
