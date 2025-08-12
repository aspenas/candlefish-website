#!/usr/bin/env node

// Comprehensive Website Testing Script
// Tests all critical aspects of the Candlefish AI website

import http from 'http';
import https from 'https';

const WEBSITE_URL = 'http://localhost:3004';
const TEST_RESULTS = {
  passed: [],
  failed: [],
  warnings: []
};

// Color codes for terminal output
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m'
};

function log(message, color = colors.reset) {
  console.log(`${color}${message}${colors.reset}`);
}

async function fetchPage(pageUrl) {
  return new Promise((resolve, reject) => {
    const protocol = pageUrl.startsWith('https') ? https : http;
    
    protocol.get(pageUrl, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => resolve({ status: res.statusCode, data, headers: res.headers }));
    }).on('error', reject);
  });
}

async function testHttpStatus() {
  log('\n📊 Testing HTTP Status...', colors.cyan);
  
  try {
    const response = await fetchPage(WEBSITE_URL);
    if (response.status === 200) {
      TEST_RESULTS.passed.push('HTTP Status: 200 OK');
      log('✅ HTTP Status: 200 OK', colors.green);
    } else {
      TEST_RESULTS.failed.push(`HTTP Status: ${response.status}`);
      log(`❌ HTTP Status: ${response.status}`, colors.red);
    }
  } catch (error) {
    TEST_RESULTS.failed.push(`HTTP Status: ${error.message}`);
    log(`❌ HTTP Status: ${error.message}`, colors.red);
  }
}

async function testContent() {
  log('\n📝 Testing Content Rendering...', colors.cyan);
  
  try {
    const response = await fetchPage(WEBSITE_URL);
    const content = response.data;
    
    // Check for essential content
    const essentialElements = [
      { name: 'Title', pattern: /<title>.*Candlefish AI.*<\/title>/i },
      { name: 'Navigation', pattern: /nav|navigation/i },
      { name: 'Hero Section', pattern: /hero|AI transformation/i },
      { name: 'React Root', pattern: /id="root"/i },
      { name: 'Meta Description', pattern: /<meta.*description.*>/i },
      { name: 'Viewport Meta', pattern: /<meta.*viewport.*>/i }
    ];
    
    essentialElements.forEach(element => {
      if (element.pattern.test(content)) {
        TEST_RESULTS.passed.push(`Content: ${element.name} found`);
        log(`✅ ${element.name} found`, colors.green);
      } else {
        TEST_RESULTS.failed.push(`Content: ${element.name} missing`);
        log(`❌ ${element.name} missing`, colors.red);
      }
    });
    
    // Check for common issues
    if (content.includes('Loading...') && !content.includes('Candlefish')) {
      TEST_RESULTS.warnings.push('Page might be stuck in loading state');
      log('⚠️  Page might be stuck in loading state', colors.yellow);
    }
    
    if (content.length < 1000) {
      TEST_RESULTS.warnings.push('Page content seems too short');
      log('⚠️  Page content seems too short', colors.yellow);
    }
    
  } catch (error) {
    TEST_RESULTS.failed.push(`Content Test: ${error.message}`);
    log(`❌ Content Test: ${error.message}`, colors.red);
  }
}

async function testAssets() {
  log('\n🎨 Testing Asset Loading...', colors.cyan);
  
  const assets = [
    '/logo/candlefish_original.png',
    '/logo/candlefish-logo.png',
    '/service-worker.js'
  ];
  
  for (const asset of assets) {
    try {
      const response = await fetchPage(`${WEBSITE_URL}${asset}`);
      if (response.status === 200 || response.status === 304) {
        TEST_RESULTS.passed.push(`Asset: ${asset} loads`);
        log(`✅ ${asset} loads`, colors.green);
      } else {
        TEST_RESULTS.warnings.push(`Asset: ${asset} returns ${response.status}`);
        log(`⚠️  ${asset} returns ${response.status}`, colors.yellow);
      }
    } catch (error) {
      TEST_RESULTS.warnings.push(`Asset: ${asset} - ${error.message}`);
      log(`⚠️  ${asset} - ${error.message}`, colors.yellow);
    }
  }
}

async function testSections() {
  log('\n🔍 Testing Page Sections...', colors.cyan);
  
  try {
    const response = await fetchPage(WEBSITE_URL);
    const content = response.data;
    
    const sections = [
      { id: 'home', name: 'Home' },
      { id: 'about', name: 'About' },
      { id: 'services', name: 'Services' },
      { id: 'portfolio', name: 'Portfolio' },
      { id: 'contact', name: 'Contact' }
    ];
    
    sections.forEach(section => {
      if (content.includes(`id="${section.id}"`) || content.includes(`#${section.id}`)) {
        TEST_RESULTS.passed.push(`Section: ${section.name} exists`);
        log(`✅ ${section.name} section exists`, colors.green);
      } else {
        TEST_RESULTS.warnings.push(`Section: ${section.name} might be missing`);
        log(`⚠️  ${section.name} section might be missing`, colors.yellow);
      }
    });
  } catch (error) {
    TEST_RESULTS.failed.push(`Section Test: ${error.message}`);
    log(`❌ Section Test: ${error.message}`, colors.red);
  }
}

