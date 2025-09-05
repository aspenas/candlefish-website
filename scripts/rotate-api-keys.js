#!/usr/bin/env node

/**
 * Secure API Key Rotation Script
 * 
 * This script helps with secure API key rotation by:
 * - Generating secure placeholder keys for development
 * - Providing rotation workflow guidance
 * - Validating key formats and security
 * - Creating audit trail for key rotations
 * 
 * Usage:
 *   node scripts/rotate-api-keys.js [command] [options]
 * 
 * Commands:
 *   generate    - Generate secure placeholder keys
 *   validate    - Validate existing key configuration  
 *   rotate      - Guide through key rotation process
 *   audit       - Generate key usage audit report
 * 
 * Security: This script never stores or transmits actual API keys
 */

const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

class ApiKeyRotator {
  constructor() {
    this.supportedProviders = {
      resend: {
        prefix: 're_',
        length: 32,
        description: 'Resend Email Service API Key'
      },
      openai: {
        prefix: 'sk-',
        length: 48,
        description: 'OpenAI API Key'
      },
      stripe: {
        prefix: 'sk_',
        length: 48,
        description: 'Stripe API Key'
      }
    };
    
    this.environments = ['development', 'staging', 'production'];
    this.auditLog = [];
  }

  /**
   * Generate secure placeholder API keys for development
   */
  generatePlaceholderKeys(provider = 'resend', count = 1) {
    console.log(`🔐 Generating ${count} secure placeholder key(s) for ${provider}\n`);
    
    if (!this.supportedProviders[provider]) {
      console.error(`❌ Unsupported provider: ${provider}`);
      console.log(`Supported providers: ${Object.keys(this.supportedProviders).join(', ')}`);
      return [];
    }

    const config = this.supportedProviders[provider];
    const keys = [];

    for (let i = 0; i < count; i++) {
      // Generate cryptographically secure random key
      const randomBytes = crypto.randomBytes(config.length);
      const keyBody = randomBytes.toString('base64')
        .replace(/[/+=]/g, '') // Remove special characters
        .substring(0, config.length - config.prefix.length);
      
      const placeholderKey = `${config.prefix}${keyBody}`;
      keys.push(placeholderKey);

      console.log(`Generated placeholder key ${i + 1}:`);
      console.log(`  Format: ${config.description}`);
      console.log(`  Key: ${placeholderKey}`);
      console.log(`  Length: ${placeholderKey.length} characters`);
      console.log(`  Security: Cryptographically secure random`);
      console.log('');
    }

    console.log('⚠️  IMPORTANT SECURITY NOTES:');
    console.log('• These are PLACEHOLDER keys for development/testing only');
    console.log('• Do NOT use these keys in production');
    console.log('• Generate real keys from the provider\'s dashboard');
    console.log('• Store real keys in environment variables only');
    console.log('• Never commit real API keys to version control\n');

    return keys;
  }

  /**
   * Validate API key format and security
   */
  validateKey(key, expectedProvider = null) {
    if (!key || typeof key !== 'string') {
      return { valid: false, error: 'Key is empty or invalid type' };
    }

    // Check for common security issues
    if (key.includes(' ') || key.includes('\n') || key.includes('\t')) {
      return { valid: false, error: 'Key contains whitespace characters' };
    }

    if (key.length < 20) {
      return { valid: false, error: 'Key too short (minimum 20 characters)' };
    }

    // Detect provider by prefix
    let detectedProvider = null;
    for (const [providerName, config] of Object.entries(this.supportedProviders)) {
      if (key.startsWith(config.prefix)) {
        detectedProvider = providerName;
        break;
      }
    }

    if (!detectedProvider) {
      return { valid: false, error: 'Unknown key format/provider' };
    }

    if (expectedProvider && detectedProvider !== expectedProvider) {
      return { 
        valid: false, 
        error: `Expected ${expectedProvider} key, got ${detectedProvider}` 
      };
    }

    const config = this.supportedProviders[detectedProvider];
    
    // Validate length
    if (key.length < config.length * 0.8 || key.length > config.length * 1.2) {
      return { 
        valid: false, 
        error: `Key length ${key.length} outside expected range for ${detectedProvider}` 
      };
    }

    return {
      valid: true,
      provider: detectedProvider,
      description: config.description,
      length: key.length
    };
  }

