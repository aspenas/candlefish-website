#!/usr/bin/env node
/**
 * Production Deployment Validation Script
 * Validates all production configurations and services
 */

import { promises as fs } from 'fs';
import { join } from 'path';

interface ValidationResult {
  category: string;
  check: string;
  status: 'pass' | 'fail' | 'warning';
  message: string;
  details?: any;
}

interface DeploymentValidation {
  overall: 'pass' | 'fail' | 'warning';
  timestamp: string;
  results: ValidationResult[];
  summary: {
    passed: number;
    failed: number;
    warnings: number;
  };
}

const requiredEnvVars = [
  'NODE_ENV',
  'SALESFORCE_CLIENT_ID',
  'SALESFORCE_CLIENT_SECRET',
  'SALESFORCE_USERNAME',
  'SALESFORCE_PASSWORD',
  'SALESFORCE_SECURITY_TOKEN',
  'SALESFORCE_LOGIN_URL',
  'COMPANYCAM_API_TOKEN',
  'COMPANYCAM_COMPANY_ID',
  'DATABASE_URL',
  'REDIS_URL',
];

const optionalEnvVars = [
  'SALESFORCE_INSTANCE_URL',
  'COMPANYCAM_WEBHOOK_SECRET',
  'NEXT_PUBLIC_API_URL',
  'NEXT_PUBLIC_WEBSOCKET_URL',
];

class ProductionValidator {
  private results: ValidationResult[] = [];

  private addResult(category: string, check: string, status: 'pass' | 'fail' | 'warning', message: string, details?: any): void {
    this.results.push({ category, check, status, message, details });
  }

  // Check environment variables
  private validateEnvironmentVariables(): void {
    console.log('Validating environment variables...');

    // Check NODE_ENV
    if (process.env.NODE_ENV !== 'production') {
      this.addResult('Environment', 'NODE_ENV', 'fail', 'NODE_ENV must be set to "production"');
    } else {
      this.addResult('Environment', 'NODE_ENV', 'pass', 'NODE_ENV correctly set to production');
    }

    // Check required variables
    for (const envVar of requiredEnvVars) {
      if (!process.env[envVar]) {
        this.addResult('Environment', envVar, 'fail', `Required environment variable ${envVar} is not set`);
      } else {
        this.addResult('Environment', envVar, 'pass', `${envVar} is configured`);
      }
    }

    // Check optional variables
    for (const envVar of optionalEnvVars) {
      if (!process.env[envVar]) {
        this.addResult('Environment', envVar, 'warning', `Optional environment variable ${envVar} is not set`);
      } else {
        this.addResult('Environment', envVar, 'pass', `${envVar} is configured`);
      }
    }
  }

  // Check file structure
  private async validateFileStructure(): Promise<void> {
    console.log('Validating file structure...');

    const criticalFiles = [
      'lib/services/salesforce.ts',
      'lib/services/companycam-api.ts',
      'lib/cache/cache-service.ts',
      'lib/middleware/error-handler.ts',
      'app/api/health/production/route.ts',
      '.env.production',
    ];

    const criticalDirectories = [
      'lib/services',
      'lib/cache',
      'lib/middleware',
      'app/api',
    ];

    // Check critical files
    for (const file of criticalFiles) {
      try {
        await fs.access(file);
        this.addResult('Files', file, 'pass', `Critical file exists: ${file}`);
      } catch {
        this.addResult('Files', file, 'fail', `Critical file missing: ${file}`);
      }
    }

    // Check critical directories
    for (const dir of criticalDirectories) {
      try {
        const stat = await fs.stat(dir);
        if (stat.isDirectory()) {
          this.addResult('Files', dir, 'pass', `Critical directory exists: ${dir}`);
        } else {
          this.addResult('Files', dir, 'fail', `Path exists but is not a directory: ${dir}`);
        }
      } catch {
        this.addResult('Files', dir, 'fail', `Critical directory missing: ${dir}`);
      }
    }
  }

