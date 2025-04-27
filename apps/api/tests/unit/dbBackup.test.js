const fs = require('fs');
const path = require('path');
const { exec } = require('child_process');
const { PrismaClient } = require('@prisma/client');
const dbBackup = require('../../src/utils/dbBackup');
const TestUtils = require('../testUtils');

const prisma = new PrismaClient();

jest.mock('child_process');

describe('Database Backup Utility', () => {
  let backupDir;
  let user;

  beforeEach(async () => {
    await TestUtils.cleanup();

    // Create test user and some data
    user = await TestUtils.createTestUser();
    await Promise.all([
      TestUtils.createTestTransaction(user.id),
      TestUtils.createTestBudget(user.id)
    ]);

    // Set up backup directory
    backupDir = path.join(__dirname, '..', '..', 'backups');
    if (!fs.existsSync(backupDir)) {
      fs.mkdirSync(backupDir, { recursive: true });
    }

    // Mock exec for database operations
    exec.mockImplementation((command, callback) => {
      callback(null, { stdout: 'Success', stderr: '' });
    });
  });

  afterEach(() => {
    // Clean up backup files
    if (fs.existsSync(backupDir)) {
      const files = fs.readdirSync(backupDir);
      for (const file of files) {
        fs.unlinkSync(path.join(backupDir, file));
      }
    }
    jest.clearAllMocks();
  });

  describe('Backup Creation', () => {
    it('should create a backup file', async () => {
      const result = await dbBackup.createBackup();

      expect(result.success).toBe(true);
      expect(result.fileName).toMatch(/backup-.*\.sql$/);
      expect(fs.existsSync(path.join(backupDir, result.fileName))).toBe(true);

      // Verify backup record in database
      const backupRecord = await prisma.adminSettings.findFirst({
        where: {
          key: expect.stringMatching(/^backup_\d+$/)
        }
      });
      expect(backupRecord).toBeTruthy();
      expect(JSON.parse(backupRecord.value)).toMatchObject({
        fileName: result.fileName,
        type: 'auto'
      });
    });

    it('should handle backup creation errors', async () => {
      exec.mockImplementation((command, callback) => {
        callback(new Error('Backup failed'), null);
      });

      await expect(dbBackup.createBackup()).rejects.toThrow('Failed to create database backup');
    });
  });

  describe('Backup Restoration', () => {
    let backupFileName;

    beforeEach(async () => {
      // Create a test backup
      const result = await dbBackup.createBackup();
      backupFileName = result.fileName;
    });

    it('should restore from backup file', async () => {
      const result = await dbBackup.restoreBackup(backupFileName);

      expect(result.success).toBe(true);
      expect(result.message).toMatch(/restored successfully/i);
    });

    it('should handle missing backup file', async () => {
      await expect(dbBackup.restoreBackup('nonexistent.sql'))
        .rejects.toThrow('Backup file not found');
    });

    it('should handle restoration errors', async () => {
      exec.mockImplementation((command, callback) => {
        callback(new Error('Restore failed'), null);
      });

      await expect(dbBackup.restoreBackup(backupFileName))
        .rejects.toThrow('Failed to restore database backup');
    });
  });

  describe('Backup Management', () => {
    beforeEach(async () => {
      // Create multiple test backups
      await Promise.all([
        dbBackup.createBackup(),
        dbBackup.createBackup()
      ]);
    });

    it('should list all backups', async () => {
      const backups = await dbBackup.listBackups();

      expect(Array.isArray(backups)).toBe(true);
      expect(backups.length).toBeGreaterThan(0);
      expect(backups[0]).toMatchObject({
        fileName: expect.stringMatching(/backup-.*\.sql$/),
        size: expect.any(Number),
        createdAt: expect.any(Date)
      });
    });

    it('should delete specific backup', async () => {
      const backups = await dbBackup.listBackups();
      const backupToDelete = backups[0];

      const result = await dbBackup.deleteBackup(backupToDelete.fileName);

      expect(result.success).toBe(true);
      expect(fs.existsSync(path.join(backupDir, backupToDelete.fileName)))
        .toBe(false);

      // Verify backup record is removed
      const backupRecord = await prisma.adminSettings.findFirst({
        where: {
          value: {
            contains: backupToDelete.fileName
          }
        }
      });
      expect(backupRecord).toBeNull();
    });

    it('should handle deletion of nonexistent backup', async () => {
      await expect(dbBackup.deleteBackup('nonexistent.sql'))
        .rejects.toThrow('Backup file not found');
    });
  });

  describe('Backup Scheduling', () => {
    beforeEach(async () => {
      // Set up test schedule
      await prisma.adminSettings.upsert({
        where: { key: 'backup_schedule' },
        update: { value: '0 0 * * *' },
        create: {
          key: 'backup_schedule',
          value: '0 0 * * *'
        }
      });
    });

    it('should initialize backup schedule', async () => {
      const CronJob = require('cron').CronJob;
      const cronSpy = jest.spyOn(CronJob.prototype, 'start');

      await dbBackup.scheduleBackup();

      expect(cronSpy).toHaveBeenCalled();
    });

    it('should handle missing schedule configuration', async () => {
      await prisma.adminSettings.delete({
        where: { key: 'backup_schedule' }
      });

      const logger = require('../../src/utils/logger').createLogger('test');
      const warnSpy = jest.spyOn(logger, 'warn');

      await dbBackup.scheduleBackup();

      expect(warnSpy).toHaveBeenCalledWith(
        expect.stringContaining('No backup schedule found')
      );
    });

    it('should clean up old backups', async () => {
      // Create an old backup file
      const oldDate = new Date();
      oldDate.setDate(oldDate.getDate() - 31);
      
      const oldBackupPath = path.join(backupDir, 'old-backup.sql');
      fs.writeFileSync(oldBackupPath, 'test backup');
      fs.utimesSync(oldBackupPath, oldDate, oldDate);

      // Run backup with cleanup
      await dbBackup.createBackup();

      // Verify old backup is removed
      expect(fs.existsSync(oldBackupPath)).toBe(false);
    });
  });

  describe('Database URL Parsing', () => {
    it('should parse database URL correctly', () => {
      process.env.DATABASE_URL = 'postgresql://user:pass@localhost:5432/dbname';
      
      const config = dbBackup.parseDatabaseUrl();
      
      expect(config).toEqual({
        host: 'localhost',
        port: '5432',
        database: 'dbname',
        user: 'user',
        password: 'pass'
      });
    });

    it('should handle missing database URL', () => {
      delete process.env.DATABASE_URL;
      
      expect(() => dbBackup.parseDatabaseUrl())
        .toThrow('DATABASE_URL environment variable is not set');
    });
  });
});
