const request = require('supertest');
const bcrypt = require('bcryptjs');
const app = require('../../src/app');
const TestUtils = require('../testUtils');
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

describe('Authentication API', () => {
  beforeEach(async () => {
    await TestUtils.cleanup();
  });

  describe('POST /api/v1/auth/register', () => {
    it('should register a new user with valid activation code', async () => {
      // Create an admin user to create activation code
      const admin = await TestUtils.createTestAdmin();
      
      // Create an activation code
      const activationCode = await TestUtils.createTestActivationCode(admin.id);

      const userData = {
        username: 'newuser',
        password: 'Password123!',
        email: 'newuser@example.com',
        phoneNumber: '+1234567890',
        activationCode: activationCode.code
      };

      const response = await request(app)
        .post('/api/v1/auth/register')
        .send(userData);

      TestUtils.expect.success(response, 201);
      expect(response.body.data).toHaveProperty('user');
      expect(response.body.data).toHaveProperty('token');
      expect(response.body.data.user.username).toBe(userData.username);
      expect(response.body.data.user.email).toBe(userData.email);
      expect(response.body.data.user).not.toHaveProperty('password');
    });

    it('should reject registration with invalid activation code', async () => {
      const userData = {
        username: 'newuser',
        password: 'Password123!',
        email: 'newuser@example.com',
        activationCode: 'INVALID'
      };

      const response = await request(app)
        .post('/api/v1/auth/register')
        .send(userData);

      TestUtils.expect.error(response, 400);
      expect(response.body.message).toMatch(/invalid.*activation code/i);
    });

    it('should reject registration with existing username', async () => {
      // Create existing user
      const existingUser = await TestUtils.createTestUser();
      
      // Create activation code
      const admin = await TestUtils.createTestAdmin();
      const activationCode = await TestUtils.createTestActivationCode(admin.id);

      const userData = {
        username: existingUser.username,
        password: 'Password123!',
        email: 'different@example.com',
        activationCode: activationCode.code
      };

      const response = await request(app)
        .post('/api/v1/auth/register')
        .send(userData);

      TestUtils.expect.error(response, 400);
      expect(response.body.message).toMatch(/username.*exists/i);
    });
  });

  describe('POST /api/v1/auth/login', () => {
    it('should login successfully with valid credentials', async () => {
      const password = 'Password123!';
      const user = await TestUtils.createTestUser({
        password: await bcrypt.hash(password, 12)
      });

      const response = await request(app)
        .post('/api/v1/auth/login')
        .send({
          username: user.username,
          password: password
        });

      TestUtils.expect.success(response);
      expect(response.body.data).toHaveProperty('token');
      expect(response.body.data).toHaveProperty('user');
      expect(response.body.data.user.id).toBe(user.id);
    });

    it('should reject login with invalid credentials', async () => {
      const user = await TestUtils.createTestUser();

      const response = await request(app)
        .post('/api/v1/auth/login')
        .send({
          username: user.username,
          password: 'wrongpassword'
        });

      TestUtils.expect.error(response, 401);
      expect(response.body.message).toMatch(/invalid credentials/i);
    });

    it('should reject login for inactive user', async () => {
      const password = 'Password123!';
      const user = await TestUtils.createTestUser({
        password: await bcrypt.hash(password, 12),
        isActive: false
      });

      const response = await request(app)
        .post('/api/v1/auth/login')
        .send({
          username: user.username,
          password: password
        });

      TestUtils.expect.error(response, 401);
      expect(response.body.message).toMatch(/account.*deactivated/i);
    });
  });

  describe('GET /api/v1/auth/me', () => {
    it('should return authenticated user profile', async () => {
      const user = await TestUtils.createTestUser();
      const token = TestUtils.generateToken(user.id);

      const response = await TestUtils.authenticatedRequest(
        'GET',
        '/api/v1/auth/me',
        null,
        token
      );

      TestUtils.expect.success(response);
      expect(response.body.data.user.id).toBe(user.id);
      expect(response.body.data.user).not.toHaveProperty('password');
    });

    it('should reject unauthenticated request', async () => {
      const response = await request(app)
        .get('/api/v1/auth/me');

      TestUtils.expect.error(response, 401);
    });
  });

  describe('PATCH /api/v1/auth/update-password', () => {
    it('should update password successfully', async () => {
      const oldPassword = 'OldPassword123!';
      const newPassword = 'NewPassword123!';
      
      const user = await TestUtils.createTestUser({
        password: await bcrypt.hash(oldPassword, 12)
      });
      
      const token = TestUtils.generateToken(user.id);

      const response = await TestUtils.authenticatedRequest(
        'PATCH',
        '/api/v1/auth/update-password',
        {
          currentPassword: oldPassword,
          newPassword: newPassword
        },
        token
      );

      TestUtils.expect.success(response);

      // Verify new password works
      const loginResponse = await request(app)
        .post('/api/v1/auth/login')
        .send({
          username: user.username,
          password: newPassword
        });

      TestUtils.expect.success(loginResponse);
    });

    it('should reject with incorrect current password', async () => {
      const user = await TestUtils.createTestUser();
      const token = TestUtils.generateToken(user.id);

      const response = await TestUtils.authenticatedRequest(
        'PATCH',
        '/api/v1/auth/update-password',
        {
          currentPassword: 'wrongpassword',
          newPassword: 'NewPassword123!'
        },
        token
      );

      TestUtils.expect.error(response, 401);
    });
  });
});
