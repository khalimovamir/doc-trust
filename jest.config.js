/** Jest config for Doc Trust (unit tests only) */
module.exports = {
  testEnvironment: 'node',
  testMatch: ['**/__tests__/**/*.test.js'],
  modulePathIgnorePatterns: ['<rootDir>/node_modules/'],
  transformIgnorePatterns: [
    'node_modules/(?!(@react-native|react-native|expo|@expo)/)',
  ],
  transform: { '^.+\\.js$': ['babel-jest', { configFile: './babel.config.jest.js' }] },
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1',
  },
};
