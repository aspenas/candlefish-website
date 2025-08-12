#!/usr/bin/env ts-node

/**
 * Verify AWS Secrets Manager integration
 * - Initializes secrets
 * - Prints a non-sensitive summary of what was loaded
 */

import { initializeSecrets, getSecretsSummary } from '../lib/startup/initialize-secrets';

async function main() {
  try {
    console.log('🔐 Verifying AWS Secrets Manager integration...');
    await initializeSecrets({ skipNonCritical: true, retryAttempts: 2, retryDelay: 1000 });
    const summary = getSecretsSummary();
    console.log('✅ Secrets summary (non-sensitive):');
    console.log(JSON.stringify(summary, null, 2));

    const criticalOk = summary.database && summary.redis && summary.jwt && summary.encryption;
    if (!criticalOk) {
      console.warn('⚠️  Some critical secrets are missing');
      process.exit(2);
    }
    process.exit(0);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error('❌ Failed to initialize secrets:', message);
    process.exit(1);
  }
}

main();
