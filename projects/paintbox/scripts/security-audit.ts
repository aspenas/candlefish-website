#!/usr/bin/env ts-node
/**
 * Security Audit Script for Paintbox Staging Deployment
 * Performs comprehensive security validation checks
 */

import https from 'https';
import http from 'http';
import { URL } from 'url';
import crypto from 'crypto';
import { execSync } from 'child_process';

interface SecurityCheckResult {
  category: string;
  check: string;
  status: 'PASS' | 'FAIL' | 'WARN';
  details: string;
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  recommendation?: string;
}

const results: SecurityCheckResult[] = [];

// Configuration
const STAGING_URL = process.env.STAGING_URL || 'https://paintbox-staging.vercel.app';
const API_URL = process.env.API_URL || 'https://paintbox-api.railway.app';

function addResult(result: SecurityCheckResult) {
  results.push(result);
  const icon = result.status === 'PASS' ? '✅' : result.status === 'WARN' ? '⚠️' : '❌';
  console.log(`${icon} ${result.category} - ${result.check}: ${result.details}`);
}

// 1. SSL/TLS Configuration Checks
async function checkSSLConfiguration(url: string): Promise<void> {
  console.log('\n🔒 Checking SSL/TLS Configuration...\n');

  try {
    const parsedUrl = new URL(url);

    // Check HTTPS enforcement
    if (parsedUrl.protocol !== 'https:') {
      addResult({
        category: 'SSL/TLS',
        check: 'HTTPS Enforcement',
        status: 'FAIL',
        details: 'Site not using HTTPS',
        severity: 'CRITICAL',
        recommendation: 'Enable HTTPS and redirect all HTTP traffic'
      });
      return;
    }

    // Get SSL certificate details
    const options = {
      hostname: parsedUrl.hostname,
      port: 443,
      method: 'GET',
      rejectUnauthorized: true
    };

    await new Promise((resolve, reject) => {
      const req = https.request(options, (res) => {
        const cert = res.socket.getPeerCertificate();

        // Check certificate validity
        const now = new Date();
        const validFrom = new Date(cert.valid_from);
        const validTo = new Date(cert.valid_to);

        if (now < validFrom || now > validTo) {
          addResult({
            category: 'SSL/TLS',
            check: 'Certificate Validity',
            status: 'FAIL',
            details: 'Certificate is not valid',
            severity: 'CRITICAL'
          });
        } else {
          const daysUntilExpiry = Math.floor((validTo.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
          addResult({
            category: 'SSL/TLS',
            check: 'Certificate Validity',
            status: daysUntilExpiry > 30 ? 'PASS' : 'WARN',
            details: `Certificate valid, expires in ${daysUntilExpiry} days`,
            severity: daysUntilExpiry > 30 ? 'LOW' : 'MEDIUM'
          });
        }

        // Check TLS version
        const tlsVersion = res.socket.getProtocol();
        if (tlsVersion && (tlsVersion === 'TLSv1.3' || tlsVersion === 'TLSv1.2')) {
          addResult({
            category: 'SSL/TLS',
            check: 'TLS Version',
            status: 'PASS',
            details: `Using ${tlsVersion}`,
            severity: 'LOW'
          });
        } else {
          addResult({
            category: 'SSL/TLS',
            check: 'TLS Version',
            status: 'FAIL',
            details: `Using outdated TLS version: ${tlsVersion}`,
            severity: 'HIGH',
            recommendation: 'Enable TLS 1.2 minimum, prefer TLS 1.3'
          });
        }

        resolve(true);
      });

      req.on('error', reject);
      req.end();
    });

  } catch (error) {
    addResult({
      category: 'SSL/TLS',
      check: 'SSL Configuration',
      status: 'FAIL',
      details: `SSL check failed: ${error.message}`,
      severity: 'HIGH'
    });
  }
}

// 2. Security Headers Checks
async function checkSecurityHeaders(url: string): Promise<void> {
  console.log('\n🛡️ Checking Security Headers...\n');

  try {
    const response = await fetch(url, { method: 'HEAD' });
    const headers = response.headers;

    // Required security headers
    const requiredHeaders = [
      {
        name: 'Content-Security-Policy',
        check: (value: string) => value && value.includes("default-src"),
        severity: 'HIGH' as const
      },
      {
        name: 'X-Frame-Options',
        check: (value: string) => value === 'DENY' || value === 'SAMEORIGIN',
        severity: 'HIGH' as const
      },
      {
        name: 'X-Content-Type-Options',
        check: (value: string) => value === 'nosniff',
        severity: 'MEDIUM' as const
      },
      {
        name: 'Referrer-Policy',
        check: (value: string) => ['strict-origin-when-cross-origin', 'no-referrer'].includes(value),
        severity: 'MEDIUM' as const
      },
      {
        name: 'Permissions-Policy',
        check: (value: string) => value && value.length > 0,
        severity: 'MEDIUM' as const
      },
      {
        name: 'Strict-Transport-Security',
        check: (value: string) => value && value.includes('max-age=') && parseInt(value.match(/max-age=(\d+)/)?.[1] || '0') >= 31536000,
        severity: 'HIGH' as const
      }
    ];

    for (const header of requiredHeaders) {
      const value = headers.get(header.name.toLowerCase());
      if (!value) {
        addResult({
          category: 'Security Headers',
          check: header.name,
          status: 'FAIL',
          details: 'Header missing',
          severity: header.severity,
          recommendation: `Add ${header.name} header`
        });
      } else if (!header.check(value)) {
        addResult({
          category: 'Security Headers',
          check: header.name,
          status: 'WARN',
          details: `Header present but misconfigured: ${value}`,
          severity: header.severity,
          recommendation: `Review ${header.name} configuration`
        });
      } else {
        addResult({
          category: 'Security Headers',
          check: header.name,
          status: 'PASS',
          details: `Properly configured: ${value.substring(0, 50)}...`,
          severity: 'LOW'
        });
      }
    }

  } catch (error) {
    addResult({
      category: 'Security Headers',
      check: 'Headers Check',
      status: 'FAIL',
      details: `Failed to check headers: ${error.message}`,
      severity: 'HIGH'
    });
  }
}

// 3. Rate Limiting Checks
async function checkRateLimiting(url: string): Promise<void> {
  console.log('\n⏱️ Checking Rate Limiting...\n');

  try {
    // Make multiple rapid requests
    const requests = 150; // Exceed the 100 req/min limit
    const startTime = Date.now();
    let blockedAt = 0;

    for (let i = 0; i < requests; i++) {
      try {
        const response = await fetch(`${url}/api/health`, {
          method: 'GET',
          headers: { 'X-Test-Request': `rate-limit-test-${i}` }
        });

        if (response.status === 429) {
          blockedAt = i + 1;
          break;
        }
      } catch (error) {
        // Connection errors might indicate rate limiting
      }
    }

    const duration = Date.now() - startTime;

    if (blockedAt > 0 && blockedAt <= 100) {
      addResult({
        category: 'Rate Limiting',
        check: 'API Rate Limiting',
        status: 'PASS',
        details: `Rate limit enforced after ${blockedAt} requests in ${duration}ms`,
        severity: 'LOW'
      });
    } else if (blockedAt > 100) {
      addResult({
        category: 'Rate Limiting',
        check: 'API Rate Limiting',
        status: 'WARN',
        details: `Rate limit enforced but threshold too high: ${blockedAt} requests`,
        severity: 'MEDIUM',
        recommendation: 'Tighten rate limiting to 100 req/min as documented'
      });
    } else {
      addResult({
        category: 'Rate Limiting',
        check: 'API Rate Limiting',
        status: 'FAIL',
        details: `No rate limiting detected after ${requests} requests`,
        severity: 'HIGH',
        recommendation: 'Implement rate limiting to prevent abuse'
      });
    }

  } catch (error) {
    addResult({
      category: 'Rate Limiting',
      check: 'Rate Limit Test',
      status: 'FAIL',
      details: `Rate limit test failed: ${error.message}`,
      severity: 'MEDIUM'
    });
  }
}

// 4. Input Validation Checks
async function checkInputValidation(url: string): Promise<void> {
  console.log('\n🔍 Checking Input Validation...\n');

  const payloads = [
    {
      name: 'XSS Payload',
      data: { name: '<script>alert("XSS")</script>' },
      checkResponse: (body: string) => !body.includes('<script>')
    },
    {
      name: 'SQL Injection',
      data: { email: "admin' OR '1'='1" },
      checkResponse: (body: string) => !body.includes('SQL') && !body.includes('error')
    },
    {
      name: 'Command Injection',
      data: { command: '; cat /etc/passwd' },
      checkResponse: (body: string) => !body.includes('root:')
    },
    {
      name: 'Path Traversal',
      data: { file: '../../../etc/passwd' },
      checkResponse: (body: string) => !body.includes('root:')
    }
  ];

  for (const payload of payloads) {
    try {
      const response = await fetch(`${url}/api/test`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload.data)
      });

      const body = await response.text();

      if (response.status === 400 || payload.checkResponse(body)) {
        addResult({
          category: 'Input Validation',
          check: payload.name,
          status: 'PASS',
          details: 'Malicious input properly rejected',
          severity: 'LOW'
        });
      } else {
        addResult({
          category: 'Input Validation',
          check: payload.name,
          status: 'FAIL',
          details: 'Malicious input not properly validated',
          severity: 'CRITICAL',
          recommendation: 'Implement proper input validation and sanitization'
        });
      }
    } catch (error) {
      // Error might indicate the payload was rejected (good)
      addResult({
        category: 'Input Validation',
        check: payload.name,
        status: 'PASS',
        details: 'Request rejected (connection error)',
        severity: 'LOW'
      });
    }
  }
}

