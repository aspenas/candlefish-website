const { getDefaultConfig } = require('expo/metro-config');

/** @type {import('expo/metro-config').MetroConfig} */
const config = getDefaultConfig(__dirname);

// Enable support for GraphQL files
config.resolver.assetExts.push('graphql', 'gql');

// Optimize for better performance
config.transformer.minifierConfig = {
  simplify: true,
  mangle: {
    keep_fnames: true,
  },
};

// Support for symlinks (for monorepo setups)
config.resolver.unstable_enableSymlinks = true;

module.exports = config;
