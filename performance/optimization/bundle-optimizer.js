/**
 * Bundle Optimizer
 * Analyzes and optimizes frontend bundles for Next.js applications
 */

const fs = require('fs').promises;
const path = require('path');
const { exec } = require('child_process');
const { promisify } = require('util');
const execAsync = promisify(exec);

class BundleOptimizer {
  constructor(projectPath) {
    this.projectPath = projectPath;
    this.targetBundleSize = 250000; // 250KB target
    this.criticalBundleSize = 500000; // 500KB critical threshold
    this.optimizations = [];
  }

  async analyzeBundles() {
    const buildPath = path.join(this.projectPath, '.next');
    const stats = await this.getBuildStats(buildPath);

    return {
      totalSize: stats.totalSize,
      bundles: stats.bundles,
      recommendations: await this.generateOptimizations(stats),
      criticalBundles: stats.bundles.filter(b => b.size > this.criticalBundleSize)
    };
  }

  async getBuildStats(buildPath) {
    try {
      const buildManifest = await fs.readFile(
        path.join(buildPath, 'build-manifest.json'),
        'utf-8'
      );
      const manifest = JSON.parse(buildManifest);

      const bundles = [];
      let totalSize = 0;

      // Analyze each page bundle
      for (const [page, assets] of Object.entries(manifest.pages)) {
        let pageSize = 0;
        const chunks = [];

        for (const asset of assets) {
          const assetPath = path.join(buildPath, 'static', asset);
          try {
            const stats = await fs.stat(assetPath);
            pageSize += stats.size;
            chunks.push({
              name: asset,
              size: stats.size,
              gzipSize: await this.getGzipSize(assetPath)
            });
          } catch (e) {
            // Asset might not exist in development
          }
        }

        bundles.push({
          page,
          size: pageSize,
          chunks,
          isLarge: pageSize > this.targetBundleSize
        });
        totalSize += pageSize;
      }

      return { totalSize, bundles };
    } catch (error) {
      console.error('Error reading build stats:', error);
      return { totalSize: 0, bundles: [] };
    }
  }

  async getGzipSize(filePath) {
    try {
      const { stdout } = await execAsync(`gzip -c "${filePath}" | wc -c`);
      return parseInt(stdout.trim());
    } catch {
      return 0;
    }
  }

  async generateOptimizations(stats) {
    const optimizations = [];

    // Check for large bundles
    const largeBundles = stats.bundles.filter(b => b.size > this.targetBundleSize);
    if (largeBundles.length > 0) {
      optimizations.push({
        type: 'BUNDLE_SIZE',
        priority: 'HIGH',
        issue: `${largeBundles.length} bundles exceed target size of ${this.targetBundleSize / 1000}KB`,
        solution: await this.generateBundleSplitConfig(largeBundles)
      });
    }

    // Check for duplicate dependencies
    const duplicates = await this.findDuplicateDependencies();
    if (duplicates.length > 0) {
      optimizations.push({
        type: 'DUPLICATE_DEPS',
        priority: 'MEDIUM',
        issue: `Found ${duplicates.length} duplicate dependencies across bundles`,
        solution: this.generateDeduplicationConfig(duplicates)
      });
    }

    // Check for unoptimized images
    const imageOptimizations = await this.analyzeImages();
    if (imageOptimizations.length > 0) {
      optimizations.push({
        type: 'IMAGE_OPTIMIZATION',
        priority: 'HIGH',
        issue: `${imageOptimizations.length} images need optimization`,
        solution: imageOptimizations
      });
    }

    return optimizations;
  }

  async generateBundleSplitConfig(largeBundles) {
    const config = {
      description: 'Implement code splitting to reduce bundle sizes',
      nextConfig: {
        webpack: `(config, { isServer }) => {
    // Implement chunk splitting
    config.optimization = {
      ...config.optimization,
      splitChunks: {
        chunks: 'all',
        cacheGroups: {
          default: false,
          vendors: false,
          framework: {
            name: 'framework',
            chunks: 'all',
            test: /[\\/]node_modules[\\/](react|react-dom|scheduler|next)[\\/]/,
            priority: 40,
            enforce: true,
          },
          lib: {
            test: /[\\/]node_modules[\\/]/,
            name(module) {
              const packageName = module.context.match(/[\\/]node_modules[\\/](.*?)([[\\/]|$)/)[1];
              return \`npm.\${packageName.replace('@', '')}\`;
            },
            priority: 30,
            minChunks: 1,
            reuseExistingChunk: true,
          },
          commons: {
            name: 'commons',
            minChunks: 2,
            priority: 20,
          },
          shared: {
            name: 'shared',
            test: /[\\/]components[\\/]|[\\/]lib[\\/]|[\\/]utils[\\/]/,
            priority: 10,
            reuseExistingChunk: true,
          },
        },
        maxAsyncRequests: 30,
        maxInitialRequests: 30,
        minSize: 20000,
      },
    };
    return config;
  }`,
        dynamicImports: largeBundles.map(bundle => ({
          page: bundle.page,
          suggestion: `Convert to dynamic import:
const Component = dynamic(() => import('${bundle.page}'), {
  loading: () => <LoadingSpinner />,
  ssr: false // If not needed for SEO
});`
        }))
      }
    };

    return config;
  }

