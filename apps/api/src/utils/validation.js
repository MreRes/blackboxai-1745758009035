const { z } = require('zod');
const config = require('../config');

// Common validation schemas
const commonSchemas = {
  uuid: z.string().uuid(),
  date: z.string().datetime(),
  pagination: z.object({
    page: z.number().int().positive().optional().default(1),
    limit: z.number().int().positive().max(100).optional().default(10)
  })
};

// Auth validation schemas
const authSchemas = {
  register: z.object({
    username: z.string().min(3).max(50),
    password: z.string()
      .min(config.validation.password.minLength)
      .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
      .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
      .regex(/[0-9]/, 'Password must contain at least one number')
      .regex(/[^A-Za-z0-9]/, 'Password must contain at least one special character'),
    email: z.string().email().optional(),
    phoneNumber: z.string().regex(/^\+?[1-9]\d{1,14}$/).optional(),
    activationCode: z.string().length(config.activationCode.length)
  }),

  login: z.object({
    username: z.string(),
    password: z.string()
  }),

  updatePassword: z.object({
    currentPassword: z.string(),
    newPassword: z.string()
      .min(config.validation.password.minLength)
      .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
      .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
      .regex(/[0-9]/, 'Password must contain at least one number')
      .regex(/[^A-Za-z0-9]/, 'Password must contain at least one special character')
  })
};

// Transaction validation schemas
const transactionSchemas = {
  create: z.object({
    type: z.enum(['INCOME', 'EXPENSE']),
    amount: z.number()
      .positive()
      .max(config.validation.transaction.maxAmount),
    category: z.string(),
    description: z.string().max(500).optional(),
    date: z.string().datetime().optional(),
    source: z.enum(['manual', 'whatsapp', 'web']).optional().default('web')
  }),

  update: z.object({
    type: z.enum(['INCOME', 'EXPENSE']).optional(),
    amount: z.number()
      .positive()
      .max(config.validation.transaction.maxAmount)
      .optional(),
    category: z.string().optional(),
    description: z.string().max(500).optional(),
    date: z.string().datetime().optional()
  }),

  filter: z.object({
    startDate: z.string().datetime().optional(),
    endDate: z.string().datetime().optional(),
    type: z.enum(['INCOME', 'EXPENSE']).optional(),
    category: z.string().optional(),
    source: z.string().optional(),
    ...commonSchemas.pagination.shape
  })
};

// Budget validation schemas
const budgetSchemas = {
  create: z.object({
    category: z.string(),
    amount: z.number().positive(),
    period: z.enum(['DAILY', 'WEEKLY', 'MONTHLY', 'YEARLY']),
    startDate: z.string().datetime(),
    endDate: z.string().datetime().optional()
  }),

  update: z.object({
    amount: z.number().positive().optional(),
    endDate: z.string().datetime().optional()
  }),

  filter: z.object({
    period: z.enum(['DAILY', 'WEEKLY', 'MONTHLY', 'YEARLY']).optional(),
    startDate: z.string().datetime().optional(),
    endDate: z.string().datetime().optional(),
    ...commonSchemas.pagination.shape
  })
};

// WhatsApp validation schemas
const whatsappSchemas = {
  sendMessage: z.object({
    phoneNumber: z.string().regex(/^\+?[1-9]\d{1,14}$/),
    message: z.string().min(1).max(4096)
  }),

  messageHistory: z.object({
    limit: z.number().int().positive().max(100).optional().default(50)
  })
};

// Backup validation schemas
const backupSchemas = {
  schedule: z.object({
    schedule: z.string().regex(/^(\*|([0-9]|1[0-9]|2[0-9]|3[0-9]|4[0-9]|5[0-9])|\*\/([0-9]|1[0-9]|2[0-9]|3[0-9]|4[0-9]|5[0-9])) (\*|([0-9]|1[0-9]|2[0-3])|\*\/([0-9]|1[0-9]|2[0-3])) (\*|([1-9]|1[0-9]|2[0-9]|3[0-1])|\*\/([1-9]|1[0-9]|2[0-9]|3[0-1])) (\*|([1-9]|1[0-2])|\*\/([1-9]|1[0-2])) (\*|([0-6])|\*\/([0-6]))$/, 
      'Invalid cron expression')
  }),

  cleanup: z.object({
    days: z.number().int().positive().max(365).optional().default(30)
  })
};

// Admin validation schemas
const adminSchemas = {
  createUser: z.object({
    username: z.string().min(3).max(50),
    email: z.string().email().optional(),
    phoneNumber: z.string().regex(/^\+?[1-9]\d{1,14}$/).optional(),
    role: z.enum(['ADMIN', 'USER']).default('USER'),
    isActive: z.boolean().default(true)
  }),

  createActivationCode: z.object({
    userId: commonSchemas.uuid,
    duration: z.enum(config.activationCode.allowedDurations)
  }),

  updateSettings: z.object({
    key: z.string(),
    value: z.string()
  })
};

// Validation middleware
const validate = (schema) => (req, res, next) => {
  try {
    const data = schema.parse({
      ...req.body,
      ...req.query,
      ...req.params
    });
    
    // Add validated data to request
    req.validated = data;
    next();
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        status: 'error',
        message: 'Validation failed',
        errors: error.errors.map(err => ({
          field: err.path.join('.'),
          message: err.message
        }))
      });
    }
    next(error);
  }
};

module.exports = {
  validate,
  schemas: {
    common: commonSchemas,
    auth: authSchemas,
    transaction: transactionSchemas,
    budget: budgetSchemas,
    whatsapp: whatsappSchemas,
    backup: backupSchemas,
    admin: adminSchemas
  }
};
