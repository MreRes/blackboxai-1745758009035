const jwt = require('jsonwebtoken');
const { PrismaClient } = require('@prisma/client');
const { verifyToken, restrictTo, isAdmin, checkActivationCode } = require('../../src/middleware/auth');
const { errorHandler, AppError } = require('../../src/middleware/errorHandler');
const config = require('../../src/config');
const TestUtils = require('../testUtils');

const prisma = new PrismaClient();

describe('Middleware', () => {
  describe('Authentication Middleware', () => {
    let user;
    let token;
    let req;
    let res;
    let next;

    beforeEach(async () => {
      await TestUtils.cleanup();
      user = await TestUtils.createTestUser();
      token = TestUtils.generateToken(user.id);

      req = {
        headers: {
          authorization: `Bearer ${token}`
        }
      };
      res = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn()
      };
      next = jest.fn();
    });

    describe('verifyToken', () => {
      it('should verify valid token', async () => {
        await verifyToken(req, res, next);

        expect(next).toHaveBeenCalled();
        expect(req.user).toBeDefined();
        expect(req.user.id).toBe(user.id);
      });

      it('should reject missing token', async () => {
        req.headers.authorization = undefined;
        await verifyToken(req, res, next);

        expect(next).toHaveBeenCalledWith(expect.any(AppError));
        expect(next.mock.calls[0][0].statusCode).toBe(401);
      });

      it('should reject invalid token', async () => {
        req.headers.authorization = 'Bearer invalid-token';
        await verifyToken(req, res, next);

        expect(next).toHaveBeenCalledWith(expect.any(AppError));
        expect(next.mock.calls[0][0].statusCode).toBe(401);
      });

      it('should reject expired token', async () => {
        const expiredToken = jwt.sign(
          { id: user.id },
          config.jwt.secret,
          { expiresIn: '0s' }
        );
        req.headers.authorization = `Bearer ${expiredToken}`;
        
        await verifyToken(req, res, next);

        expect(next).toHaveBeenCalledWith(expect.any(AppError));
        expect(next.mock.calls[0][0].statusCode).toBe(401);
      });

      it('should reject token for inactive user', async () => {
        await prisma.user.update({
          where: { id: user.id },
          data: { isActive: false }
        });

        await verifyToken(req, res, next);

        expect(next).toHaveBeenCalledWith(expect.any(AppError));
        expect(next.mock.calls[0][0].statusCode).toBe(401);
      });
    });

    describe('restrictTo', () => {
      it('should allow access for correct role', async () => {
        req.user = { role: 'ADMIN' };
        const middleware = restrictTo('ADMIN');
        
        middleware(req, res, next);
        expect(next).toHaveBeenCalledWith();
      });

      it('should deny access for incorrect role', async () => {
        req.user = { role: 'USER' };
        const middleware = restrictTo('ADMIN');
        
        middleware(req, res, next);
        expect(next).toHaveBeenCalledWith(expect.any(AppError));
        expect(next.mock.calls[0][0].statusCode).toBe(403);
      });

      it('should handle multiple allowed roles', async () => {
        req.user = { role: 'USER' };
        const middleware = restrictTo('ADMIN', 'USER');
        
        middleware(req, res, next);
        expect(next).toHaveBeenCalledWith();
      });
    });

    describe('isAdmin', () => {
      it('should allow admin access', async () => {
        req.user = { role: 'ADMIN' };
        
        isAdmin(req, res, next);
        expect(next).toHaveBeenCalledWith();
      });

      it('should deny non-admin access', async () => {
        req.user = { role: 'USER' };
        
        isAdmin(req, res, next);
        expect(next).toHaveBeenCalledWith(expect.any(AppError));
        expect(next.mock.calls[0][0].statusCode).toBe(403);
      });
    });

    describe('checkActivationCode', () => {
      let activationCode;

      beforeEach(async () => {
        activationCode = await TestUtils.createTestActivationCode(user.id);
      });

      it('should validate correct activation code', async () => {
        req.body = { activationCode: activationCode.code };
        
        await checkActivationCode(req, res, next);
        expect(next).toHaveBeenCalledWith();
        expect(req.activation).toBeDefined();
        expect(req.activation.code).toBe(activationCode.code);
      });

      it('should reject invalid activation code', async () => {
        req.body = { activationCode: 'invalid-code' };
        
        await checkActivationCode(req, res, next);
        expect(next).toHaveBeenCalledWith(expect.any(AppError));
        expect(next.mock.calls[0][0].statusCode).toBe(400);
      });

      it('should reject expired activation code', async () => {
        await prisma.activationCode.update({
          where: { id: activationCode.id },
          data: { expiresAt: new Date(Date.now() - 24 * 60 * 60 * 1000) }
        });

        req.body = { activationCode: activationCode.code };
        
        await checkActivationCode(req, res, next);
        expect(next).toHaveBeenCalledWith(expect.any(AppError));
        expect(next.mock.calls[0][0].statusCode).toBe(400);
      });

      it('should reject inactive activation code', async () => {
        await prisma.activationCode.update({
          where: { id: activationCode.id },
          data: { isActive: false }
        });

        req.body = { activationCode: activationCode.code };
        
        await checkActivationCode(req, res, next);
        expect(next).toHaveBeenCalledWith(expect.any(AppError));
        expect(next.mock.calls[0][0].statusCode).toBe(400);
      });
    });
  });

  describe('Error Handler', () => {
    let res;

    beforeEach(() => {
      res = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn()
      };
    });

    it('should handle AppError', () => {
      const error = new AppError(400, 'Test error');
      errorHandler(error, {}, res, () => {});

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        status: 'error',
        message: 'Test error'
      });
    });

    it('should handle validation errors', () => {
      const error = new Error('Validation failed');
      error.name = 'ValidationError';
      error.errors = [{ field: 'test', message: 'Invalid value' }];

      errorHandler(error, {}, res, () => {});

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        status: 'error',
        message: 'Validation failed',
        errors: error.errors
      });
    });

    it('should handle JWT errors', () => {
      const error = new jwt.JsonWebTokenError('Invalid token');
      errorHandler(error, {}, res, () => {});

      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({
        status: 'error',
        message: 'Invalid token'
      });
    });

    it('should handle Prisma errors', () => {
      const error = new Error('Prisma error');
      error.code = 'P2002'; // Unique constraint violation

      errorHandler(error, {}, res, () => {});

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json.mock.calls[0][0]).toMatchObject({
        status: 'error',
        message: expect.stringContaining('already exists')
      });
    });

    it('should handle unknown errors in production', () => {
      const originalEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'production';

      const error = new Error('Unknown error');
      errorHandler(error, {}, res, () => {});

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({
        status: 'error',
        message: 'Something went wrong'
      });

      process.env.NODE_ENV = originalEnv;
    });

    it('should include error details in development', () => {
      const originalEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'development';

      const error = new Error('Test error');
      errorHandler(error, {}, res, () => {});

      expect(res.json.mock.calls[0][0]).toMatchObject({
        status: 'error',
        message: 'Test error',
        stack: expect.any(String)
      });

      process.env.NODE_ENV = originalEnv;
    });
  });
});
