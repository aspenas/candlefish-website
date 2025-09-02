const axios = require('axios');
const fs = require('fs');

const API_BASE_URL = 'https://5470-inventory.fly.dev/api/v1';
const SITE_URL = 'https://inventory.candlefish.ai';

async function comprehensiveAPITest() {
  console.log('🚀 Comprehensive API and Infrastructure Test');
  console.log('📡 Testing backend services for https://inventory.candlefish.ai');
  console.log('='.repeat(70));

  const results = {
    timestamp: new Date().toISOString(),
    site: {
      url: SITE_URL,
      accessible: false,
      requiresAuth: false,
      status: null
    },
    api: {
      baseUrl: API_BASE_URL,
      endpoints: {},
      summary: { working: 0, total: 0 }
    },
    recommendations: [],
    overallHealth: 'unknown'
  };

  // Test 1: Site accessibility
  console.log('\n🌐 Step 1: Testing Site Accessibility...');
  try {
    const response = await axios.get(SITE_URL, { 
      timeout: 10000,
      validateStatus: () => true // Accept any status code
    });
    
    results.site.status = response.status;
    results.site.accessible = response.status === 200;
    results.site.requiresAuth = response.status === 401;
    
    if (response.status === 200) {
      console.log('✅ Site is publicly accessible');
    } else if (response.status === 401) {
      console.log('🔒 Site requires authentication (expected)');
      console.log('   This is normal for a password-protected inventory system');
    } else {
      console.log(`⚠️  Site returned HTTP ${response.status}`);
    }
    
  } catch (error) {
    console.log(`❌ Site accessibility test failed: ${error.message}`);
    results.recommendations.push('Critical: Frontend deployment issue - site not reachable');
  }

  // Test 2: Comprehensive API Testing
  console.log('\n📡 Step 2: Comprehensive API Testing...');
  
  const endpoints = [
    {
      name: 'analytics_summary',
      url: `${API_BASE_URL}/analytics/summary`,
      description: 'Dashboard summary data',
      critical: true
    },
    {
      name: 'items_list',
      url: `${API_BASE_URL}/items`,
      params: '?limit=10',
      description: 'Inventory items',
      critical: true
    },
    {
      name: 'items_search',
      url: `${API_BASE_URL}/items`,
      params: '?search=test&limit=5',
      description: 'Item search functionality'
    },
    {
      name: 'analytics_by_room',
      url: `${API_BASE_URL}/analytics/by-room`,
      description: 'Room-based analytics',
      critical: true
    },
    {
      name: 'analytics_by_category',
      url: `${API_BASE_URL}/analytics/by-category`,
      description: 'Category analytics'
    },
    {
      name: 'ai_insights',
      url: `${API_BASE_URL}/ai/insights`,
      description: 'AI-generated insights',
      critical: true
    },
    {
      name: 'recent_activity',
      url: `${API_BASE_URL}/activity/recent`,
      description: 'Recent activity feed'
    }
  ];

  for (const endpoint of endpoints) {
    const fullUrl = endpoint.url + (endpoint.params || '');
    console.log(`\n📊 Testing ${endpoint.name}: ${endpoint.description}`);
    
    try {
      const startTime = Date.now();
      const response = await axios.get(fullUrl, { 
        timeout: 15000,
        headers: {
          'Accept': 'application/json',
          'User-Agent': 'Mozilla/5.0 (compatible; TestBot/1.0)'
        }
      });
      const responseTime = Date.now() - startTime;
      
      // Analyze response data
      const dataAnalysis = analyzeResponseData(response.data, endpoint.name);
      
      results.api.endpoints[endpoint.name] = {
        status: 'success',
        httpStatus: response.status,
        responseTime,
        dataSize: JSON.stringify(response.data).length,
        critical: endpoint.critical || false,
        analysis: dataAnalysis,
        description: endpoint.description
      };
      
      console.log(`  ✅ Success (${responseTime}ms, ${dataAnalysis.summary})`);
      
      // Log specific data insights
      if (dataAnalysis.insights.length > 0) {
        dataAnalysis.insights.forEach(insight => {
          console.log(`     • ${insight}`);
        });
      }
      
    } catch (error) {
      results.api.endpoints[endpoint.name] = {
        status: 'error',
        error: error.message,
        httpStatus: error.response?.status,
        critical: endpoint.critical || false,
        description: endpoint.description
      };
      
      console.log(`  ❌ Failed: ${error.message}`);
      
      if (endpoint.critical) {
        results.recommendations.push(`Critical API issue: ${endpoint.name} endpoint failing`);
      }
    }
  }

  // Test 3: API Performance Analysis
  console.log('\n⚡ Step 3: API Performance Analysis...');
  const workingEndpoints = Object.values(results.api.endpoints).filter(e => e.status === 'success');
  const criticalEndpoints = Object.values(results.api.endpoints).filter(e => e.critical);
  const workingCriticalEndpoints = criticalEndpoints.filter(e => e.status === 'success');
  
  results.api.summary = {
    total: endpoints.length,
    working: workingEndpoints.length,
    critical: criticalEndpoints.length,
    criticalWorking: workingCriticalEndpoints.length,
    averageResponseTime: workingEndpoints.length > 0 
      ? Math.round(workingEndpoints.reduce((sum, e) => sum + (e.responseTime || 0), 0) / workingEndpoints.length)
      : 0
  };

  console.log(`Working Endpoints: ${workingEndpoints.length}/${endpoints.length}`);
  console.log(`Critical Endpoints Working: ${workingCriticalEndpoints.length}/${criticalEndpoints.length}`);
  console.log(`Average Response Time: ${results.api.summary.averageResponseTime}ms`);

  // Test 4: Data Quality Assessment
  console.log('\n🔍 Step 4: Data Quality Assessment...');
  assessDataQuality(results);

  // Generate final report
  console.log('\n📋 Step 5: Generating Final Report...');
  generateAPIReport(results);

  // Save results
  fs.writeFileSync('./api-test-results.json', JSON.stringify(results, null, 2));
  console.log('💾 Results saved to: api-test-results.json');

  return results;
}

