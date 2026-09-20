const path = require('path');
const { loadProjectEnv } = require('@expo/env');

// Make `npx expo ...` safe from the SDK root by loading the example app's
// environment before delegating to its dynamic Expo configuration.
loadProjectEnv(path.join(__dirname, 'example'), { force: true, silent: true });

module.exports = require('./example/app.config');
