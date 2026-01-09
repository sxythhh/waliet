const path = require('path');
const { getDefaultConfig, mergeConfig } = require('@react-native/metro-config');

// Root of the monorepo
const projectRoot = __dirname;
const monorepoRoot = path.resolve(projectRoot, '../..');

/**
 * Metro configuration for monorepo
 * https://reactnative.dev/docs/metro
 *
 * @type {import('@react-native/metro-config').MetroConfig}
 */
const config = {
  // Watch the monorepo root for changes in shared packages
  watchFolders: [monorepoRoot],

  resolver: {
    // Let Metro know where to resolve packages from
    nodeModulesPaths: [
      path.resolve(projectRoot, 'node_modules'),
      path.resolve(monorepoRoot, 'node_modules'),
    ],
    // Ensure we can resolve workspace packages
    disableHierarchicalLookup: true,
  },
};

module.exports = mergeConfig(getDefaultConfig(__dirname), config);
