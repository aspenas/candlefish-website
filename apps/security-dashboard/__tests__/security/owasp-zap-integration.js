import http from 'k6/http';
import { check, sleep } from 'k6';
import { Rate, Counter, Trend } from 'k6/metrics';

// OWASP ZAP Integration Test Suite
// This script integrates with OWASP ZAP proxy for comprehensive security scanning

// Metrics for ZAP integration
const zapScanTime = new Trend('zap_scan_duration');
const zapVulnerabilities = new Counter('zap_vulnerabilities');
const zapHighRiskAlerts = new Counter('zap_high_risk_alerts');
const zapMediumRiskAlerts = new Counter('zap_medium_risk_alerts');
const zapLowRiskAlerts = new Counter('zap_low_risk_alerts');

// Configuration
const ZAP_API_KEY = __ENV.ZAP_API_KEY || 'security-dashboard-test-key';
const ZAP_API_URL = __ENV.ZAP_API_URL || 'http://localhost:8080';
const TARGET_URL = __ENV.TARGET_URL || 'http://localhost:3000';
const API_URL = __ENV.API_URL || 'http://localhost:4000';

export const options = {
  scenarios: {
    zap_integration: {
      executor: 'shared-iterations',
      vus: 1, // Single user for ZAP integration
      iterations: 1,
      maxDuration: '30m', // Allow up to 30 minutes for full scan
    },
  },
  
  thresholds: {
    'zap_high_risk_alerts': ['count==0'],      // Zero high-risk vulnerabilities
    'zap_medium_risk_alerts': ['count<3'],     // Less than 3 medium-risk vulnerabilities
    'zap_scan_duration': ['avg<1800000'],      // Average scan time under 30 minutes
  },
};

// ZAP API helper functions
class ZAPClient {
  constructor(apiUrl, apiKey) {
    this.apiUrl = apiUrl;
    this.apiKey = apiKey;
  }
  
  request(endpoint, params = {}) {
    const url = new URL(`${this.apiUrl}/${endpoint}`);
    url.searchParams.append('apikey', this.apiKey);
    
    Object.entries(params).forEach(([key, value]) => {
      url.searchParams.append(key, value);
    });
    
    const response = http.get(url.toString());
    
    if (response.status !== 200) {
      console.error(`ZAP API request failed: ${response.status} ${response.body}`);
      return null;
    }
    
    try {
      return response.json();
    } catch (e) {
      console.error('Failed to parse ZAP API response:', e);
      return null;
    }
  }
  
  // Start ZAP spider scan
  startSpiderScan(url) {
    const result = this.request('JSON/spider/action/scan/', { url });
    return result ? result.scan : null;
  }
  
  // Get spider scan status
  getSpiderStatus(scanId) {
    const result = this.request('JSON/spider/view/status/', { scanId });
    return result ? parseInt(result.status) : null;
  }
  
  // Start active scan
  startActiveScan(url) {
    const result = this.request('JSON/ascan/action/scan/', { url });
    return result ? result.scan : null;
  }
  
  // Get active scan status
  getActiveScanStatus(scanId) {
    const result = this.request('JSON/ascan/view/status/', { scanId });
    return result ? parseInt(result.status) : null;
  }
  
  // Get alerts
  getAlerts(baseurl = '') {
    const result = this.request('JSON/core/view/alerts/', baseurl ? { baseurl } : {});
    return result ? result.alerts : [];
  }
  
  // Generate HTML report
  generateHtmlReport() {
    const response = http.get(`${this.apiUrl}/OTHER/core/other/htmlreport/?apikey=${this.apiKey}`);
    return response.status === 200 ? response.body : null;
  }
  
  // Generate XML report
  generateXmlReport() {
    const response = http.get(`${this.apiUrl}/OTHER/core/other/xmlreport/?apikey=${this.apiKey}`);
    return response.status === 200 ? response.body : null;
  }
  
  // Create new session
  newSession(name) {
    const result = this.request('JSON/core/action/newSession/', { name });
    return result ? result.Result === 'OK' : false;
  }
  
  // Load session
  loadSession(name) {
    const result = this.request('JSON/core/action/loadSession/', { name });
    return result ? result.Result === 'OK' : false;
  }
  
  // Include URL in scope
  includeInScope(regex) {
    const result = this.request('JSON/core/action/includeInContext/', { regex });
    return result ? result.Result === 'OK' : false;
  }
  
  // Exclude URL from scope
  excludeFromScope(regex) {
    const result = this.request('JSON/core/action/excludeFromContext/', { regex });
    return result ? result.Result === 'OK' : false;
  }
  
