const path = require('path');

// Load environment variables
require('dotenv').config({
  path: path.join(__dirname, '..', '..', process.env.NODE_ENV === 'test' ? '.env.test' : '.env')
});

const config = {
  // Application
  env: process.env.NODE_ENV || 'development',
  port: parseInt(process.env.PORT, 10) || 3001,
  apiUrl: process.env.API_URL || 'http://localhost:3001',
  corsOrigins: process.env.CORS_ORIGINS?.split(',') || ['http://localhost:3000', 'http://localhost:3002'],

  // Database
  database: {
    url: process.env.DATABASE_URL,
    ssl: process.env.NODE_ENV === 'production'
  },

  // Redis
  redis: {
    url: process.env.REDIS_URL || 'redis://localhost:6379',
    prefix: 'financial_bot:'
  },

  // JWT
  jwt: {
    secret: process.env.JWT_SECRET || 'your-super-secret-jwt-key-change-this-in-production',
    expiresIn: process.env.JWT_EXPIRES_IN || '24h'
  },

  // WhatsApp
  whatsapp: {
    sessionDir: process.env.WHATSAPP_SESSION_DIR || './whatsapp-sessions',
    puppeteerArgs: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-dev-shm-usage',
      '--disable-accelerated-2d-canvas',
      '--no-first-run',
      '--no-zygote',
      '--disable-gpu'
    ],
    reconnectInterval: 10000, // 10 seconds
    maxReconnectAttempts: 5
  },

  // Logging
  logging: {
    level: process.env.LOG_LEVEL || 'info',
    directory: path.join(__dirname, '..', '..', 'logs'),
    maxSize: '10m',
    maxFiles: '7d'
  },

  // Security
  security: {
    bcryptRounds: parseInt(process.env.BCRYPT_ROUNDS, 10) || 12,
    rateLimit: {
      windowMs: parseInt(process.env.RATE_LIMIT_WINDOW, 10) || 15 * 60 * 1000, // 15 minutes
      max: parseInt(process.env.RATE_LIMIT_MAX, 10) || 100 // limit each IP to 100 requests per windowMs
    }
  },

  // Default Admin
  defaultAdmin: {
    username: process.env.DEFAULT_ADMIN_USERNAME || 'admin',
    password: process.env.DEFAULT_ADMIN_PASSWORD || 'change-this-in-production',
    email: process.env.DEFAULT_ADMIN_EMAIL || 'admin@example.com'
  },

  // Activation Code
  activationCode: {
    length: parseInt(process.env.ACTIVATION_CODE_LENGTH, 10) || 8,
    defaultDuration: process.env.DEFAULT_ACTIVATION_DURATION || '7d',
    allowedDurations: ['1d', '7d', '30d', '90d', '365d']
  },

  // Transaction Categories
  transactionCategories: {
    expense: [
      'Food & Dining',
      'Transportation',
      'Shopping',
      'Entertainment',
      'Bills & Utilities',
      'Health & Fitness',
      'Travel',
      'Education',
      'Gifts & Donations',
      'Other Expenses'
    ],
    income: [
      'Salary',
      'Investment',
      'Business',
      'Freelance',
      'Gift',
      'Other Income'
    ]
  },

  // Budget Periods
  budgetPeriods: ['DAILY', 'WEEKLY', 'MONTHLY', 'YEARLY'],

  // Backup
  backup: {
    directory: path.join(__dirname, '..', '..', 'backups'),
    schedule: process.env.BACKUP_SCHEDULE || '0 0 * * *', // Daily at midnight
    retention: parseInt(process.env.BACKUP_RETENTION_DAYS, 10) || 30, // 30 days
    maxSize: parseInt(process.env.BACKUP_MAX_SIZE_MB, 10) || 100 // 100 MB
  },

  // Error Messages
  errors: {
    auth: {
      invalidCredentials: 'Invalid credentials',
      unauthorized: 'Unauthorized access',
      tokenExpired: 'Token has expired',
      invalidToken: 'Invalid token'
    },
    whatsapp: {
      notInitialized: 'WhatsApp client not initialized',
      sessionError: 'Error managing WhatsApp session',
      messageError: 'Error sending WhatsApp message'
    },
    backup: {
      createError: 'Error creating backup',
      restoreError: 'Error restoring backup',
      invalidFile: 'Invalid backup file'
    }
  },

  // Validation
  validation: {
    password: {
      minLength: 8,
      requireUppercase: true,
      requireLowercase: true,
      requireNumbers: true,
      requireSpecialChars: true
    },
    transaction: {
      maxAmount: 1000000000, // 1 billion
      minAmount: 0
    }
  }
};

module.exports = config;
