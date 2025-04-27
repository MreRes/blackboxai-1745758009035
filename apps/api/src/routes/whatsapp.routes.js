const express = require('express');
const { verifyToken, restrictTo } = require('../middleware/auth');
const {
  initializeWhatsApp,
  getQRCode,
  getConnectionStatus,
  logout,
  getSessionInfo,
  getAllSessions,
  deactivateSession,
  sendMessage,
  getMessageHistory
} = require('../controllers/whatsappController');

const router = express.Router();

// Protect all routes
router.use(verifyToken);

// WhatsApp client management routes (Admin only)
router.use(restrictTo('ADMIN'));

router.post('/initialize', initializeWhatsApp);
router.get('/qr', getQRCode);
router.get('/status', getConnectionStatus);
router.post('/logout', logout);

// Session management
router.get('/sessions', getAllSessions);
router.get('/sessions/:userId', getSessionInfo);
router.patch('/sessions/:sessionId/deactivate', deactivateSession);

// Messaging routes
router.post('/send', sendMessage);
router.get('/messages/:userId', getMessageHistory);

// Admin monitoring routes
router.get('/admin/stats', async (req, res) => {
  const { PrismaClient } = require('@prisma/client');
  const prisma = new PrismaClient();
  
  try {
    // Get total messages per user
    const messageStats = await prisma.transaction.groupBy({
      by: ['userId', 'source'],
      where: {
        source: 'whatsapp'
      },
      _count: true
    });

    // Get active sessions
    const activeSessions = await prisma.whatsAppSession.count({
      where: {
        isActive: true
      }
    });

    // Get user engagement (users with WhatsApp transactions)
    const activeUsers = await prisma.user.count({
      where: {
        transactions: {
          some: {
            source: 'whatsapp'
          }
        }
      }
    });

    // Get transaction types through WhatsApp
    const transactionTypes = await prisma.transaction.groupBy({
      by: ['type'],
      where: {
        source: 'whatsapp'
      },
      _count: true,
      _sum: {
        amount: true
      }
    });

    res.status(200).json({
      status: 'success',
      data: {
        messageStats,
        activeSessions,
        activeUsers,
        transactionTypes
      }
    });
  } catch (error) {
    res.status(500).json({
      status: 'error',
      message: 'Failed to fetch WhatsApp statistics'
    });
  }
});

// Webhook for external WhatsApp service notifications
router.post('/webhook', async (req, res) => {
  const { createLogger } = require('../utils/logger');
  const logger = createLogger('whatsapp-webhook');
  
  try {
    logger.info('Received webhook:', req.body);
    
    // Process webhook data
    // This could be for status updates, delivery receipts, etc.
    
    res.status(200).json({
      status: 'success',
      message: 'Webhook processed successfully'
    });
  } catch (error) {
    logger.error('Webhook processing error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to process webhook'
    });
  }
});

// Error handling middleware
router.use((err, req, res, next) => {
  const { createLogger } = require('../utils/logger');
  const logger = createLogger('whatsapp-routes');
  
  logger.error('WhatsApp route error:', err);
  
  res.status(err.statusCode || 500).json({
    status: 'error',
    message: err.message || 'Internal server error'
  });
});

module.exports = router;
