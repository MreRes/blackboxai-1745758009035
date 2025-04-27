const { AppError, catchAsync } = require('../middleware/errorHandler');
const { createLogger } = require('../utils/logger');
const dbBackup = require('../utils/dbBackup');

const logger = createLogger('backup-controller');

const createBackup = catchAsync(async (req, res) => {
  const result = await dbBackup.createBackup();

  res.status(200).json({
    status: 'success',
    data: result
  });
});

const restoreBackup = catchAsync(async (req, res) => {
  const { fileName } = req.params;

  if (!fileName) {
    throw new AppError(400, 'Backup file name is required');
  }

  // Verify admin password before restore
  const { password } = req.body;
  if (!password) {
    throw new AppError(400, 'Admin password is required for restoration');
  }

  const bcrypt = require('bcryptjs');
  const { PrismaClient } = require('@prisma/client');
  const prisma = new PrismaClient();

  const admin = await prisma.user.findFirst({
    where: {
      role: 'ADMIN',
      id: req.user.id
    }
  });

  if (!admin || !(await bcrypt.compare(password, admin.password))) {
    throw new AppError(401, 'Invalid admin password');
  }

  const result = await dbBackup.restoreBackup(fileName);

  res.status(200).json({
    status: 'success',
    data: result
  });
});

const listBackups = catchAsync(async (req, res) => {
  const backups = await dbBackup.listBackups();

  res.status(200).json({
    status: 'success',
    data: {
      backups
    }
  });
});

const deleteBackup = catchAsync(async (req, res) => {
  const { fileName } = req.params;

  if (!fileName) {
    throw new AppError(400, 'Backup file name is required');
  }

  const result = await dbBackup.deleteBackup(fileName);

  res.status(200).json({
    status: 'success',
    data: result
  });
});

const updateBackupSchedule = catchAsync(async (req, res) => {
  const { schedule } = req.body;

  if (!schedule) {
    throw new AppError(400, 'Backup schedule (cron expression) is required');
  }

  // Validate cron expression
  const cron = require('cron-validator');
  if (!cron.isValidCron(schedule)) {
    throw new AppError(400, 'Invalid cron expression');
  }

  const { PrismaClient } = require('@prisma/client');
  const prisma = new PrismaClient();

  await prisma.adminSettings.upsert({
    where: { key: 'backup_schedule' },
    update: { value: schedule },
    create: {
      key: 'backup_schedule',
      value: schedule
    }
  });

  // Reinitialize backup schedule
  await dbBackup.scheduleBackup();

  res.status(200).json({
    status: 'success',
    message: 'Backup schedule updated successfully'
  });
});

const getBackupStatus = catchAsync(async (req, res) => {
  const { PrismaClient } = require('@prisma/client');
  const prisma = new PrismaClient();

  // Get backup schedule
  const scheduleSetting = await prisma.adminSettings.findUnique({
    where: { key: 'backup_schedule' }
  });

  // Get latest backup
  const backups = await dbBackup.listBackups();
  const latestBackup = backups[0];

  // Get backup storage info
  const fs = require('fs');
  const path = require('path');
  const backupDir = path.join(process.cwd(), 'backups');
  let totalSize = 0;
  let fileCount = 0;

  if (fs.existsSync(backupDir)) {
    const files = fs.readdirSync(backupDir);
    fileCount = files.length;
    totalSize = files.reduce((acc, file) => {
      const filePath = path.join(backupDir, file);
      return acc + fs.statSync(filePath).size;
    }, 0);
  }

  res.status(200).json({
    status: 'success',
    data: {
      schedule: scheduleSetting?.value || 'Not configured',
      latestBackup: latestBackup || null,
      storage: {
        totalSize,
        fileCount,
        directory: backupDir
      }
    }
  });
});

module.exports = {
  createBackup,
  restoreBackup,
  listBackups,
  deleteBackup,
  updateBackupSchedule,
  getBackupStatus
};
