/** @type {import('jest').Config} */
const config = {
  transform: {},
  coveragePathIgnorePatterns: ['/node_modules/', '/src/__mocks__/'],
  coverageReporters: ['text-summary', 'lcov'],
  coverageProvider: 'v8',
  roots: ['./lib'],
  setupFilesAfterEnv: ['<rootDir>/jest.setup.js'],
  moduleNameMapper: {
    '^(chalk|inquirer)$': '<rootDir>/../../shared/lib/esm/module-proxy.js',
  },
};

export default config;