  /**
   * Guide through API key rotation process
   */
  async rotateKeys(provider = 'resend') {
    console.log(`🔄 API Key Rotation Wizard for ${provider.toUpperCase()}\n`);
    
    const config = this.supportedProviders[provider];
    if (!config) {
      console.error(`❌ Unsupported provider: ${provider}`);
      return;
    }

    console.log('📋 Key Rotation Checklist:\n');

    // Step 1: Pre-rotation
    console.log('1️⃣  PRE-ROTATION PREPARATION:');
    console.log('   □ Identify all systems using current key');
    console.log('   □ Document current key usage and permissions');
    console.log('   □ Prepare rollback plan');
    console.log('   □ Schedule maintenance window if needed\n');

    // Step 2: Generate new key
    console.log('2️⃣  GENERATE NEW KEY:');
    switch (provider) {
      case 'resend':
        console.log('   □ Go to https://resend.com/api-keys');
        console.log('   □ Create new API key with required permissions');
        console.log('   □ Copy the new key (starts with re_)');
        break;
      case 'openai':
        console.log('   □ Go to https://platform.openai.com/api-keys');
        console.log('   □ Create new API key with required permissions');
        console.log('   □ Copy the new key (starts with sk-)');
        break;
      default:
        console.log(`   □ Go to ${provider} dashboard and generate new API key`);
    }
    console.log('   □ Validate key format using: node scripts/rotate-api-keys.js validate\n');

    // Step 3: Update environment variables
    console.log('3️⃣  UPDATE ENVIRONMENT VARIABLES:');
    console.log('   □ Development: Update .env.local');
    console.log('   □ Staging: Update Netlify staging environment variables');
    console.log('   □ Production: Update Netlify production environment variables');
    console.log('   □ Verify all environments have new key\n');

    // Step 4: Deploy and test
    console.log('4️⃣  DEPLOY AND TEST:');
    console.log('   □ Deploy to staging first');
    console.log('   □ Test all affected functions');
    console.log('   □ Monitor error rates and logs');
    console.log('   □ Deploy to production after successful staging test');
    console.log('   □ Run post-deployment verification\n');

    // Step 5: Cleanup
    console.log('5️⃣  POST-ROTATION CLEANUP:');
    console.log('   □ Deactivate/delete old API key');
    console.log('   □ Update documentation with new key location');
    console.log('   □ Update team about rotation');
    console.log('   □ Schedule next rotation date');
    console.log('   □ Create audit log entry\n');

    // Generate audit entry template
    const auditEntry = {
      timestamp: new Date().toISOString(),
      provider: provider,
      action: 'key_rotation_initiated',
      environments: this.environments,
      checklist_completed: false,
      next_rotation_due: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString() // 90 days
    };

    console.log('📝 Audit Entry Template:');
    console.log(JSON.stringify(auditEntry, null, 2));
    console.log('\n⚠️  Save this audit entry after completing rotation\n');

    return auditEntry;
  }

  /**
   * Generate key usage audit report
   */
  auditKeyUsage() {
    console.log('📊 API Key Usage Audit Report\n');
    console.log('=' + '='.repeat(50));

    // Scan for environment files
    const envFiles = [
      '.env.local',
      '.env',
      '.env.development',
      '.env.staging', 
      '.env.production',
      'brand/website/.env.local'
    ];

    const foundKeys = [];
    const missingFiles = [];

    for (const envFile of envFiles) {
      const fullPath = path.resolve(envFile);
      
      if (fs.existsSync(fullPath)) {
        try {
          const content = fs.readFileSync(fullPath, 'utf8');
          const lines = content.split('\n');
          
          lines.forEach((line, index) => {
            const trimmed = line.trim();
            if (trimmed.startsWith('#') || !trimmed.includes('=')) return;
            
            const [key, value] = trimmed.split('=', 2);
            if (!value) return;

            // Check if value looks like an API key
            for (const [provider, config] of Object.entries(this.supportedProviders)) {
              if (value.startsWith(config.prefix)) {
                const validation = this.validateKey(value, provider);
                foundKeys.push({
                  file: envFile,
                  line: index + 1,
                  variable: key,
                  provider: provider,
                  keyLength: value.length,
                  valid: validation.valid,
                  error: validation.error || null
                });
              }
            }
          });
        } catch (error) {
          console.log(`⚠️  Could not read ${envFile}: ${error.message}`);
        }
      } else {
        missingFiles.push(envFile);
      }
    }

    // Report findings
    console.log(`\n📁 FILES SCANNED: ${envFiles.length}`);
    console.log(`🔍 API KEYS FOUND: ${foundKeys.length}\n`);

    if (foundKeys.length > 0) {
      console.log('🔑 DISCOVERED API KEYS:\n');
      foundKeys.forEach((keyInfo, index) => {
        console.log(`${index + 1}. ${keyInfo.variable} in ${keyInfo.file}`);
        console.log(`   Provider: ${keyInfo.provider}`);
        console.log(`   Length: ${keyInfo.keyLength} characters`);
        console.log(`   Valid: ${keyInfo.valid ? '✅ Yes' : '❌ No'}`);
        if (keyInfo.error) {
          console.log(`   Error: ${keyInfo.error}`);
        }
        console.log('');
      });
    }

    // Security recommendations
    console.log('🔒 SECURITY RECOMMENDATIONS:\n');
    const recommendations = [];

    if (foundKeys.some(k => !k.valid)) {
      recommendations.push('Fix invalid API keys found in environment files');
    }

    if (foundKeys.some(k => k.file.includes('.env') && !k.file.includes('.local'))) {
      recommendations.push('Move API keys from tracked files to .env.local (gitignored)');
    }

    recommendations.push('Rotate API keys every 90 days');
    recommendations.push('Use different keys for development/staging/production');
    recommendations.push('Monitor API key usage and set up alerts');
    recommendations.push('Regularly audit key permissions and access');

    recommendations.forEach((rec, index) => {
      console.log(`${index + 1}. ${rec}`);
    });

    console.log('\n' + '='.repeat(51));
    
    return {
      filesScanned: envFiles.length,
      keysFound: foundKeys.length,
      keyDetails: foundKeys,
      recommendations: recommendations
    };
  }

