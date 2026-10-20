const path = require('path');

module.exports = function (api) {
  api.cache(true);
  const expoRoot = path.dirname(require.resolve('expo/package.json'));

  return {
    // Keep Babel aligned with this app's Expo SDK in the monorepo.
    presets: [require.resolve('babel-preset-expo', { paths: [expoRoot] })],
  };
};
