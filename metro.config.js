/**
 * Metro config for Expo.
 * Extends @expo/metro-config so assets and native deps are resolved correctly in EAS Build.
 */
const { getDefaultConfig } = require('@expo/metro-config');

const config = getDefaultConfig(__dirname);

module.exports = config;
