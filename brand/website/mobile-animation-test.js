/**
 * Mobile Animation Compatibility Test
 * Tests animation performance and fallbacks on various devices
 */

// Test mobile-specific animation issues
class MobileAnimationTester {
    constructor() {
        this.results = {
            deviceInfo: this.getDeviceInfo(),
            headerTextTest: null,
            systemActivityTest: null,
            webglTest: null,
            performanceTest: null,
            fallbackTest: null
        };
    }

    getDeviceInfo() {
        const ua = navigator.userAgent;
        return {
            isMobile: /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(ua),
            isIOS: /iPad|iPhone|iPod/.test(ua),
            isAndroid: /Android/.test(ua),
            supportsWebGL: !!document.createElement('canvas').getContext('webgl'),
            prefersReducedMotion: window.matchMedia('(prefers-reduced-motion: reduce)').matches,
            screenSize: `${screen.width}x${screen.height}`,
            devicePixelRatio: window.devicePixelRatio || 1,
            touchSupport: 'ontouchstart' in window
        };
    }

    // Test 1: HeaderText rotation on mobile
    testHeaderText() {
        return new Promise((resolve) => {
            const testDiv = document.createElement('div');
            testDiv.innerHTML = `
                <div style="position: relative; font-size: 24px; line-height: 1.2;">
                    Currently engineering<br>
                    <span id="mobileHeaderText" style="color: #415A77; transition: all 0.8s ease;">
                        operational excellence systems
                    </span>
                </div>
            `;
            document.body.appendChild(testDiv);

            const textEl = document.getElementById('mobileHeaderText');
            const projects = [
                'engraving automation for trophy franchises',
                'concert intelligence platforms',
                'inventory management systems',
                'excel-to-web estimating platforms'
            ];

            let changeCount = 0;
            const interval = setInterval(() => {
                const index = changeCount % projects.length;

                // Apply mobile-optimized transition
                textEl.style.opacity = '0.6';
                textEl.style.filter = 'blur(0.5px)';
                textEl.style.transform = 'scale(0.98)';

                setTimeout(() => {
                    textEl.textContent = projects[index];
                    textEl.style.opacity = '1';
                    textEl.style.filter = 'blur(0)';
                    textEl.style.transform = 'scale(1)';
                }, 300);

                changeCount++;
                if (changeCount >= 3) {
                    clearInterval(interval);
                    document.body.removeChild(testDiv);
                    resolve({
                        success: true,
                        transitions: changeCount,
                        message: 'HeaderText transitions work on mobile'
                    });
                }
            }, 1500);

            // Timeout for slow devices
            setTimeout(() => {
                if (changeCount === 0) {
                    clearInterval(interval);
                    document.body.removeChild(testDiv);
                    resolve({
                        success: false,
                        transitions: 0,
                        message: 'HeaderText transitions failed on mobile'
                    });
                }
            }, 5000);
        });
    }

    // Test 2: SystemActivity bars performance
    testSystemActivity() {
        return new Promise((resolve) => {
            const canvas = document.createElement('canvas');
            canvas.width = 400;
            canvas.height = 4;
            canvas.style.width = '100%';
            canvas.style.height = '4px';
            document.body.appendChild(canvas);

            const ctx = canvas.getContext('2d');
            if (!ctx) {
                document.body.removeChild(canvas);
                resolve({
                    success: false,
                    message: 'Canvas not supported'
                });
                return;
            }

            const barCount = this.results.deviceInfo.isMobile ? 20 : 30; // Fewer bars on mobile
            const activity = Array.from({ length: barCount }, () => Math.random() * 0.6 + 0.2);

            let frameCount = 0;
            const startTime = performance.now();

            function animate(timestamp) {
                ctx.clearRect(0, 0, canvas.width, canvas.height);

                const barWidth = canvas.width / barCount;
                const actualBarWidth = barWidth * 0.3;

                ctx.fillStyle = 'rgba(65, 90, 119, 0.25)';

                activity.forEach((baseValue, i) => {
                    const noise = Math.sin(i * 0.3 + timestamp * 0.0005) * 0.1; // Slower on mobile
                    const value = Math.max(0.1, Math.min(1, baseValue + noise));
                    const height = value * 2;
                    const x = i * barWidth + (barWidth - actualBarWidth) / 2;

                    ctx.fillRect(x, 1, actualBarWidth, height);
                });

                frameCount++;
                if (frameCount < 60) {
                    requestAnimationFrame(animate);
                } else {
                    const endTime = performance.now();
                    const avgFPS = 1000 / ((endTime - startTime) / frameCount);

                    document.body.removeChild(canvas);
                    resolve({
                        success: avgFPS > 20,
                        fps: Math.round(avgFPS),
                        message: `SystemActivity: ${Math.round(avgFPS)} FPS`
                    });
                }
            }

            requestAnimationFrame(animate);
        });
    }

