const path = require('path');
const fs = require('fs');
const winston = require('winston');
const { createLogger } = require('../../src/utils/logger');
const config = require('../../src/config');

describe('Logger Utility', () => {
  const logDir = path.join(__dirname, '..', '..', 'logs');
  const errorLogPath = path.join(logDir, 'error.log');
  const combinedLogPath = path.join(logDir, 'combined.log');

  beforeEach(() => {
    // Clean up log files
    if (fs.existsSync(logDir)) {
      fs.rmSync(logDir, { recursive: true, force: true });
    }
  });

  afterEach(() => {
    // Clean up log files
    if (fs.existsSync(logDir)) {
      fs.rmSync(logDir, { recursive: true, force: true });
    }
  });

  describe('Logger Creation', () => {
    it('should create logger with correct configuration', () => {
      const logger = createLogger('test-service');

      expect(logger).toBeInstanceOf(winston.Logger);
      expect(logger.level).toBe(config.logging.level);
      
      // Verify transports
      const transports = logger.transports;
      expect(transports).toHaveLength(process.env.NODE_ENV === 'production' ? 2 : 3);
      
      // Verify file transports exist
      const fileTransports = transports.filter(t => t instanceof winston.transports.File);
      expect(fileTransports).toHaveLength(2);
    });

    it('should create log directory if it doesn\'t exist', () => {
      createLogger('test-service');
      expect(fs.existsSync(logDir)).toBe(true);
    });

    it('should add console transport in non-production environment', () => {
      const originalEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'development';

      const logger = createLogger('test-service');
      const consoleTransports = logger.transports.filter(
        t => t instanceof winston.transports.Console
      );

      expect(consoleTransports).toHaveLength(1);

      process.env.NODE_ENV = originalEnv;
    });

    it('should not add console transport in production environment', () => {
      const originalEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'production';

      const logger = createLogger('test-service');
      const consoleTransports = logger.transports.filter(
        t => t instanceof winston.transports.Console
      );

      expect(consoleTransports).toHaveLength(0);

      process.env.NODE_ENV = originalEnv;
    });
  });

  describe('Logging Functionality', () => {
    let logger;

    beforeEach(() => {
      logger = createLogger('test-service');
    });

    it('should log error messages to error.log', async () => {
      const errorMessage = 'Test error message';
      logger.error(errorMessage);

      // Wait for file write
      await new Promise(resolve => setTimeout(resolve, 100));

      const logContent = fs.readFileSync(errorLogPath, 'utf8');
      expect(logContent).toContain(errorMessage);
      expect(logContent).toContain('test-service');
      expect(logContent).toContain('error');
    });

    it('should log all messages to combined.log', async () => {
      const infoMessage = 'Test info message';
      const errorMessage = 'Test error message';
      
      logger.info(infoMessage);
      logger.error(errorMessage);

      // Wait for file write
      await new Promise(resolve => setTimeout(resolve, 100));

      const logContent = fs.readFileSync(combinedLogPath, 'utf8');
      expect(logContent).toContain(infoMessage);
      expect(logContent).toContain(errorMessage);
      expect(logContent).toContain('test-service');
    });

    it('should include timestamp in logs', async () => {
      logger.info('Test message');

      // Wait for file write
      await new Promise(resolve => setTimeout(resolve, 100));

      const logContent = fs.readFileSync(combinedLogPath, 'utf8');
      const logEntry = JSON.parse(logContent.split('\n')[0]);
      
      expect(logEntry).toHaveProperty('timestamp');
      expect(new Date(logEntry.timestamp)).toBeInstanceOf(Date);
    });

    it('should include error stack traces', async () => {
      const error = new Error('Test error');
      logger.error('Error occurred', error);

      // Wait for file write
      await new Promise(resolve => setTimeout(resolve, 100));

      const logContent = fs.readFileSync(errorLogPath, 'utf8');
      expect(logContent).toContain('Error occurred');
      expect(logContent).toContain(error.stack);
    });

    it('should handle objects in log messages', async () => {
      const testObject = { key: 'value', nested: { prop: true } };
      logger.info('Test object', testObject);

      // Wait for file write
      await new Promise(resolve => setTimeout(resolve, 100));

      const logContent = fs.readFileSync(combinedLogPath, 'utf8');
      expect(logContent).toContain('key');
      expect(logContent).toContain('value');
      expect(logContent).toContain('nested');
    });

    it('should handle circular references in objects', async () => {
      const circularObj = { key: 'value' };
      circularObj.self = circularObj;

      logger.info('Circular object', circularObj);

      // Wait for file write
      await new Promise(resolve => setTimeout(resolve, 100));

      const logContent = fs.readFileSync(combinedLogPath, 'utf8');
      expect(logContent).toContain('key');
      expect(logContent).toContain('value');
      expect(logContent).toContain('[Circular]');
    });
  });

  describe('Log Rotation', () => {
    it('should respect maxSize configuration', async () => {
      const logger = createLogger('test-service');
      const largeMessage = 'x'.repeat(1024 * 1024); // 1MB message

      // Write enough logs to trigger rotation
      for (let i = 0; i < 6; i++) {
        logger.info(largeMessage);
      }

      // Wait for file writes
      await new Promise(resolve => setTimeout(resolve, 100));

      // Check for rotated log files
      const files = fs.readdirSync(logDir);
      const rotatedFiles = files.filter(f => f.match(/combined\.\d+\.log/));
      expect(rotatedFiles.length).toBeGreaterThan(0);
    });

    it('should clean up old log files', async () => {
      const logger = createLogger('test-service');
      
      // Create some old log files
      const oldDate = new Date();
      oldDate.setDate(oldDate.getDate() - 8); // Older than 7 days

      const oldLogPath = path.join(logDir, 'combined.old.log');
      fs.writeFileSync(oldLogPath, 'old log');
      fs.utimesSync(oldLogPath, oldDate, oldDate);

      // Write new logs to trigger cleanup
      logger.info('New log message');

      // Wait for file operations
      await new Promise(resolve => setTimeout(resolve, 100));

      expect(fs.existsSync(oldLogPath)).toBe(false);
    });
  });

  describe('Error Handling', () => {
    it('should handle write errors gracefully', async () => {
      // Make logs directory read-only
      fs.mkdirSync(logDir, { recursive: true });
      fs.chmodSync(logDir, 0o444);

      const logger = createLogger('test-service');
      
      // This should not throw
      expect(() => {
        logger.error('Test error message');
      }).not.toThrow();

      // Restore permissions
      fs.chmodSync(logDir, 0o777);
    });

    it('should handle transport errors', async () => {
      const logger = createLogger('test-service');
      const errorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

      // Simulate transport error
      logger.transports[0].emit('error', new Error('Transport error'));

      expect(errorSpy).toHaveBeenCalled();
      errorSpy.mockRestore();
    });
  });
});
