const path = require('path');

// Resolve Expo's matching Metro version instead of the parent workspace's SDK 54 copy.
const expoRoot = path.dirname(require.resolve('expo/package.json'));
const { getDefaultConfig } = require(
  require.resolve('@expo/metro-config', { paths: [expoRoot] })
);

const config = getDefaultConfig(__dirname);
const parentNodeModules = path.resolve(__dirname, '../node_modules');
const escapedParentNodeModules = parentNodeModules.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

// npm v7+ will install ../node_modules/react and ../node_modules/react-native because of peerDependencies.
// To prevent the incompatible react-native between ./node_modules/react-native and ../node_modules/react-native,
// excludes the one from the parent folder when bundling.
config.resolver.blockList = [
  ...Array.from(config.resolver.blockList ?? []),
  new RegExp(`^${escapedParentNodeModules}/react(?:$|[-/])`),
  new RegExp(`^${escapedParentNodeModules}/expo(?:$|[-/])`),
  new RegExp(`^${escapedParentNodeModules}/@expo/`),
  new RegExp(`^${escapedParentNodeModules}/@react-native/`),
];

config.resolver.nodeModulesPaths = [
  path.resolve(__dirname, './node_modules'),
  path.resolve(__dirname, '../node_modules'),
];

config.resolver.extraNodeModules = {
  // Resolve the local SDK source during development. Pointing at the package
  // root makes Metro follow package.json's publish-only build/index.js entry.
  'ai-assistant': path.resolve(__dirname, '../src'),
};

config.watchFolders = [path.resolve(__dirname, '..')];

config.transformer.getTransformOptions = async () => ({
  transform: {
    experimentalImportSupport: false,
    inlineRequires: true,
  },
});

module.exports = config;
