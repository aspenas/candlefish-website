const {getDefaultConfig, mergeConfig} = require('@react-native/metro-config');

/**
 * Metro configuration
 * https://facebook.github.io/metro/docs/configuration
 */
const config = {
  resolver: {
    alias: {
      '@': './src',
    },
    assetExts: [
      // Image formats
      'png', 'jpg', 'jpeg', 'gif', 'webp', 'svg',
      // Audio formats
      'mp3', 'wav', 'm4a', 'aac',
      // Video formats
      'mp4', 'mov', 'avi', 'mkv',
      // Font formats
      'ttf', 'otf', 'woff', 'woff2',
      // Document formats
      'pdf', 'doc', 'docx', 'xls', 'xlsx', 'ppt', 'pptx',
    ],
  },
  transformer: {
    getTransformOptions: async () => ({
      transform: {
        experimentalImportSupport: false,
        inlineRequires: true,
      },
    }),
  },
};

module.exports = mergeConfig(getDefaultConfig(__dirname), config);