    // Test 3: WebGL support and fallback
    testWebGL() {
        return new Promise((resolve) => {
            const canvas = document.createElement('canvas');
            canvas.width = 300;
            canvas.height = 200;
            document.body.appendChild(canvas);

            try {
                const gl = canvas.getContext('webgl2') || canvas.getContext('webgl');

                if (!gl) {
                    // Test fallback rendering
                    const ctx = canvas.getContext('2d');
                    if (ctx) {
                        ctx.fillStyle = '#1B263B';
                        ctx.fillRect(0, 0, canvas.width, canvas.height);

                        // Draw static franchise network
                        ctx.fillStyle = '#3FD3C6';
                        for (let i = 0; i < 6; i++) {
                            const angle = (i / 6) * Math.PI * 2;
                            const x = canvas.width / 2 + Math.cos(angle) * 60;
                            const y = canvas.height / 2 + Math.sin(angle) * 40;
                            ctx.beginPath();
                            ctx.arc(x, y, 4, 0, Math.PI * 2);
                            ctx.fill();
                        }

                        document.body.removeChild(canvas);
                        resolve({
                            success: true,
                            webglSupported: false,
                            fallbackWorking: true,
                            message: 'WebGL not supported, 2D fallback working'
                        });
                    } else {
                        document.body.removeChild(canvas);
                        resolve({
                            success: false,
                            webglSupported: false,
                            fallbackWorking: false,
                            message: 'Neither WebGL nor Canvas 2D supported'
                        });
                    }
                    return;
                }

                // Test basic WebGL rendering
                gl.clearColor(0.05, 0.11, 0.17, 1.0);
                gl.clear(gl.COLOR_BUFFER_BIT);

                // Simple point rendering test
                const vertexShader = gl.createShader(gl.VERTEX_SHADER);
                gl.shaderSource(vertexShader, `
                    attribute vec2 position;
                    void main() {
                        gl_Position = vec4(position, 0.0, 1.0);
                        gl_PointSize = 5.0;
                    }
                `);
                gl.compileShader(vertexShader);

                const fragmentShader = gl.createShader(gl.FRAGMENT_SHADER);
                gl.shaderSource(fragmentShader, `
                    precision mediump float;
                    void main() {
                        gl_FragColor = vec4(0.25, 0.83, 0.78, 0.7);
                    }
                `);
                gl.compileShader(fragmentShader);

                const program = gl.createProgram();
                gl.attachShader(program, vertexShader);
                gl.attachShader(program, fragmentShader);
                gl.linkProgram(program);

                const success = gl.getProgramParameter(program, gl.LINK_STATUS);

                document.body.removeChild(canvas);
                resolve({
                    success: success,
                    webglSupported: true,
                    fallbackWorking: true,
                    message: success ? 'WebGL working properly' : 'WebGL shader compilation failed'
                });

            } catch (error) {
                document.body.removeChild(canvas);
                resolve({
                    success: false,
                    webglSupported: false,
                    fallbackWorking: false,
                    message: `WebGL error: ${error.message}`
                });
            }
        });
    }

    // Test 4: Overall performance on mobile
    testPerformance() {
        return new Promise((resolve) => {
            const startTime = performance.now();
            let operations = 0;

            // Simulate animation workload
            function performanceTest() {
                // Simulate DOM manipulation
                const div = document.createElement('div');
                div.style.transform = `translateX(${Math.random() * 100}px)`;
                div.style.opacity = Math.random().toString();

                // Simulate calculation
                Math.sin(Date.now() * 0.001) * Math.cos(Date.now() * 0.001);

                operations++;

                if (operations < 1000) {
                    requestAnimationFrame(performanceTest);
                } else {
                    const endTime = performance.now();
                    const totalTime = endTime - startTime;
                    const opsPerMs = operations / totalTime;

                    resolve({
                        success: totalTime < 1000, // Should complete within 1 second
                        totalTime: Math.round(totalTime),
                        opsPerMs: Math.round(opsPerMs * 1000),
                        message: `Performance: ${Math.round(totalTime)}ms for ${operations} operations`
                    });
                }
            }

            requestAnimationFrame(performanceTest);
        });
    }

