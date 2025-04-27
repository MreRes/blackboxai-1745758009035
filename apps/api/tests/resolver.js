const path = require('path');

/**
 * Custom Jest resolver to handle module imports
 * This resolver helps with module resolution, particularly for aliases and custom imports
 */
module.exports = (request, options) => {
  // Handle root imports (@/)
  if (request.startsWith('@/')) {
    return path.resolve(options.rootDir, 'src', request.substring(2));
  }

  // Handle test utilities
  if (request.startsWith('test-utils/')) {
    return path.resolve(options.rootDir, 'tests', request.substring(11));
  }

  // Handle prisma imports
  if (request === '@prisma/client') {
    return require.resolve('@prisma/client');
  }

  // Use the default resolver for everything else
  return options.defaultResolver(request, options);
};

/**
 * Module mapping configuration
 * This helps Jest understand how to map module names to file paths
 */
module.exports.moduleNameMapper = {
  '^@/(.*)$': '<rootDir>/src/$1',
  '^test-utils/(.*)$': '<rootDir>/tests/$1'
};

/**
 * Module file extensions
 * Specify which file extensions Jest should look for
 */
module.exports.moduleFileExtensions = ['js', 'json', 'node'];

/**
 * Module paths
 * Additional locations to search for modules
 */
module.exports.modulePaths = [
  '<rootDir>/src',
  '<rootDir>/node_modules'
];

/**
 * Transform ignore patterns
 * Specify which files should not be transformed
 */
module.exports.transformIgnorePatterns = [
  '/node_modules/',
  '\\.pnp\\.[^\\/]+$'
];

/**
 * Custom resolver options
 * Additional configuration for the resolver
 */
module.exports.resolverOptions = {
  // Add any custom resolver options here
  preferRelative: true,
  extensions: ['.js', '.json']
};

/**
 * Handle specific module mocks
 * Define how certain modules should be mocked
 */
module.exports.mockResolvers = {
  // Example: Mock specific modules
  'whatsapp-web.js': path.resolve(__dirname, '__mocks__/whatsapp-web.js'),
  'redis': path.resolve(__dirname, '__mocks__/redis.js')
};

/**
 * Resolve async imports
 * Handle dynamic imports and async modules
 */
module.exports.resolveAsync = async (request, options) => {
  try {
    return await module.exports(request, options);
  } catch (error) {
    throw new Error(`Failed to resolve module: ${request}\n${error.message}`);
  }
};
