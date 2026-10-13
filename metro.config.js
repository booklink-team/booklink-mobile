const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);
// Keep first-start bundling within modest development-machine memory limits.
config.maxWorkers = 2;
module.exports = config;
