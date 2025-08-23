#!/usr/bin/env node

/**
 * Verify live Candlefish website animations
 * Tests the production site at https://candlefish.ai for animation functionality
 */

const https = require('https');
const fs = require('fs');
const path = require('path');

console.log('🔍 Verifying Candlefish website animations...\n');

// Test 1: Check if the main site loads
function testSiteAvailability() {
    return new Promise((resolve, reject) => {
        const options = {
            hostname: 'candlefish.ai',
            port: 443,
            path: '/',
            method: 'GET',
            headers: {
                'User-Agent': 'Candlefish-Animation-Tester/1.0'
            }
        };

        const req = https.request(options, (res) => {
            let data = '';
            res.on('data', (chunk) => data += chunk);
            res.on('end', () => {
                if (res.statusCode === 200) {
                    console.log('✅ Site availability: PASS');
                    resolve({ status: 'success', data, statusCode: res.statusCode });
                } else {
                    console.log(`❌ Site availability: FAIL (${res.statusCode})`);
                    resolve({ status: 'fail', statusCode: res.statusCode });
                }
            });
        });

        req.on('error', (err) => {
            console.log(`❌ Site availability: ERROR (${err.message})`);
            reject(err);
        });

        req.setTimeout(10000, () => {
            req.destroy();
            console.log('❌ Site availability: TIMEOUT');
            resolve({ status: 'timeout' });
        });

        req.end();
    });
}

// Test 2: Check for animation-related JavaScript
function testAnimationCode(htmlData) {
    console.log('\n🔍 Analyzing page content for animations...');

    const checks = [
        {
            name: 'HeaderText component',
            pattern: /HeaderText|engraving automation|concert intelligence/i,
            found: false
        },
        {
            name: 'SystemActivity component',
            pattern: /SystemActivity|canvas.*animation|fillRect/i,
            found: false
        },
        {
            name: 'SystemArchitecture component',
            pattern: /SystemArchitecture|three.*js|WebGL|particle/i,
            found: false
        },
        {
            name: 'React hydration',
            pattern: /_next\/static\/chunks/i,
            found: false
        },
        {
            name: 'Animation-related CSS',
            pattern: /transition|transform|animation|@keyframes/i,
            found: false
        }
    ];

    checks.forEach(check => {
        check.found = check.pattern.test(htmlData);
        const status = check.found ? '✅' : '❌';
        console.log(`${status} ${check.name}: ${check.found ? 'FOUND' : 'NOT FOUND'}`);
    });

    const passCount = checks.filter(c => c.found).length;
    const totalCount = checks.length;

    console.log(`\n📊 Animation code analysis: ${passCount}/${totalCount} components detected`);

    if (passCount >= 3) {
        console.log('✅ Animation infrastructure: GOOD');
        return 'good';
    } else if (passCount >= 2) {
        console.log('⚠️  Animation infrastructure: PARTIAL');
        return 'partial';
    } else {
        console.log('❌ Animation infrastructure: MISSING');
        return 'missing';
    }
}

// Test 3: Check component integration
function testComponentIntegration(htmlData) {
    console.log('\n🔍 Testing component integration...');

    const integrationTests = [
        {
            name: 'Main page structure',
            test: () => htmlData.includes('Operational Design Atelier') && htmlData.includes('Currently engineering'),
            found: false
        },
        {
            name: 'Project rotation data',
            test: () => {
                const projectKeywords = ['engraving', 'concert', 'inventory', 'paintbox'];
                return projectKeywords.some(keyword => htmlData.toLowerCase().includes(keyword));
            },
            found: false
        },
        {
            name: 'Static export compatibility',
            test: () => htmlData.includes('_next') && !htmlData.includes('api/'),
            found: false
        },
        {
            name: 'CSS animation classes',
            test: () => htmlData.includes('transition') || htmlData.includes('animate'),
            found: false
        }
    ];

    integrationTests.forEach(test => {
        test.found = test.test();
        const status = test.found ? '✅' : '❌';
        console.log(`${status} ${test.name}: ${test.found ? 'PASS' : 'FAIL'}`);
    });

    const passCount = integrationTests.filter(t => t.found).length;
    console.log(`\n📊 Integration tests: ${passCount}/${integrationTests.length} passed`);

    return passCount >= 3 ? 'good' : passCount >= 2 ? 'partial' : 'poor';
}

