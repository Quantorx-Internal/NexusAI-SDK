const { getDefaultConfig } = require('expo/metro-config');
const path = require('path');

const config = getDefaultConfig(__dirname);
const defaultRewriteRequestUrl = config.server.rewriteRequestUrl;

config.resolver.blockList = [
  ...Array.from(config.resolver.blockList ?? []),
  new RegExp(path.resolve(__dirname, 'node_modules/react')),
  new RegExp(path.resolve(__dirname, 'node_modules/react-native')),
  new RegExp(path.resolve(__dirname, 'node_modules/react-native-svg')),
  new RegExp(path.resolve(__dirname, 'node_modules/lucide-react-native/node_modules/react-native-svg')),
];

config.resolver.nodeModulesPaths = [
  path.resolve(__dirname, 'example/node_modules'),
  path.resolve(__dirname, 'node_modules'),
];

config.resolver.extraNodeModules = {
  'ai-assistant': path.resolve(__dirname, 'src'),
  'lucide-react-native': path.resolve(__dirname, 'example/node_modules/lucide-react-native'),
  'react-native-svg': path.resolve(__dirname, 'example/node_modules/react-native-svg'),
};

config.watchFolders = [
  path.resolve(__dirname, 'src'),
  path.resolve(__dirname, 'example'),
];

config.server.rewriteRequestUrl = (url) => {
  if (url.includes('/.expo/.virtual-metro-entry.bundle?')) {
    return url.replace(
      '/.expo/.virtual-metro-entry.bundle?',
      '/example/index.bundle?'
    );
  }
  return defaultRewriteRequestUrl(url);
};

config.transformer.getTransformOptions = async () => ({
  transform: {
    experimentalImportSupport: false,
    inlineRequires: true,
  },
});

module.exports = config;
