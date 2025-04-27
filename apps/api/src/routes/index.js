const express = require('express');
const authRoutes = require('./auth.routes');
const transactionRoutes = require('./transaction.routes');
const budgetRoutes = require('./budget.routes');
const whatsappRoutes = require('./whatsapp.routes');
const backupRoutes = require('./backup.routes');
const { AppError } = require('../middleware/errorHandler');
const { createLogger } = require('../utils/logger');
const { PrismaClient } = require('@prisma/client');

const router = express.Router();
const logger = createLogger('routes');
const prisma = new PrismaClient();

// Health check route
router.get('/health', (req, res) => {
  res.status(200).json({
    status: 'success',
    message: 'API is running',
    timestamp: new Date().toISOString(),
    version: process.env.npm_package_version || '1.0.0'
  });
});

// API version prefix
const v1Router = express.Router();

// Mount routes
v1Router.use('/auth', authRoutes);
v1Router.use('/transactions', transactionRoutes);
v1Router.use('/budgets', budgetRoutes);
v1Router.use('/whatsapp', whatsappRoutes);
v1Router.use('/backups', backupRoutes);

// Reports endpoint
v1Router.get('/reports/summary', async (req, res) => {
  try {
    const { startDate, endDate, userId } = req.query;
    
    const where = {
      ...(userId && { userId }),
      ...(startDate && endDate && {
        date: {
          gte: new Date(startDate),
          lte: new Date(endDate)
        }
      })
    };

    // Get transaction summary
    const transactions = await prisma.transaction.groupBy({
      by: ['type'],
      where,
      _sum: {
        amount: true
      }
    });

    // Get budget summary
    const budgets = await prisma.budget.findMany({
      where: {
        ...where,
        OR: [
          { endDate: null },
          { endDate: { gte: new Date() } }
        ]
      },
      include: {
        user: {
          select: {
            username: true
          }
        }
      }
    });

    // Get category breakdown
    const categoryBreakdown = await prisma.transaction.groupBy({
      by: ['category', 'type'],
      where,
      _sum: {
        amount: true
      }
    });

    // Get source breakdown (web, whatsapp, etc.)
    const sourceBreakdown = await prisma.transaction.groupBy({
      by: ['source'],
      where,
      _count: true,
      _sum: {
        amount: true
      }
    });

    // Get daily trends
    const dailyTrends = await prisma.transaction.groupBy({
      by: ['date', 'type'],
      where,
      _sum: {
        amount: true
      }
    });

    res.status(200).json({
      status: 'success',
      data: {
        transactions,
        budgets,
        categoryBreakdown,
        sourceBreakdown,
        dailyTrends
      }
    });
  } catch (error) {
    logger.error('Error generating report:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to generate report'
    });
  }
});

// System status endpoint
v1Router.get('/system/status', async (req, res) => {
  try {
    // Get active users count
    const activeUsers = await prisma.user.count({
      where: { isActive: true }
    });

    // Get active WhatsApp sessions
    const activeSessions = await prisma.whatsAppSession.count({
      where: { isActive: true }
    });

    // Get today's transactions
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayTransactions = await prisma.transaction.count({
      where: {
        date: {
          gte: today
        }
      }
    });

    // Get system settings
    const settings = await prisma.adminSettings.findMany({
      select: {
        key: true,
        value: true
      }
    });

    res.status(200).json({
      status: 'success',
      data: {
        activeUsers,
        activeSessions,
        todayTransactions,
        settings: settings.reduce((acc, setting) => {
          acc[setting.key] = setting.value;
          return acc;
        }, {})
      }
    });
  } catch (error) {
    logger.error('Error fetching system status:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to fetch system status'
    });
  }
});

// Mount v1 routes
router.use('/v1', v1Router);

// Handle undefined routes
router.all('*', (req, res, next) => {
  next(new AppError(404, `Can't find ${req.originalUrl} on this server!`));
});

module.exports = router;
