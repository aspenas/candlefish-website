#!/usr/bin/env npx tsx

/**
 * Direct Salesforce Connection Test
 * Tests Salesforce connection without going through the API
 */

import { salesforceService } from '../lib/services/salesforce';

async function testSalesforceConnection() {
  console.log('🔧 Testing Salesforce Connection Directly');
  console.log('==========================================');

  try {
    console.log('1. Testing connection...');
    const isConnected = await salesforceService.testConnection();

    if (isConnected) {
      console.log('✅ Connection successful!');

      try {
        console.log('2. Testing search capability...');
        const searchResults = await salesforceService.searchContacts('test', 1);
        console.log(`✅ Search successful! Found ${searchResults.length} results.`);

        if (searchResults.length > 0) {
          console.log('Sample result:', JSON.stringify(searchResults[0], null, 2));
        }

        console.log('');
        console.log('🎉 Salesforce integration is working correctly!');
        console.log('');
        console.log('📋 Test Results:');
        console.log(`   Connection: ✅ Success`);
        console.log(`   Search: ✅ Success`);
        console.log(`   Search Results: ${searchResults.length} contacts`);

      } catch (searchError) {
        console.log('⚠️  Connection successful but search failed');
        console.log('   This might be due to permissions or empty data');
        console.log('   Error:', (searchError as Error).message);

        console.log('');
        console.log('📋 Test Results:');
        console.log(`   Connection: ✅ Success`);
        console.log(`   Search: ❌ Failed (${(searchError as Error).message})`);
      }

    } else {
      console.log('❌ Connection failed');
      console.log('');
      console.log('📋 Test Results:');
      console.log(`   Connection: ❌ Failed`);
      console.log(`   Search: ⏭️  Skipped`);

      console.log('');
      console.log('🔍 Troubleshooting:');
      console.log('1. Check Salesforce credentials in AWS Secrets Manager');
      console.log('2. Verify instanceUrl is correct');
      console.log('3. Confirm username/password/security token are valid');
      console.log('4. Check network connectivity to Salesforce');
    }

  } catch (error) {
    console.log('💥 Test failed with error:');
    console.log('   ', (error as Error).message);
    console.log('');
    console.log('📋 Test Results:');
    console.log(`   Connection: 💥 Error`);
    console.log(`   Search: ⏭️  Skipped`);

    console.log('');
    console.log('🔍 Troubleshooting:');
    console.log('1. Check if Salesforce service is properly configured');
    console.log('2. Verify AWS Secrets Manager access');
    console.log('3. Check environment variables');
    console.log('4. Review lib/services/salesforce.ts');

    if (error instanceof Error && error.stack) {
      console.log('');
      console.log('🐛 Full error details:');
      console.log(error.stack);
    }
  }
}

// Run the test
testSalesforceConnection().catch(console.error);