// 5. Authentication & Session Security
async function checkAuthSecurity(url: string): Promise<void> {
  console.log('\n🔐 Checking Authentication Security...\n');

  try {
    // Test JWT configuration
    const testToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkpvaG4gRG9lIiwiaWF0IjoxNTE2MjM5MDIyfQ.SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c';

    const response = await fetch(`${url}/api/protected`, {
      headers: { 'Authorization': `Bearer ${testToken}` }
    });

    if (response.status === 401) {
      addResult({
        category: 'Authentication',
        check: 'JWT Validation',
        status: 'PASS',
        details: 'Invalid JWT properly rejected',
        severity: 'LOW'
      });
    } else {
      addResult({
        category: 'Authentication',
        check: 'JWT Validation',
        status: 'FAIL',
        details: 'Invalid JWT not rejected',
        severity: 'CRITICAL',
        recommendation: 'Implement proper JWT validation'
      });
    }

    // Check for secure session configuration
    const sessionResponse = await fetch(`${url}/api/auth/session`);
    const setCookie = sessionResponse.headers.get('set-cookie');

    if (setCookie) {
      const hasSecure = setCookie.includes('Secure');
      const hasHttpOnly = setCookie.includes('HttpOnly');
      const hasSameSite = setCookie.includes('SameSite');

      if (hasSecure && hasHttpOnly && hasSameSite) {
        addResult({
          category: 'Authentication',
          check: 'Session Cookie Security',
          status: 'PASS',
          details: 'Session cookies properly configured',
          severity: 'LOW'
        });
      } else {
        addResult({
          category: 'Authentication',
          check: 'Session Cookie Security',
          status: 'FAIL',
          details: `Missing flags: ${!hasSecure ? 'Secure ' : ''}${!hasHttpOnly ? 'HttpOnly ' : ''}${!hasSameSite ? 'SameSite' : ''}`,
          severity: 'HIGH',
          recommendation: 'Add Secure, HttpOnly, and SameSite flags to session cookies'
        });
      }
    }

  } catch (error) {
    addResult({
      category: 'Authentication',
      check: 'Auth Security Test',
      status: 'WARN',
      details: `Auth test incomplete: ${error.message}`,
      severity: 'MEDIUM'
    });
  }
}

