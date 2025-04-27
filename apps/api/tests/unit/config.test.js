const path = require('path');
const config = require('../../src/config');

describe('Application Configuration', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    jest.resetModules();
    process.env = { ...originalEnv };
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  describe('Environment Settings', () => {
    it('should use default environment settings when not specified', () => {
      delete process.env.NODE_ENV;
      delete process.env.PORT;
      delete process.env.API_URL;

      const { env, port, apiUrl } = require('../../src/config');

      expect(env).toBe('development');
      expect(port).toBe(3001);
      expect(apiUrl).toBe('http://localhost:3001');
    });

    it('should use environment variables when provided', () => {
      process.env.NODE_ENV = 'production';
      process.env.PORT = '8000';
      process.env.API_URL = 'https://api.example.com';

      const { env, port, apiUrl } = require('../../src/config');

      expect(env).toBe('production');
      expect(port).toBe(8000);
      expect(apiUrl).toBe('https://api.example.com');
    });

    it('should parse CORS origins correctly', () => {
      process.env.CORS_ORIGINS = 'http://localhost:3000,http://localhost:3002';
      
      const { corsOrigins } = require('../../src/config');

      expect(corsOrigins).toEqual(['http://localhost:3000', 'http://localhost:3002']);
    });
  });

  describe('Database Configuration', () => {
    it('should configure database settings', () => {
      process.env.DATABASE_URL = 'postgresql://user:pass@localhost:5432/db';
      
      const { database } = require('../../src/config');

      expect(database.url).toBe(process.env.DATABASE_URL);
      expect(database.ssl).toBe(process.env.NODE_ENV === 'production');
    });

    it('should configure Redis settings', () => {
      process.env.REDIS_URL = 'redis://localhost:6379';
      
      const { redis } = require('../../src/config');

      expect(redis.url).toBe(process.env.REDIS_URL);
      expect(redis.prefix).toBe('financial_bot:');
    });
  });

  describe('JWT Configuration', () => {
    it('should configure JWT settings', () => {
      process.env.JWT_SECRET = 'test-secret';
      process.env.JWT_EXPIRES_IN = '1h';
      
      const { jwt } = require('../../src/config');

      expect(jwt.secret).toBe('test-secret');
      expect(jwt.expiresIn).toBe('1h');
    });

    it('should use default JWT settings when not specified', () => {
      delete process.env.JWT_SECRET;
      delete process.env.JWT_EXPIRES_IN;
      
      const { jwt } = require('../../src/config');

      expect(jwt.secret).toBe('your-super-secret-jwt-key-change-this-in-production');
      expect(jwt.expiresIn).toBe('24h');
    });
  });

  describe('WhatsApp Configuration', () => {
    it('should configure WhatsApp settings', () => {
      process.env.WHATSAPP_SESSION_DIR = '/custom/sessions';
      
      const { whatsapp } = require('../../src/config');

      expect(whatsapp.sessionDir).toBe('/custom/sessions');
      expect(whatsapp.puppeteerArgs).toEqual(expect.arrayContaining([
        '--no-sandbox',
        '--disable-setuid-sandbox'
      ]));
      expect(whatsapp.reconnectInterval).toBe(10000);
      expect(whatsapp.maxReconnectAttempts).toBe(5);
    });
  });

  describe('Logging Configuration', () => {
    it('should configure logging settings', () => {
      process.env.LOG_LEVEL = 'debug';
      
      const { logging } = require('../../src/config');

      expect(logging.level).toBe('debug');
      expect(logging.directory).toBe(path.join(__dirname, '..', '..', 'logs'));
      expect(logging.maxSize).toBe('10m');
      expect(logging.maxFiles).toBe('7d');
    });
  });

  describe('Security Configuration', () => {
    it('should configure security settings', () => {
      process.env.BCRYPT_ROUNDS = '12';
      process.env.RATE_LIMIT_WINDOW = '900000'; // 15 minutes
      process.env.RATE_LIMIT_MAX = '100';
      
      const { security } = require('../../src/config');

      expect(security.bcryptRounds).toBe(12);
      expect(security.rateLimit.windowMs).toBe(900000);
      expect(security.rateLimit.max).toBe(100);
    });
  });

  describe('Default Admin Configuration', () => {
    it('should configure default admin settings', () => {
      process.env.DEFAULT_ADMIN_USERNAME = 'admin';
      process.env.DEFAULT_ADMIN_PASSWORD = 'adminpass';
      process.env.DEFAULT_ADMIN_EMAIL = 'admin@example.com';
      
      const { defaultAdmin } = require('../../src/config');

      expect(defaultAdmin.username).toBe('admin');
      expect(defaultAdmin.password).toBe('adminpass');
      expect(defaultAdmin.email).toBe('admin@example.com');
    });
  });

  describe('Activation Code Configuration', () => {
    it('should configure activation code settings', () => {
      process.env.ACTIVATION_CODE_LENGTH = '10';
      process.env.DEFAULT_ACTIVATION_DURATION = '30d';
      
      const { activationCode } = require('../../src/config');

      expect(activationCode.length).toBe(10);
      expect(activationCode.defaultDuration).toBe('30d');
      expect(activationCode.allowedDurations).toEqual([
        '1d', '7d', '30d', '90d', '365d'
      ]);
    });
  });

  describe('Transaction Categories', () => {
    it('should define transaction categories', () => {
      const { transactionCategories } = require('../../src/config');

      expect(transactionCategories.expense).toEqual(expect.arrayContaining([
        'Food & Dining',
        'Transportation',
        'Shopping'
      ]));

      expect(transactionCategories.income).toEqual(expect.arrayContaining([
        'Salary',
        'Investment',
        'Business'
      ]));
    });
  });

  describe('Budget Configuration', () => {
    it('should define budget periods', () => {
      const { budgetPeriods } = require('../../src/config');

      expect(budgetPeriods).toEqual([
        'DAILY',
        'WEEKLY',
        'MONTHLY',
        'YEARLY'
      ]);
    });
  });

  describe('Backup Configuration', () => {
    it('should configure backup settings', () => {
      process.env.BACKUP_SCHEDULE = '0 0 * * *';
      process.env.BACKUP_RETENTION_DAYS = '30';
      process.env.BACKUP_MAX_SIZE_MB = '100';
      
      const { backup } = require('../../src/config');

      expect(backup.directory).toBe(path.join(__dirname, '..', '..', 'backups'));
      expect(backup.schedule).toBe('0 0 * * *');
      expect(backup.retention).toBe(30);
      expect(backup.maxSize).toBe(100);
    });
  });

  describe('Error Messages', () => {
    it('should define error messages', () => {
      const { errors } = require('../../src/config');

      expect(errors.auth).toBeDefined();
      expect(errors.whatsapp).toBeDefined();
      expect(errors.backup).toBeDefined();
    });
  });

  describe('Validation Rules', () => {
    it('should define validation rules', () => {
      const { validation } = require('../../src/config');

      expect(validation.password).toMatchObject({
        minLength: expect.any(Number),
        requireUppercase: expect.any(Boolean),
        requireLowercase: expect.any(Boolean),
        requireNumbers: expect.any(Boolean),
        requireSpecialChars: expect.any(Boolean)
      });

      expect(validation.transaction).toMatchObject({
        maxAmount: expect.any(Number),
        minAmount: expect.any(Number)
      });
    });
  });
});