    // Test 5: Accessibility and reduced motion
    testAccessibility() {
        const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

        return {
            success: true,
            prefersReducedMotion: reducedMotion,
            hasAltText: document.querySelector('[aria-hidden]') !== null,
            keyboardNavigation: document.querySelector('[tabindex]') !== null,
            message: reducedMotion ?
                'Reduced motion preferred - animations will be minimal' :
                'Full animations enabled'
        };
    }

    // Run all tests
    async runAllTests() {
        console.log('🔍 Running mobile animation compatibility tests...\n');

        // Device info
        console.log('📱 Device Information:');
        Object.entries(this.results.deviceInfo).forEach(([key, value]) => {
            console.log(`   ${key}: ${value}`);
        });
        console.log('');

        try {
            // Run tests sequentially
            console.log('🔄 Testing HeaderText animation...');
            this.results.headerTextTest = await this.testHeaderText();
            console.log(`   ${this.results.headerTextTest.success ? '✅' : '❌'} ${this.results.headerTextTest.message}`);

            console.log('🔄 Testing SystemActivity performance...');
            this.results.systemActivityTest = await this.testSystemActivity();
            console.log(`   ${this.results.systemActivityTest.success ? '✅' : '❌'} ${this.results.systemActivityTest.message}`);

            console.log('🔄 Testing WebGL support...');
            this.results.webglTest = await this.testWebGL();
            console.log(`   ${this.results.webglTest.success ? '✅' : '❌'} ${this.results.webglTest.message}`);

            console.log('🔄 Testing performance...');
            this.results.performanceTest = await this.testPerformance();
            console.log(`   ${this.results.performanceTest.success ? '✅' : '❌'} ${this.results.performanceTest.message}`);

            console.log('🔄 Testing accessibility...');
            this.results.fallbackTest = this.testAccessibility();
            console.log(`   ${this.results.fallbackTest.success ? '✅' : '❌'} ${this.results.fallbackTest.message}`);

        } catch (error) {
            console.error('💥 Test execution failed:', error);
        }

        // Final assessment
        const passedTests = [
            this.results.headerTextTest?.success,
            this.results.systemActivityTest?.success,
            this.results.webglTest?.success,
            this.results.performanceTest?.success,
            this.results.fallbackTest?.success
        ].filter(Boolean).length;

        console.log('\n' + '='.repeat(50));
        console.log('📋 MOBILE COMPATIBILITY RESULTS');
        console.log('='.repeat(50));
        console.log(`🎯 Tests passed: ${passedTests}/5`);

        if (passedTests >= 4) {
            console.log('🟢 EXCELLENT mobile compatibility');
        } else if (passedTests >= 3) {
            console.log('🟡 GOOD mobile compatibility with minor issues');
        } else {
            console.log('🔴 POOR mobile compatibility - optimization needed');
        }

        // Mobile-specific recommendations
        console.log('\n💡 Mobile Recommendations:');
        if (!this.results.webglTest?.webglSupported) {
            console.log('• WebGL not supported - 2D fallbacks will be used');
        }
        if (this.results.systemActivityTest?.fps < 30) {
            console.log('• Reduce animation complexity for better performance');
        }
        if (this.results.deviceInfo.prefersReducedMotion) {
            console.log('• User prefers reduced motion - minimal animations active');
        }
        if (this.results.deviceInfo.isMobile) {
            console.log('• Mobile device detected - using optimized animation settings');
        }

        return this.results;
    }
}

// Auto-run if in browser environment
if (typeof window !== 'undefined') {
    const tester = new MobileAnimationTester();
    window.mobileAnimationTest = () => tester.runAllTests();

    // Auto-run on load
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => {
            setTimeout(() => tester.runAllTests(), 1000);
        });
    } else {
        setTimeout(() => tester.runAllTests(), 1000);
    }
}

// Export for Node.js
if (typeof module !== 'undefined' && module.exports) {
    module.exports = MobileAnimationTester;
}
