/**
 * Jest Configuration
 * Configured for Chrome Extension testing with proper coverage thresholds
 */

module.exports = {
  displayName: 'spAI-Defender Tests',
  testEnvironment: 'jsdom',
  rootDir: './',
  testMatch: ['**/tests/**/*.test.js'],
  collectCoverageFrom: [
    'chrome-extension/src/**/*.js',
    '!chrome-extension/src/**/*.test.js',
    '!chrome-extension/src/**/index.js'
  ],
  coverageDirectory: 'coverage',
  coverageReporters: ['text', 'html', 'lcov', 'json-summary'],

  // Coverage thresholds by module
  coverageThreshold: {
    global: {
      branches: 90,
      functions: 90,
      lines: 90,
      statements: 90
    },
    'chrome-extension/src/utils/': {
      branches: 95,
      functions: 95,
      lines: 95,
      statements: 95
    },
    'chrome-extension/src/content/': {
      branches: 85,
      functions: 85,
      lines: 85,
      statements: 85
    },
    'chrome-extension/src/background/': {
      branches: 90,
      functions: 90,
      lines: 90,
      statements: 90
    },
    'chrome-extension/src/popup/': {
      branches: 80,
      functions: 80,
      lines: 80,
      statements: 80
    }
  },

  // Module name mapper for resolving imports
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/chrome-extension/src/$1',
    '^@utils/(.*)$': '<rootDir>/chrome-extension/src/utils/$1',
    '^@content/(.*)$': '<rootDir>/chrome-extension/src/content/$1',
    '^@background/(.*)$': '<rootDir>/chrome-extension/src/background/$1'
  },

  // Setup files to run before tests
  setupFilesAfterEnv: ['<rootDir>/tests/setup/jest.setup.js'],

  // Module file extensions
  moduleFileExtensions: ['js', 'json'],

  // Verbose output
  verbose: true,

  // Test timeout
  testTimeout: 10000,

  // Collect coverage from all files
  collectCoverage: true,

  // Transform files with Babel
  transform: {
    '^.+\\.jsx?$': 'babel-jest'
  },
  transformIgnorePatterns: ['node_modules/(?!(jest-chrome)/)']
};
