const express = require('express');
const { PrismaClient } = require('@prisma/client');
const config = require('./config');
const Security = require('./utils/security');
const { createLogger } = require('./utils/logger');
const routes = require('./routes');
const dbBackup = require('./utils/dbBackup');
const whatsappService = require('./services/whatsappService');

const logger = createLogger('app');
const prisma = new PrismaClient();

class App {
  constructor() {
    this.app = express();
    this.isDev = config.env === 'development';
    this.setupMiddleware();
    this.setupRoutes();
    this.setupErrorHandling();
    this.initializeServices();
  }

  /**
   * Configure application middleware
   */
  setupMiddleware() {
    // Security middleware
    Security.configureMiddleware(this.app);

    // Request logging
    if (this.isDev) {
      const morgan = require('morgan');
      this.app.use(morgan('dev'));
    }

    // Request ID
    this.app.use((req, res, next) => {
      req.id = require('crypto').randomBytes(16).toString('hex');
      next();
    });

    // Response time header
    this.app.use((req, res, next) => {
      const start = Date.now();
      res.on('finish', () => {
        const duration = Date.now() - start;
        res.setHeader('X-Response-Time', `${duration}ms`);
      });
      next();
    });
  }

  /**
   * Configure application routes
   */
  setupRoutes() {
    // API routes
    this.app.use('/api', routes);

    // Swagger documentation
    if (this.isDev) {
      const swaggerUi = require('swagger-ui-express');
      const { SwaggerDoc } = require('./utils/apiResponse');
      this.app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(SwaggerDoc.generate()));
    }

    // Health check
    this.app.get('/health', async (req, res) => {
      try {
        // Check database connection
        await prisma.$queryRaw`SELECT 1`;

        res.status(200).json({
          status: 'healthy',
          timestamp: new Date().toISOString(),
          services: {
            database: 'connected',
            whatsapp: whatsappService.client ? 'connected' : 'disconnected'
          }
        });
      } catch (error) {
        logger.error('Health check failed:', error);
        res.status(500).json({
          status: 'unhealthy',
          timestamp: new Date().toISOString(),
          error: this.isDev ? error.message : 'Internal server error'
        });
      }
    });

    // 404 handler
    this.app.use((req, res) => {
      res.status(404).json({
        status: 'error',
        message: `Cannot ${req.method} ${req.url}`
      });
    });
  }

  /**
   * Configure error handling
   */
  setupErrorHandling() {
    // Global error handler
    this.app.use((err, req, res, next) => {
      logger.error('Unhandled error:', {
        error: err,
        request: {
          id: req.id,
          method: req.method,
          url: req.url,
          body: Security.sanitizeForLogging(req.body)
        }
      });

      const statusCode = err.statusCode || 500;
      const message = statusCode === 500 && !this.isDev
        ? 'Internal server error'
        : err.message;

      res.status(statusCode).json({
        status: 'error',
        message,
        ...(this.isDev && { stack: err.stack })
      });
    });

    // Handle uncaught exceptions
    process.on('uncaughtException', (error) => {
      logger.error('Uncaught Exception:', error);
      this.gracefulShutdown(1);
    });

    // Handle unhandled promise rejections
    process.on('unhandledRejection', (error) => {
      logger.error('Unhandled Rejection:', error);
      this.gracefulShutdown(1);
    });
  }

  /**
   * Initialize application services
   */
  async initializeServices() {
    try {
      // Initialize WhatsApp service
      await whatsappService.initialize();
      logger.info('WhatsApp service initialized');

      // Initialize backup schedule
      await dbBackup.scheduleBackup();
      logger.info('Backup schedule initialized');

      // Additional service initialization can be added here
    } catch (error) {
      logger.error('Service initialization failed:', error);
    }
  }

  /**
   * Start the application
   */
  async start() {
    try {
      const port = config.port;
      
      this.server = this.app.listen(port, () => {
        logger.info(`Server running on port ${port} in ${config.env} mode`);
      });

      // Graceful shutdown handling
      process.on('SIGTERM', () => this.gracefulShutdown());
      process.on('SIGINT', () => this.gracefulShutdown());
    } catch (error) {
      logger.error('Failed to start server:', error);
      process.exit(1);
    }
  }

  /**
   * Gracefully shutdown the application
   */
  async gracefulShutdown(code = 0) {
    logger.info('Initiating graceful shutdown...');

    try {
      // Close HTTP server
      if (this.server) {
        await new Promise((resolve) => {
          this.server.close(resolve);
        });
      }

      // Disconnect WhatsApp client
      if (whatsappService.client) {
        await whatsappService.client.destroy();
      }

      // Close database connection
      await prisma.$disconnect();

      logger.info('Graceful shutdown completed');
      process.exit(code);
    } catch (error) {
      logger.error('Error during shutdown:', error);
      process.exit(1);
    }
  }
}

module.exports = new App();