  // Check configuration files
  private async validateConfigurationFiles(): Promise<void> {
    console.log('Validating configuration files...');

    // Check .env.production
    try {
      const envContent = await fs.readFile('.env.production', 'utf8');
      const lines = envContent.split('\n').filter(line => line.trim() && !line.startsWith('#'));

      if (lines.length === 0) {
        this.addResult('Config', '.env.production', 'fail', '.env.production is empty');
      } else {
        this.addResult('Config', '.env.production', 'pass', `.env.production contains ${lines.length} configuration lines`);

        // Check for sensitive data exposure
        const sensitivePatterns = [
          /password.*=.*[^*]/i,
          /secret.*=.*[^*]/i,
          /token.*=.*[^*]/i,
        ];

        let exposedSecrets = false;
        for (const line of lines) {
          for (const pattern of sensitivePatterns) {
            if (pattern.test(line) && !line.includes('*') && line.split('=')[1]?.length > 10) {
              exposedSecrets = true;
              break;
            }
          }
        }

        if (exposedSecrets) {
          this.addResult('Config', 'Secrets', 'warning', 'Potential sensitive data in .env.production');
        } else {
          this.addResult('Config', 'Secrets', 'pass', 'No obvious sensitive data exposure detected');
        }
      }
    } catch {
      this.addResult('Config', '.env.production', 'fail', '.env.production file not found');
    }

    // Check package.json
    try {
      const packageContent = await fs.readFile('package.json', 'utf8');
      const packageJson = JSON.parse(packageContent);

      if (packageJson.dependencies?.jsforce && packageJson.dependencies?.axios && packageJson.dependencies?.ioredis) {
        this.addResult('Config', 'Dependencies', 'pass', 'All critical dependencies are present');
      } else {
        this.addResult('Config', 'Dependencies', 'fail', 'Missing critical dependencies');
      }

      if (packageJson.scripts?.build && packageJson.scripts?.start) {
        this.addResult('Config', 'Scripts', 'pass', 'Build and start scripts are configured');
      } else {
        this.addResult('Config', 'Scripts', 'fail', 'Missing build or start scripts');
      }
    } catch {
      this.addResult('Config', 'package.json', 'fail', 'Cannot read or parse package.json');
    }
  }

  // Check service configurations
  private async validateServiceConfigurations(): Promise<void> {
    console.log('Validating service configurations...');

    // Check Salesforce configuration
    const salesforceVars = [
      'SALESFORCE_CLIENT_ID',
      'SALESFORCE_CLIENT_SECRET',
      'SALESFORCE_USERNAME',
      'SALESFORCE_PASSWORD',
      'SALESFORCE_SECURITY_TOKEN',
    ];

    const salesforceConfigured = salesforceVars.every(v => process.env[v]);
    if (salesforceConfigured) {
      this.addResult('Services', 'Salesforce', 'pass', 'Salesforce credentials are configured');
    } else {
      this.addResult('Services', 'Salesforce', 'fail', 'Salesforce credentials are incomplete');
    }

    // Check CompanyCam configuration
    if (process.env.COMPANYCAM_API_TOKEN && process.env.COMPANYCAM_COMPANY_ID) {
      this.addResult('Services', 'CompanyCam', 'pass', 'CompanyCam credentials are configured');
    } else {
      this.addResult('Services', 'CompanyCam', 'fail', 'CompanyCam credentials are incomplete');
    }

    // Check database configuration
    if (process.env.DATABASE_URL) {
      const dbUrl = process.env.DATABASE_URL;
      if (dbUrl.includes('flycast') || dbUrl.includes('fly.dev')) {
        this.addResult('Services', 'Database', 'pass', 'Database URL configured for Fly.io');
      } else {
        this.addResult('Services', 'Database', 'warning', 'Database URL may not be production-ready');
      }
    } else {
      this.addResult('Services', 'Database', 'fail', 'Database URL not configured');
    }

    // Check Redis configuration
    if (process.env.REDIS_URL) {
      this.addResult('Services', 'Redis', 'pass', 'Redis URL is configured');
    } else {
      this.addResult('Services', 'Redis', 'fail', 'Redis URL not configured');
    }
  }

