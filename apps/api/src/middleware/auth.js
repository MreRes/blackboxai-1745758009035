const jwt = require('jsonwebtoken');
const { PrismaClient } = require('@prisma/client');
const { AppError } = require('./errorHandler');
const { createLogger } = require('../utils/logger');

const prisma = new PrismaClient();
const logger = createLogger('auth-middleware');

const generateToken = (userId, role) => {
  return jwt.sign(
    { id: userId, role },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN || '24h' }
  );
};

const verifyToken = async (req, res, next) => {
  try {
    // Get token from header
    const authHeader = req.headers.authorization;
    if (!authHeader?.startsWith('Bearer ')) {
      throw new AppError(401, 'No token provided');
    }

    const token = authHeader.split(' ')[1];

    // Verify token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // Check if user still exists
    const user = await prisma.user.findUnique({
      where: { id: decoded.id },
      select: {
        id: true,
        username: true,
        role: true,
        isActive: true
      }
    });

    if (!user) {
      throw new AppError(401, 'User no longer exists');
    }

    if (!user.isActive) {
      throw new AppError(401, 'User account is deactivated');
    }

    // Add user to request
    req.user = user;
    next();
  } catch (error) {
    if (error instanceof jwt.JsonWebTokenError) {
      return next(new AppError(401, 'Invalid token'));
    }
    next(error);
  }
};

const restrictTo = (...roles) => {
  return (req, res, next) => {
    if (!roles.includes(req.user.role)) {
      return next(new AppError(403, 'You do not have permission to perform this action'));
    }
    next();
  };
};

const isAdmin = (req, res, next) => {
  if (req.user.role !== 'ADMIN') {
    return next(new AppError(403, 'Admin access required'));
  }
  next();
};

const checkActivationCode = async (req, res, next) => {
  try {
    const { activationCode } = req.body;
    
    if (!activationCode) {
      throw new AppError(400, 'Activation code is required');
    }

    const activation = await prisma.activationCode.findUnique({
      where: { code: activationCode },
      include: { user: true }
    });

    if (!activation) {
      throw new AppError(400, 'Invalid activation code');
    }

    if (!activation.isActive) {
      throw new AppError(400, 'Activation code is no longer active');
    }

    if (activation.expiresAt < new Date()) {
      throw new AppError(400, 'Activation code has expired');
    }

    req.activation = activation;
    next();
  } catch (error) {
    next(error);
  }
};

module.exports = {
  generateToken,
  verifyToken,
  restrictTo,
  isAdmin,
  checkActivationCode
};
