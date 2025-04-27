require('dotenv').config();
const app = require('./app');
const { createLogger } = require('./utils/logger');

const logger = createLogger('server');

async function startServer() {
  try {
    // Start the application
    await app.start();

    // Log startup information
    logger.info('Server initialization complete');
    logger.info(`Environment: ${process.env.NODE_ENV}`);
    logger.info(`Process ID: ${process.pid}`);
    logger.info(`Memory Usage: ${Math.round(process.memoryUsage().heapUsed / 1024 / 1024)}MB`);
    
    // Optional: Log system information
    const os = require('os');
    logger.info(`Platform: ${os.platform()}`);
    logger.info(`Architecture: ${os.arch()}`);
    logger.info(`CPUs: ${os.cpus().length}`);
    logger.info(`Total Memory: ${Math.round(os.totalmem() / 1024 / 1024)}MB`);
    logger.info(`Free Memory: ${Math.round(os.freemem() / 1024 / 1024)}MB`);

  } catch (error) {
    logger.error('Failed to start server:', error);
    process.exit(1);
  }
}

// Start the server
startServer();

// Handle worker threads if needed
if (process.env.ENABLE_WORKERS === 'true') {
  const cluster = require('cluster');
  const numCPUs = require('os').cpus().length;

  if (cluster.isMaster) {
    logger.info(`Master process ${process.pid} is running`);

    // Fork workers
    for (let i = 0; i < numCPUs; i++) {
      cluster.fork();
    }

    cluster.on('exit', (worker, code, signal) => {
      logger.warn(`Worker ${worker.process.pid} died. Signal: ${signal}. Code: ${code}`);
      // Replace the dead worker
      cluster.fork();
    });
  }
}

// Export for testing
module.exports = app;
