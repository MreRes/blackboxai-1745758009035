const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const request = require('supertest');
const config = require('../src/config');
const app = require('../src/app');

const prisma = new PrismaClient();

/**
 * Test Utilities
 */
class TestUtils {
  /**
   * Create a test user
   * @param {Object} data - User data override
   * @returns {Promise<Object>} Created user
   */
  static async createTestUser(data = {}) {
    const defaultUser = {
      username: `testuser_${Date.now()}`,
      password: await bcrypt.hash('password123', 12),
      email: `test${Date.now()}@example.com`,
      role: 'USER',
      isActive: true
    };

    return prisma.user.create({
      data: { ...defaultUser, ...data }
    });
  }

  /**
   * Create a test admin user
   * @returns {Promise<Object>} Created admin user
   */
  static async createTestAdmin() {
    return this.createTestUser({
      username: `testadmin_${Date.now()}`,
      role: 'ADMIN'
    });
  }

  /**
   * Generate JWT token for a user
   * @param {string} userId - User ID
   * @param {string} role - User role
   * @returns {string} JWT token
   */
  static generateToken(userId, role = 'USER') {
    return jwt.sign(
      { id: userId, role },
      config.jwt.secret,
      { expiresIn: config.jwt.expiresIn }
    );
  }

  /**
   * Create test transaction
   * @param {string} userId - User ID
   * @param {Object} data - Transaction data override
   * @returns {Promise<Object>} Created transaction
   */
  static async createTestTransaction(userId, data = {}) {
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
  }

  /**
   * Create test budget
   * @param {string} userId - User ID
   * @param {Object} data - Budget data override
   * @returns {Promise<Object>} Created budget
   */
  static async createTestBudget(userId, data = {}) {
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
  }

  /**
   * Create test activation code
   * @param {string} userId - User ID
   * @param {Object} data - Activation code data override
   * @returns {Promise<Object>} Created activation code
   */
  static async createTestActivationCode(userId, data = {}) {
    const defaultCode = {
      code: `TEST${Date.now()}`,
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      isActive: true
    };

    return prisma.activationCode.create({
      data: {
        ...defaultCode,
        ...data,
        userId
      }
    });
  }

  /**
   * Make authenticated request
   * @param {string} method - HTTP method
   * @param {string} url - Request URL
   * @param {Object} data - Request data
   * @param {string} token - JWT token
   * @returns {Promise<Object>} Supertest response
   */
  static async authenticatedRequest(method, url, data = null, token) {
    const req = request(app)[method.toLowerCase()](url)
      .set('Authorization', `Bearer ${token}`);

    if (data) {
      req.send(data);
    }

    return req;
  }

  /**
   * Clean up test data
   * @returns {Promise<void>}
   */
  static async cleanup() {
    const tables = [
      'Transaction',
      'Budget',
      'ActivationCode',
      'WhatsAppSession',
      'AdminSettings',
      'User'
    ];

    for (const table of tables) {
      await prisma[table].deleteMany();
    }
  }

  /**
   * Get date helpers
   */
  static get dates() {
    return {
      startOfDay: () => {
        const date = new Date();
        date.setHours(0, 0, 0, 0);
        return date;
      },
      endOfDay: () => {
        const date = new Date();
        date.setHours(23, 59, 59, 999);
        return date;
      },
      startOfMonth: () => {
        const date = new Date();
        date.setDate(1);
        date.setHours(0, 0, 0, 0);
        return date;
      },
      endOfMonth: () => {
        const date = new Date();
        date.setMonth(date.getMonth() + 1);
        date.setDate(0);
        date.setHours(23, 59, 59, 999);
        return date;
      }
    };
  }

  /**
   * Response assertions
   */
  static get expect() {
    return {
      success: (response, statusCode = 200) => {
        expect(response.status).toBe(statusCode);
        expect(response.body).toHaveProperty('status', 'success');
      },
      error: (response, statusCode = 400) => {
        expect(response.status).toBe(statusCode);
        expect(response.body).toHaveProperty('status', 'error');
      },
      validation: (response) => {
        expect(response.status).toBe(400);
        expect(response.body).toHaveProperty('status', 'error');
        expect(response.body).toHaveProperty('errors');
        expect(Array.isArray(response.body.errors)).toBe(true);
      }
    };
  }
}

module.exports = TestUtils;
