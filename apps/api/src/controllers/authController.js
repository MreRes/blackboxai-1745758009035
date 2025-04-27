const bcrypt = require('bcryptjs');
const { PrismaClient } = require('@prisma/client');
const { AppError, catchAsync } = require('../middleware/errorHandler');
const { generateToken } = require('../middleware/auth');
const { createLogger } = require('../utils/logger');

const prisma = new PrismaClient();
const logger = createLogger('auth-controller');

const register = catchAsync(async (req, res) => {
  const { username, password, email, phoneNumber, activationCode } = req.body;

  // Validate activation code
  const activation = await prisma.activationCode.findUnique({
    where: { code: activationCode },
    include: { user: true }
  });

  if (!activation || !activation.isActive || activation.expiresAt < new Date()) {
    throw new AppError(400, 'Invalid or expired activation code');
  }

  // Check if user already exists
  const existingUser = await prisma.user.findFirst({
    where: {
      OR: [
        { username },
        { email: email || undefined },
        { phoneNumber: phoneNumber || undefined }
      ]
    }
  });

  if (existingUser) {
    throw new AppError(400, 'Username, email, or phone number already exists');
  }

  // Hash password
  const hashedPassword = await bcrypt.hash(password, 12);

  // Create user
  const user = await prisma.user.create({
    data: {
      username,
      password: hashedPassword,
      email,
      phoneNumber,
      activationCode: {
        connect: {
          id: activation.id
        }
      }
    },
    select: {
      id: true,
      username: true,
      email: true,
      phoneNumber: true,
      role: true
    }
  });

  // Generate token
  const token = generateToken(user.id, user.role);

  res.status(201).json({
    status: 'success',
    data: {
      user,
      token
    }
  });
});

const login = catchAsync(async (req, res) => {
  const { username, password } = req.body;

  if (!username || !password) {
    throw new AppError(400, 'Please provide username and password');
  }

  // Find user
  const user = await prisma.user.findUnique({
    where: { username },
    include: {
      activationCode: true
    }
  });

  if (!user || !(await bcrypt.compare(password, user.password))) {
    throw new AppError(401, 'Invalid credentials');
  }

  if (!user.isActive) {
    throw new AppError(401, 'Your account is deactivated');
  }

  // Check activation code validity
  if (user.activationCode && (!user.activationCode.isActive || user.activationCode.expiresAt < new Date())) {
    throw new AppError(401, 'Your activation code has expired');
  }

  // Generate token
  const token = generateToken(user.id, user.role);

  // Remove sensitive data
  const { password: _, ...userWithoutPassword } = user;

  res.status(200).json({
    status: 'success',
    data: {
      user: userWithoutPassword,
      token
    }
  });
});

const adminLogin = catchAsync(async (req, res) => {
  const { username, password } = req.body;

  if (!username || !password) {
    throw new AppError(400, 'Please provide username and password');
  }

  // Find admin user
  const user = await prisma.user.findFirst({
    where: {
      username,
      role: 'ADMIN'
    }
  });

  if (!user || !(await bcrypt.compare(password, user.password))) {
    throw new AppError(401, 'Invalid credentials');
  }

  if (!user.isActive) {
    throw new AppError(401, 'Your account is deactivated');
  }

  // Generate token
  const token = generateToken(user.id, user.role);

  // Remove sensitive data
  const { password: _, ...userWithoutPassword } = user;

  res.status(200).json({
    status: 'success',
    data: {
      user: userWithoutPassword,
      token
    }
  });
});

const getMe = catchAsync(async (req, res) => {
  const user = await prisma.user.findUnique({
    where: { id: req.user.id },
    select: {
      id: true,
      username: true,
      email: true,
      phoneNumber: true,
      role: true,
      isActive: true,
      createdAt: true
    }
  });

  res.status(200).json({
    status: 'success',
    data: { user }
  });
});

const updatePassword = catchAsync(async (req, res) => {
  const { currentPassword, newPassword } = req.body;

  const user = await prisma.user.findUnique({
    where: { id: req.user.id }
  });

  if (!(await bcrypt.compare(currentPassword, user.password))) {
    throw new AppError(401, 'Current password is incorrect');
  }

  const hashedPassword = await bcrypt.hash(newPassword, 12);

  await prisma.user.update({
    where: { id: req.user.id },
    data: { password: hashedPassword }
  });

  res.status(200).json({
    status: 'success',
    message: 'Password updated successfully'
  });
});

module.exports = {
  register,
  login,
  adminLogin,
  getMe,
  updatePassword
};
