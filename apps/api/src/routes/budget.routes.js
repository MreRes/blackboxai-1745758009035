const express = require('express');
const { verifyToken, restrictTo } = require('../middleware/auth');
const {
  createBudget,
  getBudgets,
  getBudget,
  updateBudget,
  deleteBudget,
  getBudgetAnalytics
} = require('../controllers/budgetController');

const router = express.Router();

// Protect all routes
router.use(verifyToken);

// Regular user routes
router
  .route('/')
  .get(getBudgets)
  .post(createBudget);

router.get('/analytics', getBudgetAnalytics);

router
  .route('/:id')
  .get(getBudget)
  .patch(updateBudget)
  .delete(deleteBudget);

// Admin routes
router.use(restrictTo('ADMIN'));

// Admin can view all user budgets
router.get('/admin/all', async (req, res) => {
  const { PrismaClient } = require('@prisma/client');
  const prisma = new PrismaClient();
  
  const {
    userId,
    period,
    startDate,
    endDate,
    page = 1,
    limit = 10
  } = req.query;

  const skip = (page - 1) * limit;

  const where = {
    ...(userId && { userId }),
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
      include: {
        user: {
          select: {
            username: true,
            email: true,
            phoneNumber: true
          }
        }
      },
      orderBy: { startDate: 'desc' },
      skip,
      take: parseInt(limit)
    }),
    prisma.budget.count({ where })
  ]);

  // Get spending data for each budget
  const budgetsWithSpending = await Promise.all(
    budgets.map(async (budget) => {
      const spending = await prisma.transaction.aggregate({
        where: {
          userId: budget.userId,
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
        remaining: budget.amount - (spending._sum.amount || 0),
        percentageUsed: ((spending._sum.amount || 0) / budget.amount) * 100
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

// Admin analytics across all users
router.get('/admin/analytics', async (req, res) => {
  const { PrismaClient } = require('@prisma/client');
  const prisma = new PrismaClient();
  
  const { startDate, endDate } = req.query;

  // Get overall budget statistics
  const overallStats = await prisma.budget.aggregate({
    _sum: {
      amount: true
    },
    _avg: {
      amount: true
    },
    _count: true
  });

  // Get category-wise budget allocation
  const categoryStats = await prisma.budget.groupBy({
    by: ['category'],
    _sum: {
      amount: true
    }
  });

  // Get user-wise budget utilization
  const userBudgets = await prisma.budget.findMany({
    include: {
      user: {
        select: {
          username: true
        }
      }
    }
  });

  const userUtilization = await Promise.all(
    userBudgets.map(async (budget) => {
      const spending = await prisma.transaction.aggregate({
        where: {
          userId: budget.userId,
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
        username: budget.user.username,
        budgetAmount: budget.amount,
        spent: spending._sum.amount || 0,
        utilization: ((spending._sum.amount || 0) / budget.amount) * 100
      };
    })
  );

  res.status(200).json({
    status: 'success',
    data: {
      overallStats,
      categoryStats,
      userUtilization
    }
  });
});

module.exports = router;