// Test 4: Analyze build artifacts
function testBuildArtifacts() {
    console.log('\n🔍 Checking local build artifacts...');

    const artifacts = [
        { path: './components/HeaderText.tsx', name: 'HeaderText source' },
        { path: './components/SystemActivity.tsx', name: 'SystemActivity source' },
        { path: './components/SystemArchitecture.tsx', name: 'SystemArchitecture source' },
        { path: './out/', name: 'Static build output' },
        { path: './next.config.js', name: 'Next.js configuration' }
    ];

    let artifactsFound = 0;
    artifacts.forEach(artifact => {
        const exists = fs.existsSync(path.join(__dirname, artifact.path));
        const status = exists ? '✅' : '❌';
        console.log(`${status} ${artifact.name}: ${exists ? 'EXISTS' : 'MISSING'}`);
        if (exists) artifactsFound++;
    });

    console.log(`\n📊 Build artifacts: ${artifactsFound}/${artifacts.length} found`);
    return artifactsFound >= 4 ? 'good' : 'incomplete';
}

// Main test runner
async function runTests() {
    try {
        console.log('🚀 Starting Candlefish animation verification...\n');

        // Test site availability
        const siteResult = await testSiteAvailability();

        if (siteResult.status === 'success') {
            // Analyze the HTML content
            const codeAnalysis = testAnimationCode(siteResult.data);
            const integrationAnalysis = testComponentIntegration(siteResult.data);
            const buildAnalysis = testBuildArtifacts();

            console.log('\n' + '='.repeat(60));
            console.log('📋 FINAL ASSESSMENT');
            console.log('='.repeat(60));

            console.log(`🌐 Site Status: ${siteResult.statusCode === 200 ? 'ONLINE' : 'OFFLINE'}`);
            console.log(`🎨 Animation Code: ${codeAnalysis.toUpperCase()}`);
            console.log(`🔗 Integration: ${integrationAnalysis.toUpperCase()}`);
            console.log(`🏗️  Build Artifacts: ${buildAnalysis.toUpperCase()}`);

            // Overall assessment
            const scores = {
                good: 3,
                partial: 2,
                incomplete: 1,
                poor: 1,
                missing: 0
            };

            const totalScore = (scores[codeAnalysis] || 0) +
                             (scores[integrationAnalysis] || 0) +
                             (scores[buildAnalysis] || 0);

            console.log('\n🎯 OVERALL ANIMATION STATUS:');
            if (totalScore >= 8) {
                console.log('🟢 EXCELLENT - All animations should be working perfectly');
            } else if (totalScore >= 6) {
                console.log('🟡 GOOD - Most animations working, minor issues possible');
            } else if (totalScore >= 4) {
                console.log('🟠 PARTIAL - Some animations working, investigation needed');
            } else {
                console.log('🔴 POOR - Animation issues detected, fixes required');
            }

            // Specific recommendations
            console.log('\n💡 RECOMMENDATIONS:');
            if (codeAnalysis === 'missing') {
                console.log('• Check if JavaScript bundles are loading correctly');
                console.log('• Verify static export configuration');
            }
            if (integrationAnalysis === 'poor') {
                console.log('• Test component hydration on client side');
                console.log('• Check browser console for errors');
            }
            if (buildAnalysis === 'incomplete') {
                console.log('• Run `npm run build` to regenerate static files');
                console.log('• Verify deployment configuration');
            }

            console.log('\n🌐 Test the live site: https://candlefish.ai');
            console.log('📱 Local test file: ./test-animations.html');

        } else {
            console.log('\n❌ Cannot analyze animations - site is not accessible');
            console.log('💡 Check if https://candlefish.ai is accessible from your network');
        }

    } catch (error) {
        console.error('\n💥 Test execution failed:', error.message);
        console.log('\n🔧 Try running the tests locally:');
        console.log('• Open ./test-animations.html in your browser');
        console.log('• Check `npm run dev` for local development');
    }
}

// Run the verification
runTests().then(() => {
    console.log('\n✨ Animation verification complete!');
}).catch((error) => {
    console.error('\n💥 Verification failed:', error);
    process.exit(1);
});
