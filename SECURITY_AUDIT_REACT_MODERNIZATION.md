# Security Audit Report: Candlefish.ai React Modernization

**Date:** January 2025
**Auditor:** Security Specialist
**Project:** Converting static HTML to React 18 with TypeScript
**OWASP Compliance:** Based on OWASP Top 10 2021

## Executive Summary

This security audit evaluates the proposed React modernization of Candlefish.ai, focusing on potential vulnerabilities and security best practices. The analysis covers XSS prevention, secure routing, CSP implementation, dependency security, and OWASP compliance.

**Risk Level:** LOW to MEDIUM
**Recommendation:** PROCEED with security enhancements

## 1. XSS (Cross-Site Scripting) Vulnerabilities

### Current State Analysis

- Static HTML files use inline scripts for GSAP animations
- Google Analytics tracking script loads from external CDN
- Email address exposed in plain text: `hello@candlefish.ai`
- No user input forms currently exist

### React Implementation Recommendations

```typescript
// Secure component example with XSS prevention
import DOMPurify from 'isomorphic-dompurify';

interface SafeContentProps {
  content: string;
  allowedTags?: string[];
}

export const SafeContent: React.FC<SafeContentProps> = ({ content, allowedTags }) => {
  const sanitized = DOMPurify.sanitize(content, {
    ALLOWED_TAGS: allowedTags || ['p', 'span', 'strong', 'em'],
    ALLOWED_ATTR: ['class', 'id']
  });

  return <div dangerouslySetInnerHTML={{ __html: sanitized }} />;
};
```

### Severity: MEDIUM

- **Risk:** Dynamic content rendering without sanitization
- **Mitigation:**
  - Use React's built-in XSS protection (auto-escaping)
  - Implement DOMPurify for any dangerouslySetInnerHTML usage
  - Avoid eval() and Function() constructors
  - Validate and sanitize all user inputs

## 2. Input Validation Requirements

### Current State

- No input forms detected in current static HTML
- Contact section only displays email link

### Future Contact Form Security

```typescript
// Input validation schema using Zod
import { z } from 'zod';

const ContactFormSchema = z.object({
  name: z.string()
    .min(2, 'Name must be at least 2 characters')
    .max(100, 'Name too long')
    .regex(/^[a-zA-Z\s'-]+$/, 'Invalid characters in name'),

  email: z.string()
    .email('Invalid email format')
    .max(255, 'Email too long'),

  message: z.string()
    .min(10, 'Message must be at least 10 characters')
    .max(5000, 'Message too long')
    .transform(val => DOMPurify.sanitize(val))
});

// Rate limiting for form submissions
const RATE_LIMIT = {
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5 // limit each IP to 5 requests per windowMs
};
```

### Severity: LOW (currently), HIGH (when forms added)

- **Mitigation:**
  - Implement Zod or Yup for schema validation
  - Add rate limiting with express-rate-limit
  - Use CAPTCHA for form submissions
  - Implement honeypot fields

## 3. Secure Routing and 404 Handling

### Current Implementation

- Basic 404.html with animation
- Netlify redirect rules in place

### React Router Security Configuration

```typescript
// Secure routing configuration
import { createBrowserRouter, RouterProvider } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';

const router = createBrowserRouter([
  {
    path: '/',
    element: <HomePage />,
    errorElement: <Error404 />
  },
  {
    path: '/contact',
    element: <ContactPage />,
    loader: async () => {
      // Implement auth check if needed
      return null;
    }
  },
  {
    path: '*',
    element: <Error404 />
  }
]);

// Secure 404 component
export const Error404: React.FC = () => {
  return (
    <>
      <Helmet>
        <title>404 - Page Not Found | Candlefish AI</title>
        <meta name="robots" content="noindex, nofollow" />
      </Helmet>
      <div className="error-404">
        {/* Avoid exposing system paths or sensitive info */}
        <h1>Page Not Found</h1>
        <p>The requested page does not exist.</p>
      </div>
    </>
  );
};
```

