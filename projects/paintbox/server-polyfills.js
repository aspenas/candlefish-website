// Server-side polyfills for browser APIs that get bundled into server code
// This must be loaded before any other code to prevent "self is not defined" errors

if (typeof global !== 'undefined') {
  // Define self for server-side environment
  if (!global.self) {
    global.self = global;
  }
  
  // Define globalThis.self for compatibility
  if (!global.globalThis) {
    global.globalThis = global;
  }
  
  if (!global.globalThis.self) {
    global.globalThis.self = global.globalThis;
  }
  
  // Define window for server-side environment (minimal polyfill)
  if (!global.window) {
    global.window = global;
  }
  
  // Define document for server-side environment (minimal polyfill)
  if (!global.document) {
    global.document = {};
  }
}

// For ES modules compatibility
if (typeof globalThis !== 'undefined') {
  if (!globalThis.self) {
    globalThis.self = globalThis;
  }
}