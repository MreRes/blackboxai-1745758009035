#!/usr/bin/env node
const { execSync } = require('child_process');
const { PrismaClient } = require('@prisma/client');
const { createLogger } = require('../src/utils/logger');

const logger = createLogger('db-init');
const prisma = new PrismaClient();

async function main() {
  try {
    logger.info('Starting database initialization...');

    // Run migrations
    logger.info('Running database migrations...');
    execSync('npx prisma migrate deploy', { stdio: 'inherit' });

    // Generate Prisma Client
    logger.info('Generating Prisma Client...');
    execSync('npx prisma generate', { stdio: 'inherit' });

    // Run database seed
    logger.info('Running database seed...');
    execSync('node prisma/seed.js', { stdio: 'inherit' });

    // Verify database connection
    logger.info('Verifying database connection...');
    await prisma.$queryRaw`SELECT 1`;

    // Check if admin user exists
    const adminCount = await prisma.user.count({
      where: { role: 'ADMIN' }
    });

    if (adminCount === 0) {
      logger.warn('No admin user found. Please run the seed script.');
    } else {
      logger.info(`Found ${adminCount} admin user(s)`);
    }

    // Check required tables
    const requiredTables = [
      'User',
      'ActivationCode',
      'Transaction',
      'Budget',
      'WhatsAppSession',
      'AdminSettings'
    ];

    for (const table of requiredTables) {
      const count = await prisma[table].count();
      logger.info(`Table ${table}: ${count} records`);
    }

    logger.info('Database initialization completed successfully!');
    process.exit(0);
  } catch (error) {
    logger.error('Database initialization failed:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

// Run the initialization
main();
