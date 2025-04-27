const request = require('supertest');
const app = require('../../src/app');
const TestUtils = require('../testUtils');
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

describe('Transaction API', () => {
  let user;
  let token;

  beforeEach(async () => {
    await TestUtils.cleanup();
    user = await TestUtils.createTestUser();
    token = TestUtils.generateToken(user.id);
  });

  describe('POST /api/v1/transactions', () => {
    it('should create a new transaction', async () => {
      const transactionData = {
        type: 'EXPENSE',
        amount: 100.50,
        category: 'Food',
        description: 'Lunch',
        date: new Date().toISOString()
      };

      const response = await TestUtils.authenticatedRequest(
        'POST',
        '/api/v1/transactions',
        transactionData,
        token
      );

      TestUtils.expect.success(response, 201);
      expect(response.body.data.transaction).toMatchObject({
        ...transactionData,
        userId: user.id,
        amount: transactionData.amount
      });
    });

    it('should validate transaction amount', async () => {
      const response = await TestUtils.authenticatedRequest(
        'POST',
        '/api/v1/transactions',
        {
          type: 'EXPENSE',
          amount: -100, // Negative amount
          category: 'Food'
        },
        token
      );

      TestUtils.expect.validation(response);
    });

    it('should require authentication', async () => {
      const response = await request(app)
        .post('/api/v1/transactions')
        .send({
          type: 'EXPENSE',
          amount: 100,
          category: 'Food'
        });

      TestUtils.expect.error(response, 401);
    });
  });

  describe('GET /api/v1/transactions', () => {
    beforeEach(async () => {
      // Create test transactions
      await Promise.all([
        TestUtils.createTestTransaction(user.id, {
          type: 'EXPENSE',
          amount: 100,
          category: 'Food',
          date: TestUtils.dates.startOfMonth()
        }),
        TestUtils.createTestTransaction(user.id, {
          type: 'INCOME',
          amount: 1000,
          category: 'Salary',
          date: TestUtils.dates.startOfMonth()
        }),
        TestUtils.createTestTransaction(user.id, {
          type: 'EXPENSE',
          amount: 200,
          category: 'Transport',
          date: new Date()
        })
      ]);
    });

    it('should list user transactions with pagination', async () => {
      const response = await TestUtils.authenticatedRequest(
        'GET',
        '/api/v1/transactions?page=1&limit=10',
        null,
        token
      );

      TestUtils.expect.success(response);
      expect(response.body.data.transactions).toHaveLength(3);
      expect(response.body.data.pagination).toMatchObject({
        page: 1,
        limit: 10,
        total: 3
      });
    });

    it('should filter transactions by type', async () => {
      const response = await TestUtils.authenticatedRequest(
        'GET',
        '/api/v1/transactions?type=EXPENSE',
        null,
        token
      );

      TestUtils.expect.success(response);
      expect(response.body.data.transactions).toHaveLength(2);
      expect(response.body.data.transactions).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ type: 'EXPENSE' })
        ])
      );
    });

    it('should filter transactions by date range', async () => {
      const startDate = TestUtils.dates.startOfMonth().toISOString();
      const endDate = TestUtils.dates.endOfMonth().toISOString();

      const response = await TestUtils.authenticatedRequest(
        'GET',
        `/api/v1/transactions?startDate=${startDate}&endDate=${endDate}`,
        null,
        token
      );

      TestUtils.expect.success(response);
      expect(response.body.data.transactions.length).toBeGreaterThan(0);
    });

    it('should include transaction summary', async () => {
      const response = await TestUtils.authenticatedRequest(
        'GET',
        '/api/v1/transactions',
        null,
        token
      );

      TestUtils.expect.success(response);
      expect(response.body.data.summary).toMatchObject({
        income: 1000,
        expenses: 300,
        balance: 700
      });
    });
  });

  describe('GET /api/v1/transactions/:id', () => {
    let transaction;

    beforeEach(async () => {
      transaction = await TestUtils.createTestTransaction(user.id);
    });

    it('should get transaction by id', async () => {
      const response = await TestUtils.authenticatedRequest(
        'GET',
        `/api/v1/transactions/${transaction.id}`,
        null,
        token
      );

      TestUtils.expect.success(response);
      expect(response.body.data.transaction).toMatchObject({
        id: transaction.id,
        userId: user.id
      });
    });

    it('should not allow access to other user\'s transaction', async () => {
      const otherUser = await TestUtils.createTestUser();
      const otherTransaction = await TestUtils.createTestTransaction(otherUser.id);

      const response = await TestUtils.authenticatedRequest(
        'GET',
        `/api/v1/transactions/${otherTransaction.id}`,
        null,
        token
      );

      TestUtils.expect.error(response, 404);
    });
  });

  describe('PATCH /api/v1/transactions/:id', () => {
    let transaction;

    beforeEach(async () => {
      transaction = await TestUtils.createTestTransaction(user.id);
    });

    it('should update transaction', async () => {
      const updates = {
        amount: 150,
        description: 'Updated description'
      };

      const response = await TestUtils.authenticatedRequest(
        'PATCH',
        `/api/v1/transactions/${transaction.id}`,
        updates,
        token
      );

      TestUtils.expect.success(response);
      expect(response.body.data.transaction).toMatchObject(updates);
    });

    it('should validate update data', async () => {
      const response = await TestUtils.authenticatedRequest(
        'PATCH',
        `/api/v1/transactions/${transaction.id}`,
        { amount: -100 },
        token
      );

      TestUtils.expect.validation(response);
    });
  });

  describe('DELETE /api/v1/transactions/:id', () => {
    let transaction;

    beforeEach(async () => {
      transaction = await TestUtils.createTestTransaction(user.id);
    });

    it('should delete transaction', async () => {
      const response = await TestUtils.authenticatedRequest(
        'DELETE',
        `/api/v1/transactions/${transaction.id}`,
        null,
        token
      );

      TestUtils.expect.success(response, 204);

      // Verify deletion
      const deleted = await prisma.transaction.findUnique({
        where: { id: transaction.id }
      });
      expect(deleted).toBeNull();
    });

    it('should not allow deleting other user\'s transaction', async () => {
      const otherUser = await TestUtils.createTestUser();
      const otherTransaction = await TestUtils.createTestTransaction(otherUser.id);

      const response = await TestUtils.authenticatedRequest(
        'DELETE',
        `/api/v1/transactions/${otherTransaction.id}`,
        null,
        token
      );

      TestUtils.expect.error(response, 404);
    });
  });

  describe('GET /api/v1/transactions/stats', () => {
    beforeEach(async () => {
      // Create various transactions for statistics
      await Promise.all([
        TestUtils.createTestTransaction(user.id, {
          type: 'EXPENSE',
          amount: 100,
          category: 'Food',
          date: TestUtils.dates.startOfMonth()
        }),
        TestUtils.createTestTransaction(user.id, {
          type: 'EXPENSE',
          amount: 200,
          category: 'Food',
          date: TestUtils.dates.startOfMonth()
        }),
        TestUtils.createTestTransaction(user.id, {
          type: 'INCOME',
          amount: 1000,
          category: 'Salary',
          date: TestUtils.dates.startOfMonth()
        })
      ]);
    });

    it('should return transaction statistics', async () => {
      const response = await TestUtils.authenticatedRequest(
        'GET',
        '/api/v1/transactions/stats',
        null,
        token
      );

      TestUtils.expect.success(response);
      expect(response.body.data).toMatchObject({
        categoryStats: expect.any(Array),
        dailyStats: expect.any(Array)
      });

      // Verify category stats
      const foodCategory = response.body.data.categoryStats.find(
        stat => stat.category === 'Food' && stat.type === 'EXPENSE'
      );
      expect(foodCategory._sum.amount).toBe(300);
    });

    it('should filter statistics by date range', async () => {
      const startDate = TestUtils.dates.startOfMonth().toISOString();
      const endDate = TestUtils.dates.endOfMonth().toISOString();

      const response = await TestUtils.authenticatedRequest(
        'GET',
        `/api/v1/transactions/stats?startDate=${startDate}&endDate=${endDate}`,
        null,
        token
      );

      TestUtils.expect.success(response);
      expect(response.body.data.categoryStats.length).toBeGreaterThan(0);
    });
  });
});