  /**
   * Create a secure environment template
   */
  createEnvTemplate() {
    console.log('📄 Creating secure .env template...\n');

    const template = `# Candlefish Web Platform Environment Variables
# 
# SECURITY NOTICE:
# - This file contains sensitive API keys and configuration
# - Never commit this file to version control
# - Use different keys for development/staging/production
# - Rotate keys regularly (every 90 days recommended)

# Email Service (Resend)
RESEND_API_KEY=re_placeholder_replace_with_real_key
RESEND_AUDIENCE_ID=your_audience_id_here

# Email Configuration
ADMIN_EMAIL=hello@candlefish.ai
NOTIFICATION_EMAIL=hello@candlefish.ai
FROM_EMAIL=noreply@candlefish.ai

# Application Configuration
NODE_ENV=development
NEXT_PUBLIC_API_URL=https://api.candlefish.ai

# CORS Configuration
ALLOWED_ORIGINS=https://candlefish.ai,https://www.candlefish.ai,https://test.candlefish.ai

# Optional: Disable telemetry
NEXT_TELEMETRY_DISABLED=1

# Security Configuration (optional)
RATE_LIMIT_WINDOW_MS=60000
RATE_LIMIT_MAX_REQUESTS=5

# Generated: ${new Date().toISOString()}
# Next rotation due: ${new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString()}
`;

    const templatePath = path.resolve('.env.template');
    fs.writeFileSync(templatePath, template);
    
    console.log(`✅ Environment template created: ${templatePath}`);
    console.log('\n📋 Next steps:');
    console.log('1. Copy .env.template to .env.local');
    console.log('2. Replace placeholder values with real API keys');
    console.log('3. Ensure .env.local is in .gitignore');
    console.log('4. Configure the same variables in Netlify dashboard\n');

    return templatePath;
  }
}

// Main CLI interface
async function main() {
  const args = process.argv.slice(2);
  const command = args[0] || 'help';
  const rotator = new ApiKeyRotator();

  switch (command) {
    case 'generate':
      const provider = args[1] || 'resend';
      const count = parseInt(args[2]) || 1;
      rotator.generatePlaceholderKeys(provider, count);
      break;

    case 'validate':
      const keyToValidate = args[1];
      const expectedProvider = args[2];
      
      if (!keyToValidate) {
        console.error('Usage: node scripts/rotate-api-keys.js validate <api-key> [expected-provider]');
        process.exit(1);
      }
      
      const validation = rotator.validateKey(keyToValidate, expectedProvider);
      
      if (validation.valid) {
        console.log('✅ Key validation passed:');
        console.log(`   Provider: ${validation.provider}`);
        console.log(`   Description: ${validation.description}`);
        console.log(`   Length: ${validation.length} characters`);
      } else {
        console.log('❌ Key validation failed:');
        console.log(`   Error: ${validation.error}`);
        process.exit(1);
      }
      break;

    case 'rotate':
      const rotateProvider = args[1] || 'resend';
      await rotator.rotateKeys(rotateProvider);
      break;

    case 'audit':
      rotator.auditKeyUsage();
      break;

    case 'template':
      rotator.createEnvTemplate();
      break;

    case 'help':
    default:
      console.log('🔐 Secure API Key Rotation Tool\n');
      console.log('Usage: node scripts/rotate-api-keys.js <command> [options]\n');
      console.log('Commands:');
      console.log('  generate [provider] [count]  - Generate secure placeholder keys');
      console.log('  validate <key> [provider]    - Validate API key format');
      console.log('  rotate [provider]            - Guide through rotation process');
      console.log('  audit                        - Generate key usage audit');
      console.log('  template                     - Create secure .env template');
      console.log('  help                         - Show this help message\n');
      console.log('Providers: resend, openai, stripe\n');
      console.log('Examples:');
      console.log('  node scripts/rotate-api-keys.js generate resend');
      console.log('  node scripts/rotate-api-keys.js validate re_abc123...');
      console.log('  node scripts/rotate-api-keys.js rotate resend');
      console.log('  node scripts/rotate-api-keys.js audit');
      break;
  }
}

// Run if called directly
if (require.main === module) {
  main().catch(error => {
    console.error('❌ Script failed:', error);
    process.exit(1);
  });
}

module.exports = { ApiKeyRotator };