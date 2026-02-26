/**
 * Metro config for Expo SDK 54. Must extend @expo/metro-config for EAS Build.
 */
const { getDefaultConfig } = require('@expo/metro-config');

const config = getDefaultConfig(__dirname);

module.exports = config;
