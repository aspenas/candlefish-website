const { getDefaultConfig } = require('expo/metro-config');
const path = require('path');

const config = getDefaultConfig(__dirname);

// Monorepo support - resolve modules from parent directories
const projectRoot = __dirname;
const workspaceRoot = path.resolve(projectRoot, '../..');

config.watchFolders = [workspaceRoot];
config.resolver.disableHierarchicalLookup = false;
config.resolver.nodeModulesPaths = [
  path.resolve(projectRoot, 'node_modules'),
  path.resolve(workspaceRoot, 'node_modules'),
];

// Support for TypeScript path mapping
config.resolver.alias = {
  '@': path.resolve(projectRoot, 'src'),
  '@components': path.resolve(projectRoot, 'src/components'),
  '@screens': path.resolve(projectRoot, 'src/screens'),
  '@services': path.resolve(projectRoot, 'src/services'),
  '@store': path.resolve(projectRoot, 'src/store'),
  '@types': path.resolve(projectRoot, 'src/types'),
  '@utils': path.resolve(projectRoot, 'src/utils'),
  '@hooks': path.resolve(projectRoot, 'src/hooks'),
  '@navigation': path.resolve(projectRoot, 'src/navigation'),
  '@constants': path.resolve(projectRoot, 'src/constants'),
  '@assets': path.resolve(projectRoot, 'assets')
};

// Support for shared prompt engineering types
config.resolver.alias['@candlefish/prompt-engineering'] = path.resolve(
  workspaceRoot, 
  'brand/website/lib/prompt-engineering'
);

module.exports = config;