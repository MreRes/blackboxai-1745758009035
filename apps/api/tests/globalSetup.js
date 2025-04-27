const { execSync } = require('child_process');
const { PrismaClient } = require('@prisma/client');
const { createLogger } = require('../src/utils/logger');

const logger = createLogger('test-global-setup');
const prisma = new PrismaClient();

async function globalSetup() {
  try {
    logger.info('Starting global test setup...');

    // Ensure we're using test environment
    process.env.NODE_ENV = 'test';
    
    // Set up test database
    if (!process.env.TEST_DATABASE_URL) {
      throw new Error('TEST_DATABASE_URL environment variable is not set');
    }

    // Run migrations on test database
    logger.info('Running migrations on test database...');
    execSync('npx prisma migrate deploy', {
      env: {
        ...process.env,
        DATABASE_URL: process.env.TEST_DATABASE_URL
      }
    });

    // Create test admin user
    const adminExists = await prisma.user.findFirst({
      where: { role: 'ADMIN' }
    });

    if (!adminExists) {
      const bcrypt = require('bcryptjs');
      await prisma.user.create({
        data: {
          username: 'testadmin',
          password: await bcrypt.hash('admin123', 12),
          email: 'testadmin@example.com',
          role: 'ADMIN',
          isActive: true
        }
      });
      logger.info('Created test admin user');
    }

    // Create test settings
    const settings = [
      { key: 'activation_code_length', value: '8' },
      { key: 'default_activation_duration', value: '7d' },
      { key: 'backup_schedule', value: '0 0 * * *' }
    ];

    for (const setting of settings) {
      await prisma.adminSettings.upsert({
        where: { key: setting.key },
        update: { value: setting.value },
        create: setting
      });
    }
    logger.info('Created test settings');

    // Create test categories
    const categories = [
      { name: 'Food', type: 'EXPENSE' },
      { name: 'Transport', type: 'EXPENSE' },
      { name: 'Salary', type: 'INCOME' }
    ];

    await prisma.adminSettings.upsert({
      where: { key: 'category_metadata' },
      update: { value: JSON.stringify(categories) },
      create: {
        key: 'category_metadata',
        value: JSON.stringify(categories)
      }
    });
    logger.info('Created test categories');

    logger.info('Global test setup completed successfully');
  } catch (error) {
    logger.error('Global test setup failed:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

module.exports = globalSetup;
