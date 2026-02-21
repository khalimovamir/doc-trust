/**
 * Metro config for Expo. Fast Refresh is enabled by default.
 * After changing theme/colors: press "r" in terminal or Cmd+R in simulator to reload.
 */
const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

module.exports = config;
