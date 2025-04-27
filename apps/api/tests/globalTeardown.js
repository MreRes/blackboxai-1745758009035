const { PrismaClient } = require('@prisma/client');
const { createLogger } = require('../src/utils/logger');

const logger = createLogger('test-global-teardown');
const prisma = new PrismaClient();

async function globalTeardown() {
  try {
    logger.info('Starting global test teardown...');

    // Clean up test database
    const models = Reflect.ownKeys(prisma).filter(key => {
      return typeof prisma[key] === 'object' && 
             prisma[key] !== null &&
             'deleteMany' in prisma[key];
    });

    for (const model of models) {
      await prisma[model].deleteMany();
    }
    logger.info('Test database cleaned');

    // Clean up any test files
    const fs = require('fs');
    const path = require('path');
    const testFiles = [
      path.join(__dirname, '..', 'backups'),
      path.join(__dirname, '..', 'logs'),
      path.join(__dirname, '..', 'whatsapp-sessions')
    ];

    for (const file of testFiles) {
      if (fs.existsSync(file)) {
        fs.rmSync(file, { recursive: true, force: true });
      }
    }
    logger.info('Test files cleaned');

    logger.info('Global test teardown completed successfully');
  } catch (error) {
    logger.error('Global test teardown failed:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

module.exports = globalTeardown;
