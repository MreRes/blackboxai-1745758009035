const request = require('supertest');
const { PrismaClient } = require('@prisma/client');
const app = require('../../src/app');
const whatsappService = require('../../src/services/whatsappService');
const dbBackup = require('../../src/utils/dbBackup');
const config = require('../../src/config');

const prisma = new PrismaClient();

describe('Application Setup', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Middleware Configuration', () => {
    it('should use security middleware', async () => {
      const response = await request(app)
        .get('/api/v1/health');

      // Check security headers
      expect(response.headers).toMatchObject({
        'x-frame-options': 'DENY',
        'x-xss-protection': '1; mode=block',
        'x-content-type-options': 'nosniff'
      });
    });

    it('should handle CORS', async () => {
      const response = await request(app)
        .options('/api/v1/health')
        .set('Origin', 'http://localhost:3000');

      expect(response.headers['access-control-allow-origin']).toBe('http://localhost:3000');
      expect(response.headers['access-control-allow-credentials']).toBe('true');
    });

    it('should reject unauthorized CORS origins', async () => {
      const response = await request(app)
        .options('/api/v1/health')
        .set('Origin', 'http://unauthorized-origin.com');

      expect(response.headers['access-control-allow-origin']).toBeUndefined();
    });

    it('should apply rate limiting', async () => {
      const maxRequests = config.security.rateLimit.max;
      const requests = [];

      // Make max + 1 requests
      for (let i = 0; i <= maxRequests; i++) {
        requests.push(request(app).get('/api/v1/health'));
      }

      const responses = await Promise.all(requests);
      const lastResponse = responses[responses.length - 1];

      expect(lastResponse.status).toBe(429);
      expect(lastResponse.body.message).toMatch(/too many requests/i);
    });

    it('should parse JSON bodies', async () => {
      const response = await request(app)
        .post('/api/v1/auth/login')
        .send({
          username: 'test',
          password: 'password'
        });

      // Even though login will fail, request should be parsed
      expect(response.status).not.toBe(400);
    });

    it('should reject large request bodies', async () => {
      const largeBody = { data: 'x'.repeat(11 * 1024) }; // > 10kb

      const response = await request(app)
        .post('/api/v1/auth/login')
        .send(largeBody);

      expect(response.status).toBe(413); // Payload Too Large
    });

    it('should add request ID to each request', async () => {
      const response = await request(app)
        .get('/api/v1/health');

      expect(response.headers['x-request-id']).toBeDefined();
      expect(response.headers['x-request-id']).toMatch(/^[a-f0-9]{32}$/);
    });

    it('should track response time', async () => {
      const response = await request(app)
        .get('/api/v1/health');

      expect(response.headers['x-response-time']).toBeDefined();
      expect(response.headers['x-response-time']).toMatch(/^\d+ms$/);
    });
  });

  describe('Route Configuration', () => {
    it('should handle health check route', async () => {
      const response = await request(app)
        .get('/health');

      expect(response.status).toBe(200);
      expect(response.body).toMatchObject({
        status: 'healthy',
        timestamp: expect.any(String),
        services: {
          database: 'connected',
          whatsapp: expect.any(String)
        }
      });
    });

    it('should handle API version prefix', async () => {
      const response = await request(app)
        .get('/api/v1/health');

      expect(response.status).toBe(200);
    });

    it('should handle undefined routes', async () => {
      const response = await request(app)
        .get('/undefined/route');

      expect(response.status).toBe(404);
      expect(response.body).toMatchObject({
        status: 'error',
        message: expect.stringContaining('Cannot GET /undefined/route')
      });
    });

    it('should serve API documentation in development', async () => {
      const originalEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'development';

      const response = await request(app)
        .get('/api-docs/');

      expect(response.status).toBe(200);
      expect(response.text).toContain('swagger-ui');

      process.env.NODE_ENV = originalEnv;
    });

    it('should not serve API documentation in production', async () => {
      const originalEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'production';

      const response = await request(app)
        .get('/api-docs/');

      expect(response.status).toBe(404);

      process.env.NODE_ENV = originalEnv;
    });
  });

  describe('Service Initialization', () => {
    it('should initialize WhatsApp service', async () => {
      expect(whatsappService.initialize).toHaveBeenCalled();
    });

    it('should initialize backup schedule', async () => {
      expect(dbBackup.scheduleBackup).toHaveBeenCalled();
    });

    it('should handle service initialization errors gracefully', async () => {
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
      whatsappService.initialize.mockRejectedValueOnce(new Error('Service error'));

      // App should still start
      const response = await request(app)
        .get('/health');

      expect(response.status).toBe(200);
      expect(consoleSpy).toHaveBeenCalled();

      consoleSpy.mockRestore();
    });
  });

  describe('Error Handling', () => {
    it('should handle synchronous errors', async () => {
      const response = await request(app)
        .get('/api/v1/error-test')
        .set('x-trigger-error', 'sync');

      expect(response.status).toBe(500);
      expect(response.body).toMatchObject({
        status: 'error',
        message: expect.any(String)
      });
    });

    it('should handle asynchronous errors', async () => {
      const response = await request(app)
        .get('/api/v1/error-test')
        .set('x-trigger-error', 'async');

      expect(response.status).toBe(500);
      expect(response.body).toMatchObject({
        status: 'error',
        message: expect.any(String)
      });
    });

    it('should handle validation errors', async () => {
      const response = await request(app)
        .post('/api/v1/auth/register')
        .send({
          // Missing required fields
        });

      expect(response.status).toBe(400);
      expect(response.body).toMatchObject({
        status: 'error',
        message: expect.stringContaining('validation'),
        errors: expect.any(Array)
      });
    });

    it('should sanitize error output in production', async () => {
      const originalEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'production';

      const response = await request(app)
        .get('/api/v1/error-test')
        .set('x-trigger-error', 'sync');

      expect(response.body.message).toBe('Internal server error');
      expect(response.body.stack).toBeUndefined();

      process.env.NODE_ENV = originalEnv;
    });
  });

  describe('Graceful Shutdown', () => {
    it('should handle SIGTERM signal', async () => {
      const mockExit = jest.spyOn(process, 'exit').mockImplementation(() => {});
      
      process.emit('SIGTERM');

      // Wait for shutdown handlers
      await new Promise(resolve => setTimeout(resolve, 100));

      expect(whatsappService.client.destroy).toHaveBeenCalled();
      expect(mockExit).toHaveBeenCalledWith(0);

      mockExit.mockRestore();
    });

    it('should handle SIGINT signal', async () => {
      const mockExit = jest.spyOn(process, 'exit').mockImplementation(() => {});
      
      process.emit('SIGINT');

      // Wait for shutdown handlers
      await new Promise(resolve => setTimeout(resolve, 100));

      expect(whatsappService.client.destroy).toHaveBeenCalled();
      expect(mockExit).toHaveBeenCalledWith(0);

      mockExit.mockRestore();
    });
  });
});
