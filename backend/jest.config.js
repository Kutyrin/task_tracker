/** @type {import('jest').Config} */
module.exports = {
  moduleFileExtensions: ['js', 'json', 'ts'],
  rootDir: '.',
  testMatch: ['<rootDir>/test/unit/**/*.spec.ts'],
  transform: {
    '^.+\\.(t|j)s$': ['@swc/jest'],
  },
  transformIgnorePatterns: ['node_modules/(?!@nestjs/)'],
  collectCoverageFrom: ['src/**/*.ts'],
  coverageDirectory: './coverage',
  coverageReporters: ['text', 'html', 'json-summary', 'lcov'],
  testEnvironment: 'node',
};
