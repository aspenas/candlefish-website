// CloudWatch Synthetics Canary Script for Candlefish.ai
// Monitors the operational atelier and WebGL performance

const synthetics = require('Synthetics');
const log = require('SyntheticsLogger');

const apiCanaryBlueprint = async function () {
    // Configuration
    const config = synthetics.getConfiguration();
    config.setConfig({
        screenshotOnStepStart: true,
        screenshotOnStepSuccess: true,
        screenshotOnStepFailure: true,
        includeRequestHeaders: true,
        includeResponseHeaders: true,
        restrictedHeaders: [],
        restrictedUrlParameters: []
    });

    const url = 'https://${domain}';
    
    // Test 1: Basic site availability
    await synthetics.executeStep('checkHomepage', async function() {
        const response = await synthetics.getPage().goto(url, {
            waitUntil: 'networkidle0',
            timeout: 30000
        });
        
        if (!response.ok()) {
            throw new Error(`Homepage returned status: ${response.status()}`);
        }
        
        log.info('Homepage loaded successfully');
    });

    // Test 2: Check for operational elements
    await synthetics.executeStep('checkOperationalElements', async function() {
        const page = synthetics.getPage();
        
        // Check for system activity bar
        const systemActivity = await page.$('[data-widget="system-activity"]');
        if (!systemActivity) {
            log.warn('System activity widget not found');
        } else {
            log.info('System activity widget present');
        }
        
        // Check for operational matrix
        const operationalMatrix = await page.$('[data-widget="operational-matrix"]');
        if (!operationalMatrix) {
            log.warn('Operational matrix widget not found');
        } else {
            log.info('Operational matrix widget present');
        }
    });

    // Test 3: Check WebGL performance
    await synthetics.executeStep('checkWebGLPerformance', async function() {
        const page = synthetics.getPage();
        
        // Check if WebGL is supported
        const webglSupported = await page.evaluate(() => {
            const canvas = document.createElement('canvas');
            const gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');
            return !!gl;
        });
        
        if (!webglSupported) {
            throw new Error('WebGL not supported in test environment');
        }
        
        log.info('WebGL is supported');
        
        // Wait for potential animation initialization
        await page.waitForTimeout(3000);
        
        // Check for any JavaScript errors
        const jsErrors = await page.evaluate(() => {
            return window.__TEST_ERRORS__ || [];
        });
        
        if (jsErrors.length > 0) {
            log.warn(`JavaScript errors detected: ${JSON.stringify(jsErrors)}`);
        }
    });

    // Test 4: API Health Check
    await synthetics.executeStep('checkAPIHealth', async function() {
        try {
            const healthResponse = await synthetics.getPage().goto(`${url}/api/health`, {
                timeout: 10000
            });
            
            if (healthResponse.ok()) {
                const healthData = await healthResponse.json();
                log.info(`API Health: ${JSON.stringify(healthData)}`);
            } else {
                log.warn(`API health check returned: ${healthResponse.status()}`);
            }
        } catch (error) {
            log.warn(`API health check failed: ${error.message}`);
            // Don't fail the entire canary for API endpoint issues
        }
    });

    // Test 5: Performance metrics
    await synthetics.executeStep('checkPerformanceMetrics', async function() {
        const page = synthetics.getPage();
        
        // Get performance metrics
        const performanceMetrics = await page.evaluate(() => {
            const navigation = performance.getEntriesByType('navigation')[0];
            const paint = performance.getEntriesByType('paint');
            
            return {
                domContentLoaded: navigation.domContentLoadedEventEnd - navigation.domContentLoadedEventStart,
                loadComplete: navigation.loadEventEnd - navigation.loadEventStart,
                firstPaint: paint.find(entry => entry.name === 'first-paint')?.startTime || 0,
                firstContentfulPaint: paint.find(entry => entry.name === 'first-contentful-paint')?.startTime || 0
            };
        });
        
        log.info(`Performance metrics: ${JSON.stringify(performanceMetrics)}`);
        
        // Assert performance thresholds
        if (performanceMetrics.domContentLoaded > 3000) {
            log.warn(`DOM Content Loaded took ${performanceMetrics.domContentLoaded}ms (threshold: 3000ms)`);
        }
        
        if (performanceMetrics.firstContentfulPaint > 2000) {
            log.warn(`First Contentful Paint took ${performanceMetrics.firstContentfulPaint}ms (threshold: 2000ms)`);
        }
    });

    // Test 6: Mobile responsiveness check
    await synthetics.executeStep('checkMobileResponsiveness', async function() {
        const page = synthetics.getPage();
        
        // Test mobile viewport
        await page.setViewport({ width: 375, height: 667 });
        await page.reload({ waitUntil: 'networkidle0' });
        
        // Check if mobile navigation exists
        const mobileNav = await page.$('[data-mobile-nav]');
        if (mobileNav) {
            log.info('Mobile navigation detected');
        } else {
            log.warn('Mobile navigation not found');
        }
        
        // Reset viewport
        await page.setViewport({ width: 1366, height: 768 });
    });

    log.info('Canary test completed successfully');
};

exports.handler = async () => {
    return await synthetics.executeStep('apiCanaryBlueprint', apiCanaryBlueprint);
};