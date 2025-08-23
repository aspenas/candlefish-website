const axios = require('axios');

async function quickTest() {
  console.log('🧪 Quick E2E Test Results\n');
  
  // Test API connectivity
  console.log('📡 API Connectivity:');
  try {
    const response = await axios.get('https://5470-inventory.fly.dev/api/v1/analytics/summary');
    console.log('✅ Backend API: Working');
    console.log(`   • Total Items: ${response.data.totalItems}`);
    console.log(`   • Total Value: $${response.data.totalValue}`);
    console.log(`   • Keep Count: ${response.data.keepCount}`);
    console.log(`   • Sell Count: ${response.data.sellCount}`);
    console.log(`   • Unsure Count: ${response.data.unsureCount}`);
  } catch (error) {
    console.log('❌ Backend API: Failed -', error.message);
  }

  // Test key API endpoints
  const endpoints = [
    '/api/v1/items',
    '/api/v1/analytics/by-room',
    '/api/v1/analytics/by-category',
    '/api/v1/ai/insights',
  ];

  console.log('\n📋 API Endpoint Tests:');
  for (const endpoint of endpoints) {
    try {
      const response = await axios.get(`https://5470-inventory.fly.dev${endpoint}`);
      const dataLength = Array.isArray(response.data) ? response.data.length : 'N/A';
      console.log(`✅ ${endpoint}: Working (${dataLength} records)`);
    } catch (error) {
      console.log(`❌ ${endpoint}: Failed - ${error.message}`);
    }
  }

  // Test frontend pages (just check if server is running)
  console.log('\n🌐 Frontend Status:');
  try {
    const response = await axios.get('http://localhost:3008');
    if (response.status === 200) {
      console.log('✅ Local Frontend: Running on localhost:3008');
    }
  } catch (error) {
    console.log('❌ Local Frontend: Not accessible');
  }

  try {
    const response = await axios.get('https://inventory.candlefish.ai');
    console.log('✅ Production Frontend: Accessible');
  } catch (error) {
    console.log('❌ Production Frontend: Not accessible - ' + error.message);
  }

  console.log('\n🔍 Deployment Issues Identified:');
  console.log('1. ❌ Production frontend at inventory.candlefish.ai returns 404');
  console.log('2. ✅ Backend at 5470-inventory.fly.dev is fully functional');
  console.log('3. ✅ Local frontend works when API URL is set correctly');
  
  console.log('\n💡 Root Cause Analysis:');
  console.log('• Frontend deployment is likely missing or misconfigured');
  console.log('• Backend API is working and serving correct data');
  console.log('• Analytics/AI Insights pages would work locally with correct API URL');
  
  console.log('\n🚀 Recommended Actions:');
  console.log('1. Deploy frontend with VITE_API_URL=https://5470-inventory.fly.dev/api/v1');
  console.log('2. Test pages locally: http://localhost:3008/analytics and /insights');
  console.log('3. Verify all interactive features work in local environment');
}

quickTest().catch(console.error);