  // Check security configurations
  private validateSecurity(): void {
    console.log('Validating security configurations...');

    // Check JWT secret
    if (process.env.JWT_SECRET && process.env.JWT_SECRET.length >= 32) {
      this.addResult('Security', 'JWT Secret', 'pass', 'JWT secret is configured with adequate length');
    } else {
      this.addResult('Security', 'JWT Secret', 'fail', 'JWT secret is missing or too short');
    }

    // Check encryption key
    if (process.env.ENCRYPTION_KEY && process.env.ENCRYPTION_KEY.length >= 32) {
      this.addResult('Security', 'Encryption Key', 'pass', 'Encryption key is configured with adequate length');
    } else {
      this.addResult('Security', 'Encryption Key', 'fail', 'Encryption key is missing or too short');
    }

    // Check CORS configuration
    if (process.env.CORS_ORIGIN) {
      this.addResult('Security', 'CORS', 'pass', 'CORS origins are configured');
    } else {
      this.addResult('Security', 'CORS', 'warning', 'CORS origins not explicitly configured');
    }

    // Check rate limiting
    if (process.env.RATE_LIMIT_MAX) {
      this.addResult('Security', 'Rate Limiting', 'pass', 'Rate limiting is configured');
    } else {
      this.addResult('Security', 'Rate Limiting', 'warning', 'Rate limiting not configured');
    }
  }

  // Main validation function
  async validate(): Promise<DeploymentValidation> {
    console.log('🔍 Starting production deployment validation...\n');

    this.validateEnvironmentVariables();
    await this.validateFileStructure();
    await this.validateConfigurationFiles();
    await this.validateServiceConfigurations();
    this.validateSecurity();

    // Calculate summary
    const summary = this.results.reduce(
      (acc, result) => {
        acc[result.status === 'pass' ? 'passed' : result.status === 'fail' ? 'failed' : 'warnings']++;
        return acc;
      },
      { passed: 0, failed: 0, warnings: 0 }
    );

    // Determine overall status
    let overall: 'pass' | 'fail' | 'warning' = 'pass';
    if (summary.failed > 0) {
      overall = 'fail';
    } else if (summary.warnings > 0) {
      overall = 'warning';
    }

    return {
      overall,
      timestamp: new Date().toISOString(),
      results: this.results,
      summary,
    };
  }
}

// Main execution
async function main() {
  const validator = new ProductionValidator();
  const validation = await validator.validate();

  // Print results
  console.log('\n📊 Validation Results:');
  console.log('='.repeat(50));

  // Group by category
  const categories = [...new Set(validation.results.map(r => r.category))];

  for (const category of categories) {
    console.log(`\n${category}:`);
    const categoryResults = validation.results.filter(r => r.category === category);

    for (const result of categoryResults) {
      const icon = result.status === 'pass' ? '✅' : result.status === 'fail' ? '❌' : '⚠️';
      console.log(`  ${icon} ${result.check}: ${result.message}`);
      if (result.details) {
        console.log(`     Details: ${JSON.stringify(result.details, null, 2)}`);
      }
    }
  }

  // Print summary
  console.log('\n📈 Summary:');
  console.log('='.repeat(50));
  console.log(`✅ Passed: ${validation.summary.passed}`);
  console.log(`⚠️  Warnings: ${validation.summary.warnings}`);
  console.log(`❌ Failed: ${validation.summary.failed}`);
  console.log(`\nOverall Status: ${validation.overall === 'pass' ? '✅ PASS' : validation.overall === 'warning' ? '⚠️ WARNING' : '❌ FAIL'}`);

  // Exit with appropriate code
  if (validation.overall === 'fail') {
    console.log('\n❌ Deployment validation failed! Please address the issues above before deploying.');
    process.exit(1);
  } else if (validation.overall === 'warning') {
    console.log('\n⚠️ Deployment validation passed with warnings. Review the warnings above.');
    process.exit(0);
  } else {
    console.log('\n✅ All validation checks passed! Ready for production deployment.');
    process.exit(0);
  }
}

if (require.main === module) {
  main().catch((error) => {
    console.error('❌ Validation script failed:', error);
    process.exit(1);
  });
}

export { ProductionValidator, ValidationResult, DeploymentValidation };
