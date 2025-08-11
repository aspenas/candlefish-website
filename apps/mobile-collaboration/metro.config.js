const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

// Add support for additional file extensions
config.resolver.assetExts.push('db', 'mp3', 'ttf', 'otf', 'png', 'jpg');

// Add support for TypeScript paths
config.resolver.alias = {
  '@': './src',
  '@/components': './src/components',
  '@/screens': './src/screens',
  '@/services': './src/services',
  '@/stores': './src/stores',
  '@/types': './src/types',
  '@/utils': './src/utils',
  '@/graphql': './src/graphql',
};

// Optimize bundle for mobile
config.transformer.minifierConfig = {
  keep_classnames: true,
  mangle: {
    keep_fnames: true,
  },
};

module.exports = config;
