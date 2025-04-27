const request = require('supertest');
const app = require('../../src/app');
const TestUtils = require('../testUtils');
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

describe('Budget API', () => {
  let user;
  let token;

  beforeEach(async () => {
    await TestUtils.cleanup();
    user = await TestUtils.createTestUser();
    token = TestUtils.generateToken(user.id);
  });

  describe('POST /api/v1/budgets', () => {
    it('should create a new budget', async () => {
      const budgetData = {
        category: 'Food',
        amount: 1000000,
        period: 'MONTHLY',
        startDate: new Date().toISOString()
      };

      const response = await TestUtils.authenticatedRequest(
        'POST',
        '/api/v1/budgets',
        budgetData,
        token
      );

      TestUtils.expect.success(response, 201);
      expect(response.body.data.budget).toMatchObject({
        ...budgetData,
        userId: user.id,
        amount: budgetData.amount
      });
    });

    it('should prevent duplicate budgets for same category and period', async () => {
      const budgetData = {
        category: 'Food',
        amount: 1000000,
        period: 'MONTHLY',
        startDate: new Date().toISOString()
      };

      // Create first budget
      await TestUtils.createTestBudget(user.id, budgetData);

      // Attempt to create duplicate
      const response = await TestUtils.authenticatedRequest(
        'POST',
        '/api/v1/budgets',
        budgetData,
        token
      );

      TestUtils.expect.error(response, 400);
      expect(response.body.message).toMatch(/already exists/i);
    });

    it('should validate budget amount', async () => {
      const response = await TestUtils.authenticatedRequest(
        'POST',
        '/api/v1/budgets',
        {
          category: 'Food',
          amount: -1000, // Negative amount
          period: 'MONTHLY',
          startDate: new Date().toISOString()
        },
        token
      );

      TestUtils.expect.validation(response);
    });
  });

  describe('GET /api/v1/budgets', () => {
    beforeEach(async () => {
      // Create test budgets
      await Promise.all([
        TestUtils.createTestBudget(user.id, {
          category: 'Food',
          amount: 1000000,
          period: 'MONTHLY'
        }),
        TestUtils.createTestBudget(user.id, {
          category: 'Transport',
          amount: 500000,
          period: 'MONTHLY'
        }),
        TestUtils.createTestBudget(user.id, {
          category: 'Entertainment',
          amount: 300000,
          period: 'MONTHLY'
        })
      ]);

      // Create some transactions
      await Promise.all([
        TestUtils.createTestTransaction(user.id, {
          type: 'EXPENSE',
          amount: 200000,
          category: 'Food'
        }),
        TestUtils.createTestTransaction(user.id, {
          type: 'EXPENSE',
          amount: 100000,
          category: 'Transport'
        })
      ]);
    });

    it('should list budgets with spending information', async () => {
      const response = await TestUtils.authenticatedRequest(
        'GET',
        '/api/v1/budgets',
        null,
        token
      );

      TestUtils.expect.success(response);
      expect(response.body.data.budgets).toHaveLength(3);
      
      const foodBudget = response.body.data.budgets.find(b => b.category === 'Food');
      expect(foodBudget).toMatchObject({
        spent: 200000,
        remaining: 800000
      });
    });

    it('should filter budgets by period', async () => {
      const response = await TestUtils.authenticatedRequest(
        'GET',
        '/api/v1/budgets?period=MONTHLY',
        null,
        token
      );

      TestUtils.expect.success(response);
      expect(response.body.data.budgets).toHaveLength(3);
    });

    it('should filter budgets by date range', async () => {
      const startDate = TestUtils.dates.startOfMonth().toISOString();
      const endDate = TestUtils.dates.endOfMonth().toISOString();

      const response = await TestUtils.authenticatedRequest(
        'GET',
        `/api/v1/budgets?startDate=${startDate}&endDate=${endDate}`,
        null,
        token
      );

      TestUtils.expect.success(response);
      expect(response.body.data.budgets.length).toBeGreaterThan(0);
    });
  });

  describe('GET /api/v1/budgets/:id', () => {
    let budget;

    beforeEach(async () => {
      budget = await TestUtils.createTestBudget(user.id);
      
      // Add some transactions
      await TestUtils.createTestTransaction(user.id, {
        type: 'EXPENSE',
        amount: 200000,
        category: budget.category
      });
    });

    it('should get budget by id with spending details', async () => {
      const response = await TestUtils.authenticatedRequest(
        'GET',
        `/api/v1/budgets/${budget.id}`,
        null,
        token
      );

      TestUtils.expect.success(response);
      expect(response.body.data.budget).toMatchObject({
        id: budget.id,
        userId: user.id,
        spent: 200000,
        remaining: budget.amount - 200000
      });
    });

    it('should not allow access to other user\'s budget', async () => {
      const otherUser = await TestUtils.createTestUser();
      const otherBudget = await TestUtils.createTestBudget(otherUser.id);

      const response = await TestUtils.authenticatedRequest(
        'GET',
        `/api/v1/budgets/${otherBudget.id}`,
        null,
        token
      );

      TestUtils.expect.error(response, 404);
    });
  });

  describe('PATCH /api/v1/budgets/:id', () => {
    let budget;

    beforeEach(async () => {
      budget = await TestUtils.createTestBudget(user.id);
    });

    it('should update budget', async () => {
      const updates = {
        amount: 1500000,
        endDate: new Date().toISOString()
      };

      const response = await TestUtils.authenticatedRequest(
        'PATCH',
        `/api/v1/budgets/${budget.id}`,
        updates,
        token
      );

      TestUtils.expect.success(response);
      expect(response.body.data.budget).toMatchObject(updates);
    });

    it('should validate update data', async () => {
      const response = await TestUtils.authenticatedRequest(
        'PATCH',
        `/api/v1/budgets/${budget.id}`,
        { amount: -1000 },
        token
      );

      TestUtils.expect.validation(response);
    });
  });

  describe('DELETE /api/v1/budgets/:id', () => {
    let budget;

    beforeEach(async () => {
      budget = await TestUtils.createTestBudget(user.id);
    });

    it('should delete budget', async () => {
      const response = await TestUtils.authenticatedRequest(
        'DELETE',
        `/api/v1/budgets/${budget.id}`,
        null,
        token
      );

      TestUtils.expect.success(response, 204);

      // Verify deletion
      const deleted = await prisma.budget.findUnique({
        where: { id: budget.id }
      });
      expect(deleted).toBeNull();
    });
  });

  describe('GET /api/v1/budgets/analytics', () => {
    beforeEach(async () => {
      // Create budgets and transactions for analytics
      const budgets = await Promise.all([
        TestUtils.createTestBudget(user.id, {
          category: 'Food',
          amount: 1000000,
          period: 'MONTHLY'
        }),
        TestUtils.createTestBudget(user.id, {
          category: 'Transport',
          amount: 500000,
          period: 'MONTHLY'
        })
      ]);

      await Promise.all([
        TestUtils.createTestTransaction(user.id, {
          type: 'EXPENSE',
          amount: 800000,
          category: 'Food'
        }),
        TestUtils.createTestTransaction(user.id, {
          type: 'EXPENSE',
          amount: 100000,
          category: 'Transport'
        })
      ]);
    });

    it('should return budget analytics', async () => {
      const response = await TestUtils.authenticatedRequest(
        'GET',
        '/api/v1/budgets/analytics',
        null,
        token
      );

      TestUtils.expect.success(response);
      expect(response.body.data.budgets).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            category: 'Food',
            spent: 800000,
            remaining: 200000,
            percentageUsed: 80,
            status: 'warning'
          }),
          expect.objectContaining({
            category: 'Transport',
            spent: 100000,
            remaining: 400000,
            percentageUsed: 20,
            status: 'good'
          })
        ])
      );
    });
  });
});