  async findDuplicateDependencies() {
    try {
      const { stdout } = await execAsync(
        `cd "${this.projectPath}" && npm ls --depth=0 --json 2>/dev/null || true`
      );

      const deps = JSON.parse(stdout);
      const duplicates = [];
      const seen = new Map();

      const checkDuplicates = (dependencies, parent = '') => {
        for (const [name, info] of Object.entries(dependencies || {})) {
          const version = info.version || info;
          const key = `${name}@${version}`;

          if (seen.has(name)) {
            const existing = seen.get(name);
            if (existing.version !== version) {
              duplicates.push({
                name,
                versions: [existing.version, version],
                parents: [existing.parent, parent]
              });
            }
          } else {
            seen.set(name, { version, parent });
          }

          if (info.dependencies) {
            checkDuplicates(info.dependencies, name);
          }
        }
      };

      checkDuplicates(deps.dependencies);
      return duplicates;
    } catch {
      return [];
    }
  }

  generateDeduplicationConfig(duplicates) {
    return {
      description: 'Deduplicate dependencies to reduce bundle size',
      resolutions: duplicates.reduce((acc, dup) => {
        // Use the latest version
        const latestVersion = dup.versions.sort().pop();
        acc[dup.name] = latestVersion;
        return acc;
      }, {}),
      packageJson: {
        resolutions: duplicates.reduce((acc, dup) => {
          const latestVersion = dup.versions.sort().pop();
          acc[dup.name] = latestVersion;
          return acc;
        }, {})
      }
    };
  }

  async analyzeImages() {
    const publicPath = path.join(this.projectPath, 'public');
    const optimizations = [];

    try {
      const files = await this.getAllFiles(publicPath);
      const imageFiles = files.filter(f => /\.(jpg|jpeg|png|gif|svg)$/i.test(f));

      for (const file of imageFiles) {
        const stats = await fs.stat(file);
        if (stats.size > 100000) { // 100KB
          optimizations.push({
            file: path.relative(this.projectPath, file),
            currentSize: stats.size,
            recommendation: 'Convert to WebP or AVIF format',
            nextImageOptimization: `
import Image from 'next/image';

<Image
  src="${path.relative(publicPath, file)}"
  alt="Description"
  width={800}
  height={600}
  placeholder="blur"
  quality={85}
  loading="lazy"
/>`
          });
        }
      }
    } catch {
      // Public directory might not exist
    }

    return optimizations;
  }

  async getAllFiles(dirPath, arrayOfFiles = []) {
    try {
      const files = await fs.readdir(dirPath);

      for (const file of files) {
        const filePath = path.join(dirPath, file);
        const stat = await fs.stat(filePath);

        if (stat.isDirectory()) {
          await this.getAllFiles(filePath, arrayOfFiles);
        } else {
          arrayOfFiles.push(filePath);
        }
      }
    } catch {
      // Directory might not exist
    }

    return arrayOfFiles;
  }

  async generateOptimizedNextConfig() {
    return `/** @type {import('next').NextConfig} */
const nextConfig = {
  // Enable SWC minification for smaller bundles
  swcMinify: true,

  // Optimize images
  images: {
    domains: ['candlefish.ai'],
    formats: ['image/avif', 'image/webp'],
    deviceSizes: [640, 750, 828, 1080, 1200, 1920, 2048, 3840],
    imageSizes: [16, 32, 48, 64, 96, 128, 256, 384],
    minimumCacheTTL: 60 * 60 * 24 * 365, // 1 year
  },

  // Production optimizations
  productionBrowserSourceMaps: false,

  // Compression
  compress: true,

  // Webpack optimizations
  webpack: (config, { dev, isServer }) => {
    // Production optimizations
    if (!dev && !isServer) {
      // Tree shaking
      config.optimization.usedExports = true;
      config.optimization.sideEffects = false;

      // Minimize
      config.optimization.minimize = true;

      // Split chunks
      config.optimization.splitChunks = {
        chunks: 'all',
        minSize: 20000,
        maxSize: 244000,
        minChunks: 1,
        maxAsyncRequests: 30,
        maxInitialRequests: 30,
        cacheGroups: {
          default: false,
          vendors: false,
          framework: {
            name: 'framework',
            chunks: 'all',
            test: /[\\/]node_modules[\\/](react|react-dom|scheduler|next)[\\/]/,
            priority: 40,
            enforce: true,
          },
          lib: {
            test: /[\\/]node_modules[\\/]/,
            name(module) {
              const packageName = module.context.match(/[\\/]node_modules[\\/](.*?)([[\\/]|$)/)[1];
              return \`npm.\${packageName.replace('@', '')}\`;
            },
            priority: 30,
            minChunks: 1,
            reuseExistingChunk: true,
          },
          commons: {
            name: 'commons',
            minChunks: 2,
            priority: 20,
          },
        },
      };

      // Module concatenation
      config.optimization.concatenateModules = true;

      // Remove unused code
      config.optimization.providedExports = true;
    }

    // Alias optimizations
    config.resolve.alias = {
      ...config.resolve.alias,
      'lodash': 'lodash-es',
    };

    // Ignore moment locales
    config.plugins.push(
      new (require('webpack')).IgnorePlugin({
        resourceRegExp: /^\\.\\/locale$/,
        contextRegExp: /moment$/,
      })
    );

    return config;
  },

  // Experimental features for performance
  experimental: {
    optimizeCss: true,
    optimizePackageImports: ['lodash', 'date-fns', '@mui/material', '@mui/icons-material'],
    turbo: {
      rules: {
        '*.svg': {
          loaders: ['@svgr/webpack'],
          as: '*.js',
        },
      },
    },
  },

  // Headers for caching
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          {
            key: 'X-DNS-Prefetch-Control',
            value: 'on'
          },
        ],
      },
      {
        source: '/static/(.*)',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=31536000, immutable',
          },
        ],
      },
    ];
  },
};

module.exports = nextConfig;`;
  }
}

module.exports = BundleOptimizer;
