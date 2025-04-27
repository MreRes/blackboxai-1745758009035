const config = require('../config');

/**
 * Standard API Response Format
 */
class ApiResponse {
  /**
   * Success response
   * @param {Object} res - Express response object
   * @param {string} message - Success message
   * @param {Object} data - Response data
   * @param {number} statusCode - HTTP status code (default: 200)
   */
  static success(res, message, data = null, statusCode = 200) {
    return res.status(statusCode).json({
      status: 'success',
      message,
      data,
      timestamp: new Date().toISOString()
    });
  }

  /**
   * Error response
   * @param {Object} res - Express response object
   * @param {string} message - Error message
   * @param {number} statusCode - HTTP status code (default: 500)
   * @param {Object} errors - Detailed error information
   */
  static error(res, message, statusCode = 500, errors = null) {
    const response = {
      status: 'error',
      message,
      timestamp: new Date().toISOString()
    };

    if (errors && config.env === 'development') {
      response.errors = errors;
    }

    return res.status(statusCode).json(response);
  }

  /**
   * Paginated response
   * @param {Object} res - Express response object
   * @param {string} message - Success message
   * @param {Array} data - Array of items
   * @param {Object} pagination - Pagination information
   * @param {number} statusCode - HTTP status code (default: 200)
   */
  static paginated(res, message, data, pagination, statusCode = 200) {
    return res.status(statusCode).json({
      status: 'success',
      message,
      data,
      pagination: {
        total: pagination.total,
        pages: Math.ceil(pagination.total / pagination.limit),
        page: pagination.page,
        limit: pagination.limit
      },
      timestamp: new Date().toISOString()
    });
  }
}

/**
 * API Documentation Generator
 */
class ApiDoc {
  static endpoints = {};

  /**
   * Register an API endpoint
   * @param {string} method - HTTP method
   * @param {string} path - API path
   * @param {Object} config - Endpoint configuration
   */
  static register(method, path, config) {
    if (!this.endpoints[path]) {
      this.endpoints[path] = {};
    }
    this.endpoints[path][method] = {
      description: config.description,
      auth: config.auth || false,
      roles: config.roles || [],
      params: config.params || [],
      body: config.body || {},
      responses: config.responses || {},
      example: config.example || null
    };
  }

  /**
   * Generate API documentation
   * @returns {Object} API documentation
   */
  static generate() {
    return {
      info: {
        title: 'Financial WhatsApp Bot API',
        version: process.env.npm_package_version || '1.0.0',
        description: 'API documentation for Financial WhatsApp Bot'
      },
      basePath: '/api/v1',
      endpoints: this.endpoints
    };
  }
}

// Register API endpoints
ApiDoc.register('POST', '/auth/register', {
  description: 'Register a new user',
  body: {
    username: 'string',
    password: 'string',
    email: 'string (optional)',
    phoneNumber: 'string (optional)',
    activationCode: 'string'
  },
  responses: {
    200: { description: 'User registered successfully' },
    400: { description: 'Invalid input' },
    409: { description: 'Username already exists' }
  },
  example: {
    request: {
      username: 'john_doe',
      password: 'StrongPass123!',
      email: 'john@example.com',
      phoneNumber: '+1234567890',
      activationCode: 'ABC123'
    },
    response: {
      status: 'success',
      message: 'User registered successfully',
      data: {
        user: {
          id: 'uuid',
          username: 'john_doe',
          email: 'john@example.com'
        },
        token: 'jwt_token'
      }
    }
  }
});

// Add more endpoint documentation as needed...

/**
 * Swagger Documentation Generator
 */
class SwaggerDoc {
  /**
   * Generate Swagger/OpenAPI documentation
   * @returns {Object} Swagger documentation
   */
  static generate() {
    const apiDoc = ApiDoc.generate();
    
    return {
      openapi: '3.0.0',
      info: {
        title: apiDoc.info.title,
        version: apiDoc.info.version,
        description: apiDoc.info.description
      },
      servers: [
        {
          url: config.apiUrl,
          description: `${config.env} server`
        }
      ],
      components: {
        securitySchemes: {
          bearerAuth: {
            type: 'http',
            scheme: 'bearer',
            bearerFormat: 'JWT'
          }
        }
      },
      paths: this.convertEndpointsToSwagger(apiDoc.endpoints)
    };
  }

  /**
   * Convert API endpoints to Swagger format
   * @param {Object} endpoints - API endpoints
   * @returns {Object} Swagger paths
   */
  static convertEndpointsToSwagger(endpoints) {
    const paths = {};

    for (const [path, methods] of Object.entries(endpoints)) {
      paths[path] = {};
      
      for (const [method, config] of Object.entries(methods)) {
        paths[path][method.toLowerCase()] = {
          summary: config.description,
          security: config.auth ? [{ bearerAuth: [] }] : [],
          parameters: config.params.map(param => ({
            name: param.name,
            in: param.in || 'query',
            required: param.required || false,
            schema: {
              type: param.type || 'string'
            },
            description: param.description
          })),
          requestBody: Object.keys(config.body).length > 0 ? {
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: config.body
                }
              }
            }
          } : undefined,
          responses: Object.entries(config.responses).reduce((acc, [code, response]) => {
            acc[code] = {
              description: response.description,
              content: {
                'application/json': {
                  schema: response.schema || {
                    type: 'object',
                    properties: {
                      status: { type: 'string' },
                      message: { type: 'string' },
                      data: { type: 'object' }
                    }
                  }
                }
              }
            };
            return acc;
          }, {})
        };
      }
    }

    return paths;
  }
}

module.exports = {
  ApiResponse,
  ApiDoc,
  SwaggerDoc
};