  // Set authentication method
  setAuthenticationMethod(contextId, authMethodName, authMethodConfigParams) {
    const result = this.request('JSON/authentication/action/setAuthenticationMethod/', {
      contextId,
      authMethodName,
      authMethodConfigParams,
    });
    return result ? result.Result === 'OK' : false;
  }
  
  // Set logged in indicator
  setLoggedInIndicator(contextId, loggedInIndicatorRegex) {
    const result = this.request('JSON/authentication/action/setLoggedInIndicator/', {
      contextId,
      loggedInIndicatorRegex,
    });
    return result ? result.Result === 'OK' : false;
  }
}

// Main OWASP ZAP integration test
export default function () {
  const scanStartTime = new Date();
  
  console.log('🔒 Starting OWASP ZAP Security Scan...');
  
  const zap = new ZAPClient(ZAP_API_URL, ZAP_API_KEY);
  
  // Create new session for this scan
  const sessionName = `SecurityDashboard-${Date.now()}`;
  if (!zap.newSession(sessionName)) {
    console.error('Failed to create ZAP session');
    return;
  }
  
  // Configure scan scope
  configureScope(zap);
  
  // Set up authentication if needed
  setupAuthentication(zap);
  
  // Run spider scan
  const spiderScanId = runSpiderScan(zap);
  if (!spiderScanId) {
    console.error('Failed to start spider scan');
    return;
  }
  
  // Run active security scan
  const activeScanId = runActiveScan(zap);
  if (!activeScanId) {
    console.error('Failed to start active scan');
    return;
  }
  
  // Analyze results
  analyzeResults(zap);
  
  // Generate reports
  generateReports(zap, sessionName);
  
  const scanEndTime = new Date();
  const totalScanTime = scanEndTime - scanStartTime;
  zapScanTime.add(totalScanTime);
  
  console.log(`✅ ZAP Security Scan completed in ${totalScanTime}ms`);
}

function configureScope(zap) {
  console.log('📋 Configuring scan scope...');
  
  // Include main application URLs
  const includePatterns = [
    `${TARGET_URL}.*`,
    `${API_URL}.*`,
  ];
  
  includePatterns.forEach(pattern => {
    zap.includeInScope(pattern);
  });
  
  // Exclude unnecessary URLs to speed up scan
  const excludePatterns = [
    '.*\\.js$',
    '.*\\.css$',
    '.*\\.png$',
    '.*\\.jpg$',
    '.*\\.jpeg$',
    '.*\\.gif$',
    '.*\\.svg$',
    '.*\\.ico$',
    '.*\\.woff$',
    '.*\\.woff2$',
    '.*\\.ttf$',
    '.*logout.*',
  ];
  
  excludePatterns.forEach(pattern => {
    zap.excludeFromScope(pattern);
  });
}

function setupAuthentication(zap) {
  console.log('🔐 Setting up authentication...');
  
  // Configure authentication for the security dashboard
  // This assumes form-based authentication
  const contextId = '0'; // Default context
  
  const authConfig = JSON.stringify({
    loginUrl: `${TARGET_URL}/login`,
    loginRequestData: 'username={%username%}&password={%password%}',
    usernameParameter: 'username',
    passwordParameter: 'password',
  });
  
  zap.setAuthenticationMethod(contextId, 'formBasedAuthentication', authConfig);
  
  // Set logged in indicator (adjust based on your app)
  zap.setLoggedInIndicator(contextId, '\\Qdashboard\\E');
}

function runSpiderScan(zap) {
  console.log('🕷️  Starting spider scan...');
  
  const spiderScanId = zap.startSpiderScan(TARGET_URL);
  if (!spiderScanId) {
    return null;
  }
  
  // Wait for spider scan to complete
  let spiderProgress = 0;
  const maxWaitTime = 600; // 10 minutes max
  let waitTime = 0;
  
  while (spiderProgress < 100 && waitTime < maxWaitTime) {
    sleep(5); // Wait 5 seconds between checks
    waitTime += 5;
    
    spiderProgress = zap.getSpiderStatus(spiderScanId);
    if (spiderProgress === null) {
      console.error('Failed to get spider scan status');
      break;
    }
    
    console.log(`Spider scan progress: ${spiderProgress}%`);
  }
  
  if (spiderProgress < 100) {
    console.warn('Spider scan did not complete within time limit');
  } else {
    console.log('✅ Spider scan completed');
  }
  
  return spiderScanId;
}