### Severity: LOW

- **Mitigation:**
  - Implement catch-all routes
  - Avoid exposing system information in errors
  - Add proper meta tags for SEO security
  - Implement route guards for protected pages

## 4. Content Security Policy (CSP) Recommendations

### Current State

- Basic security headers in netlify.toml
- No CSP implementation

### Recommended CSP Implementation

```javascript
// vite.config.ts CSP plugin
export default defineConfig({
  plugins: [
    react(),
    {
      name: 'html-transform',
      transformIndexHtml(html) {
        return html.replace(
          '<head>',
          `<head>
            <meta http-equiv="Content-Security-Policy" content="
              default-src 'self';
              script-src 'self' 'nonce-{NONCE}' https://www.googletagmanager.com https://www.google-analytics.com;
              style-src 'self' 'unsafe-inline' https://fonts.googleapis.com;
              font-src 'self' https://fonts.gstatic.com;
              img-src 'self' data: https: blob:;
              connect-src 'self' https://www.google-analytics.com https://api.candlefish.ai;
              frame-ancestors 'none';
              form-action 'self';
              base-uri 'self';
              object-src 'none';
              upgrade-insecure-requests;
            ">`
        );
      }
    }
  ]
});

// netlify.toml enhanced headers
[[headers]]
  for = "/*"
  [headers.values]
    X-Frame-Options = "DENY"
    X-Content-Type-Options = "nosniff"
    X-XSS-Protection = "1; mode=block"
    Referrer-Policy = "strict-origin-when-cross-origin"
    Permissions-Policy = "camera=(), microphone=(), geolocation=()"
    Strict-Transport-Security = "max-age=31536000; includeSubDomains; preload"
```

### Severity: HIGH

- **Priority:** Implement comprehensive CSP
- **Benefits:** Prevents XSS, data injection, clickjacking

## 5. Dependency Vulnerabilities Analysis

### Current Dependencies Review

```json
{
  "dependencies": {
    "react": "^18.3.1",              // ✅ Latest stable
    "react-dom": "^18.3.1",          // ✅ Latest stable
    "react-router-dom": "^7.1.1",    // ✅ Latest v7
    "@react-spring/web": "^9.7.5",   // ✅ No known vulnerabilities
    "aws-amplify": "^6.10.0",        // ⚠️  Large bundle, review necessity
    "chart.js": "^4.4.7",            // ✅ Latest stable
    "date-fns": "^4.1.0"             // ✅ Latest v4
  }
}
```

### Security Recommendations

1. **Run regular audits:**

   ```bash
   npm audit
   npm audit fix
   ```

2. **Use Snyk or Dependabot** for continuous monitoring

3. **Lock dependencies:**

   ```json
   {
     "overrides": {
       "lodash": "^4.17.21"
     }
   }
   ```

### Severity: MEDIUM

- **Action:** Enable GitHub Dependabot
- **Schedule:** Weekly dependency updates

## 6. HTTPS and Secure Communication

### Current State

- Site uses HTTPS (enforced by Netlify)
- upgrade-insecure-requests not implemented

### Recommendations

```typescript
// API client with security best practices
import axios from 'axios';

const apiClient = axios.create({
  baseURL: 'https://api.candlefish.ai',
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
    'X-Requested-With': 'XMLHttpRequest'
  },
  withCredentials: true, // For CORS with credentials
  validateStatus: (status) => status < 500
});

