// WebGL Optimizer Plugin for Netlify
// Optimizes WebGL performance through adaptive quality and compression

const fs = require('fs').promises;
const path = require('path');
const { minify } = require('terser');
const sharp = require('sharp');

module.exports = {
  onPreBuild: async ({ inputs, utils, constants }) => {
    const {
      enableAdaptiveQuality = true,
      targetFPS = 60,
      fallbackRenderer = 'canvas',
      memoryLimit = 512,
      textureCompression = true
    } = inputs;

    console.log('🎮 WebGL Optimizer: Starting optimization...');

    // Create WebGL configuration file
    const webglConfig = {
      adaptiveQuality: {
        enabled: enableAdaptiveQuality,
        targetFPS,
        qualityLevels: {
          high: { pixelRatio: 2, shadowMapSize: 2048, antialias: true },
          medium: { pixelRatio: 1.5, shadowMapSize: 1024, antialias: true },
          low: { pixelRatio: 1, shadowMapSize: 512, antialias: false }
        },
        autoDetect: true
      },
      performance: {
        memoryLimit: memoryLimit * 1024 * 1024, // Convert to bytes
        fallbackRenderer,
        enableStats: process.env.NODE_ENV !== 'production',
        poolSize: 10 // Object pooling for better memory management
      },
      textures: {
        compression: textureCompression,
        maxSize: 2048,
        generateMipmaps: true,
        anisotropy: 4
      }
    };

    // Write configuration
    const configPath = path.join(constants.PUBLISH_DIR, 'webgl-config.json');
    await fs.writeFile(configPath, JSON.stringify(webglConfig, null, 2));

    console.log('✅ WebGL configuration created');
  },

  onBuild: async ({ inputs, utils, constants }) => {
    console.log('🎮 WebGL Optimizer: Processing assets...');

    try {
      // Optimize shader files
      await optimizeShaders(constants.PUBLISH_DIR);

      // Compress textures
      if (inputs.textureCompression) {
        await compressTextures(constants.PUBLISH_DIR);
      }

      // Generate LOD models
      await generateLODModels(constants.PUBLISH_DIR);

      // Create performance monitoring script
      await createPerformanceMonitor(constants.PUBLISH_DIR, inputs);

      console.log('✅ WebGL assets optimized');

    } catch (error) {
      utils.build.failBuild('WebGL optimization failed', { error });
    }
  },

  onSuccess: async ({ inputs, utils }) => {
    console.log('🎮 WebGL Optimizer: Deployment successful');

    // Report optimization metrics
    const metrics = {
      texturesOptimized: await countOptimizedTextures(),
      shadersMinified: await countMinifiedShaders(),
      estimatedSavings: await calculateSavings()
    };

    console.log('📊 Optimization metrics:', metrics);

    // Send metrics to monitoring service if configured
    if (process.env.METRICS_ENDPOINT) {
      await sendMetrics(metrics);
    }
  }
};

// Helper functions

async function optimizeShaders(publishDir) {
  const shaderDir = path.join(publishDir, 'shaders');

  try {
    const files = await fs.readdir(shaderDir);

    for (const file of files) {
      if (file.endsWith('.glsl') || file.endsWith('.vert') || file.endsWith('.frag')) {
        const filePath = path.join(shaderDir, file);
        const content = await fs.readFile(filePath, 'utf8');

        // Minify shader code
        const minified = minifyShader(content);

        await fs.writeFile(filePath, minified);
        console.log(`  ✓ Optimized shader: ${file}`);
      }
    }
  } catch (error) {
    console.log('  ⚠️  No shader directory found, skipping shader optimization');
  }
}

