// Simple script to test the Dashboard data transformation
const fetch = require('node-fetch');

// Helper function to convert snake_case to camelCase
const toCamelCase = (obj) => {
  if (obj === null || obj === undefined || typeof obj !== 'object') {
    return obj;
  }
  
  if (Array.isArray(obj)) {
    return obj.map(toCamelCase);
  }
  
  const camelCaseObj = {};
  for (const [key, value] of Object.entries(obj)) {
    const camelKey = key.replace(/_([a-z])/g, (_, letter) => letter.toUpperCase());
    camelCaseObj[camelKey] = toCamelCase(value);
  }
  return camelCaseObj;
};

async function testDashboardData() {
  try {
    console.log('Testing Dashboard Data Transformation...\n');
    
    // Test the API call
    const response = await fetch('http://localhost:4050/api/v1/analytics/summary');
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    const rawData = await response.json();
    
    console.log('Raw API Response (snake_case):');
    console.log(JSON.stringify(rawData, null, 2));
    console.log('\n');
    
    // Transform the data (same as API service does)
    const transformedData = toCamelCase(rawData);
    
    console.log('Transformed Data (camelCase):');
    console.log(JSON.stringify(transformedData, null, 2));
    console.log('\n');
    
    // Verify the Dashboard will show correct values
    console.log('Dashboard Display Values:');
    console.log(`Total Items: ${transformedData.totalItems || 0} (should be 134)`);
    console.log(`Total Value: $${(transformedData.totalValue || 0).toLocaleString()} (should be $213,300)`);
    console.log(`Keep Count: ${transformedData.keepCount || 0} (should be 108)`);
    console.log(`Sell Count: ${transformedData.sellCount || 0} (should be 0)`);
    console.log(`Unsure Count: ${transformedData.unsureCount || 0} (should be 26)`);
    
    // Check if transformation worked correctly
    const success = transformedData.totalItems === 134 && 
                   transformedData.totalValue === 213300 && 
                   transformedData.keepCount === 108;
    
    console.log('\n' + '='.repeat(50));
    if (success) {
      console.log('✅ TRANSFORMATION SUCCESSFUL! Dashboard should show correct data.');
    } else {
      console.log('❌ TRANSFORMATION FAILED! Dashboard will show incorrect data.');
    }
    console.log('='.repeat(50));
    
  } catch (error) {
    console.error('❌ ERROR:', error.message);
  }
}

testDashboardData();