const request = require('supertest');
const fs = require('fs');
const path = require('path');
const app = require('../../src/app');
const TestUtils = require('../testUtils');
const { PrismaClient } = require('@prisma/client');
const dbBackup = require('../../src/utils/dbBackup');

const prisma = new PrismaClient();

describe('Backup API', () => {
  let admin;
  let adminToken;
  let user;
  let userToken;
  let backupDir;

  beforeEach(async () => {
    await TestUtils.cleanup();
    
    // Create admin user
    admin = await TestUtils.createTestAdmin();
    adminToken = TestUtils.generateToken(admin.id, 'ADMIN');

    // Create regular user
    user = await TestUtils.createTestUser();
    userToken = TestUtils.generateToken(user.id);

    // Set up backup directory
    backupDir = path.join(__dirname, '..', '..', 'backups');
    if (!fs.existsSync(backupDir)) {
      fs.mkdirSync(backupDir, { recursive: true });
    }

    // Create some test data
    await Promise.all([
      TestUtils.createTestTransaction(user.id, {
        type: 'EXPENSE',
        amount: 100000,
        category: 'Food'
      }),
      TestUtils.createTestBudget(user.id, {
        category: 'Food',
        amount: 1000000,
        period: 'MONTHLY'
      })
    ]);
  });

  afterEach(() => {
    // Clean up backup files
    if (fs.existsSync(backupDir)) {
      const files = fs.readdirSync(backupDir);
      for (const file of files) {
        fs.unlinkSync(path.join(backupDir, file));
      }
    }
  });

  describe('POST /api/v1/backups/create', () => {
    it('should create a database backup', async () => {
      const response = await TestUtils.authenticatedRequest(
        'POST',
        '/api/v1/backups/create',
        null,
        adminToken
      );

      TestUtils.expect.success(response);
      expect(response.body.data).toHaveProperty('fileName');
      
      // Verify backup file exists
      const backupPath = path.join(backupDir, response.body.data.fileName);
      expect(fs.existsSync(backupPath)).toBe(true);
    });

    it('should require admin access', async () => {
      const response = await TestUtils.authenticatedRequest(
        'POST',
        '/api/v1/backups/create',
        null,
        userToken
      );

      TestUtils.expect.error(response, 403);
    });
  });

  describe('POST /api/v1/backups/restore/:fileName', () => {
    let backupFileName;

    beforeEach(async () => {
      // Create a backup
      const result = await dbBackup.createBackup();
      backupFileName = result.fileName;
    });

    it('should restore from backup with valid admin password', async () => {
      const response = await TestUtils.authenticatedRequest(
        'POST',
        `/api/v1/backups/restore/${backupFileName}`,
        { password: 'admin123' }, // Default admin password from seed
        adminToken
      );

      TestUtils.expect.success(response);
    });

    it('should require valid admin password', async () => {
      const response = await TestUtils.authenticatedRequest(
        'POST',
        `/api/v1/backups/restore/${backupFileName}`,
        { password: 'wrongpassword' },
        adminToken
      );

      TestUtils.expect.error(response, 401);
    });

    it('should handle invalid backup file', async () => {
      const response = await TestUtils.authenticatedRequest(
        'POST',
        '/api/v1/backups/restore/nonexistent.sql',
        { password: 'admin123' },
        adminToken
      );

      TestUtils.expect.error(response, 400);
    });
  });

  describe('GET /api/v1/backups/list', () => {
    beforeEach(async () => {
      // Create multiple backups
      await Promise.all([
        dbBackup.createBackup(),
        dbBackup.createBackup()
      ]);
    });

    it('should list all backups', async () => {
      const response = await TestUtils.authenticatedRequest(
        'GET',
        '/api/v1/backups/list',
        null,
        adminToken
      );

      TestUtils.expect.success(response);
      expect(Array.isArray(response.body.data.backups)).toBe(true);
      expect(response.body.data.backups.length).toBeGreaterThan(0);
      expect(response.body.data.backups[0]).toHaveProperty('fileName');
      expect(response.body.data.backups[0]).toHaveProperty('size');
      expect(response.body.data.backups[0]).toHaveProperty('createdAt');
    });
  });

  describe('DELETE /api/v1/backups/:fileName', () => {
    let backupFileName;

    beforeEach(async () => {
      const result = await dbBackup.createBackup();
      backupFileName = result.fileName;
    });

    it('should delete backup file', async () => {
      const response = await TestUtils.authenticatedRequest(
        'DELETE',
        `/api/v1/backups/${backupFileName}`,
        null,
        adminToken
      );

      TestUtils.expect.success(response);
      
      // Verify file is deleted
      const backupPath = path.join(backupDir, backupFileName);
      expect(fs.existsSync(backupPath)).toBe(false);
    });
  });

  describe('PUT /api/v1/backups/schedule', () => {
    it('should update backup schedule', async () => {
      const schedule = '0 0 * * *'; // Daily at midnight

      const response = await TestUtils.authenticatedRequest(
        'PUT',
        '/api/v1/backups/schedule',
        { schedule },
        adminToken
      );

      TestUtils.expect.success(response);

      // Verify schedule is saved
      const setting = await prisma.adminSettings.findUnique({
        where: { key: 'backup_schedule' }
      });
      expect(setting.value).toBe(schedule);
    });

    it('should validate cron expression', async () => {
      const response = await TestUtils.authenticatedRequest(
        'PUT',
        '/api/v1/backups/schedule',
        { schedule: 'invalid-cron' },
        adminToken
      );

      TestUtils.expect.validation(response);
    });
  });

  describe('GET /api/v1/backups/status', () => {
    beforeEach(async () => {
      // Create some backups
      await Promise.all([
        dbBackup.createBackup(),
        dbBackup.createBackup()
      ]);

      // Set backup schedule
      await prisma.adminSettings.upsert({
        where: { key: 'backup_schedule' },
        update: { value: '0 0 * * *' },
        create: {
          key: 'backup_schedule',
          value: '0 0 * * *'
        }
      });
    });

    it('should return backup system status', async () => {
      const response = await TestUtils.authenticatedRequest(
        'GET',
        '/api/v1/backups/status',
        null,
        adminToken
      );

      TestUtils.expect.success(response);
      expect(response.body.data).toMatchObject({
        schedule: expect.any(String),
        latestBackup: expect.any(Object),
        storage: {
          totalSize: expect.any(Number),
          fileCount: expect.any(Number),
          directory: expect.any(String)
        }
      });
    });
  });

  describe('POST /api/v1/backups/verify/:fileName', () => {
    let backupFileName;

    beforeEach(async () => {
      const result = await dbBackup.createBackup();
      backupFileName = result.fileName;
    });

    it('should verify valid backup file', async () => {
      const response = await TestUtils.authenticatedRequest(
        'POST',
        `/api/v1/backups/verify/${backupFileName}`,
        null,
        adminToken
      );

      TestUtils.expect.success(response);
      expect(response.body.data).toMatchObject({
        fileName: backupFileName,
        isValid: true
      });
    });

    it('should handle invalid backup file', async () => {
      // Create an invalid backup file
      const invalidPath = path.join(backupDir, 'invalid.sql');
      fs.writeFileSync(invalidPath, 'invalid content');

      const response = await TestUtils.authenticatedRequest(
        'POST',
        '/api/v1/backups/verify/invalid.sql',
        null,
        adminToken
      );

      TestUtils.expect.error(response, 400);
    });
  });

  describe('POST /api/v1/backups/cleanup', () => {
    beforeEach(async () => {
      // Create some old backups
      const oldDate = new Date();
      oldDate.setDate(oldDate.getDate() - 31);
      
      const oldBackupPath = path.join(backupDir, 'old-backup.sql');
      fs.writeFileSync(oldBackupPath, 'test backup');
      fs.utimesSync(oldBackupPath, oldDate, oldDate);
    });

    it('should clean up old backups', async () => {
      const response = await TestUtils.authenticatedRequest(
        'POST',
        '/api/v1/backups/cleanup',
        { days: 30 },
        adminToken
      );

      TestUtils.expect.success(response);
      expect(response.body.data.deletedCount).toBeGreaterThan(0);

      // Verify old backups are deleted
      const files = fs.readdirSync(backupDir);
      const oldFiles = files.filter(file => {
        const stats = fs.statSync(path.join(backupDir, file));
        const daysOld = (Date.now() - stats.birthtime.getTime()) / (1000 * 60 * 60 * 24);
        return daysOld > 30;
      });
      expect(oldFiles.length).toBe(0);
    });
  });
});
