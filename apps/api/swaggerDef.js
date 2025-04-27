module.exports = {
  openapi: '3.0.0',
  info: {
    title: 'WhatsApp Financial Bot API',
    version: '1.0.0',
    description: 'API documentation for WhatsApp Financial Management Bot',
    license: {
      name: 'MIT',
      url: 'https://opensource.org/licenses/MIT'
    },
    contact: {
      name: 'API Support',
      email: 'support@example.com'
    }
  },
  servers: [
    {
      url: process.env.API_URL || 'http://localhost:3001',
      description: process.env.NODE_ENV === 'production' ? 'Production server' : 'Development server'
    }
  ],
  tags: [
    {
      name: 'Auth',
      description: 'Authentication and authorization endpoints'
    },
    {
      name: 'Transactions',
      description: 'Financial transaction management'
    },
    {
      name: 'Budgets',
      description: 'Budget planning and tracking'
    },
    {
      name: 'WhatsApp',
      description: 'WhatsApp bot integration and management'
    },
    {
      name: 'Backup',
      description: 'Database backup and restore operations'
    },
    {
      name: 'System',
      description: 'System health and monitoring'
    }
  ],
  components: {
    securitySchemes: {
      bearerAuth: {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT'
      }
    },
    schemas: {
      Error: {
        type: 'object',
        properties: {
          status: {
            type: 'string',
            example: 'error'
          },
          message: {
            type: 'string'
          },
          errors: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                field: {
                  type: 'string'
                },
                message: {
                  type: 'string'
                }
              }
            }
          }
        }
      },
      User: {
        type: 'object',
        properties: {
          id: {
            type: 'string',
            format: 'uuid'
          },
          username: {
            type: 'string'
          },
          email: {
            type: 'string',
            format: 'email'
          },
          phoneNumber: {
            type: 'string'
          },
          role: {
            type: 'string',
            enum: ['USER', 'ADMIN']
          },
          isActive: {
            type: 'boolean'
          }
        }
      },
      Transaction: {
        type: 'object',
        properties: {
          id: {
            type: 'string',
            format: 'uuid'
          },
          type: {
            type: 'string',
            enum: ['INCOME', 'EXPENSE']
          },
          amount: {
            type: 'number',
            format: 'float'
          },
          category: {
            type: 'string'
          },
          description: {
            type: 'string'
          },
          date: {
            type: 'string',
            format: 'date-time'
          },
          source: {
            type: 'string',
            enum: ['manual', 'whatsapp', 'web']
          }
        }
      },
      Budget: {
        type: 'object',
        properties: {
          id: {
            type: 'string',
            format: 'uuid'
          },
          category: {
            type: 'string'
          },
          amount: {
            type: 'number',
            format: 'float'
          },
          period: {
            type: 'string',
            enum: ['DAILY', 'WEEKLY', 'MONTHLY', 'YEARLY']
          },
          startDate: {
            type: 'string',
            format: 'date-time'
          },
          endDate: {
            type: 'string',
            format: 'date-time'
          }
        }
      }
    },
    parameters: {
      pageParam: {
        in: 'query',
        name: 'page',
        schema: {
          type: 'integer',
          default: 1,
          minimum: 1
        },
        description: 'Page number for pagination'
      },
      limitParam: {
        in: 'query',
        name: 'limit',
        schema: {
          type: 'integer',
          default: 10,
          minimum: 1,
          maximum: 100
        },
        description: 'Number of items per page'
      },
      startDateParam: {
        in: 'query',
        name: 'startDate',
        schema: {
          type: 'string',
          format: 'date-time'
        },
        description: 'Start date for filtering (ISO 8601)'
      },
      endDateParam: {
        in: 'query',
        name: 'endDate',
        schema: {
          type: 'string',
          format: 'date-time'
        },
        description: 'End date for filtering (ISO 8601)'
      }
    },
    responses: {
      UnauthorizedError: {
        description: 'Authentication information is missing or invalid',
        content: {
          'application/json': {
            schema: {
              $ref: '#/components/schemas/Error'
            }
          }
        }
      },
      ValidationError: {
        description: 'Invalid input parameters',
        content: {
          'application/json': {
            schema: {
              $ref: '#/components/schemas/Error'
            }
          }
        }
      },
      NotFoundError: {
        description: 'The specified resource was not found',
        content: {
          'application/json': {
            schema: {
              $ref: '#/components/schemas/Error'
            }
          }
        }
      }
    }
  }
};
