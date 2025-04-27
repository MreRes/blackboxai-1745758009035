const rateLimit = require('express-rate-limit');
const helmet = require('helmet');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const config = require('../config');
const { createLogger } = require('./logger');
const { AppError } = require('../middleware/errorHandler');

const logger = createLogger('security');

/**
 * Security Utilities
 */
class Security {
  /**
   * Configure security middleware
   * @param {Object} app - Express application
   */
  static configureMiddleware(app) {
    // Basic security headers
    app.use(helmet());

    // CORS configuration
    app.use(cors({
      origin: config.corsOrigins,
      credentials: true,
      methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
      allowedHeaders: ['Content-Type', 'Authorization']
    }));

    // Rate limiting
    app.use(this.configureRateLimit());

    // Body parser limits
    app.use(express.json({ limit: '10kb' }));
    app.use(express.urlencoded({ extended: true, limit: '10kb' }));

    // Security headers
    app.use(this.securityHeaders);

    logger.info('Security middleware configured');
  }

  /**
   * Configure rate limiting
   * @returns {Function} Rate limit middleware
   */
  static configureRateLimit() {
    return rateLimit({
      windowMs: config.security.rateLimit.windowMs,
      max: config.security.rateLimit.max,
      message: {
        status: 'error',
        message: 'Too many requests, please try again later'
      },
      handler: (req, res, next, options) => {
        logger.warn(`Rate limit exceeded for IP: ${req.ip}`);
        res.status(429).json(options.message);
      }
    });
  }

  /**
   * Additional security headers middleware
   */
  static securityHeaders(req, res, next) {
    // Prevent clickjacking
    res.setHeader('X-Frame-Options', 'DENY');
    
    // Enable XSS filter
    res.setHeader('X-XSS-Protection', '1; mode=block');
    
    // Prevent MIME type sniffing
    res.setHeader('X-Content-Type-Options', 'nosniff');
    
    // Referrer policy
    res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
    
    // Content Security Policy
    if (config.env === 'production') {
      res.setHeader('Content-Security-Policy', this.getCSPPolicy());
    }

    next();
  }

  /**
   * Get Content Security Policy
   * @returns {string} CSP policy
   */
  static getCSPPolicy() {
    return [
      "default-src 'self'",
      "img-src 'self' data: https:",
      "script-src 'self'",
      "style-src 'self' 'unsafe-inline' https:",
      "font-src 'self' https:",
      "frame-ancestors 'none'",
      "base-uri 'self'",
      "form-action 'self'"
    ].join('; ');
  }

  /**
   * Hash password
   * @param {string} password - Plain text password
   * @returns {Promise<string>} Hashed password
   */
  static async hashPassword(password) {
    return bcrypt.hash(password, config.security.bcryptRounds);
  }

  /**
   * Compare password with hash
   * @param {string} password - Plain text password
   * @param {string} hash - Hashed password
   * @returns {Promise<boolean>} Comparison result
   */
  static async comparePassword(password, hash) {
    return bcrypt.compare(password, hash);
  }

  /**
   * Generate activation code
   * @returns {string} Activation code
   */
  static generateActivationCode() {
    const length = config.activationCode.length;
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let code = '';
    
    for (let i = 0; i < length; i++) {
      code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    
    return code;
  }

  /**
   * Generate secure random token
   * @param {number} bytes - Number of bytes (default: 32)
   * @returns {string} Random token
   */
  static generateToken(bytes = 32) {
    return crypto.randomBytes(bytes).toString('hex');
  }

  /**
   * Validate password strength
   * @param {string} password - Password to validate
   * @returns {Object} Validation result
   */
  static validatePasswordStrength(password) {
    const rules = config.validation.password;
    const checks = {
      length: password.length >= rules.minLength,
      uppercase: rules.requireUppercase ? /[A-Z]/.test(password) : true,
      lowercase: rules.requireLowercase ? /[a-z]/.test(password) : true,
      numbers: rules.requireNumbers ? /[0-9]/.test(password) : true,
      special: rules.requireSpecialChars ? /[^A-Za-z0-9]/.test(password) : true
    };

    const passed = Object.values(checks).every(Boolean);
    
    return {
      passed,
      checks,
      strength: this.calculatePasswordStrength(password)
    };
  }

  /**
   * Calculate password strength score (0-100)
   * @param {string} password - Password to evaluate
   * @returns {number} Strength score
   */
  static calculatePasswordStrength(password) {
    let score = 0;
    
    // Length
    score += Math.min(password.length * 4, 40);
    
    // Character types
    if (/[A-Z]/.test(password)) score += 15;
    if (/[a-z]/.test(password)) score += 15;
    if (/[0-9]/.test(password)) score += 15;
    if (/[^A-Za-z0-9]/.test(password)) score += 15;
    
    return Math.min(score, 100);
  }

  /**
   * Sanitize data for logging
   * @param {Object} data - Data to sanitize
   * @returns {Object} Sanitized data
   */
  static sanitizeForLogging(data) {
    const sensitiveFields = ['password', 'token', 'secret', 'apiKey'];
    const sanitized = { ...data };

    for (const field of sensitiveFields) {
      if (field in sanitized) {
        sanitized[field] = '[REDACTED]';
      }
    }

    return sanitized;
  }

  /**
   * Validate IP address
   * @param {string} ip - IP address to validate
   * @returns {boolean} Validation result
   */
  static isValidIP(ip) {
    const ipv4Regex = /^(\d{1,3}\.){3}\d{1,3}$/;
    const ipv6Regex = /^([0-9a-fA-F]{1,4}:){7}[0-9a-fA-F]{1,4}$/;
    
    return ipv4Regex.test(ip) || ipv6Regex.test(ip);
  }

  /**
   * Check if request is from allowed IP
   * @param {Object} req - Express request object
   * @param {Array} allowedIPs - Array of allowed IP addresses
   * @throws {AppError} If IP is not allowed
   */
  static checkAllowedIP(req, allowedIPs) {
    const clientIP = req.ip;
    
    if (!allowedIPs.includes(clientIP)) {
      logger.warn(`Access denied from IP: ${clientIP}`);
      throw new AppError(403, 'Access denied from this IP address');
    }
  }
}

module.exports = Security;
