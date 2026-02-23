/** Babel config only for Jest (unit tests). Not used by Metro/Expo. */
module.exports = {
  presets: [['@babel/preset-env', { targets: { node: 'current' }, modules: 'commonjs' }]],
};
