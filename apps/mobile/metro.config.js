const path = require('path');
const { getDefaultConfig, mergeConfig } = require('@react-native/metro-config');

// Root of the monorepo
const projectRoot = __dirname;
const monorepoRoot = path.resolve(projectRoot, '../..');

const defaultConfig = getDefaultConfig(__dirname);

// Force single React 19 version from mobile's local node_modules
const reactPath = path.resolve(projectRoot, 'node_modules/react');
const reactDomPath = path.resolve(projectRoot, 'node_modules/react-dom');

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
    // Prioritize mobile app's node_modules first
    nodeModulesPaths: [
      path.resolve(projectRoot, 'node_modules'),
      path.resolve(monorepoRoot, 'node_modules'),
    ],
    // Allow resolution from workspace packages
    extraNodeModules: {
      '@virality/shared-types': path.resolve(monorepoRoot, 'packages/shared-types'),
    },
    // Intercept all module resolution to force single React instance
    resolveRequest: (context, moduleName, platform) => {
      // Force all react imports to use local React 19
      if (moduleName === 'react' || moduleName.startsWith('react/')) {
        const newModuleName = moduleName === 'react'
          ? reactPath
          : path.join(reactPath, moduleName.slice('react/'.length));
        return context.resolveRequest(context, newModuleName, platform);
      }
      // Force react-dom to use local version
      if (moduleName === 'react-dom' || moduleName.startsWith('react-dom/')) {
        const newModuleName = moduleName === 'react-dom'
          ? reactDomPath
          : path.join(reactDomPath, moduleName.slice('react-dom/'.length));
        return context.resolveRequest(context, newModuleName, platform);
      }
      // Default resolution
      return context.resolveRequest(context, moduleName, platform);
    },
  },

  // Ensure TypeScript files are processed from workspace packages
  transformer: {
    ...defaultConfig.transformer,
    getTransformOptions: async () => ({
      transform: {
        experimentalImportSupport: false,
        inlineRequires: true,
      },
    }),
  },
};

module.exports = mergeConfig(defaultConfig, config);
