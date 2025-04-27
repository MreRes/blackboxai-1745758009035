const { PrismaClient } = require('@prisma/client');
const { AppError, catchAsync } = require('../middleware/errorHandler');
const { createLogger } = require('../utils/logger');

const prisma = new PrismaClient();
const logger = createLogger('transaction-controller');

const createTransaction = catchAsync(async (req, res) => {
  const { type, amount, category, description, date, source = 'web' } = req.body;
  const userId = req.user.id;

  const transaction = await prisma.transaction.create({
    data: {
      userId,
      type,
      amount: parseFloat(amount),
      category,
      description,
      date: date ? new Date(date) : new Date(),
      source
    }
  });

  res.status(201).json({
    status: 'success',
    data: { transaction }
  });
});

const getTransactions = catchAsync(async (req, res) => {
  const { 
    startDate, 
    endDate, 
    type, 
    category,
    source,
    page = 1,
    limit = 10
  } = req.query;

  const skip = (page - 1) * limit;

  // Build where clause
  const where = {
    userId: req.user.id,
    ...(startDate && endDate && {
      date: {
        gte: new Date(startDate),
        lte: new Date(endDate)
      }
    }),
    ...(type && { type }),
    ...(category && { category }),
    ...(source && { source })
  };

  // Get transactions with pagination
  const [transactions, total] = await Promise.all([
    prisma.transaction.findMany({
      where,
      orderBy: { date: 'desc' },
      skip,
      take: parseInt(limit)
    }),
    prisma.transaction.count({ where })
  ]);

  // Calculate totals
  const totals = await prisma.transaction.groupBy({
    by: ['type'],
    where,
    _sum: {
      amount: true
    }
  });

  const income = totals.find(t => t.type === 'INCOME')?._sum.amount || 0;
  const expenses = totals.find(t => t.type === 'EXPENSE')?._sum.amount || 0;
  const balance = income - expenses;

  res.status(200).json({
    status: 'success',
    data: {
      transactions,
      pagination: {
        total,
        pages: Math.ceil(total / limit),
        page: parseInt(page),
        limit: parseInt(limit)
      },
      summary: {
        income,
        expenses,
        balance
      }
    }
  });
});

const getTransaction = catchAsync(async (req, res) => {
  const { id } = req.params;
  const userId = req.user.id;

  const transaction = await prisma.transaction.findFirst({
    where: {
      id,
      userId
    }
  });

  if (!transaction) {
    throw new AppError(404, 'Transaction not found');
  }

  res.status(200).json({
    status: 'success',
    data: { transaction }
  });
});

const updateTransaction = catchAsync(async (req, res) => {
  const { id } = req.params;
  const userId = req.user.id;
  const { type, amount, category, description, date } = req.body;

  const transaction = await prisma.transaction.findFirst({
    where: {
      id,
      userId
    }
  });

  if (!transaction) {
    throw new AppError(404, 'Transaction not found');
  }

  const updatedTransaction = await prisma.transaction.update({
    where: { id },
    data: {
      type,
      amount: parseFloat(amount),
      category,
      description,
      date: date ? new Date(date) : undefined
    }
  });

  res.status(200).json({
    status: 'success',
    data: { transaction: updatedTransaction }
  });
});

const deleteTransaction = catchAsync(async (req, res) => {
  const { id } = req.params;
  const userId = req.user.id;

  const transaction = await prisma.transaction.findFirst({
    where: {
      id,
      userId
    }
  });

  if (!transaction) {
    throw new AppError(404, 'Transaction not found');
  }

  await prisma.transaction.delete({
    where: { id }
  });

  res.status(204).json({
    status: 'success',
    data: null
  });
});

const getTransactionStats = catchAsync(async (req, res) => {
  const { startDate, endDate } = req.query;
  const userId = req.user.id;

  const where = {
    userId,
    ...(startDate && endDate && {
      date: {
        gte: new Date(startDate),
        lte: new Date(endDate)
      }
    })
  };

  // Get category-wise totals
  const categoryStats = await prisma.transaction.groupBy({
    by: ['category', 'type'],
    where,
    _sum: {
      amount: true
    }
  });

  // Get daily totals
  const dailyStats = await prisma.transaction.groupBy({
    by: ['date', 'type'],
    where,
    _sum: {
      amount: true
    }
  });

  res.status(200).json({
    status: 'success',
    data: {
      categoryStats,
      dailyStats
    }
  });
});

module.exports = {
  createTransaction,
  getTransactions,
  getTransaction,
  updateTransaction,
  deleteTransaction,
  getTransactionStats
};
