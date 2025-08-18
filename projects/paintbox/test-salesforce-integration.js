/**
 * Test Salesforce Integration
 * Quick test to verify API endpoints are working
 */

const BASE_URL = 'http://localhost:3006';

async function testSalesforceConnection() {
  console.log('🔍 Testing Salesforce connection...');

  try {
    const response = await fetch(`${BASE_URL}/api/v1/salesforce/test`);
    const result = await response.json();

    console.log('✅ Connection Test Result:', result);
    return result.success && result.connected;
  } catch (error) {
    console.error('❌ Connection test failed:', error.message);
    return false;
  }
}

async function testSalesforceSearch(query) {
  console.log(`🔍 Testing search for: "${query}"`);

  try {
    const response = await fetch(`${BASE_URL}/api/v1/salesforce/search?q=${encodeURIComponent(query)}&limit=5`);
    const result = await response.json();

    console.log('✅ Search Result:', result);

    if (result.success && result.data) {
      console.log(`   - Found ${result.data.contacts?.length || 0} contacts`);
      console.log(`   - Found ${result.data.accounts?.length || 0} accounts`);
      console.log(`   - Total: ${result.data.total || 0} results`);
    }

    return result;
  } catch (error) {
    console.error('❌ Search test failed:', error.message);
    return null;
  }
}

async function runTests() {
  console.log('🚀 Starting Salesforce Integration Tests\n');

  // Test 1: Connection
  const isConnected = await testSalesforceConnection();
  console.log('');

  if (!isConnected) {
    console.log('❌ Cannot proceed with search tests - no connection');
    console.log('\n📝 To fix this:');
    console.log('1. Set up Salesforce sandbox credentials in AWS Secrets Manager');
    console.log('2. Ensure environment variables are configured');
    console.log('3. Verify jsforce is properly installed');
    return;
  }

  // Test 2: Search by name
  await testSalesforceSearch('Smith');
  console.log('');

  // Test 3: Search by phone
  await testSalesforceSearch('555');
  console.log('');

  // Test 4: Search by email domain
  await testSalesforceSearch('test.com');
  console.log('');

  console.log('✅ All tests completed!');
}

// Run the tests
runTests().catch(console.error);
