/**
 * Content Security Policy (CSP) utilities for React application
 * Implements defense-in-depth security with nonce-based script execution
 */

import crypto from 'crypto';

// CSP Directives configuration
export interface CSPConfig {
  'default-src'?: string[];
  'script-src'?: string[];
  'style-src'?: string[];
  'img-src'?: string[];
  'font-src'?: string[];
  'connect-src'?: string[];
  'media-src'?: string[];
  'object-src'?: string[];
  'child-src'?: string[];
  'frame-src'?: string[];
  'frame-ancestors'?: string[];
  'form-action'?: string[];
  'base-uri'?: string[];
  'worker-src'?: string[];
  'manifest-src'?: string[];
  'prefetch-src'?: string[];
  'upgrade-insecure-requests'?: boolean;
  'block-all-mixed-content'?: boolean;
}

// Generate cryptographically secure nonce
export const generateNonce = (): string => {
  return crypto.randomBytes(16).toString('base64');
};

// Default secure CSP configuration
export const defaultCSPConfig: CSPConfig = {
  'default-src': ["'self'"],
  'script-src': [
    "'self'",
    "'nonce-{NONCE}'",
    'https://www.googletagmanager.com',
    'https://www.google-analytics.com',
    "'strict-dynamic'" // Allows trusted scripts to load other scripts
  ],
  'style-src': [
    "'self'",
    "'unsafe-inline'", // Required for React's style prop
    'https://fonts.googleapis.com'
  ],
  'img-src': [
    "'self'",
    'data:',
    'blob:',
    'https:',
    'https://www.google-analytics.com',
    'https://www.googletagmanager.com'
  ],
  'font-src': [
    "'self'",
    'https://fonts.gstatic.com'
  ],
  'connect-src': [
    "'self'",
    'https://api.candlefish.ai',
    'https://www.google-analytics.com',
    'https://vitals.vercel-insights.com',
    'wss://api.candlefish.ai' // WebSocket support
  ],
  'media-src': ["'self'"],
  'object-src': ["'none'"],
  'child-src': ["'self'"],
  'frame-src': ["'none'"],
  'frame-ancestors': ["'none'"],
  'form-action': ["'self'"],
  'base-uri': ["'self'"],
  'worker-src': ["'self'", 'blob:'],
  'manifest-src': ["'self'"],
  'upgrade-insecure-requests': true,
  'block-all-mixed-content': true
};

// Build CSP header string from configuration
export const buildCSPHeader = (config: CSPConfig, nonce?: string): string => {
  const directives: string[] = [];

  // Process each directive
  Object.entries(config).forEach(([directive, value]) => {
    if (value === true) {
      // Boolean directives (upgrade-insecure-requests, block-all-mixed-content)
      directives.push(directive);
    } else if (Array.isArray(value) && value.length > 0) {
      // Array-based directives
      let sources = value.join(' ');

      // Replace nonce placeholder if provided
      if (nonce && sources.includes('{NONCE}')) {
        sources = sources.replace(/{NONCE}/g, nonce);
      }

      directives.push(`${directive} ${sources}`);
    }
  });

  return directives.join('; ');
};

// Environment-specific CSP configurations
export const getEnvironmentCSP = (env: 'development' | 'production'): CSPConfig => {
  const baseConfig = { ...defaultCSPConfig };

  if (env === 'development') {
    // Relax CSP for development
    baseConfig['script-src'] = [
      ...(baseConfig['script-src'] || []),
      "'unsafe-eval'", // Required for React Fast Refresh
      'http://localhost:*',
      'ws://localhost:*' // Hot Module Replacement
    ];

    baseConfig['connect-src'] = [
      ...(baseConfig['connect-src'] || []),
      'http://localhost:*',
      'ws://localhost:*'
    ];
  }

  return baseConfig;
};

// CSP violation report handler
export interface CSPViolation {
  'document-uri': string;
  'violated-directive': string;
  'effective-directive': string;
  'original-policy': string;
  'blocked-uri': string;
  'status-code': number;
  'source-file'?: string;
  'line-number'?: number;
  'column-number'?: number;
}