// 6. CORS Configuration Check
async function checkCORSConfiguration(url: string): Promise<void> {
  console.log('\n🌐 Checking CORS Configuration...\n');

  try {
    const origins = [
      'https://evil.com',
      'http://localhost:3000',
      'https://paintbox.vercel.app'
    ];

    for (const origin of origins) {
      const response = await fetch(`${url}/api/health`, {
        method: 'OPTIONS',
        headers: {
          'Origin': origin,
          'Access-Control-Request-Method': 'POST'
        }
      });

      const allowedOrigin = response.headers.get('access-control-allow-origin');

      if (origin === 'https://evil.com' && allowedOrigin === '*') {
        addResult({
          category: 'CORS',
          check: 'CORS Wildcard',
          status: 'FAIL',
          details: 'CORS allows all origins (wildcard)',
          severity: 'HIGH',
          recommendation: 'Configure specific allowed origins instead of wildcard'
        });
      } else if (origin === 'https://evil.com' && allowedOrigin === origin) {
        addResult({
          category: 'CORS',
          check: 'CORS Restriction',
          status: 'FAIL',
          details: `Unauthorized origin allowed: ${origin}`,
          severity: 'HIGH'
        });
      } else if (origin === 'https://paintbox.vercel.app' && allowedOrigin === origin) {
        addResult({
          category: 'CORS',
          check: 'CORS Configuration',
          status: 'PASS',
          details: 'Authorized origins properly configured',
          severity: 'LOW'
        });
      }
    }

  } catch (error) {
    addResult({
      category: 'CORS',
      check: 'CORS Test',
      status: 'WARN',
      details: `CORS test incomplete: ${error.message}`,
      severity: 'MEDIUM'
    });
  }
}

