module.exports = {
  // Test environment
  testEnvironment: 'node',

  // Test files pattern
  testMatch: [
    '**/tests/**/*.test.js',
    '**/tests/**/*.spec.js'
  ],

  // Coverage configuration
  collectCoverage: true,
  coverageDirectory: 'coverage',
  collectCoverageFrom: [
    'src/**/*.js',
    '!src/**/*.test.js',
    '!src/**/*.spec.js',
    '!src/tests/**/*'
  ],
  coverageThreshold: {
    global: {
      branches: 80,
      functions: 80,
      lines: 80,
      statements: 80
    }
  },

  // Setup files
  setupFiles: ['<rootDir>/tests/setup.js'],

  // Module file extensions
  moduleFileExtensions: ['js', 'json'],

  // Module name mapper for aliases
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1'
  },

  // Transform configuration
  transform: {
    '^.+\\.js$': 'babel-jest'
  },

  // Ignore patterns
  testPathIgnorePatterns: [
    '/node_modules/',
    '/dist/',
    '/coverage/'
  ],

  // Test timeout
  testTimeout: 10000,

  // Verbose output
  verbose: true,

  // Global setup
  globalSetup: '<rootDir>/tests/globalSetup.js',
  globalTeardown: '<rootDir>/tests/globalTeardown.js',

  // Reporter configuration
  reporters: [
    'default',
    [
      'jest-junit',
      {
        outputDirectory: 'reports/junit',
        outputName: 'junit.xml',
        classNameTemplate: '{classname}',
        titleTemplate: '{title}',
        ancestorSeparator: ' › ',
        usePathForSuiteName: true
      }
    ]
  ],

  // Test environment variables
  testEnvironmentVariables: {
    NODE_ENV: 'test'
  },

  // Custom resolver
  resolver: '<rootDir>/tests/resolver.js',

  // Watch plugins
  watchPlugins: [
    'jest-watch-typeahead/filename',
    'jest-watch-typeahead/testname'
  ]
};
