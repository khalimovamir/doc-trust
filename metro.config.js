/**
 * Metro config for Expo.
 * Extends @expo/metro-config so assets and native deps are resolved correctly in EAS Build.
 * Чтобы изменения сразу были в симуляторе: 1) npm run start:clear  2) npm run ios:simulator  3) В приложении нажать localhost:8081  4) В симуляторе Cmd+D → Enable Fast Refresh.
 */
const { getDefaultConfig } = require('@expo/metro-config');

const config = getDefaultConfig(__dirname);

module.exports = config;