async function testPerformance() {
  log('\n⚡ Testing Performance...', colors.cyan);
  
  const startTime = Date.now();
  
  try {
    const response = await fetchPage(WEBSITE_URL);
    const loadTime = Date.now() - startTime;
    
    if (loadTime < 1000) {
      TEST_RESULTS.passed.push(`Performance: Page loads in ${loadTime}ms`);
      log(`✅ Page loads in ${loadTime}ms (Excellent)`, colors.green);
    } else if (loadTime < 3000) {
      TEST_RESULTS.passed.push(`Performance: Page loads in ${loadTime}ms`);
      log(`✅ Page loads in ${loadTime}ms (Good)`, colors.green);
    } else {
      TEST_RESULTS.warnings.push(`Performance: Page loads in ${loadTime}ms`);
      log(`⚠️  Page loads in ${loadTime}ms (Slow)`, colors.yellow);
    }
    
    // Check content size
    const contentSize = Buffer.byteLength(response.data, 'utf8');
    const sizeInKB = (contentSize / 1024).toFixed(2);
    
    if (contentSize < 500000) {
      TEST_RESULTS.passed.push(`Performance: Page size ${sizeInKB}KB`);
      log(`✅ Page size: ${sizeInKB}KB (Optimal)`, colors.green);
    } else {
      TEST_RESULTS.warnings.push(`Performance: Page size ${sizeInKB}KB`);
      log(`⚠️  Page size: ${sizeInKB}KB (Large)`, colors.yellow);
    }
    
  } catch (error) {
    TEST_RESULTS.failed.push(`Performance Test: ${error.message}`);
    log(`❌ Performance Test: ${error.message}`, colors.red);
  }
}

async function testResponsiveness() {
  log('\n📱 Testing Responsive Design...', colors.cyan);
  
  try {
    const response = await fetchPage(WEBSITE_URL);
    const content = response.data;
    
    // Check for responsive meta tags and classes
    const responsiveChecks = [
      { name: 'Viewport meta tag', pattern: /viewport.*width=device-width/i },
      { name: 'Responsive classes', pattern: /sm:|md:|lg:|xl:/i },
      { name: 'Mobile menu', pattern: /mobile.*menu|hamburger|toggle.*menu/i },
      { name: 'Flexible containers', pattern: /container|flex|grid/i }
    ];
    
    responsiveChecks.forEach(check => {
      if (check.pattern.test(content)) {
        TEST_RESULTS.passed.push(`Responsive: ${check.name} found`);
        log(`✅ ${check.name} found`, colors.green);
      } else {
        TEST_RESULTS.warnings.push(`Responsive: ${check.name} might be missing`);
        log(`⚠️  ${check.name} might be missing`, colors.yellow);
      }
    });
  } catch (error) {
    TEST_RESULTS.failed.push(`Responsive Test: ${error.message}`);
    log(`❌ Responsive Test: ${error.message}`, colors.red);
  }
}

async function runAllTests() {
  log('\n' + '='.repeat(60), colors.bright);
  log('🚀 CANDLEFISH AI WEBSITE TEST SUITE', colors.bright + colors.cyan);
  log('='.repeat(60) + '\n', colors.bright);
  
  await testHttpStatus();
  await testContent();
  await testAssets();
  await testSections();
  await testPerformance();
  await testResponsiveness();
  
  // Summary
  log('\n' + '='.repeat(60), colors.bright);
  log('📊 TEST RESULTS SUMMARY', colors.bright + colors.cyan);
  log('='.repeat(60), colors.bright);
  
  log(`\n✅ Passed: ${TEST_RESULTS.passed.length}`, colors.green);
  log(`⚠️  Warnings: ${TEST_RESULTS.warnings.length}`, colors.yellow);
  log(`❌ Failed: ${TEST_RESULTS.failed.length}`, colors.red);
  
  const totalTests = TEST_RESULTS.passed.length + TEST_RESULTS.warnings.length + TEST_RESULTS.failed.length;
  const successRate = ((TEST_RESULTS.passed.length / totalTests) * 100).toFixed(1);
  
  log(`\n📈 Success Rate: ${successRate}%`, colors.bright);
  
  if (TEST_RESULTS.failed.length === 0) {
    log('\n🎉 All critical tests passed! The website is working excellently!', colors.green + colors.bright);
  } else if (TEST_RESULTS.failed.length <= 2) {
    log('\n⚠️  Most tests passed with minor issues to address.', colors.yellow);
  } else {
    log('\n❌ Several issues need attention.', colors.red);
  }
  
  // Exit code based on failures
  process.exit(TEST_RESULTS.failed.length > 0 ? 1 : 0);
}

// Run tests
runAllTests().catch(error => {
  log(`\n❌ Test suite error: ${error.message}`, colors.red);
  process.exit(1);
});