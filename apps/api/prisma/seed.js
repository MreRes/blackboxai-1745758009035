const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');
const prisma = new PrismaClient();

async function seed() {
  try {
    console.log('🌱 Starting database seed...');

    // Create admin user
    const hashedPassword = await bcrypt.hash(
      process.env.DEFAULT_ADMIN_PASSWORD || 'admin123',
      12
    );

    const admin = await prisma.user.upsert({
      where: { username: 'admin' },
      update: {},
      create: {
        username: process.env.DEFAULT_ADMIN_USERNAME || 'admin',
        password: hashedPassword,
        email: process.env.DEFAULT_ADMIN_EMAIL || 'admin@example.com',
        role: 'ADMIN',
        isActive: true
      }
    });

    console.log('👤 Admin user created:', admin.username);

    // Create default admin settings
    const defaultSettings = [
      {
        key: 'activation_code_length',
        value: process.env.ACTIVATION_CODE_LENGTH || '8'
      },
      {
        key: 'default_activation_duration',
        value: process.env.DEFAULT_ACTIVATION_DURATION || '7d'
      },
      {
        key: 'max_devices_per_user',
        value: '3'
      },
      {
        key: 'allowed_transaction_categories',
        value: JSON.stringify([
          'Food & Dining',
          'Transportation',
          'Shopping',
          'Entertainment',
          'Bills & Utilities',
          'Health & Fitness',
          'Travel',
          'Education',
          'Gifts & Donations',
          'Salary',
          'Investment',
          'Other Income',
          'Other Expenses'
        ])
      },
      {
        key: 'budget_periods',
        value: JSON.stringify(['DAILY', 'WEEKLY', 'MONTHLY', 'YEARLY'])
      },
      {
        key: 'whatsapp_session_timeout',
        value: '24h'
      },
      {
        key: 'backup_schedule',
        value: '0 0 * * *' // Daily at midnight
      },
      {
        key: 'max_transaction_amount',
        value: '100000000' // 100 million (adjust as needed)
      }
    ];

    for (const setting of defaultSettings) {
      await prisma.adminSettings.upsert({
        where: { key: setting.key },
        update: { value: setting.value },
        create: setting
      });
    }

    console.log('⚙️ Default settings created');

    // Create sample activation codes for testing
    if (process.env.NODE_ENV === 'development') {
      const testActivationCode = await prisma.activationCode.upsert({
        where: { code: 'TEST123' },
        update: {},
        create: {
          code: 'TEST123',
          userId: admin.id,
          expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
          isActive: true
        }
      });

      console.log('🎫 Test activation code created:', testActivationCode.code);
    }

    // Create sample categories (if needed)
    const sampleCategories = [
      { name: 'Food & Dining', icon: '🍽️', type: 'EXPENSE' },
      { name: 'Transportation', icon: '🚗', type: 'EXPENSE' },
      { name: 'Shopping', icon: '🛍️', type: 'EXPENSE' },
      { name: 'Bills & Utilities', icon: '📱', type: 'EXPENSE' },
      { name: 'Salary', icon: '💰', type: 'INCOME' },
      { name: 'Investment', icon: '📈', type: 'INCOME' }
    ];

    // Note: Categories are stored as strings in transactions,
    // but we can store the metadata in AdminSettings for reference
    await prisma.adminSettings.upsert({
      where: { key: 'category_metadata' },
      update: { value: JSON.stringify(sampleCategories) },
      create: {
        key: 'category_metadata',
        value: JSON.stringify(sampleCategories)
      }
    });

    console.log('📊 Category metadata created');

    console.log('✅ Database seed completed successfully!');
  } catch (error) {
    console.error('❌ Error seeding database:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

seed()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
