const request = require('supertest');
const app = require('../../src/app');
const TestUtils = require('../testUtils');
const whatsappService = require('../../src/services/whatsappService');
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

describe('WhatsApp Integration', () => {
  let admin;
  let adminToken;
  let user;
  let userToken;

  beforeEach(async () => {
    await TestUtils.cleanup();
    
    // Create admin user
    admin = await TestUtils.createTestAdmin();
    adminToken = TestUtils.generateToken(admin.id, 'ADMIN');

    // Create regular user
    user = await TestUtils.createTestUser({
      phoneNumber: '+1234567890'
    });
    userToken = TestUtils.generateToken(user.id);

    // Reset WhatsApp service mock
    jest.clearAllMocks();
  });

  describe('WhatsApp Client Management', () => {
    it('should initialize WhatsApp client', async () => {
      const response = await TestUtils.authenticatedRequest(
        'POST',
        '/api/v1/whatsapp/initialize',
        null,
        adminToken
      );

      TestUtils.expect.success(response);
      expect(whatsappService.initialize).toHaveBeenCalled();
    });

    it('should get QR code', async () => {
      // Mock QR code generation
      const mockQR = 'mock-qr-code-data';
      whatsappService.client.on.mockImplementation((event, callback) => {
        if (event === 'qr') {
          callback(mockQR);
        }
      });

      const response = await TestUtils.authenticatedRequest(
        'GET',
        '/api/v1/whatsapp/qr',
        null,
        adminToken
      );

      TestUtils.expect.success(response);
      expect(response.body.data).toHaveProperty('qr', mockQR);
    });

    it('should get connection status', async () => {
      whatsappService.client.getState.mockResolvedValue('CONNECTED');

      const response = await TestUtils.authenticatedRequest(
        'GET',
        '/api/v1/whatsapp/status',
        null,
        adminToken
      );

      TestUtils.expect.success(response);
      expect(response.body.data).toHaveProperty('state', 'CONNECTED');
    });

    it('should require admin access for management endpoints', async () => {
      const response = await TestUtils.authenticatedRequest(
        'POST',
        '/api/v1/whatsapp/initialize',
        null,
        userToken // Using regular user token
      );

      TestUtils.expect.error(response, 403);
    });
  });

  describe('Message Handling', () => {
    beforeEach(async () => {
      // Create activation code for the user
      await TestUtils.createTestActivationCode(user.id, {
        isActive: true,
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000)
      });
    });

    it('should handle expense recording message', async () => {
      const message = {
        from: '1234567890@c.us',
        body: 'catat pengeluaran 50000 untuk makan'
      };

      // Simulate message received
      await whatsappService.handleMessage(message);

      // Verify transaction was created
      const transaction = await prisma.transaction.findFirst({
        where: {
          userId: user.id,
          type: 'EXPENSE',
          category: 'makan',
          amount: 50000
        }
      });

      expect(transaction).toBeTruthy();
      expect(whatsappService.client.sendMessage).toHaveBeenCalledWith(
        message.from,
        expect.stringContaining('berhasil dicatat')
      );
    });

    it('should handle income recording message', async () => {
      const message = {
        from: '1234567890@c.us',
        body: 'catat pemasukan 1000000 dari gaji'
      };

      await whatsappService.handleMessage(message);

      const transaction = await prisma.transaction.findFirst({
        where: {
          userId: user.id,
          type: 'INCOME',
          category: 'gaji',
          amount: 1000000
        }
      });

      expect(transaction).toBeTruthy();
    });

    it('should send financial summary', async () => {
      // Create some transactions
      await Promise.all([
        TestUtils.createTestTransaction(user.id, {
          type: 'EXPENSE',
          amount: 100000,
          category: 'Food'
        }),
        TestUtils.createTestTransaction(user.id, {
          type: 'INCOME',
          amount: 500000,
          category: 'Salary'
        })
      ]);

      const message = {
        from: '1234567890@c.us',
        body: 'laporan keuangan'
      };

      await whatsappService.handleMessage(message);

      expect(whatsappService.client.sendMessage).toHaveBeenCalledWith(
        message.from,
        expect.stringContaining('Ringkasan Keuangan')
      );
    });

    it('should handle invalid message format', async () => {
      const message = {
        from: '1234567890@c.us',
        body: 'invalid message'
      };

      await whatsappService.handleMessage(message);

      expect(whatsappService.client.sendMessage).toHaveBeenCalledWith(
        message.from,
        expect.stringContaining('Bantuan Penggunaan Bot')
      );
    });

    it('should reject messages from unregistered numbers', async () => {
      const message = {
        from: 'unregistered@c.us',
        body: 'catat pengeluaran 50000 untuk makan'
      };

      await whatsappService.handleMessage(message);

      expect(whatsappService.client.sendMessage).toHaveBeenCalledWith(
        message.from,
        expect.stringContaining('belum terdaftar')
      );
    });
  });

  describe('Session Management', () => {
    it('should list all WhatsApp sessions', async () => {
      // Create test sessions
      await prisma.whatsAppSession.createMany({
        data: [
          {
            userId: user.id,
            sessionData: 'test-session-1',
            isActive: true
          },
          {
            userId: admin.id,
            sessionData: 'test-session-2',
            isActive: true
          }
        ]
      });

      const response = await TestUtils.authenticatedRequest(
        'GET',
        '/api/v1/whatsapp/sessions',
        null,
        adminToken
      );

      TestUtils.expect.success(response);
      expect(response.body.data.sessions).toHaveLength(2);
    });

    it('should deactivate session', async () => {
      const session = await prisma.whatsAppSession.create({
        data: {
          userId: user.id,
          sessionData: 'test-session',
          isActive: true
        }
      });

      const response = await TestUtils.authenticatedRequest(
        'PATCH',
        `/api/v1/whatsapp/sessions/${session.id}/deactivate`,
        null,
        adminToken
      );

      TestUtils.expect.success(response);

      const updatedSession = await prisma.whatsAppSession.findUnique({
        where: { id: session.id }
      });
      expect(updatedSession.isActive).toBe(false);
    });
  });

  describe('Admin Monitoring', () => {
    it('should get WhatsApp statistics', async () => {
      // Create some test data
      await Promise.all([
        TestUtils.createTestTransaction(user.id, {
          type: 'EXPENSE',
          amount: 100000,
          source: 'whatsapp'
        }),
        TestUtils.createTestTransaction(user.id, {
          type: 'INCOME',
          amount: 500000,
          source: 'whatsapp'
        })
      ]);

      const response = await TestUtils.authenticatedRequest(
        'GET',
        '/api/v1/whatsapp/admin/stats',
        null,
        adminToken
      );

      TestUtils.expect.success(response);
      expect(response.body.data).toMatchObject({
        messageStats: expect.any(Array),
        activeSessions: expect.any(Number),
        activeUsers: expect.any(Number),
        transactionTypes: expect.any(Array)
      });
    });
  });
});