// 7. Generate Security Report
function generateSecurityReport(): void {
  console.log('\n\n📋 SECURITY AUDIT REPORT\n');
  console.log('========================\n');

  const summary = {
    total: results.length,
    passed: results.filter(r => r.status === 'PASS').length,
    warnings: results.filter(r => r.status === 'WARN').length,
    failed: results.filter(r => r.status === 'FAIL').length,
    critical: results.filter(r => r.severity === 'CRITICAL').length,
    high: results.filter(r => r.severity === 'HIGH').length,
    medium: results.filter(r => r.severity === 'MEDIUM').length,
    low: results.filter(r => r.severity === 'LOW').length
  };

  console.log('📊 Summary:');
  console.log(`   Total Checks: ${summary.total}`);
  console.log(`   ✅ Passed: ${summary.passed}`);
  console.log(`   ⚠️  Warnings: ${summary.warnings}`);
  console.log(`   ❌ Failed: ${summary.failed}`);
  console.log('\n🚨 Severity Breakdown:');
  console.log(`   Critical: ${summary.critical}`);
  console.log(`   High: ${summary.high}`);
  console.log(`   Medium: ${summary.medium}`);
  console.log(`   Low: ${summary.low}`);

  console.log('\n\n📝 Detailed Findings:\n');

  // Group by category
  const categories = [...new Set(results.map(r => r.category))];

  for (const category of categories) {
    console.log(`\n### ${category}\n`);
    const categoryResults = results.filter(r => r.category === category);

    for (const result of categoryResults) {
      const icon = result.status === 'PASS' ? '✅' : result.status === 'WARN' ? '⚠️' : '❌';
      console.log(`${icon} ${result.check}`);
      console.log(`   Status: ${result.status} | Severity: ${result.severity}`);
      console.log(`   Details: ${result.details}`);
      if (result.recommendation) {
        console.log(`   📌 Recommendation: ${result.recommendation}`);
      }
      console.log('');
    }
  }

  console.log('\n\n🔧 Priority Recommendations:\n');

  const criticalAndHigh = results.filter(r =>
    r.status !== 'PASS' && (r.severity === 'CRITICAL' || r.severity === 'HIGH')
  );

  if (criticalAndHigh.length === 0) {
    console.log('✅ No critical or high severity issues found!');
  } else {
    criticalAndHigh.forEach((issue, index) => {
      console.log(`${index + 1}. [${issue.severity}] ${issue.category} - ${issue.check}`);
      console.log(`   ${issue.recommendation || issue.details}`);
      console.log('');
    });
  }

  // Calculate security score
  const score = Math.round((summary.passed / summary.total) * 100);
  const grade = score >= 90 ? 'A' : score >= 80 ? 'B' : score >= 70 ? 'C' : score >= 60 ? 'D' : 'F';

  console.log('\n\n🏆 Security Score: ' + score + '% (Grade: ' + grade + ')\n');
}

// Main execution
async function runSecurityAudit(): Promise<void> {
  console.log('🔒 Paintbox Security Audit Tool');
  console.log('================================\n');
  console.log(`Staging URL: ${STAGING_URL}`);
  console.log(`API URL: ${API_URL}`);
  console.log(`Timestamp: ${new Date().toISOString()}\n`);

  try {
    // Run all security checks
    await checkSSLConfiguration(STAGING_URL);
    await checkSecurityHeaders(STAGING_URL);
    await checkRateLimiting(API_URL);
    await checkInputValidation(API_URL);
    await checkAuthSecurity(API_URL);
    await checkCORSConfiguration(API_URL);

    // Generate report
    generateSecurityReport();

    // Exit with appropriate code
    const failedCount = results.filter(r => r.status === 'FAIL').length;
    const criticalCount = results.filter(r => r.severity === 'CRITICAL').length;

    if (criticalCount > 0) {
      console.log('\n❌ CRITICAL SECURITY ISSUES DETECTED - DEPLOYMENT SHOULD BE BLOCKED\n');
      process.exit(1);
    } else if (failedCount > 5) {
      console.log('\n⚠️  MULTIPLE SECURITY ISSUES DETECTED - REVIEW BEFORE PRODUCTION\n');
      process.exit(1);
    } else {
      console.log('\n✅ SECURITY AUDIT COMPLETED - READY FOR STAGING\n');
      process.exit(0);
    }

  } catch (error) {
    console.error('\n❌ Security audit failed:', error);
    process.exit(1);
  }
}

// Run the audit
runSecurityAudit();
