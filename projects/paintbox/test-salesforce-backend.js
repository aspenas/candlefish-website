const fetch = require('node-fetch');

async function testSalesforceBackend() {
  const baseUrl = 'https://paintbox-backend-9jj08p5hw-temppjs.vercel.app';

  console.log('Testing Salesforce Backend Integration...\n');

  try {
    // Test 1: Health check
    console.log('1. Testing health endpoint...');
    const healthResponse = await fetch(`${baseUrl}/health`);
    const healthData = await healthResponse.json();
    console.log('✅ Health check:', healthData);

    // Test 2: Search for contacts
    console.log('\n2. Testing Salesforce search...');
    const searchResponse = await fetch(`${baseUrl}/api/v1/salesforce/search?q=test`);
    const searchData = await searchResponse.json();
    console.log('Search response status:', searchResponse.status);
    console.log('Search data:', JSON.stringify(searchData, null, 2));

    // Test 3: Get specific account (if we have one from search)
    if (searchData.accounts && searchData.accounts.length > 0) {
      const accountId = searchData.accounts[0].Id;
      console.log(`\n3. Testing account fetch for ID: ${accountId}...`);
      const accountResponse = await fetch(`${baseUrl}/api/v1/salesforce/accounts/${accountId}`);
      const accountData = await accountResponse.json();
      console.log('Account data:', JSON.stringify(accountData, null, 2));
    }

  } catch (error) {
    console.error('❌ Error testing backend:', error.message);
  }
}

testSalesforceBackend();