// Request interceptor for auth tokens
apiClient.interceptors.request.use(
  (config) => {
    const token = getSecureToken(); // From secure storage
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor for error handling
apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      // Handle unauthorized
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);
```

### Severity: LOW

- **Status:** HTTPS already enforced
- **Enhancement:** Add HSTS preload

## 7. Email Protection

### Current Implementation

- Email exposed in plain text: `hello@candlefish.ai`

### Secure Implementation

```typescript
// Email obfuscation component
export const ProtectedEmail: React.FC = () => {
  const [email, setEmail] = useState<string>('');

  useEffect(() => {
    // Decode on client-side only
    const encoded = 'aGVsbG9AY2FuZGxlZmlzaC5haQ=='; // base64
    setEmail(atob(encoded));
  }, []);

  const handleClick = (e: React.MouseEvent) => {
    e.preventDefault();
    if (email) {
      window.location.href = `mailto:${email}`;
    }
  };

  return (
    <a
      href="#contact"
      onClick={handleClick}
      aria-label="Contact email"
    >
      {email || 'Loading...'}
    </a>
  );
};
```

### Severity: LOW

- **Risk:** Email harvesting by bots
- **Mitigation:** Client-side rendering, obfuscation

## 8. Third-Party Script Security

### Current Scripts

- Google Analytics (gtag.js)
- GSAP animation library
- Unpkg CDN usage

### Secure Implementation

```typescript
// Secure third-party script loading
export const GoogleAnalytics: React.FC<{ measurementId: string }> = ({ measurementId }) => {
  useEffect(() => {
    // Only load in production
    if (process.env.NODE_ENV !== 'production') return;

    // Create script with nonce
    const script = document.createElement('script');
    script.src = `https://www.googletagmanager.com/gtag/js?id=${measurementId}`;
    script.async = true;
    script.nonce = getNonce(); // From CSP nonce generator

    // Subresource integrity
    script.integrity = 'sha384-...'; // Add actual hash
    script.crossOrigin = 'anonymous';

    document.head.appendChild(script);

    // Initialize gtag
    window.dataLayer = window.dataLayer || [];
    function gtag() { dataLayer.push(arguments); }
    gtag('js', new Date());
    gtag('config', measurementId, {
      cookie_flags: 'secure;samesite=strict',
      anonymize_ip: true
    });

    return () => {
      document.head.removeChild(script);
    };
  }, [measurementId]);

  return null;
};
```

### Severity: MEDIUM

- **Risk:** Supply chain attacks
- **Mitigation:** Use SRI, vendor dependencies

## 9. Authentication & Authorization Requirements

### Current State

- No authentication required (public site)

### Future Considerations

```typescript
// JWT token management
const TOKEN_KEY = 'auth_token';
const REFRESH_KEY = 'refresh_token';

export const secureTokenStorage = {
  setTokens: (access: string, refresh: string) => {
    // Use sessionStorage for sensitive tokens
    sessionStorage.setItem(TOKEN_KEY, access);

    // Or use secure cookie
    document.cookie = `${TOKEN_KEY}=${access}; Secure; HttpOnly; SameSite=Strict; Max-Age=3600`;
  },

  getAccessToken: (): string | null => {
    return sessionStorage.getItem(TOKEN_KEY);
  },

  clearTokens: () => {
    sessionStorage.removeItem(TOKEN_KEY);
    sessionStorage.removeItem(REFRESH_KEY);
  }
};

// Protected route wrapper
export const ProtectedRoute: React.FC<{ children: ReactNode }> = ({ children }) => {
  const token = secureTokenStorage.getAccessToken();

  if (!token) {
    return <Navigate to="/login" replace />;
  }

  return <>{children}</>;
};
```

### Severity: N/A (not currently needed)

- **Future:** Implement OAuth2/SAML if needed

## 10. Data Protection & Privacy

### GDPR Compliance Checklist

- [ ] Privacy policy page
- [ ] Cookie consent banner
- [ ] Data retention policies
- [ ] Right to deletion
- [ ] Data portability

### Implementation

```typescript
// Cookie consent component
export const CookieConsent: React.FC = () => {
  const [consent, setConsent] = useState<boolean | null>(null);

  useEffect(() => {
    const stored = localStorage.getItem('cookie_consent');
    if (stored) {
      setConsent(JSON.parse(stored));
    }
  }, []);

  const handleAccept = () => {
    localStorage.setItem('cookie_consent', 'true');
    setConsent(true);
    // Enable analytics
    window.gtag?.('consent', 'update', {
      analytics_storage: 'granted'
    });
  };

  const handleDecline = () => {
    localStorage.setItem('cookie_consent', 'false');
    setConsent(false);
    // Disable analytics
    window.gtag?.('consent', 'update', {
      analytics_storage: 'denied'
    });
  };

  if (consent !== null) return null;

  return (
    <div className="cookie-banner" role="dialog" aria-label="Cookie consent">
      <p>We use cookies to improve your experience.</p>
      <button onClick={handleAccept}>Accept</button>
      <button onClick={handleDecline}>Decline</button>
      <a href="/privacy">Privacy Policy</a>
    </div>
  );
};
```

### Severity: MEDIUM

- **Legal requirement in EU**
- **Implementation priority: HIGH**

## Security Testing Checklist

### Automated Testing

```typescript
// Example security test
describe('Security Tests', () => {
  test('XSS Prevention', () => {
    const maliciousInput = '<script>alert("XSS")</script>';
    const { container } = render(<SafeContent content={maliciousInput} />);
    expect(container.innerHTML).not.toContain('<script>');
  });

  test('CSP Headers', async () => {
    const response = await fetch('/');
    const csp = response.headers.get('Content-Security-Policy');
    expect(csp).toContain("default-src 'self'");
  });
});
```

### Manual Testing Checklist

- [ ] Test all input fields with malicious payloads
- [ ] Verify CSP headers in browser DevTools
- [ ] Check for console errors/warnings
- [ ] Test with OWASP ZAP scanner
- [ ] Verify HTTPS redirect
- [ ] Test error pages don't leak info
- [ ] Check bundle size (<200KB target)

## Implementation Priority

### Phase 1 - Critical (Week 1)

1. Implement CSP headers
2. Set up dependency scanning
3. Configure secure build pipeline
4. Add basic security headers

### Phase 2 - Important (Week 2)

1. Implement input validation
2. Add email obfuscation
3. Set up error boundaries
4. Configure rate limiting

### Phase 3 - Enhancement (Week 3)

1. Add cookie consent
2. Implement SRI for scripts
3. Set up security monitoring
4. Add automated security tests

## Bundle Size Optimization

```javascript
// vite.config.ts optimizations
export default defineConfig({
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          'react-vendor': ['react', 'react-dom'],
          'router': ['react-router-dom'],
          'animations': ['@react-spring/web', 'gsap'],
        }
      }
    },
    // Enable compression
    minify: 'terser',
    terserOptions: {
      compress: {
        drop_console: true,
        drop_debugger: true
      }
    }
  }
});
```

## Monitoring & Incident Response

### Recommended Tools

1. **Sentry** - Error tracking and performance
2. **LogRocket** - Session replay
3. **Datadog** - APM and security monitoring

### Security Headers Monitoring

```typescript
// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    version: process.env.APP_VERSION,
    // Don't expose sensitive info
  });
});
```

## Conclusion

The React modernization of Candlefish.ai presents minimal security risks in its current form as a static marketing site. However, implementing the recommended security measures will ensure the application remains secure as features are added.

### Key Recommendations

1. **Implement comprehensive CSP** - Priority HIGH
2. **Enable dependency scanning** - Priority HIGH
3. **Add security headers** - Priority HIGH
4. **Prepare for future forms** - Priority MEDIUM
5. **Implement monitoring** - Priority MEDIUM

### Overall Risk Assessment: LOW to MEDIUM

The modernization can proceed safely with the implementation of recommended security controls. The existing Netlify infrastructure provides good baseline security.

### Next Steps

1. Review and approve security recommendations
2. Create security implementation tickets
3. Set up automated security testing
4. Schedule quarterly security reviews

---
**Document Version:** 1.0
**Last Updated:** January 2025
**Next Review:** April 2025
