/**
 * Test script for Candlefish AI Secrets Management
 * Operational Design Atelier - Validation Suite
 */

import { VaultClient, getSecret } from './libs/secrets-sdk/vault-client';

async function testSecretsManagement() {
  console.log('🔐 Testing Candlefish AI Secrets Management...\n');

  const vault = new VaultClient();

  try {
    // Test 1: Health check
    console.log('1. Testing Vault health...');
    const isHealthy = await vault.health();
    console.log(`   ${isHealthy ? '✅' : '❌'} Vault health: ${isHealthy ? 'OK' : 'Failed'}`);

    if (!isHealthy) {
      console.log('   ⚠️  Vault is not accessible. Make sure services are running:');
      console.log('   docker-compose -f infrastructure/secrets-management/docker-compose.local.yml up -d');
      return;
    }

    // Test 2: Get MongoDB connection
    console.log('\n2. Testing MongoDB connection retrieval...');
    const mongoSecret = await getSecret<{uri: string, username: string, password: string}>('candlefish/mongodb/connection');
    console.log(`   ✅ MongoDB URI: ${mongoSecret.uri.substring(0, 50)}...`);
    console.log(`   ✅ Username: ${mongoSecret.username}`);

    // Test 3: Get API keys
    console.log('\n3. Testing API key retrieval...');
    const smitherySecret = await getSecret<{key: string}>('candlefish/api/smithery');
    console.log(`   ✅ Smithery API Key: ${smitherySecret.key.substring(0, 8)}...${smitherySecret.key.substring(-4)}`);

    // Test 4: Get JWT secret
    console.log('\n4. Testing JWT secret retrieval...');
    const jwtSecret = await getSecret<{value: string}>('candlefish/jwt/secret');
    console.log(`   ✅ JWT Secret: ${jwtSecret.value.substring(0, 8)}...`);

    // Test 5: Get encryption key
    console.log('\n5. Testing encryption key retrieval...');
    const encryptionKey = await getSecret<{value: string}>('candlefish/encryption/key');
    console.log(`   ✅ Encryption Key: ${encryptionKey.value.substring(0, 8)}...`);

    // Test 6: List all secrets
    console.log('\n6. Testing secret enumeration...');
    const allSecrets = await vault.listSecrets('candlefish');
    console.log(`   ✅ Found ${allSecrets.length} secret categories:`);
    allSecrets.forEach(secret => console.log(`      • ${secret}`));

    // Test 7: Create a test secret
    console.log('\n7. Testing secret creation...');
    const testSecretPath = 'candlefish/test/deployment-test';
    const testSecretData = {
      timestamp: new Date().toISOString(),
      test: true,
      message: 'Deployment test successful'
    };
    
    await vault.putSecret(testSecretPath, testSecretData);
    console.log(`   ✅ Created test secret at: ${testSecretPath}`);

    // Test 8: Retrieve the test secret
    console.log('\n8. Testing test secret retrieval...');
    const retrievedSecret = await getSecret<typeof testSecretData>(testSecretPath);
    console.log(`   ✅ Retrieved test secret: ${retrievedSecret.message}`);
    console.log(`   ✅ Timestamp: ${retrievedSecret.timestamp}`);

    // Test 9: Clean up test secret
    console.log('\n9. Testing secret deletion...');
    await vault.deleteSecret(testSecretPath);
    console.log(`   ✅ Deleted test secret`);

    console.log('\n🎉 All tests passed! Secrets management is working correctly.');
    console.log('\n🔗 Access Information:');
    console.log(`   • Vault UI: http://localhost:8201/ui`);
    console.log(`   • Token: candlefish-dev-token`);
    console.log(`   • Environment file: .env.local`);

  } catch (error) {
    console.error('❌ Test failed:', error.message);
    console.log('\n🔧 Troubleshooting:');
    console.log('   1. Ensure Docker services are running');
    console.log('   2. Check Vault is accessible at http://localhost:8201');
    console.log('   3. Verify the dev token is correct');
  }
}

// Self-executing test
if (require.main === module) {
  testSecretsManagement().catch(console.error);
}

export { testSecretsManagement };