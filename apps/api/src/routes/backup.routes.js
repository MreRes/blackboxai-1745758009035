const express = require('express');
const { verifyToken, restrictTo } = require('../middleware/auth');
const {
  createBackup,
  restoreBackup,
  listBackups,
  deleteBackup,
  updateBackupSchedule,
  getBackupStatus
} = require('../controllers/backupController');

const router = express.Router();

// Protect all routes and restrict to admin only
router.use(verifyToken);
router.use(restrictTo('ADMIN'));

// Backup management routes
router.post('/create', createBackup);
router.post('/restore/:fileName', restoreBackup);
router.get('/list', listBackups);
router.delete('/:fileName', deleteBackup);
router.put('/schedule', updateBackupSchedule);
router.get('/status', getBackupStatus);

// Download backup file
router.get('/download/:fileName', async (req, res) => {
  const { fileName } = req.params;
  const path = require('path');
  const fs = require('fs');

  const backupPath = path.join(process.cwd(), 'backups', fileName);

  // Check if file exists
  if (!fs.existsSync(backupPath)) {
    return res.status(404).json({
      status: 'error',
      message: 'Backup file not found'
    });
  }

  // Log download activity
  const { createLogger } = require('../utils/logger');
  const logger = createLogger('backup-routes');
  logger.info(`Backup download requested: ${fileName} by user ${req.user.id}`);

  // Record download in admin settings
  const { PrismaClient } = require('@prisma/client');
  const prisma = new PrismaClient();
  await prisma.adminSettings.create({
    data: {
      key: `backup_download_${Date.now()}`,
      value: JSON.stringify({
        fileName,
        userId: req.user.id,
        downloadedAt: new Date()
      })
    }
  });

  // Send file
  res.download(backupPath);
});

// Backup verification
router.post('/verify/:fileName', async (req, res) => {
  const { fileName } = req.params;
  const path = require('path');
  const fs = require('fs');
  const { createLogger } = require('../utils/logger');
  const logger = createLogger('backup-routes');

  try {
    const backupPath = path.join(process.cwd(), 'backups', fileName);

    // Check if file exists
    if (!fs.existsSync(backupPath)) {
      return res.status(404).json({
        status: 'error',
        message: 'Backup file not found'
      });
    }

    // Read first few lines to verify it's a valid PostgreSQL dump
    const { exec } = require('child_process');
    const command = `head -n 10 ${backupPath} | grep -E "PostgreSQL database dump"`;
    
    exec(command, (error, stdout, stderr) => {
      if (error || !stdout) {
        logger.error(`Backup verification failed for ${fileName}:`, error || 'Invalid format');
        return res.status(400).json({
          status: 'error',
          message: 'Invalid backup file format'
        });
      }

      // Get file stats
      const stats = fs.statSync(backupPath);

      res.status(200).json({
        status: 'success',
        data: {
          fileName,
          size: stats.size,
          createdAt: stats.birthtime,
          isValid: true
        }
      });
    });
  } catch (error) {
    logger.error(`Backup verification error for ${fileName}:`, error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to verify backup file'
    });
  }
});

// Backup cleanup
router.post('/cleanup', async (req, res) => {
  const { days = 30 } = req.body;
  const path = require('path');
  const fs = require('fs');
  const { createLogger } = require('../utils/logger');
  const logger = createLogger('backup-routes');

  try {
    const backupDir = path.join(process.cwd(), 'backups');
    const files = fs.readdirSync(backupDir);
    const now = new Date();
    let deletedCount = 0;

    for (const file of files) {
      const filePath = path.join(backupDir, file);
      const stats = fs.statSync(filePath);
      const daysOld = (now - stats.birthtime) / (1000 * 60 * 60 * 24);

      if (daysOld > days) {
        fs.unlinkSync(filePath);
        deletedCount++;
        logger.info(`Deleted old backup: ${file}`);
      }
    }

    res.status(200).json({
      status: 'success',
      data: {
        deletedCount,
        message: `Deleted ${deletedCount} backup(s) older than ${days} days`
      }
    });
  } catch (error) {
    logger.error('Backup cleanup error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to cleanup old backups'
    });
  }
});

module.exports = router;
