/**
 * Metro config for Expo.
 * expo/metro-config — официальный способ в Expo (внутри это @expo/metro-config).
 */
const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

module.exports = config;
