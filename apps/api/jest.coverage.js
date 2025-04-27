module.exports = {
  // Extend base Jest config
  ...require('./jest.config'),

  // Coverage configuration
  collectCoverage: true,
  coverageDirectory: 'coverage',
  collectCoverageFrom: [
    'src/**/*.js',
    '!src/**/*.test.js',
    '!src/**/*.spec.js',
    '!src/tests/**/*',
    '!src/docs/**/*'
  ],

  // Coverage thresholds
  coverageThreshold: {
    global: {
      statements: 85,
      branches: 80,
      functions: 85,
      lines: 85
    },
    './src/controllers/': {
      statements: 90,
      branches: 85,
      functions: 90,
      lines: 90
    },
    './src/services/': {
      statements: 90,
      branches: 85,
      functions: 90,
      lines: 90
    },
    './src/middleware/': {
      statements: 95,
      branches: 90,
      functions: 95,
      lines: 95
    },
    './src/utils/': {
      statements: 95,
      branches: 90,
      functions: 95,
      lines: 95
    }
  },

  // Coverage reporters
  coverageReporters: [
    'text',
    'text-summary',
    'html',
    'lcov',
    'clover'
  ],

  // Coverage paths to ignore
  coveragePathIgnorePatterns: [
    '/node_modules/',
    '/dist/',
    '/coverage/',
    '/docs/',
    '/tests/',
    '/__mocks__/',
    '\\.config\\.js$'
  ],

  // Report test coverage even if thresholds are not met
  coverageReporters: [
    ['text', { skipFull: true }],
    'text-summary',
    ['html', { skipFull: true }],
    'lcov',
    'clover'
  ],

  // Additional coverage options
  coverageProvider: 'v8',
  forceCoverageMatch: ['**/*.js'],

  // Report uncovered lines in coverage report
  coverageReporters: [
    ['text', { skipFull: true }],
    'text-summary',
    ['html', { skipFull: true }],
    'lcov',
    ['json', { file: 'coverage.json' }],
    ['json-summary', { file: 'coverage-summary.json' }]
  ],

  // Report files that have no coverage
  coverageReporters: [
    ['text', { skipFull: true }],
    'text-summary',
    ['html', { skipFull: true }],
    'lcov',
    ['json', { file: 'coverage.json' }],
    ['json-summary', { file: 'coverage-summary.json' }],
    ['text', { file: 'coverage.txt' }]
  ],

  // Custom coverage reporter options
  coverageReporterOptions: {
    html: {
      // Subdirectory to write HTML coverage report to
      dir: 'coverage/html',
      // Include source files in report
      subdir: '.'
    },
    lcov: {
      // File to write LCOV coverage report to
      file: 'coverage/lcov.info'
    },
    text: {
      // Skip empty files in text report
      skipEmpty: true,
      // Skip full coverage files in text report
      skipFull: true
    }
  },

  // Report test results with coverage information
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
        usePathForSuiteName: true,
        addFileAttribute: true,
        reportTestSuiteErrors: true
      }
    ],
    [
      './node_modules/jest-html-reporter',
      {
        pageTitle: 'Test Report',
        outputPath: 'reports/test-report.html',
        includeFailureMsg: true,
        includeSuiteFailure: true
      }
    ]
  ]
};
