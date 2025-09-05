#!/usr/bin/env node

/**
 * WebGL Performance Testing Script
 * Tests Three.js rendering performance
 */

const puppeteer = require('puppeteer');
const fs = require('fs');
const path = require('path');

async function testWebGLPerformance(url) {
  const browser = await puppeteer.launch({
    headless: true,
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--enable-webgl',
      '--use-gl=swiftshader',
    ],
  });

  const page = await browser.newPage();

  // Enable performance metrics
  await page.evaluateOnNewDocument(() => {
    window.__performanceMetrics = {
      fps: [],
      memory: [],
      renderTime: [],
      drawCalls: 0,
      triangles: 0,
      textures: 0,
      shaders: 0,
    };

    // Override requestAnimationFrame to measure FPS
    const originalRAF = window.requestAnimationFrame;
    let lastTime = performance.now();
    let frameCount = 0;
    let fpsUpdateTime = performance.now();

    window.requestAnimationFrame = function(callback) {
      return originalRAF.call(window, (timestamp) => {
        frameCount++;
        
        const currentTime = performance.now();
        const deltaTime = currentTime - fpsUpdateTime;
        
        if (deltaTime >= 1000) {
          const fps = (frameCount * 1000) / deltaTime;
          window.__performanceMetrics.fps.push(fps);
          frameCount = 0;
          fpsUpdateTime = currentTime;
        }

        // Measure render time
        const renderStart = performance.now();
        const result = callback(timestamp);
        const renderEnd = performance.now();
        
        window.__performanceMetrics.renderTime.push(renderEnd - renderStart);
        
        return result;
      });
    };

    // Monitor memory usage
    if ('memory' in performance) {
      setInterval(() => {
        window.__performanceMetrics.memory.push(
          performance.memory.usedJSHeapSize / 1048576
        );
      }, 1000);
    }
  });

  // Navigate to page
  await page.goto(url, {
    waitUntil: 'networkidle2',
    timeout: 30000,
  });

  // Wait for Three.js to initialize
  await page.waitForFunction(() => {
    return window.THREE !== undefined || window.__threeRenderer !== undefined;
  }, { timeout: 10000 }).catch(() => {
    console.log('Three.js not detected, continuing...');
  });

  // Inject WebGL monitoring
  await page.evaluate(() => {
    const canvas = document.querySelector('canvas');
    if (canvas) {
      const gl = canvas.getContext('webgl') || canvas.getContext('webgl2');
      if (gl) {
        // Count draw calls
        const originalDrawElements = gl.drawElements;
        const originalDrawArrays = gl.drawArrays;
        
        gl.drawElements = function() {
          window.__performanceMetrics.drawCalls++;
          return originalDrawElements.apply(this, arguments);
        };
        
        gl.drawArrays = function() {
          window.__performanceMetrics.drawCalls++;
          return originalDrawArrays.apply(this, arguments);
        };

        // Get WebGL info
        const debugInfo = gl.getExtension('WEBGL_debug_renderer_info');
        if (debugInfo) {
          window.__performanceMetrics.renderer = gl.getParameter(
            debugInfo.UNMASKED_RENDERER_WEBGL
          );
          window.__performanceMetrics.vendor = gl.getParameter(
            debugInfo.UNMASKED_VENDOR_WEBGL
          );
        }

        // Count textures
        window.__performanceMetrics.maxTextures = gl.getParameter(
          gl.MAX_TEXTURE_IMAGE_UNITS
        );
      }
    }
  });

  // Run performance test for 10 seconds
  console.log('Running WebGL performance test for 10 seconds...');
  
  // Simulate user interactions
  const testDuration = 10000;
  const startTime = Date.now();
  
  while (Date.now() - startTime < testDuration) {
    // Simulate mouse movement
    await page.mouse.move(
      Math.random() * 800,
      Math.random() * 600
    );
    
    // Simulate scroll
    await page.evaluate(() => {
      window.scrollBy(0, Math.random() * 100 - 50);
    });
    
    await page.waitForTimeout(100);
  }

  // Collect metrics
  const metrics = await page.evaluate(() => {
    const m = window.__performanceMetrics;
    
    const avgFPS = m.fps.length > 0
      ? m.fps.reduce((a, b) => a + b, 0) / m.fps.length
      : 0;
    
    const minFPS = m.fps.length > 0
      ? Math.min(...m.fps)
      : 0;
    
    const maxFPS = m.fps.length > 0
      ? Math.max(...m.fps)
      : 0;
    
    const avgMemory = m.memory.length > 0
      ? m.memory.reduce((a, b) => a + b, 0) / m.memory.length
      : 0;
    
    const peakMemory = m.memory.length > 0
      ? Math.max(...m.memory)
      : 0;
    
    const avgRenderTime = m.renderTime.length > 0
      ? m.renderTime.reduce((a, b) => a + b, 0) / m.renderTime.length
      : 0;
    
    // Calculate percentiles
    const sortedFPS = [...m.fps].sort((a, b) => a - b);
    const p95FPS = sortedFPS[Math.floor(sortedFPS.length * 0.95)] || 0;
    const p99FPS = sortedFPS[Math.floor(sortedFPS.length * 0.99)] || 0;
    
    return {
      averageFPS: avgFPS,
      minFPS: minFPS,
      maxFPS: maxFPS,
      p95FPS: p95FPS,
      p99FPS: p99FPS,
      averageMemoryMB: avgMemory,
      peakMemoryMB: peakMemory,
      averageRenderTimeMS: avgRenderTime,
      totalDrawCalls: m.drawCalls,
      drawCallsPerSecond: m.drawCalls / 10,
      renderer: m.renderer || 'Unknown',
      vendor: m.vendor || 'Unknown',
      maxTextures: m.maxTextures || 0,
      fpsStability: calculateStability(m.fps),
    };
  });

  // Take performance screenshot
  await page.screenshot({
    path: path.join(__dirname, '../performance-screenshot.png'),
  });

  // Generate performance profile
  const profile = await page.metrics();

  await browser.close();

  // Add test metadata
  metrics.testDuration = testDuration;
  metrics.url = url;
  metrics.timestamp = new Date().toISOString();
  metrics.profile = profile;

  // Calculate performance score
  metrics.performanceScore = calculatePerformanceScore(metrics);

  return metrics;
}

