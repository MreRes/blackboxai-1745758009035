const { PrismaClient } = require('@prisma/client');
const { AppError, catchAsync } = require('../middleware/errorHandler');
const { createLogger } = require('../utils/logger');
const whatsappService = require('../services/whatsappService');

const prisma = new PrismaClient();
const logger = createLogger('whatsapp-controller');

const initializeWhatsApp = catchAsync(async (req, res) => {
  try {
    await whatsappService.initialize();
    res.status(200).json({
      status: 'success',
      message: 'WhatsApp client initialization started'
    });
  } catch (error) {
    logger.error('WhatsApp initialization error:', error);
    throw new AppError(500, 'Failed to initialize WhatsApp client');
  }
});

const getQRCode = catchAsync(async (req, res) => {
  if (!whatsappService.client) {
    throw new AppError(400, 'WhatsApp client not initialized');
  }

  try {
    const qr = await new Promise((resolve, reject) => {
      whatsappService.client.once('qr', (qr) => resolve(qr));
      setTimeout(() => reject(new Error('QR code timeout')), 30000);
    });

    res.status(200).json({
      status: 'success',
      data: { qr }
    });
  } catch (error) {
    logger.error('QR code generation error:', error);
    throw new AppError(500, 'Failed to generate QR code');
  }
});

const getConnectionStatus = catchAsync(async (req, res) => {
  if (!whatsappService.client) {
    throw new AppError(400, 'WhatsApp client not initialized');
  }

  const state = await whatsappService.client.getState();

  res.status(200).json({
    status: 'success',
    data: { state }
  });
});

const logout = catchAsync(async (req, res) => {
  if (!whatsappService.client) {
    throw new AppError(400, 'WhatsApp client not initialized');
  }

  await whatsappService.client.logout();
  
  res.status(200).json({
    status: 'success',
    message: 'Logged out successfully'
  });
});

const getSessionInfo = catchAsync(async (req, res) => {
  const { userId } = req.params;

  const session = await prisma.whatsAppSession.findFirst({
    where: {
      userId,
      isActive: true
    }
  });

  if (!session) {
    throw new AppError(404, 'No active WhatsApp session found');
  }

  res.status(200).json({
    status: 'success',
    data: { session }
  });
});

const getAllSessions = catchAsync(async (req, res) => {
  const sessions = await prisma.whatsAppSession.findMany({
    include: {
      user: {
        select: {
          username: true,
          phoneNumber: true
        }
      }
    }
  });

  res.status(200).json({
    status: 'success',
    data: { sessions }
  });
});

const deactivateSession = catchAsync(async (req, res) => {
  const { sessionId } = req.params;

  const session = await prisma.whatsAppSession.findUnique({
    where: { id: sessionId }
  });

  if (!session) {
    throw new AppError(404, 'Session not found');
  }

  await prisma.whatsAppSession.update({
    where: { id: sessionId },
    data: { isActive: false }
  });

  res.status(200).json({
    status: 'success',
    message: 'Session deactivated successfully'
  });
});

const sendMessage = catchAsync(async (req, res) => {
  const { phoneNumber, message } = req.body;

  if (!whatsappService.client) {
    throw new AppError(400, 'WhatsApp client not initialized');
  }

  // Format phone number
  const formattedNumber = phoneNumber.includes('@c.us') 
    ? phoneNumber 
    : `${phoneNumber.replace(/[^\d]/g, '')}@c.us`;

  try {
    await whatsappService.client.sendMessage(formattedNumber, message);
    
    res.status(200).json({
      status: 'success',
      message: 'Message sent successfully'
    });
  } catch (error) {
    logger.error('Message sending error:', error);
    throw new AppError(500, 'Failed to send message');
  }
});

const getMessageHistory = catchAsync(async (req, res) => {
  const { userId } = req.params;
  const { limit = 50 } = req.query;

  const user = await prisma.user.findUnique({
    where: { id: userId }
  });

  if (!user || !user.phoneNumber) {
    throw new AppError(404, 'User not found or no phone number associated');
  }

  if (!whatsappService.client) {
    throw new AppError(400, 'WhatsApp client not initialized');
  }

  const chat = await whatsappService.client.getChatById(user.phoneNumber + '@c.us');
  const messages = await chat.fetchMessages({ limit: parseInt(limit) });

  res.status(200).json({
    status: 'success',
    data: { messages }
  });
});

module.exports = {
  initializeWhatsApp,
  getQRCode,
  getConnectionStatus,
  logout,
  getSessionInfo,
  getAllSessions,
  deactivateSession,
  sendMessage,
  getMessageHistory
};
