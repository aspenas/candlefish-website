const puppeteer = require('puppeteer');
const { spawn, execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const LOCAL_PORT = 3013;
const LOCAL_URL = `http://localhost:${LOCAL_PORT}`;

class RouteFixer {
  constructor() {
    this.server = null;
    this.browser = null;
    this.results = {
      build: { success: false, errors: [] },
      routes: {},
      fixes: [],
      finalStatus: 'unknown'
    };
  }

  async buildProject() {
    console.log('📦 Building project...');
    try {
      // Set environment variable for build
      process.env.VITE_API_URL = 'https://5470-inventory.fly.dev/api/v1';

      const output = execSync('npm run build', {
        encoding: 'utf8',
        stdio: 'pipe'
      });

      this.results.build.success = true;
      console.log('✅ Build successful');
      return true;
    } catch (error) {
      this.results.build.success = false;
      this.results.build.errors.push(error.message);
      console.log('❌ Build failed:', error.message);
      return false;
    }
  }

  async startServer() {
    console.log(`🌐 Starting server on port ${LOCAL_PORT}...`);
    this.server = spawn('npx', ['serve', '-s', 'dist', '-p', LOCAL_PORT.toString()], {
      stdio: 'pipe'
    });

    return new Promise((resolve) => {
      setTimeout(() => {
        console.log('✅ Server started');
        resolve();
      }, 3000);
    });
  }

  async testRoutes() {
    console.log('\n🧪 Testing all routes...');

    this.browser = await puppeteer.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });

    const routes = [
      { name: 'Dashboard', path: '/', expectWorking: true },
      { name: 'Inventory', path: '/inventory', expectWorking: false },
      { name: 'Photos', path: '/photos', expectWorking: false },
      { name: 'Analytics', path: '/analytics', expectWorking: true },
      { name: 'Insights', path: '/insights', expectWorking: true }
    ];

    for (const route of routes) {
      console.log(`\n📄 Testing ${route.name}...`);
      await this.testSingleRoute(route);
    }
  }

  async testSingleRoute(route) {
    const page = await this.browser.newPage();

    const routeResult = {
      accessible: false,
      hasError: false,
      errorDetails: [],
      isWorking: false,
      screenshots: []
    };

    const errors = [];

    page.on('console', message => {
      if (message.type() === 'error') {
        errors.push({
          type: 'console',
          text: message.text(),
          location: message.location()
        });
      }
    });

    page.on('pageerror', error => {
      errors.push({
        type: 'javascript',
        message: error.message,
        stack: error.stack
      });
    });

    try {
      const response = await page.goto(`${LOCAL_URL}${route.path}`, {
        waitUntil: 'networkidle2',
        timeout: 15000
      });

      routeResult.accessible = response.status() === 200;

      if (routeResult.accessible) {
        await page.waitForTimeout(3000);

        // Check for error boundaries
        const pageAnalysis = await page.evaluate(() => {
          const errorTexts = ['Something went wrong', 'Error', 'failed to load'];
          const bodyText = document.body.textContent.toLowerCase();

          return {
            hasErrorText: errorTexts.some(text => bodyText.includes(text.toLowerCase())),
            elementCount: document.querySelectorAll('*').length,
            hasReactRoot: !!document.querySelector('#root > div'),
            bodyLength: bodyText.length,
            headings: Array.from(document.querySelectorAll('h1, h2, h3')).map(h => h.textContent)
          };
        });

        routeResult.hasError = pageAnalysis.hasErrorText;
        routeResult.isWorking = !pageAnalysis.hasErrorText && pageAnalysis.elementCount > 50;

        // Capture errors
        routeResult.errorDetails = errors;

        console.log(`  Status: ${routeResult.accessible ? 'Accessible' : 'Not accessible'}`);
        console.log(`  Working: ${routeResult.isWorking ? 'Yes' : 'No'}`);
        console.log(`  Has Error: ${routeResult.hasError ? 'Yes' : 'No'}`);
        console.log(`  Elements: ${pageAnalysis.elementCount}`);

        if (errors.length > 0) {
          console.log(`  JS Errors: ${errors.length}`);
          errors.slice(0, 2).forEach(error => {
            console.log(`    - ${error.message || error.text}`);
          });
        }
      }

    } catch (error) {
      routeResult.errorDetails.push({
        type: 'navigation',
        message: error.message
      });
      console.log(`  ❌ Failed to load: ${error.message}`);
    }

    await page.close();
    this.results.routes[route.name] = routeResult;
  }

  async suggestFixes() {
    console.log('\n🔧 Analyzing issues and suggesting fixes...');

    const brokenRoutes = Object.entries(this.results.routes)
      .filter(([name, result]) => !result.isWorking)
      .map(([name, result]) => ({ name, ...result }));

    if (brokenRoutes.length === 0) {
      console.log('✅ All routes are working correctly!');
      this.results.finalStatus = 'all_working';
      return;
    }

    console.log(`\n🚨 Found ${brokenRoutes.length} broken routes:`);

    for (const route of brokenRoutes) {
      console.log(`\n❌ ${route.name}:`);

      if (route.errorDetails.length > 0) {
        const jsErrors = route.errorDetails.filter(e => e.type === 'javascript' || e.type === 'console');

        if (jsErrors.length > 0) {
          console.log('  JavaScript Errors Found:');
          jsErrors.forEach((error, i) => {
            console.log(`    ${i + 1}. ${error.message || error.text}`);

            // Suggest specific fixes based on error patterns
            this.suggestSpecificFix(route.name, error);
          });
        }
      }
    }

    this.results.finalStatus = 'issues_found';
  }

  suggestSpecificFix(routeName, error) {
    const errorText = error.message || error.text || '';

    if (errorText.includes('Cannot read properties') || errorText.includes('Cannot access before initialization')) {
      this.results.fixes.push({
        route: routeName,
        issue: 'Variable access error',
        fix: 'Add null checks and default values in component',
        priority: 'high'
      });
    }

    if (errorText.includes('Module not found') || errorText.includes('Failed to resolve')) {
      this.results.fixes.push({
        route: routeName,
        issue: 'Missing import or module',
        fix: 'Check import paths and ensure all dependencies exist',
        priority: 'critical'
      });
    }

    if (errorText.includes('JSHandle@error') || errorText.includes('JSHandle@object')) {
      this.results.fixes.push({
        route: routeName,
        issue: 'React component error',
        fix: 'Add error boundaries and fix component logic',
        priority: 'high'
      });
    }
  }

  generateReport() {
    console.log('\n' + '='.repeat(60));
    console.log('📋 COMPREHENSIVE ROUTE TESTING REPORT');
    console.log('='.repeat(60));

    // Build Status
    console.log('\n🏗️  BUILD STATUS:');
    console.log(`Status: ${this.results.build.success ? '✅ SUCCESS' : '❌ FAILED'}`);
    if (this.results.build.errors.length > 0) {
      this.results.build.errors.forEach(error => {
        console.log(`Error: ${error}`);
      });
    }

    // Route Status
    console.log('\n📄 ROUTE STATUS:');
    Object.entries(this.results.routes).forEach(([name, result]) => {
      const icon = result.isWorking ? '✅' : result.accessible ? '⚠️' : '❌';
      console.log(`${icon} ${name}: ${result.isWorking ? 'Working' : result.hasError ? 'Has Errors' : 'Not Loading'}`);
    });

    // Fixes Needed
    if (this.results.fixes.length > 0) {
      console.log('\n🔧 FIXES NEEDED:');
      this.results.fixes.forEach((fix, i) => {
        console.log(`${i + 1}. [${fix.priority.toUpperCase()}] ${fix.route}: ${fix.issue}`);
        console.log(`   Fix: ${fix.fix}`);
      });
    }

    // Final Status
    console.log('\n📊 FINAL STATUS:');
    const workingCount = Object.values(this.results.routes).filter(r => r.isWorking).length;
    const totalCount = Object.keys(this.results.routes).length;

    console.log(`Working Routes: ${workingCount}/${totalCount} (${Math.round(workingCount/totalCount*100)}%)`);

    if (this.results.finalStatus === 'all_working') {
      console.log('🎉 All routes are functioning correctly!');
      console.log('✅ The application is ready for production.');
    } else {
      console.log('⚠️  Some routes need fixes before production deployment.');
    }

    console.log('\n' + '='.repeat(60));

    return this.results;
  }

  async cleanup() {
    if (this.browser) {
      await this.browser.close();
    }
    if (this.server) {
      this.server.kill();
    }
  }

  async run() {
    try {
      const buildSuccess = await this.buildProject();
      if (!buildSuccess) {
        console.log('❌ Build failed, cannot continue testing.');
        return this.results;
      }

      await this.startServer();
      await this.testRoutes();
      await this.suggestFixes();

      return this.generateReport();
    } finally {
      await this.cleanup();
    }
  }
}

if (require.main === module) {
  const fixer = new RouteFixer();
  fixer.run()
    .then((results) => {
      const exitCode = results.finalStatus === 'all_working' ? 0 : 1;
      process.exit(exitCode);
    })
    .catch(error => {
      console.error('❌ Testing failed:', error);
      process.exit(1);
    });
}

module.exports = { RouteFixer };
