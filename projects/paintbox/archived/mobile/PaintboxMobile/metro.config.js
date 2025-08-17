const { getDefaultConfig, mergeConfig } = require('@react-native/metro-config');

/**
 * Metro configuration with performance optimizations
 * https://reactnative.dev/docs/metro
 *
 * @type {import('@react-native/metro-config').MetroConfig}
 */
const config = {
  transformer: {
    // Enable minification
    minifierConfig: {
      mangle: {
        keep_fnames: true,
      },
    },
    // Enable bundle splitting for large apps
    unstable_allowRequireContext: true,
  },
  serializer: {
    // Optimize bundle output
    createModuleIdFactory: function () {
      return function (path) {
        // Create shorter module IDs for smaller bundles
        const hash = require('crypto')
          .createHash('md5')
          .update(path)
          .digest('hex')
          .substring(0, 8);
        return hash;
      };
    },
    // Bundle splitting configuration
    unstable_splitBundleOptions: {
      createModuleGroups: function (modules) {
        const groups = new Map();

        // Group vendor modules together
        const vendorModules = modules.filter(module =>
          module.path.includes('node_modules')
        );
        if (vendorModules.length > 0) {
          groups.set('vendor', vendorModules);
        }

        // Group component modules
        const componentModules = modules.filter(module =>
          module.path.includes('/components/') ||
          module.path.includes('/screens/')
        );
        if (componentModules.length > 0) {
          groups.set('components', componentModules);
        }

        return groups;
      },
    },
  },
  resolver: {
    // Optimize resolution
    alias: {
      '@components': './src/components',
      '@screens': './src/screens',
      '@services': './src/services',
      '@utils': './src/utils',
      '@types': './src/types',
      '@hooks': './src/hooks',
      '@store': './src/store',
    },
  },
};

module.exports = mergeConfig(getDefaultConfig(__dirname), config);