export const handleCSPViolation = (violation: CSPViolation): void => {
  // Log violation for monitoring
  console.error('CSP Violation:', {
    directive: violation['violated-directive'],
    blockedURI: violation['blocked-uri'],
    documentURI: violation['document-uri'],
    sourceFile: violation['source-file'],
    lineNumber: violation['line-number']
  });

  // In production, send to monitoring service
  if (process.env.NODE_ENV === 'production') {
    // Example: Send to Sentry or custom endpoint
    fetch('/api/csp-report', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(violation)
    }).catch(err => console.error('Failed to report CSP violation:', err));
  }
};

// React hook for CSP nonce
export const useCSPNonce = (): string | null => {
  if (typeof window === 'undefined') return null;

  // Get nonce from meta tag (set by server)
  const metaTag = document.querySelector('meta[name="csp-nonce"]');
  return metaTag?.getAttribute('content') || null;
};

// Helper to create script tags with nonce
export const createNoncedScript = (src: string, nonce: string): HTMLScriptElement => {
  const script = document.createElement('script');
  script.src = src;
  script.nonce = nonce;
  script.async = true;
  return script;
};

// Middleware for Express/Node.js servers
export const cspMiddleware = (req: any, res: any, next: any) => {
  const nonce = generateNonce();
  const env = process.env.NODE_ENV as 'development' | 'production';
  const cspConfig = getEnvironmentCSP(env);
  const cspHeader = buildCSPHeader(cspConfig, nonce);

  // Set CSP header
  res.setHeader('Content-Security-Policy', cspHeader);

  // Set report-only header for testing
  if (process.env.CSP_REPORT_ONLY === 'true') {
    res.setHeader('Content-Security-Policy-Report-Only', cspHeader);
  }

  // Make nonce available to templates
  res.locals.cspNonce = nonce;

  next();
};

// Vite plugin for CSP
export const viteCSPPlugin = () => {
  return {
    name: 'csp-plugin',
    transformIndexHtml(html: string) {
      const nonce = generateNonce();
      const env = process.env.NODE_ENV as 'development' | 'production';
      const cspConfig = getEnvironmentCSP(env);
      const cspHeader = buildCSPHeader(cspConfig, nonce);

      // Inject CSP meta tag
      const cspMeta = `<meta http-equiv="Content-Security-Policy" content="${cspHeader}">`;
      const nonceMeta = `<meta name="csp-nonce" content="${nonce}">`;

      // Add nonce to existing script tags
      html = html.replace(/<script/g, `<script nonce="${nonce}"`);

      // Inject meta tags into head
      return html.replace('<head>', `<head>\n    ${cspMeta}\n    ${nonceMeta}`);
    }
  };
};

// Trusted Types policy (if supported)
export const initializeTrustedTypes = () => {
  if (typeof window !== 'undefined' && 'trustedTypes' in window) {
    try {
      window.trustedTypes.createPolicy('default', {
        createHTML: (input: string) => input,
        createScriptURL: (input: string) => {
          // Validate script URLs
          const allowedOrigins = [
            'https://www.googletagmanager.com',
            'https://www.google-analytics.com',
            'https://cdnjs.cloudflare.com'
          ];

          const url = new URL(input);
          if (allowedOrigins.some(origin => url.origin === origin)) {
            return input;
          }

          throw new Error(`Untrusted script URL: ${input}`);
        }
      });
    } catch (error) {
      console.error('Failed to create Trusted Types policy:', error);
    }
  }
};

// Example usage in React component
/*
import { useCSPNonce, createNoncedScript } from '@/utils/security/csp';

export const ThirdPartyScript: React.FC<{ src: string }> = ({ src }) => {
  const nonce = useCSPNonce();

  useEffect(() => {
    if (!nonce) return;

    const script = createNoncedScript(src, nonce);
    document.head.appendChild(script);

    return () => {
      document.head.removeChild(script);
    };
  }, [src, nonce]);

  return null;
};
*/

// Example Vite configuration
/*
// vite.config.ts
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { viteCSPPlugin } from './src/utils/security/csp';

export default defineConfig({
  plugins: [
    react(),
    viteCSPPlugin()
  ]
});
*/
