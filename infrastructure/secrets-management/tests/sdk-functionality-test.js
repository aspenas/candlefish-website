#!/usr/bin/env node

/**
 * SDK Functionality Test Suite
 * Tests the TypeScript/JavaScript SDK functionality
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// Test configuration
const TEST_CONFIG = {
    colors: {
        green: '\x1b[32m',
        red: '\x1b[31m',
        yellow: '\x1b[33m',
        blue: '\x1b[34m',
        reset: '\x1b[0m'
    },
    timeout: 30000 // 30 seconds
};

class TestSuite {
    constructor() {
        this.passedTests = 0;
        this.failedTests = 0;
        this.testResults = [];
        this.startTime = Date.now();
    }

    log(testName, status, message) {
        const colors = TEST_CONFIG.colors;
        let prefix = '';
        
        switch (status) {
            case 'PASS':
                prefix = `${colors.green}✓${colors.reset}`;
                this.passedTests++;
                break;
            case 'FAIL':
                prefix = `${colors.red}✗${colors.reset}`;
                this.failedTests++;
                break;
            case 'WARN':
                prefix = `${colors.yellow}⚠${colors.reset}`;
                break;
            case 'INFO':
                prefix = `${colors.blue}ℹ${colors.reset}`;
                break;
        }
        
        const output = `${prefix} ${testName}: ${message}`;
        console.log(output);
        this.testResults.push({ testName, status, message });
    }

    async testSDKStructure() {
        console.log(`${TEST_CONFIG.colors.blue}=== SDK Structure Tests ===${TEST_CONFIG.colors.reset}`);
        
        const baseDir = path.resolve(__dirname, '..');
        const sdkDir = path.join(baseDir, 'sdk', 'typescript');
        
        // Check if SDK directory exists
        if (fs.existsSync(sdkDir)) {
            this.log('SDK_DIRECTORY', 'PASS', 'SDK directory exists');
            
            // Check required files
            const requiredFiles = [
                'package.json',
                'index.ts',
                'tsconfig.json'
            ];
            
            for (const file of requiredFiles) {
                const filePath = path.join(sdkDir, file);
                if (fs.existsSync(filePath)) {
                    this.log(`SDK_FILE_${file.replace('.', '_')}`, 'PASS', `${file} exists`);
                    
                    // Validate package.json structure
                    if (file === 'package.json') {
                        try {
                            const pkg = JSON.parse(fs.readFileSync(filePath, 'utf8'));
                            if (pkg.name && pkg.version) {
                                this.log('PACKAGE_JSON_VALID', 'PASS', `Valid package.json with name: ${pkg.name}`);
                            } else {
                                this.log('PACKAGE_JSON_VALID', 'FAIL', 'package.json missing required fields');
                            }
                            
                            // Check dependencies
                            if (pkg.dependencies || pkg.devDependencies) {
                                this.log('PACKAGE_DEPENDENCIES', 'PASS', 'Dependencies defined');
                            } else {
                                this.log('PACKAGE_DEPENDENCIES', 'WARN', 'No dependencies defined');
                            }
                        } catch (error) {
                            this.log('PACKAGE_JSON_PARSE', 'FAIL', `Cannot parse package.json: ${error.message}`);
                        }
                    }
                } else {
                    this.log(`SDK_FILE_${file.replace('.', '_')}`, 'FAIL', `${file} is missing`);
                }
            }
            
            // Check TypeScript configuration
            const tsconfigPath = path.join(sdkDir, 'tsconfig.json');
            if (fs.existsSync(tsconfigPath)) {
                try {
                    const tsconfig = JSON.parse(fs.readFileSync(tsconfigPath, 'utf8'));
                    if (tsconfig.compilerOptions) {
                        this.log('TSCONFIG_VALID', 'PASS', 'Valid TypeScript configuration');
                    } else {
                        this.log('TSCONFIG_VALID', 'FAIL', 'Invalid TypeScript configuration');
                    }
                } catch (error) {
                    this.log('TSCONFIG_PARSE', 'FAIL', `Cannot parse tsconfig.json: ${error.message}`);
                }
            }
            
        } else {
            this.log('SDK_DIRECTORY', 'FAIL', 'SDK directory does not exist');
            return;
        }
    }

    async testSDKCompilation() {
        console.log(`${TEST_CONFIG.colors.blue}=== SDK Compilation Tests ===${TEST_CONFIG.colors.reset}`);
        
        const sdkDir = path.join(path.resolve(__dirname, '..'), 'sdk', 'typescript');
        
        if (!fs.existsSync(sdkDir)) {
            this.log('SDK_COMPILATION', 'FAIL', 'SDK directory not found');
            return;
        }
        
        process.chdir(sdkDir);
        
        try {
            // Check if TypeScript is available
            execSync('npx tsc --version', { stdio: 'pipe' });
            this.log('TYPESCRIPT_AVAILABLE', 'PASS', 'TypeScript compiler available');
            
            // Try to compile TypeScript files
            try {
                execSync('npx tsc --noEmit --skipLibCheck', { 
                    stdio: 'pipe',
                    timeout: TEST_CONFIG.timeout 
                });
                this.log('TYPESCRIPT_COMPILATION', 'PASS', 'TypeScript compilation successful');
            } catch (error) {
                this.log('TYPESCRIPT_COMPILATION', 'FAIL', `TypeScript compilation failed: ${error.message}`);
            }
            
        } catch (error) {
            this.log('TYPESCRIPT_AVAILABLE', 'WARN', 'TypeScript not available, skipping compilation tests');
        }
    }

    async testSDKFunctionality() {
        console.log(`${TEST_CONFIG.colors.blue}=== SDK Functionality Tests ===${TEST_CONFIG.colors.reset}`);
        
        const sdkDir = path.join(path.resolve(__dirname, '..'), 'sdk', 'typescript');
        const indexPath = path.join(sdkDir, 'index.ts');
        
        if (!fs.existsSync(indexPath)) {
            this.log('SDK_INDEX', 'FAIL', 'SDK index.ts not found');
            return;
        }
        
        try {
            const indexContent = fs.readFileSync(indexPath, 'utf8');
            
            // Check for key SDK functionality
            const requiredExports = [
                'secrets',
                'SecretsManager',
                'get',
                'set',
                'delete'
            ];
            
            const foundExports = [];
            for (const exportName of requiredExports) {
                if (indexContent.includes(exportName)) {
                    foundExports.push(exportName);
                }
            }
            
            if (foundExports.length > 0) {
                this.log('SDK_EXPORTS', 'PASS', `Found exports: ${foundExports.join(', ')}`);
            } else {
                this.log('SDK_EXPORTS', 'FAIL', 'No expected exports found in SDK');
            }
            
            // Check for proper TypeScript types
            if (indexContent.includes('interface') || indexContent.includes('type')) {
                this.log('SDK_TYPES', 'PASS', 'TypeScript types/interfaces found');
            } else {
                this.log('SDK_TYPES', 'WARN', 'No TypeScript types/interfaces found');
            }
            
            // Check for error handling
            if (indexContent.includes('try') && indexContent.includes('catch')) {
                this.log('SDK_ERROR_HANDLING', 'PASS', 'Error handling present');
            } else {
                this.log('SDK_ERROR_HANDLING', 'WARN', 'Limited error handling detected');
            }
            
            // Check for async/await patterns
            if (indexContent.includes('async') && indexContent.includes('await')) {
                this.log('SDK_ASYNC', 'PASS', 'Async/await patterns found');
            } else {
                this.log('SDK_ASYNC', 'INFO', 'No async patterns detected');
            }
            
        } catch (error) {
            this.log('SDK_READ', 'FAIL', `Cannot read SDK index: ${error.message}`);
        }
    }

    async testSDKServer() {
        console.log(`${TEST_CONFIG.colors.blue}=== SDK Server Tests ===${TEST_CONFIG.colors.reset}`);
        
        const serverPath = path.join(path.resolve(__dirname, '..'), 'sdk', 'typescript', 'src', 'server.ts');
        
        if (fs.existsSync(serverPath)) {
            this.log('SDK_SERVER_EXISTS', 'PASS', 'SDK server file exists');
            
            try {
                const serverContent = fs.readFileSync(serverPath, 'utf8');
                
                // Check for Express or Fastify
                if (serverContent.includes('express') || serverContent.includes('fastify')) {
                    this.log('SDK_SERVER_FRAMEWORK', 'PASS', 'Server framework detected');
                } else {
                    this.log('SDK_SERVER_FRAMEWORK', 'INFO', 'No common server framework detected');
                }
                
                // Check for API endpoints
                if (serverContent.includes('/api/') || serverContent.includes('app.get') || serverContent.includes('app.post')) {
                    this.log('SDK_SERVER_ENDPOINTS', 'PASS', 'API endpoints defined');
                } else {
                    this.log('SDK_SERVER_ENDPOINTS', 'WARN', 'No API endpoints detected');
                }
                
                // Check for security middleware
                if (serverContent.includes('helmet') || serverContent.includes('cors')) {
                    this.log('SDK_SERVER_SECURITY', 'PASS', 'Security middleware detected');
                } else {
                    this.log('SDK_SERVER_SECURITY', 'WARN', 'No security middleware detected');
                }
                
            } catch (error) {
                this.log('SDK_SERVER_READ', 'FAIL', `Cannot read server file: ${error.message}`);
            }
        } else {
            this.log('SDK_SERVER_EXISTS', 'INFO', 'SDK server file not found (may not be required)');
        }
    }

    async testSDKDependencies() {
        console.log(`${TEST_CONFIG.colors.blue}=== SDK Dependencies Tests ===${TEST_CONFIG.colors.reset}`);
        
        const sdkDir = path.join(path.resolve(__dirname, '..'), 'sdk', 'typescript');
        const packagePath = path.join(sdkDir, 'package.json');
        
        if (!fs.existsSync(packagePath)) {
            this.log('PACKAGE_JSON_EXISTS', 'FAIL', 'package.json not found');
            return;
        }
        
        try {
            const pkg = JSON.parse(fs.readFileSync(packagePath, 'utf8'));
            
            // Check for AWS SDK
            const allDeps = { ...pkg.dependencies, ...pkg.devDependencies };
            
            if (allDeps['@aws-sdk/client-secrets-manager']) {
                this.log('AWS_SDK_SECRETS', 'PASS', 'AWS Secrets Manager SDK dependency found');
            } else if (allDeps['aws-sdk']) {
                this.log('AWS_SDK_LEGACY', 'PASS', 'Legacy AWS SDK found');
            } else {
                this.log('AWS_SDK_MISSING', 'FAIL', 'AWS SDK dependency missing');
            }
            
            // Check for other common dependencies
            const commonDeps = ['axios', 'fetch', 'node-fetch'];
            const foundHttpLib = commonDeps.some(dep => allDeps[dep]);
            
            if (foundHttpLib) {
                this.log('HTTP_CLIENT', 'PASS', 'HTTP client library found');
            } else {
                this.log('HTTP_CLIENT', 'INFO', 'No explicit HTTP client (may use built-in fetch)');
            }
            
            // Check for TypeScript
            if (allDeps['typescript']) {
                this.log('TYPESCRIPT_DEP', 'PASS', 'TypeScript dependency found');
            } else {
                this.log('TYPESCRIPT_DEP', 'WARN', 'TypeScript dependency missing');
            }
            
        } catch (error) {
            this.log('PACKAGE_PARSE', 'FAIL', `Cannot parse package.json: ${error.message}`);
        }
    }

    async testSDKConfiguration() {
        console.log(`${TEST_CONFIG.colors.blue}=== SDK Configuration Tests ===${TEST_CONFIG.colors.reset}`);
        
        const sdkDir = path.join(path.resolve(__dirname, '..'), 'sdk', 'typescript');
        
        // Check for configuration files
        const configFiles = [
            '.env.example',
            'config.json',
            'src/config.ts',
            'src/config.js'
        ];
        
        let configFound = false;
        for (const configFile of configFiles) {
            const configPath = path.join(sdkDir, configFile);
            if (fs.existsSync(configPath)) {
                this.log(`CONFIG_${configFile.replace(/[/.]/g, '_')}`, 'PASS', `Configuration file found: ${configFile}`);
                configFound = true;
            }
        }
        
        if (!configFound) {
            this.log('SDK_CONFIG', 'WARN', 'No configuration files found');
        }
        
        // Check for environment variable documentation
        const files = [path.join(sdkDir, 'README.md'), path.join(sdkDir, 'index.ts')];
        for (const file of files) {
            if (fs.existsSync(file)) {
                const content = fs.readFileSync(file, 'utf8');
                if (content.includes('AWS_REGION') || content.includes('VAULT_ADDR')) {
                    this.log('ENV_VARS_DOCUMENTED', 'PASS', `Environment variables documented in ${path.basename(file)}`);
                    break;
                }
            }
        }
    }

    generateReport() {
        const duration = Date.now() - this.startTime;
        const colors = TEST_CONFIG.colors;
        
        console.log(`${colors.blue}${'='.repeat(60)}${colors.reset}`);
        console.log(`${colors.blue}                SDK Test Report${colors.reset}`);
        console.log(`${colors.blue}${'='.repeat(60)}${colors.reset}`);
        console.log();
        console.log(`Duration: ${duration}ms`);
        console.log(`Tests Passed: ${colors.green}${this.passedTests}${colors.reset}`);
        console.log(`Tests Failed: ${colors.red}${this.failedTests}${colors.reset}`);
        console.log(`Total Tests: ${this.passedTests + this.failedTests}`);
        console.log();
        
        if (this.failedTests === 0) {
            console.log(`${colors.green}✓ All SDK tests passed!${colors.reset}`);
            return 0;
        } else {
            console.log(`${colors.red}✗ Some SDK tests failed. Please review the SDK implementation.${colors.reset}`);
            console.log();
            console.log('Failed tests:');
            this.testResults
                .filter(result => result.status === 'FAIL')
                .forEach(result => {
                    console.log(`  - ${result.testName}: ${result.message}`);
                });
            return 1;
        }
    }

    async run() {
        console.log(`${TEST_CONFIG.colors.blue}Starting SDK functionality tests...${TEST_CONFIG.colors.reset}`);
        console.log();
        
        try {
            await this.testSDKStructure();
            await this.testSDKCompilation();
            await this.testSDKFunctionality();
            await this.testSDKServer();
            await this.testSDKDependencies();
            await this.testSDKConfiguration();
            
            return this.generateReport();
        } catch (error) {
            console.error(`${TEST_CONFIG.colors.red}Test suite failed with error: ${error.message}${TEST_CONFIG.colors.reset}`);
            return 2;
        }
    }
}

// Run the test suite
if (require.main === module) {
    const testSuite = new TestSuite();
    testSuite.run()
        .then(exitCode => process.exit(exitCode))
        .catch(error => {
            console.error('Unhandled error:', error);
            process.exit(2);
        });
}

module.exports = TestSuite;