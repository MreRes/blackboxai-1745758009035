const { exec } = require('child_process');
const path = require('path');
const fs = require('fs');
const { promisify } = require('util');
const { createLogger } = require('./logger');
const { PrismaClient } = require('@prisma/client');

const execAsync = promisify(exec);
const logger = createLogger('db-backup');
const prisma = new PrismaClient();

class DatabaseBackup {
  constructor() {
    this.backupDir = path.join(process.cwd(), 'backups');
    this.ensureBackupDir();
  }

  ensureBackupDir() {
    if (!fs.existsSync(this.backupDir)) {
      fs.mkdirSync(this.backupDir, { recursive: true });
    }
  }

  getBackupFileName() {
    const date = new Date().toISOString().replace(/[:.]/g, '-');
    return `backup-${date}.sql`;
  }

  async createBackup() {
    try {
      const fileName = this.getBackupFileName();
      const filePath = path.join(this.backupDir, fileName);

      const { host, port, database, user, password } = this.parseDatabaseUrl();

      const command = `PGPASSWORD=${password} pg_dump -h ${host} -p ${port} -U ${user} -d ${database} -F p > ${filePath}`;

      await execAsync(command);

      // Create backup record in database
      await prisma.adminSettings.create({
        data: {
          key: `backup_${Date.now()}`,
          value: JSON.stringify({
            fileName,
            createdAt: new Date(),
            size: fs.statSync(filePath).size,
            type: 'auto'
          })
        }
      });

      logger.info(`Backup created successfully: ${fileName}`);
      return { success: true, fileName };
    } catch (error) {
      logger.error('Backup creation failed:', error);
      throw new Error('Failed to create database backup');
    }
  }

  async restoreBackup(fileName) {
    try {
      const filePath = path.join(this.backupDir, fileName);

      if (!fs.existsSync(filePath)) {
        throw new Error('Backup file not found');
      }

      const { host, port, database, user, password } = this.parseDatabaseUrl();

      // Drop existing connections
      await prisma.$executeRaw`SELECT pg_terminate_backend(pid) 
        FROM pg_stat_activity 
        WHERE datname = ${database} AND pid <> pg_backend_pid()`;

      // Restore from backup
      const command = `PGPASSWORD=${password} psql -h ${host} -p ${port} -U ${user} -d ${database} < ${filePath}`;

      await execAsync(command);

      logger.info(`Backup restored successfully from: ${fileName}`);
      return { success: true, message: 'Backup restored successfully' };
    } catch (error) {
      logger.error('Backup restoration failed:', error);
      throw new Error('Failed to restore database backup');
    }
  }

  async listBackups() {
    try {
      const files = fs.readdirSync(this.backupDir);
      const backups = files
        .filter(file => file.endsWith('.sql'))
        .map(file => {
          const filePath = path.join(this.backupDir, file);
          const stats = fs.statSync(filePath);
          return {
            fileName: file,
            size: stats.size,
            createdAt: stats.birthtime
          };
        })
        .sort((a, b) => b.createdAt - a.createdAt);

      return backups;
    } catch (error) {
      logger.error('Error listing backups:', error);
      throw new Error('Failed to list backups');
    }
  }

  async deleteBackup(fileName) {
    try {
      const filePath = path.join(this.backupDir, fileName);

      if (!fs.existsSync(filePath)) {
        throw new Error('Backup file not found');
      }

      fs.unlinkSync(filePath);

      // Remove backup record from database
      await prisma.adminSettings.deleteMany({
        where: {
          value: {
            contains: fileName
          }
        }
      });

      logger.info(`Backup deleted successfully: ${fileName}`);
      return { success: true, message: 'Backup deleted successfully' };
    } catch (error) {
      logger.error('Backup deletion failed:', error);
      throw new Error('Failed to delete backup');
    }
  }

  async scheduleBackup() {
    try {
      const setting = await prisma.adminSettings.findUnique({
        where: { key: 'backup_schedule' }
      });

      if (!setting) {
        logger.warn('No backup schedule found in settings');
        return;
      }

      const schedule = setting.value; // Cron expression
      const CronJob = require('cron').CronJob;

      new CronJob(schedule, async () => {
        try {
          await this.createBackup();
          logger.info('Scheduled backup completed successfully');

          // Clean up old backups (keep last 30 days)
          const thirtyDaysAgo = new Date();
          thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

          const backups = await this.listBackups();
          for (const backup of backups) {
            if (backup.createdAt < thirtyDaysAgo) {
              await this.deleteBackup(backup.fileName);
            }
          }
        } catch (error) {
          logger.error('Scheduled backup failed:', error);
        }
      }, null, true);

      logger.info('Backup schedule initialized');
    } catch (error) {
      logger.error('Failed to initialize backup schedule:', error);
    }
  }

  parseDatabaseUrl() {
    const url = new URL(process.env.DATABASE_URL);
    return {
      host: url.hostname,
      port: url.port || '5432',
      database: url.pathname.slice(1),
      user: url.username,
      password: url.password
    };
  }
}

module.exports = new DatabaseBackup();