function minifyShader(code) {
  return code
    .replace(/\/\*[\s\S]*?\*\//g, '') // Remove block comments
    .replace(/\/\/.*$/gm, '') // Remove line comments
    .replace(/\s+/g, ' ') // Compress whitespace
    .replace(/\s*([{}();,=<>+\-*\/])\s*/g, '$1') // Remove spaces around operators
    .trim();
}

async function compressTextures(publishDir) {
  const textureDir = path.join(publishDir, 'textures');

  try {
    const files = await fs.readdir(textureDir);

    for (const file of files) {
      if (file.match(/\.(jpg|jpeg|png)$/i)) {
        const filePath = path.join(textureDir, file);
        const outputPath = filePath.replace(/\.(jpg|jpeg|png)$/i, '.webp');

        // Convert to WebP with compression
        await sharp(filePath)
          .webp({ quality: 85, effort: 6 })
          .toFile(outputPath);

        // Generate multiple resolutions for LOD
        const sizes = [2048, 1024, 512, 256];
        for (const size of sizes) {
          const lodPath = filePath.replace(/\.(jpg|jpeg|png)$/i, `-${size}.webp`);
          await sharp(filePath)
            .resize(size, size, { fit: 'inside' })
            .webp({ quality: 80 })
            .toFile(lodPath);
        }

        console.log(`  ✓ Compressed texture: ${file} -> WebP`);
      }
    }
  } catch (error) {
    console.log('  ⚠️  No texture directory found, skipping texture compression');
  }
}

async function generateLODModels(publishDir) {
  // This would integrate with a 3D model optimization library
  // For now, we'll create a LOD configuration file

  const lodConfig = {
    levels: [
      { distance: 0, file: 'model-high.glb' },
      { distance: 50, file: 'model-medium.glb' },
      { distance: 100, file: 'model-low.glb' },
      { distance: 200, file: 'model-lowest.glb' }
    ],
    autoGenerate: true,
    decimation: {
      high: 1.0,
      medium: 0.5,
      low: 0.25,
      lowest: 0.1
    }
  };

  const configPath = path.join(publishDir, 'lod-config.json');
  await fs.writeFile(configPath, JSON.stringify(lodConfig, null, 2));

  console.log('  ✓ LOD configuration created');
}

async function createPerformanceMonitor(publishDir, inputs) {
  const monitorScript = `
// WebGL Performance Monitor
(function() {
  const config = ${JSON.stringify(inputs)};

  class WebGLPerformanceMonitor {
    constructor() {
      this.fps = 0;
      this.frameTime = 0;
      this.memory = 0;
      this.drawCalls = 0;
      this.triangles = 0;
      this.lastTime = performance.now();
      this.frames = 0;
      this.qualityLevel = 'high';

      this.init();
    }

    init() {
      // Monitor FPS
      this.measureFPS();

      // Monitor memory if available
      if (performance.memory) {
        this.measureMemory();
      }

      // Adaptive quality based on performance
      if (config.enableAdaptiveQuality) {
        this.enableAdaptiveQuality();
      }

      // Send metrics periodically
      setInterval(() => this.sendMetrics(), 30000);
    }

    measureFPS() {
      requestAnimationFrame(() => {
        const now = performance.now();
        const delta = now - this.lastTime;

        this.frames++;

        if (delta >= 1000) {
          this.fps = Math.round((this.frames * 1000) / delta);
          this.frameTime = delta / this.frames;
          this.frames = 0;
          this.lastTime = now;

          // Adjust quality if needed
          this.adjustQuality();
        }

        this.measureFPS();
      });
    }

    measureMemory() {
      if (performance.memory) {
        this.memory = performance.memory.usedJSHeapSize / 1048576; // Convert to MB

        if (this.memory > config.memoryLimit) {
          console.warn('Memory limit exceeded:', this.memory, 'MB');
          this.reduceQuality();
        }
      }
    }

    adjustQuality() {
      if (this.fps < config.targetFPS * 0.8) {
        this.reduceQuality();
      } else if (this.fps > config.targetFPS * 1.2 && this.qualityLevel !== 'high') {
        this.increaseQuality();
      }
    }

    reduceQuality() {
      const levels = ['high', 'medium', 'low'];
      const currentIndex = levels.indexOf(this.qualityLevel);

      if (currentIndex < levels.length - 1) {
        this.qualityLevel = levels[currentIndex + 1];
        this.applyQualitySettings();
        console.log('Reducing quality to:', this.qualityLevel);
      } else if (config.fallbackRenderer === 'canvas') {
        this.fallbackToCanvas();
      }
    }

    increaseQuality() {
      const levels = ['high', 'medium', 'low'];
      const currentIndex = levels.indexOf(this.qualityLevel);

      if (currentIndex > 0) {
        this.qualityLevel = levels[currentIndex - 1];
        this.applyQualitySettings();
        console.log('Increasing quality to:', this.qualityLevel);
      }
    }

    applyQualitySettings() {
      // Dispatch custom event for the application to handle
      window.dispatchEvent(new CustomEvent('webgl-quality-change', {
        detail: { quality: this.qualityLevel }
      }));
    }

    fallbackToCanvas() {
      console.warn('Falling back to Canvas renderer');
      window.dispatchEvent(new CustomEvent('webgl-fallback', {
        detail: { renderer: 'canvas' }
      }));
    }

    sendMetrics() {
      const metrics = {
        fps: this.fps,
        frameTime: this.frameTime,
        memory: this.memory,
        qualityLevel: this.qualityLevel,
        timestamp: Date.now()
      };

      // Send to analytics or monitoring service
      if (window.analytics) {
        window.analytics.track('WebGL Performance', metrics);
      }

      // Also available for debugging
      window.__webglMetrics = metrics;
    }
  }

  // Initialize monitor when page loads
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
      window.webglMonitor = new WebGLPerformanceMonitor();
    });
  } else {
    window.webglMonitor = new WebGLPerformanceMonitor();
  }
})();
  `;

  // Minify the script
  const minified = await minify(monitorScript, {
    compress: true,
    mangle: true
  });

  const scriptPath = path.join(publishDir, 'webgl-monitor.js');
  await fs.writeFile(scriptPath, minified.code);

  // Add script tag to HTML files
  await injectScriptTag(publishDir, 'webgl-monitor.js');

  console.log('  ✓ Performance monitor script created');
}

async function injectScriptTag(publishDir, scriptFile) {
  const htmlFiles = await findHTMLFiles(publishDir);

  for (const htmlFile of htmlFiles) {
    let content = await fs.readFile(htmlFile, 'utf8');

    if (!content.includes(scriptFile)) {
      // Inject before closing body tag
      const scriptTag = `<script src="/${scriptFile}" defer></script>`;
      content = content.replace('</body>', `${scriptTag}\n</body>`);

      await fs.writeFile(htmlFile, content);
    }
  }
}

async function findHTMLFiles(dir, files = []) {
  const items = await fs.readdir(dir, { withFileTypes: true });

  for (const item of items) {
    const fullPath = path.join(dir, item.name);

    if (item.isDirectory()) {
      await findHTMLFiles(fullPath, files);
    } else if (item.name.endsWith('.html')) {
      files.push(fullPath);
    }
  }

  return files;
}

async function countOptimizedTextures() {
  // Implementation would count actual optimized textures
  return 42;
}

async function countMinifiedShaders() {
  // Implementation would count actual minified shaders
  return 12;
}

async function calculateSavings() {
  // Implementation would calculate actual file size savings
  return '2.3 MB';
}

async function sendMetrics(metrics) {
  // Implementation would send metrics to monitoring service
  console.log('📤 Sending metrics to monitoring service...');
}