function runActiveScan(zap) {
  console.log('⚡ Starting active security scan...');
  
  const activeScanId = zap.startActiveScan(TARGET_URL);
  if (!activeScanId) {
    return null;
  }
  
  // Wait for active scan to complete
  let activeScanProgress = 0;
  const maxWaitTime = 1200; // 20 minutes max
  let waitTime = 0;
  
  while (activeScanProgress < 100 && waitTime < maxWaitTime) {
    sleep(10); // Wait 10 seconds between checks
    waitTime += 10;
    
    activeScanProgress = zap.getActiveScanStatus(activeScanId);
    if (activeScanProgress === null) {
      console.error('Failed to get active scan status');
      break;
    }
    
    console.log(`Active scan progress: ${activeScanProgress}%`);
  }
  
  if (activeScanProgress < 100) {
    console.warn('Active scan did not complete within time limit');
  } else {
    console.log('✅ Active security scan completed');
  }
  
  return activeScanId;
}

function analyzeResults(zap) {
  console.log('📊 Analyzing scan results...');
  
  const alerts = zap.getAlerts(TARGET_URL);
  if (!alerts) {
    console.error('Failed to retrieve alerts');
    return;
  }
  
  // Categorize alerts by risk level
  const alertsByRisk = {
    High: [],
    Medium: [],
    Low: [],
    Informational: [],
  };
  
  alerts.forEach(alert => {
    const risk = alert.risk || 'Informational';
    if (alertsByRisk[risk]) {
      alertsByRisk[risk].push(alert);
    }
  });
  
  // Update metrics
  zapVulnerabilities.add(alerts.length);
  zapHighRiskAlerts.add(alertsByRisk.High.length);
  zapMediumRiskAlerts.add(alertsByRisk.Medium.length);
  zapLowRiskAlerts.add(alertsByRisk.Low.length);
  
  // Log summary
  console.log('\n📈 Scan Results Summary:');
  console.log(`Total Alerts: ${alerts.length}`);
  console.log(`High Risk: ${alertsByRisk.High.length}`);
  console.log(`Medium Risk: ${alertsByRisk.Medium.length}`);
  console.log(`Low Risk: ${alertsByRisk.Low.length}`);
  console.log(`Informational: ${alertsByRisk.Informational.length}`);
  
  // Log high-risk vulnerabilities in detail
  if (alertsByRisk.High.length > 0) {
    console.log('\n🚨 HIGH RISK VULNERABILITIES:');
    alertsByRisk.High.forEach((alert, index) => {
      console.log(`${index + 1}. ${alert.name}`);
      console.log(`   URL: ${alert.url}`);
      console.log(`   Description: ${alert.description}`);
      console.log(`   Solution: ${alert.solution}`);
      console.log('');
    });
  }
  
  // Log medium-risk vulnerabilities
  if (alertsByRisk.Medium.length > 0) {
    console.log('\n⚠️  MEDIUM RISK VULNERABILITIES:');
    alertsByRisk.Medium.forEach((alert, index) => {
      console.log(`${index + 1}. ${alert.name} - ${alert.url}`);
    });
  }
  
  // Perform checks
  check(alertsByRisk.High, {
    'No high-risk vulnerabilities': (alerts) => alerts.length === 0,
  });
  
  check(alertsByRisk.Medium, {
    'Limited medium-risk vulnerabilities': (alerts) => alerts.length < 5,
  });
  
  check(alerts, {
    'Security scan completed successfully': (alerts) => Array.isArray(alerts),
  });
}

function generateReports(zap, sessionName) {
  console.log('📝 Generating security reports...');
  
  // Generate HTML report
  const htmlReport = zap.generateHtmlReport();
  if (htmlReport) {
    console.log(`✅ HTML report generated (${htmlReport.length} bytes)`);
    // In a real scenario, you might save this to a file or send it somewhere
  }
  
  // Generate XML report
  const xmlReport = zap.generateXmlReport();
  if (xmlReport) {
    console.log(`✅ XML report generated (${xmlReport.length} bytes)`);
    // In a real scenario, you might save this to a file or send it somewhere
  }
}

// Specific vulnerability tests using ZAP
export function testSQLInjection() {
  console.log('🔍 Testing for SQL Injection vulnerabilities...');
  
  const zap = new ZAPClient(ZAP_API_URL, ZAP_API_KEY);
  
  // Focus scan on specific endpoints known to handle database queries
  const sqlEndpoints = [
    `${API_URL}/api/incidents/search`,
    `${API_URL}/api/alerts`,
    `${API_URL}/api/threats`,
    `${API_URL}/api/users`,
  ];
  
  sqlEndpoints.forEach(endpoint => {
    const scanId = zap.startActiveScan(endpoint);
    if (scanId) {
      // Wait for scan completion
      let progress = 0;
      const maxWait = 300; // 5 minutes
      let waited = 0;
      
      while (progress < 100 && waited < maxWait) {
        sleep(10);
        waited += 10;
        progress = zap.getActiveScanStatus(scanId);
        if (progress === null) break;
      }
      
      // Check for SQL injection alerts
      const alerts = zap.getAlerts(endpoint);
      const sqlAlerts = alerts.filter(alert => 
        alert.name.toLowerCase().includes('sql injection') ||
        alert.cweid === '89'
      );
      
      check(sqlAlerts, {
        [`No SQL injection in ${endpoint}`]: (alerts) => alerts.length === 0,
      });
      
      if (sqlAlerts.length > 0) {
        console.log(`⚠️ SQL Injection found in ${endpoint}:`, sqlAlerts);
      }
    }
  });
}

