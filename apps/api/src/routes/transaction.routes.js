const express = require('express');
const { verifyToken, restrictTo } = require('../middleware/auth');
const {
  createTransaction,
  getTransactions,
  getTransaction,
  updateTransaction,
  deleteTransaction,
  getTransactionStats
} = require('../controllers/transactionController');

const router = express.Router();

// Protect all routes
router.use(verifyToken);

// Regular user routes
router
  .route('/')
  .get(getTransactions)
  .post(createTransaction);

router.get('/stats', getTransactionStats);

router
  .route('/:id')
  .get(getTransaction)
  .patch(updateTransaction)
  .delete(deleteTransaction);

// Admin routes
router.use(restrictTo('ADMIN'));

// Admin can view all user transactions
router.get('/admin/all', async (req, res) => {
  const { PrismaClient } = require('@prisma/client');
  const prisma = new PrismaClient();
  
  const {
    userId,
    startDate,
    endDate,
    type,
    category,
    page = 1,
    limit = 10
  } = req.query;

  const skip = (page - 1) * limit;

  const where = {
    ...(userId && { userId }),
    ...(startDate && endDate && {
      date: {
        gte: new Date(startDate),
        lte: new Date(endDate)
      }
    }),
    ...(type && { type }),
    ...(category && { category })
  };

  const [transactions, total] = await Promise.all([
    prisma.transaction.findMany({
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
      orderBy: { date: 'desc' },
      skip,
      take: parseInt(limit)
    }),
    prisma.transaction.count({ where })
  ]);

  res.status(200).json({
    status: 'success',
    data: {
      transactions,
      pagination: {
        total,
        pages: Math.ceil(total / limit),
        page: parseInt(page),
        limit: parseInt(limit)
      }
    }
  });
});

// Admin stats across all users
router.get('/admin/stats', async (req, res) => {
  const { PrismaClient } = require('@prisma/client');
  const prisma = new PrismaClient();
  
  const { startDate, endDate } = req.query;

  const where = {
    ...(startDate && endDate && {
      date: {
        gte: new Date(startDate),
        lte: new Date(endDate)
      }
    })
  };

  // Get overall stats
  const overallStats = await prisma.transaction.groupBy({
    by: ['type'],
    where,
    _sum: {
      amount: true
    }
  });

  // Get user-wise stats
  const userStats = await prisma.transaction.groupBy({
    by: ['userId', 'type'],
    where,
    _sum: {
      amount: true
    }
  });

  // Get category-wise stats
  const categoryStats = await prisma.transaction.groupBy({
    by: ['category', 'type'],
    where,
    _sum: {
      amount: true
    }
  });

  res.status(200).json({
    status: 'success',
    data: {
      overallStats,
      userStats,
      categoryStats
    }
  });
});

module.exports = router;
