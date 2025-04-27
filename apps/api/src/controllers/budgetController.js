const { PrismaClient } = require('@prisma/client');
const { AppError, catchAsync } = require('../middleware/errorHandler');
const { createLogger } = require('../utils/logger');

const prisma = new PrismaClient();
const logger = createLogger('budget-controller');

const createBudget = catchAsync(async (req, res) => {
  const { category, amount, period, startDate, endDate } = req.body;
  const userId = req.user.id;

  // Check if budget already exists for the category and period
  const existingBudget = await prisma.budget.findFirst({
    where: {
      userId,
      category,
      startDate: new Date(startDate),
      period
    }
  });

  if (existingBudget) {
    throw new AppError(400, 'Budget already exists for this category and period');
  }

  const budget = await prisma.budget.create({
    data: {
      userId,
      category,
      amount: parseFloat(amount),
      period,
      startDate: new Date(startDate),
      endDate: endDate ? new Date(endDate) : null
    }
  });

  res.status(201).json({
    status: 'success',
    data: { budget }
  });
});

const getBudgets = catchAsync(async (req, res) => {
  const { period, startDate, endDate, page = 1, limit = 10 } = req.query;
  const userId = req.user.id;

  const skip = (page - 1) * limit;

  const where = {
    userId,
    ...(period && { period }),
    ...(startDate && {
      startDate: {
        gte: new Date(startDate)
      }
    }),
    ...(endDate && {
      endDate: {
        lte: new Date(endDate)
      }
    })
  };

  const [budgets, total] = await Promise.all([
    prisma.budget.findMany({
      where,
      orderBy: { startDate: 'desc' },
      skip,
      take: parseInt(limit)
    }),
    prisma.budget.count({ where })
  ]);

  // Get actual spending for each budget
  const budgetsWithSpending = await Promise.all(
    budgets.map(async (budget) => {
      const spending = await prisma.transaction.aggregate({
        where: {
          userId,
          category: budget.category,
          type: 'EXPENSE',
          date: {
            gte: budget.startDate,
            lte: budget.endDate || new Date()
          }
        },
        _sum: {
          amount: true
        }
      });

      return {
        ...budget,
        spent: spending._sum.amount || 0,
        remaining: budget.amount - (spending._sum.amount || 0)
      };
    })
  );

  res.status(200).json({
    status: 'success',
    data: {
      budgets: budgetsWithSpending,
      pagination: {
        total,
        pages: Math.ceil(total / limit),
        page: parseInt(page),
        limit: parseInt(limit)
      }
    }
  });
});

const getBudget = catchAsync(async (req, res) => {
  const { id } = req.params;
  const userId = req.user.id;

  const budget = await prisma.budget.findFirst({
    where: {
      id,
      userId
    }
  });

  if (!budget) {
    throw new AppError(404, 'Budget not found');
  }

  // Get actual spending for the budget
  const spending = await prisma.transaction.aggregate({
    where: {
      userId,
      category: budget.category,
      type: 'EXPENSE',
      date: {
        gte: budget.startDate,
        lte: budget.endDate || new Date()
      }
    },
    _sum: {
      amount: true
    }
  });

  const budgetWithSpending = {
    ...budget,
    spent: spending._sum.amount || 0,
    remaining: budget.amount - (spending._sum.amount || 0)
  };

  res.status(200).json({
    status: 'success',
    data: { budget: budgetWithSpending }
  });
});

const updateBudget = catchAsync(async (req, res) => {
  const { id } = req.params;
  const userId = req.user.id;
  const { amount, endDate } = req.body;

  const budget = await prisma.budget.findFirst({
    where: {
      id,
      userId
    }
  });

  if (!budget) {
    throw new AppError(404, 'Budget not found');
  }

  const updatedBudget = await prisma.budget.update({
    where: { id },
    data: {
      amount: amount ? parseFloat(amount) : undefined,
      endDate: endDate ? new Date(endDate) : undefined
    }
  });

  res.status(200).json({
    status: 'success',
    data: { budget: updatedBudget }
  });
});

const deleteBudget = catchAsync(async (req, res) => {
  const { id } = req.params;
  const userId = req.user.id;

  const budget = await prisma.budget.findFirst({
    where: {
      id,
      userId
    }
  });

  if (!budget) {
    throw new AppError(404, 'Budget not found');
  }

  await prisma.budget.delete({
    where: { id }
  });

  res.status(204).json({
    status: 'success',
    data: null
  });
});

const getBudgetAnalytics = catchAsync(async (req, res) => {
  const userId = req.user.id;
  const { startDate, endDate } = req.query;

  // Get all active budgets
  const budgets = await prisma.budget.findMany({
    where: {
      userId,
      startDate: {
        lte: new Date()
      },
      OR: [
        { endDate: null },
        { endDate: { gte: new Date() } }
      ]
    }
  });

  // Get spending data for each budget
  const budgetAnalytics = await Promise.all(
    budgets.map(async (budget) => {
      const spending = await prisma.transaction.aggregate({
        where: {
          userId,
          category: budget.category,
          type: 'EXPENSE',
          date: {
            gte: budget.startDate,
            lte: budget.endDate || new Date()
          }
        },
        _sum: {
          amount: true
        }
      });

      const percentageUsed = ((spending._sum.amount || 0) / budget.amount) * 100;

      return {
        ...budget,
        spent: spending._sum.amount || 0,
        remaining: budget.amount - (spending._sum.amount || 0),
        percentageUsed,
        status: percentageUsed >= 100 ? 'exceeded' : 
                percentageUsed >= 80 ? 'warning' : 'good'
      };
    })
  );

  res.status(200).json({
    status: 'success',
    data: { budgets: budgetAnalytics }
  });
});

module.exports = {
  createBudget,
  getBudgets,
  getBudget,
  updateBudget,
  deleteBudget,
  getBudgetAnalytics
};