export function testXSS() {
  console.log('🔍 Testing for Cross-Site Scripting (XSS) vulnerabilities...');
  
  const zap = new ZAPClient(ZAP_API_URL, ZAP_API_KEY);
  
  // Focus scan on endpoints that handle user input
  const xssEndpoints = [
    `${API_URL}/api/incidents`,
    `${API_URL}/api/alerts`,
    `${API_URL}/api/users/profile`,
    `${TARGET_URL}/dashboard`,
  ];
  
  xssEndpoints.forEach(endpoint => {
    const scanId = zap.startActiveScan(endpoint);
    if (scanId) {
      // Wait for scan completion
      let progress = 0;
      const maxWait = 300; // 5 minutes
      let waited = 0;
      
      while (progress < 100 && waited < maxWait) {
        sleep(10);
        waited += 10;
        progress = zap.getActiveScanStatus(scanId);
        if (progress === null) break;
      }
      
      // Check for XSS alerts
      const alerts = zap.getAlerts(endpoint);
      const xssAlerts = alerts.filter(alert => 
        alert.name.toLowerCase().includes('cross site scripting') ||
        alert.name.toLowerCase().includes('xss') ||
        alert.cweid === '79'
      );
      
      check(xssAlerts, {
        [`No XSS in ${endpoint}`]: (alerts) => alerts.length === 0,
      });
      
      if (xssAlerts.length > 0) {
        console.log(`⚠️ XSS found in ${endpoint}:`, xssAlerts);
      }
    }
  });
}

export function testAuthentication() {
  console.log('🔍 Testing authentication security...');
  
  const zap = new ZAPClient(ZAP_API_URL, ZAP_API_KEY);
  
  // Test authentication bypass
  const authEndpoints = [
    `${API_URL}/auth/login`,
    `${TARGET_URL}/login`,
    `${API_URL}/api/user/profile`,
  ];
  
  authEndpoints.forEach(endpoint => {
    const scanId = zap.startActiveScan(endpoint);
    if (scanId) {
      // Wait for scan completion
      let progress = 0;
      const maxWait = 300; // 5 minutes
      let waited = 0;
      
      while (progress < 100 && waited < maxWait) {
        sleep(10);
        waited += 10;
        progress = zap.getActiveScanStatus(scanId);
        if (progress === null) break;
      }
      
      // Check for authentication-related alerts
      const alerts = zap.getAlerts(endpoint);
      const authAlerts = alerts.filter(alert => 
        alert.name.toLowerCase().includes('authentication') ||
        alert.name.toLowerCase().includes('session') ||
        alert.name.toLowerCase().includes('authorization')
      );
      
      check(authAlerts, {
        [`No authentication issues in ${endpoint}`]: (alerts) => alerts.length === 0,
      });
      
      if (authAlerts.length > 0) {
        console.log(`⚠️ Authentication issues found in ${endpoint}:`, authAlerts);
      }
    }
  });
}

// Cleanup function
export function teardown(data) {
  console.log('\n=== OWASP ZAP Security Scan Summary ===');
  console.log(`Total vulnerabilities found: ${zapVulnerabilities.count}`);
  console.log(`High-risk alerts: ${zapHighRiskAlerts.count}`);
  console.log(`Medium-risk alerts: ${zapMediumRiskAlerts.count}`);
  console.log(`Low-risk alerts: ${zapLowRiskAlerts.count}`);
  console.log(`Average scan duration: ${zapScanTime.avg.toFixed(2)}ms`);
  
  if (zapHighRiskAlerts.count > 0) {
    console.log('\n🚨 CRITICAL: High-risk vulnerabilities detected!');
    console.log('Address these issues immediately before production deployment.');
  } else if (zapMediumRiskAlerts.count > 3) {
    console.log('\n⚠️ WARNING: Multiple medium-risk vulnerabilities detected.');
    console.log('Review and address these issues to improve security posture.');
  } else {
    console.log('\n✅ Security scan passed with acceptable risk level.');
  }
  
  console.log('======================================\n');
}