function analyzeResponseData(data, endpointName) {
  const analysis = {
    type: 'unknown',
    summary: '',
    insights: []
  };

  try {
    if (Array.isArray(data)) {
      analysis.type = 'array';
      analysis.summary = `${data.length} items`;
      
      if (data.length > 0) {
        const firstItem = data[0];
        const fields = Object.keys(firstItem);
        analysis.insights.push(`${fields.length} fields per item`);
        
        if (fields.includes('id')) analysis.insights.push('Has ID field');
        if (fields.includes('name')) analysis.insights.push('Has name field');
        if (fields.includes('price')) analysis.insights.push('Has price field');
        if (fields.includes('room')) analysis.insights.push('Has room field');
        if (fields.includes('category')) analysis.insights.push('Has category field');
      }
      
    } else if (typeof data === 'object' && data !== null) {
      analysis.type = 'object';
      
      // Special analysis for different endpoints
      if (endpointName === 'analytics_summary') {
        const keys = Object.keys(data);
        analysis.summary = `${keys.length} metrics`;
        
        if (data.totalItems) analysis.insights.push(`${data.totalItems} total items`);
        if (data.totalValue) analysis.insights.push(`$${data.totalValue.toLocaleString()} total value`);
        if (data.roomCount) analysis.insights.push(`${data.roomCount} rooms`);
        if (data.categoryCount) analysis.insights.push(`${data.categoryCount} categories`);
        
      } else if (endpointName === 'ai_insights') {
        if (data.insights) {
          analysis.summary = `${data.insights.length} insights`;
          analysis.insights.push(`Generated at ${data.timestamp || 'unknown time'}`);
        }
        
      } else {
        analysis.summary = `${Object.keys(data).length} properties`;
      }
      
    } else {
      analysis.type = typeof data;
      analysis.summary = `${typeof data} value`;
    }
    
  } catch (error) {
    analysis.summary = 'Analysis failed';
    analysis.insights.push(`Error: ${error.message}`);
  }

  return analysis;
}

function assessDataQuality(results) {
  const dataQuality = {
    hasInventoryData: false,
    hasAnalytics: false,
    hasAIInsights: false,
    dataFreshness: 'unknown',
    completeness: 0
  };

  // Check for inventory data
  if (results.api.endpoints.items_list?.status === 'success') {
    const analysis = results.api.endpoints.items_list.analysis;
    if (analysis.summary.includes('items') && !analysis.summary.includes('0 items')) {
      dataQuality.hasInventoryData = true;
      console.log('  ✅ Inventory data available');
    } else {
      console.log('  ⚠️  No inventory items found');
    }
  }

  // Check for analytics
  if (results.api.endpoints.analytics_summary?.status === 'success') {
    dataQuality.hasAnalytics = true;
    console.log('  ✅ Analytics data available');
  } else {
    console.log('  ❌ Analytics data not available');
  }

  // Check for AI insights
  if (results.api.endpoints.ai_insights?.status === 'success') {
    dataQuality.hasAIInsights = true;
    console.log('  ✅ AI insights available');
  } else {
    console.log('  ❌ AI insights not available');
  }

  // Calculate completeness score
  const criticalEndpoints = Object.values(results.api.endpoints).filter(e => e.critical);
  const workingCritical = criticalEndpoints.filter(e => e.status === 'success');
  dataQuality.completeness = criticalEndpoints.length > 0 
    ? Math.round((workingCritical.length / criticalEndpoints.length) * 100)
    : 0;

  console.log(`  Data Completeness: ${dataQuality.completeness}%`);

  results.dataQuality = dataQuality;
}