function calculateStability(fpsArray) {
  if (fpsArray.length < 2) return 100;
  
  const mean = fpsArray.reduce((a, b) => a + b, 0) / fpsArray.length;
  const variance = fpsArray.reduce((sum, fps) => {
    return sum + Math.pow(fps - mean, 2);
  }, 0) / fpsArray.length;
  
  const stdDev = Math.sqrt(variance);
  const coefficientOfVariation = (stdDev / mean) * 100;
  
  // Lower CV means more stable FPS
  return Math.max(0, 100 - coefficientOfVariation);
}

function calculatePerformanceScore(metrics) {
  let score = 100;
  
  // FPS scoring (40% weight)
  if (metrics.averageFPS < 60) {
    score -= (60 - metrics.averageFPS) * 0.67; // -40 points max
  }
  
  // Memory scoring (20% weight)
  if (metrics.peakMemoryMB > 512) {
    score -= Math.min(20, (metrics.peakMemoryMB - 512) / 25);
  }
  
  // Render time scoring (20% weight)
  if (metrics.averageRenderTimeMS > 16.67) {
    score -= Math.min(20, (metrics.averageRenderTimeMS - 16.67) * 2);
  }
  
  // Stability scoring (20% weight)
  score -= (100 - metrics.fpsStability) * 0.2;
  
  return Math.max(0, Math.round(score));
}

// Main execution
const url = process.argv[2] || 'http://localhost:3000';

testWebGLPerformance(url)
  .then(metrics => {
    console.log('\n=== WebGL Performance Test Results ===\n');
    console.log(`URL: ${metrics.url}`);
    console.log(`Timestamp: ${metrics.timestamp}`);
    console.log(`Test Duration: ${metrics.testDuration}ms\n`);
    
    console.log('FPS Metrics:');
    console.log(`  Average: ${metrics.averageFPS.toFixed(2)}`);
    console.log(`  Min: ${metrics.minFPS.toFixed(2)}`);
    console.log(`  Max: ${metrics.maxFPS.toFixed(2)}`);
    console.log(`  P95: ${metrics.p95FPS.toFixed(2)}`);
    console.log(`  P99: ${metrics.p99FPS.toFixed(2)}`);
    console.log(`  Stability: ${metrics.fpsStability.toFixed(2)}%\n`);
    
    console.log('Memory Usage:');
    console.log(`  Average: ${metrics.averageMemoryMB.toFixed(2)}MB`);
    console.log(`  Peak: ${metrics.peakMemoryMB.toFixed(2)}MB\n`);
    
    console.log('Rendering:');
    console.log(`  Average Render Time: ${metrics.averageRenderTimeMS.toFixed(2)}ms`);
    console.log(`  Total Draw Calls: ${metrics.totalDrawCalls}`);
    console.log(`  Draw Calls/Second: ${metrics.drawCallsPerSecond.toFixed(2)}\n`);
    
    console.log('WebGL Info:');
    console.log(`  Renderer: ${metrics.renderer}`);
    console.log(`  Vendor: ${metrics.vendor}`);
    console.log(`  Max Textures: ${metrics.maxTextures}\n`);
    
    console.log(`Performance Score: ${metrics.performanceScore}/100`);
    
    if (metrics.performanceScore >= 80) {
      console.log('✅ EXCELLENT: Performance meets all targets');
    } else if (metrics.performanceScore >= 60) {
      console.log('⚠️ GOOD: Performance is acceptable but could be improved');
    } else {
      console.log('❌ POOR: Performance needs significant optimization');
    }
    
    // Write results to file
    fs.writeFileSync(
      path.join(__dirname, '../webgl-performance-results.json'),
      JSON.stringify(metrics, null, 2)
    );
    
    console.log('\nResults saved to webgl-performance-results.json');
    
    // Exit with appropriate code
    process.exit(metrics.performanceScore >= 60 ? 0 : 1);
  })
  .catch(error => {
    console.error('Performance test failed:', error);
    process.exit(1);
  });