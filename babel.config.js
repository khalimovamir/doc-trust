/**
 * Babel config for Metro/Expo (app bundle).
 * babel-preset-expo includes Fast Refresh — сохраняй файлы, симулятор обновится сам.
 */
module.exports = function (api) {
  api.cache(true);
  return {
    presets: ['babel-preset-expo'],
  };
};