function generateAPIReport(results) {
  console.log('\n' + '='.repeat(70));
  console.log('📋 COMPREHENSIVE API & INFRASTRUCTURE REPORT');
  console.log('='.repeat(70));
  
  const timestamp = new Date().toLocaleString();
  console.log(`🕐 Test completed: ${timestamp}`);
  console.log(`🌐 Frontend: ${results.site.url}`);
  console.log(`📡 API: ${results.api.baseUrl}`);

  // Site Status
  console.log('\n🌐 FRONTEND STATUS:');
  if (results.site.requiresAuth) {
    console.log('✅ Site is properly protected with authentication');
    console.log('   (This is expected for an inventory management system)');
  } else if (results.site.accessible) {
    console.log('✅ Site is publicly accessible');
  } else {
    console.log('❌ Site is not accessible');
  }

  // API Health Summary
  console.log('\n📡 API HEALTH SUMMARY:');
  const { total, working, critical, criticalWorking, averageResponseTime } = results.api.summary;
  console.log(`Overall Endpoints: ${working}/${total} working (${Math.round(working/total*100)}%)`);
  console.log(`Critical Endpoints: ${criticalWorking}/${critical} working (${Math.round(criticalWorking/critical*100)}%)`);
  console.log(`Average Response Time: ${averageResponseTime}ms`);

  // Detailed API Status
  console.log('\n📊 DETAILED API STATUS:');
  Object.entries(results.api.endpoints).forEach(([name, endpoint]) => {
    const status = endpoint.status === 'success' ? '✅' : '❌';
    const critical = endpoint.critical ? '🔴 CRITICAL' : '';
    const time = endpoint.responseTime ? `${endpoint.responseTime}ms` : 'failed';
    
    console.log(`${status} ${name} (${time}) ${critical}`);
    console.log(`    ${endpoint.description}`);
    
    if (endpoint.status === 'success' && endpoint.analysis) {
      console.log(`    Data: ${endpoint.analysis.summary}`);
    } else if (endpoint.status === 'error') {
      console.log(`    Error: ${endpoint.error}`);
    }
  });

  // Data Quality
  console.log('\n🔍 DATA QUALITY ASSESSMENT:');
  const dq = results.dataQuality;
  console.log(`Inventory Data: ${dq.hasInventoryData ? '✅ Available' : '❌ Missing'}`);
  console.log(`Analytics Data: ${dq.hasAnalytics ? '✅ Available' : '❌ Missing'}`);
  console.log(`AI Insights: ${dq.hasAIInsights ? '✅ Available' : '❌ Missing'}`);
  console.log(`Data Completeness: ${dq.completeness}%`);

  // Route Health Prediction (based on API availability)
  console.log('\n📄 PREDICTED ROUTE HEALTH:');
  console.log('(Based on API endpoint availability)');
  
  const routePredictions = [
    { name: 'Dashboard', dependency: 'analytics_summary', health: results.api.endpoints.analytics_summary?.status === 'success' },
    { name: 'Inventory', dependency: 'items_list', health: results.api.endpoints.items_list?.status === 'success' },
    { name: 'Analytics', dependency: 'analytics_by_room', health: results.api.endpoints.analytics_by_room?.status === 'success' },
    { name: 'Insights', dependency: 'ai_insights', health: results.api.endpoints.ai_insights?.status === 'success' },
    { name: 'Photos', dependency: 'items_list', health: results.api.endpoints.items_list?.status === 'success' }
  ];

  routePredictions.forEach(route => {
    const status = route.health ? '✅ Should work' : '❌ Likely broken';
    console.log(`${status} ${route.name} (depends on ${route.dependency})`);
  });

  // Overall Assessment
  console.log('\n🎯 OVERALL ASSESSMENT:');
  const healthScore = Math.round(
    (working / total) * 0.5 + 
    (criticalWorking / critical) * 0.4 + 
    (dq.completeness / 100) * 0.1
  ) * 100;

  let healthStatus = 'CRITICAL';
  if (healthScore >= 90) healthStatus = 'EXCELLENT';
  else if (healthScore >= 75) healthStatus = 'GOOD';
  else if (healthScore >= 50) healthStatus = 'FAIR';

  console.log(`Health Score: ${healthScore}%`);
  console.log(`System Status: ${healthStatus}`);

  results.overallHealth = healthStatus;

  // Recommendations
  console.log('\n💡 RECOMMENDATIONS:');
  if (results.recommendations.length === 0) {
    console.log('✅ All systems are functioning optimally!');
  } else {
    results.recommendations.forEach((rec, i) => {
      console.log(`${i + 1}. ${rec}`);
    });
  }

  // Performance recommendations
  if (averageResponseTime > 500) {
    console.log('⚡ Performance: Consider API response time optimization');
  }
  
  if (criticalWorking < critical) {
    console.log('🚨 Critical: Some essential features may not work in the frontend');
  }

  console.log('\n' + '='.repeat(70));
}

// Run the test
if (require.main === module) {
  comprehensiveAPITest()
    .then((results) => {
      console.log(`\n🎉 API testing complete! System status: ${results.overallHealth}`);
      
      const success = results.overallHealth === 'EXCELLENT' || results.overallHealth === 'GOOD';
      process.exit(success ? 0 : 1);
    })
    .catch(error => {
      console.error('\n❌ API testing failed:', error);
      process.exit(1);
    });
}

module.exports = { comprehensiveAPITest };