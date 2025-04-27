const { PrismaClient } = require('@prisma/client');
const { createLogger } = require('../src/utils/logger');

const logger = createLogger('test-setup');
const prisma = new PrismaClient();

// Setup test environment
process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = 'test-secret';
process.env.DATABASE_URL = process.env.TEST_DATABASE_URL;

// Global test setup
global.beforeAll(async () => {
  try {
    // Connect to test database
    await prisma.$connect();
    logger.info('Connected to test database');

    // Clean up database before tests
    await cleanDatabase();
    logger.info('Database cleaned');

  } catch (error) {
    logger.error('Test setup failed:', error);
    throw error;
  }
});

// Global test teardown
global.afterAll(async () => {
  try {
    // Clean up database after tests
    await cleanDatabase();
    logger.info('Database cleaned');

    // Disconnect from test database
    await prisma.$disconnect();
    logger.info('Disconnected from test database');

  } catch (error) {
    logger.error('Test teardown failed:', error);
    throw error;
  }
});

// Clean database helper
async function cleanDatabase() {
  const models = Reflect.ownKeys(prisma).filter(key => {
    return typeof prisma[key] === 'object' && 
           prisma[key] !== null &&
           'deleteMany' in prisma[key];
  });

  return Promise.all(
    models.map(model => prisma[model].deleteMany())
  );
}

// Global test utilities
global.createTestUser = async (data = {}) => {
  const bcrypt = require('bcryptjs');
  const defaultUser = {
    username: 'testuser',
    password: await bcrypt.hash('password123', 12),
    email: 'test@example.com',
    role: 'USER',
    isActive: true
  };

  return prisma.user.create({
    data: { ...defaultUser, ...data }
  });
};

global.createTestTransaction = async (userId, data = {}) => {
  const defaultTransaction = {
    type: 'EXPENSE',
    amount: 100,
    category: 'Test Category',
    description: 'Test transaction',
    source: 'test'
  };

  return prisma.transaction.create({
    data: {
      ...defaultTransaction,
      ...data,
      userId
    }
  });
};

global.createTestBudget = async (userId, data = {}) => {
  const defaultBudget = {
    category: 'Test Category',
    amount: 1000,
    period: 'MONTHLY',
    startDate: new Date()
  };

  return prisma.budget.create({
    data: {
      ...defaultBudget,
      ...data,
      userId
    }
  });
};

global.generateTestToken = (userId, role = 'USER') => {
  const jwt = require('jsonwebtoken');
  return jwt.sign(
    { id: userId, role },
    process.env.JWT_SECRET,
    { expiresIn: '1h' }
  );
};

// Test helpers
global.testHelpers = {
  prisma,
  logger,
  cleanDatabase,
  
  // Request helper
  createTestRequest: (app) => {
    const request = require('supertest');
    return request(app);
  },

  // Response assertions
  expectSuccess: (response, statusCode = 200) => {
    expect(response.status).toBe(statusCode);
    expect(response.body).toHaveProperty('status', 'success');
  },

  expectError: (response, statusCode = 400) => {
    expect(response.status).toBe(statusCode);
    expect(response.body).toHaveProperty('status', 'error');
  },

  // Date helpers
  getStartOfMonth: () => {
    const date = new Date();
    return new Date(date.getFullYear(), date.getMonth(), 1);
  },

  getEndOfMonth: () => {
    const date = new Date();
    return new Date(date.getFullYear(), date.getMonth() + 1, 0);
  }
};

// Mock WhatsApp service
jest.mock('../src/services/whatsappService', () => ({
  initialize: jest.fn(),
  client: {
    sendMessage: jest.fn(),
    on: jest.fn(),
    destroy: jest.fn()
  }
}));

// Mock Redis
jest.mock('redis', () => ({
  createClient: jest.fn().mockReturnValue({
    connect: jest.fn(),
    disconnect: jest.fn(),
    on: jest.fn(),
    set: jest.fn(),
    get: jest.fn(),
    del: jest.fn()
  })
}));
