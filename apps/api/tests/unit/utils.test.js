const { ApiResponse } = require('../../src/utils/apiResponse');
const { validate, schemas } = require('../../src/utils/validation');
const Security = require('../../src/utils/security');
const config = require('../../src/config');

describe('Utility Functions', () => {
  describe('ApiResponse', () => {
    let res;

    beforeEach(() => {
      res = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn()
      };
    });

    it('should format success response', () => {
      const data = { id: 1, name: 'Test' };
      ApiResponse.success(res, 'Success message', data);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({
        status: 'success',
        message: 'Success message',
        data,
        timestamp: expect.any(String)
      });
    });

    it('should format error response', () => {
      const error = new Error('Test error');
      ApiResponse.error(res, 'Error message', 400, error);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        status: 'error',
        message: 'Error message',
        timestamp: expect.any(String),
        errors: expect.any(Error)
      });
    });

    it('should format paginated response', () => {
      const data = [{ id: 1 }, { id: 2 }];
      const pagination = {
        total: 10,
        page: 1,
        limit: 2
      };

      ApiResponse.paginated(res, 'Paginated data', data, pagination);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({
        status: 'success',
        message: 'Paginated data',
        data,
        pagination: {
          total: 10,
          pages: 5,
          page: 1,
          limit: 2
        },
        timestamp: expect.any(String)
      });
    });
  });

  describe('Validation', () => {
    const mockNext = jest.fn();

    beforeEach(() => {
      mockNext.mockClear();
    });

    describe('Auth Schemas', () => {
      it('should validate registration data', () => {
        const req = {
          body: {
            username: 'testuser',
            password: 'Password123!',
            email: 'test@example.com',
            activationCode: '12345678'
          }
        };
        const res = {
          status: jest.fn().mockReturnThis(),
          json: jest.fn()
        };

        validate(schemas.auth.register)(req, res, mockNext);
        expect(mockNext).toHaveBeenCalled();
      });

      it('should reject invalid registration data', () => {
        const req = {
          body: {
            username: 'te', // too short
            password: 'weak',
            email: 'invalid-email'
          }
        };
        const res = {
          status: jest.fn().mockReturnThis(),
          json: jest.fn()
        };

        validate(schemas.auth.register)(req, res, mockNext);
        expect(res.status).toHaveBeenCalledWith(400);
      });
    });

    describe('Transaction Schemas', () => {
      it('should validate transaction data', () => {
        const req = {
          body: {
            type: 'EXPENSE',
            amount: 100.50,
            category: 'Food',
            description: 'Lunch'
          }
        };
        const res = {
          status: jest.fn().mockReturnThis(),
          json: jest.fn()
        };

        validate(schemas.transaction.create)(req, res, mockNext);
        expect(mockNext).toHaveBeenCalled();
      });

      it('should reject invalid transaction data', () => {
        const req = {
          body: {
            type: 'INVALID',
            amount: -100
          }
        };
        const res = {
          status: jest.fn().mockReturnThis(),
          json: jest.fn()
        };

        validate(schemas.transaction.create)(req, res, mockNext);
        expect(res.status).toHaveBeenCalledWith(400);
      });
    });
  });

  describe('Security', () => {
    describe('Password Management', () => {
      it('should hash password', async () => {
        const password = 'testpassword';
        const hash = await Security.hashPassword(password);
        
        expect(hash).not.toBe(password);
        expect(hash).toMatch(/^\$2[aby]\$\d{1,2}\$/);
      });

      it('should verify password hash', async () => {
        const password = 'testpassword';
        const hash = await Security.hashPassword(password);
        
        const isValid = await Security.comparePassword(password, hash);
        expect(isValid).toBe(true);
      });

      it('should reject incorrect password', async () => {
        const password = 'testpassword';
        const hash = await Security.hashPassword(password);
        
        const isValid = await Security.comparePassword('wrongpassword', hash);
        expect(isValid).toBe(false);
      });

      it('should validate password strength', () => {
        const strongPassword = 'StrongP@ss123';
        const weakPassword = 'weak';

        const strongResult = Security.validatePasswordStrength(strongPassword);
        expect(strongResult.passed).toBe(true);
        expect(strongResult.strength).toBeGreaterThanOrEqual(80);

        const weakResult = Security.validatePasswordStrength(weakPassword);
        expect(weakResult.passed).toBe(false);
        expect(weakResult.strength).toBeLessThan(50);
      });
    });

    describe('Token Generation', () => {
      it('should generate secure random token', () => {
        const token1 = Security.generateToken();
        const token2 = Security.generateToken();

        expect(token1).toHaveLength(64); // 32 bytes = 64 hex chars
        expect(token2).toHaveLength(64);
        expect(token1).not.toBe(token2);
      });

      it('should generate activation code', () => {
        const code = Security.generateActivationCode();
        
        expect(code).toHaveLength(config.activationCode.length);
        expect(code).toMatch(/^[A-Z0-9]+$/);
      });
    });

    describe('Data Sanitization', () => {
      it('should sanitize sensitive data', () => {
        const data = {
          username: 'test',
          password: 'secret123',
          token: 'abc123',
          apiKey: 'xyz789',
          email: 'test@example.com'
        };

        const sanitized = Security.sanitizeForLogging(data);
        
        expect(sanitized.username).toBe(data.username);
        expect(sanitized.email).toBe(data.email);
        expect(sanitized.password).toBe('[REDACTED]');
        expect(sanitized.token).toBe('[REDACTED]');
        expect(sanitized.apiKey).toBe('[REDACTED]');
      });
    });

    describe('IP Validation', () => {
      it('should validate IPv4 addresses', () => {
        expect(Security.isValidIP('192.168.1.1')).toBe(true);
        expect(Security.isValidIP('256.256.256.256')).toBe(false);
        expect(Security.isValidIP('invalid')).toBe(false);
      });

      it('should validate IPv6 addresses', () => {
        expect(Security.isValidIP('2001:0db8:85a3:0000:0000:8a2e:0370:7334')).toBe(true);
        expect(Security.isValidIP('invalid-ipv6')).toBe(false);
      });

      it('should handle IP whitelist checking', () => {
        const allowedIPs = ['192.168.1.1', '10.0.0.1'];
        const req = { ip: '192.168.1.1' };

        expect(() => Security.checkAllowedIP(req, allowedIPs)).not.toThrow();
        
        req.ip = '192.168.1.2';
        expect(() => Security.checkAllowedIP(req, allowedIPs)).toThrow();
      });
    });
  });
});
