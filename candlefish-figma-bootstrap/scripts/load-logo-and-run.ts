import { readFileSync } from 'fs';

// Absolute path as provided
const LOGO_PATH = '/Users/patricksmith/candlefish-ai/apps/website/public/logo/candlefish_logo.png';

export function getLogoBytes(): Uint8Array {
  return new Uint8Array(readFileSync(LOGO_PATH));
}

// Usage notes:
// 1) Run `npm run build` to compile the plugin
// 2) In Figma Desktop, open Console (Plugins → Development → Open Console)
// 3) With the plugin running, paste: figma.ui.postMessage({ type: 'bootstrap', bytes: <Uint8Array> })
//    You can generate bytes in Node and paste manually, or extend the plugin UI to request them.
