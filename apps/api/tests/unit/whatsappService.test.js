const whatsappService = require('../../src/services/whatsappService');
const { PrismaClient } = require('@prisma/client');
const TestUtils = require('../testUtils');

const prisma = new PrismaClient();

describe('WhatsApp Service', () => {
  let user;
  let activationCode;

  beforeEach(async () => {
    await TestUtils.cleanup();
    
    // Create test user with activation code
    user = await TestUtils.createTestUser({
      phoneNumber: '1234567890'
    });
    
    activationCode = await TestUtils.createTestActivationCode(user.id, {
      isActive: true,
      expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000)
    });
  });

  describe('NLP Processing', () => {
    it('should recognize expense recording intent', async () => {
      const result = await whatsappService.nlpManager.process('id', 
        'catat pengeluaran 50000 untuk makan'
      );

      expect(result.intent).toBe('transaction.expense');
      expect(result.entities).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            entity: 'amount',
            value: '50000'
          }),
          expect.objectContaining({
            entity: 'category',
            value: 'makan'
          })
        ])
      );
    });

    it('should recognize income recording intent', async () => {
      const result = await whatsappService.nlpManager.process('id',
        'catat pemasukan 1000000 dari gaji'
      );

      expect(result.intent).toBe('transaction.income');
      expect(result.entities).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            entity: 'amount',
            value: '1000000'
          }),
          expect.objectContaining({
            entity: 'category',
            value: 'gaji'
          })
        ])
      );
    });

    it('should recognize report request intent', async () => {
      const result = await whatsappService.nlpManager.process('id',
        'laporan keuangan'
      );

      expect(result.intent).toBe('report.summary');
    });

    it('should handle informal language', async () => {
      const result = await whatsappService.nlpManager.process('id',
        'keluar 50rb buat makan'
      );

      expect(result.intent).toBe('transaction.expense');
      expect(result.entities).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            entity: 'amount',
            value: '50000'
          }),
          expect.objectContaining({
            entity: 'category',
            value: 'makan'
          })
        ])
      );
    });

    it('should handle typos and misspellings', async () => {
      const result = await whatsappService.nlpManager.process('id',
        'catet pngeluaran 50000 utk mkn'
      );

      expect(result.intent).toBe('transaction.expense');
    });
  });

  describe('Message Handling', () => {
    it('should handle expense recording message', async () => {
      const message = {
        from: '1234567890@c.us',
        body: 'catat pengeluaran 50000 untuk makan'
      };

      await whatsappService.handleMessage(message);

      // Verify transaction was created
      const transaction = await prisma.transaction.findFirst({
        where: {
          userId: user.id,
          type: 'EXPENSE',
          category: 'makan',
          amount: 50000,
          source: 'whatsapp'
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
          amount: 1000000,
          source: 'whatsapp'
        }
      });

      expect(transaction).toBeTruthy();
      expect(whatsappService.client.sendMessage).toHaveBeenCalledWith(
        message.from,
        expect.stringContaining('berhasil dicatat')
      );
    });

    it('should handle financial summary request', async () => {
      // Create some test transactions
      await Promise.all([
        TestUtils.createTestTransaction(user.id, {
          type: 'EXPENSE',
          amount: 100000,
          category: 'Food'
        }),
        TestUtils.createTestTransaction(user.id, {
          type: 'INCOME',
          amount: 1000000,
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
      expect(whatsappService.client.sendMessage).toHaveBeenCalledWith(
        message.from,
        expect.stringContaining('1000000') // Income
      );
      expect(whatsappService.client.sendMessage).toHaveBeenCalledWith(
        message.from,
        expect.stringContaining('100000') // Expense
      );
    });

    it('should handle budget status request', async () => {
      // Create test budget
      await TestUtils.createTestBudget(user.id, {
        category: 'Food',
        amount: 1000000,
        period: 'MONTHLY'
      });

      // Create test transaction
      await TestUtils.createTestTransaction(user.id, {
        type: 'EXPENSE',
        amount: 500000,
        category: 'Food'
      });

      const message = {
        from: '1234567890@c.us',
        body: 'lihat budget'
      };

      await whatsappService.handleMessage(message);

      expect(whatsappService.client.sendMessage).toHaveBeenCalledWith(
        message.from,
        expect.stringContaining('Status Budget')
      );
      expect(whatsappService.client.sendMessage).toHaveBeenCalledWith(
        message.from,
        expect.stringContaining('50%') // Usage percentage
      );
    });

    it('should handle invalid message format', async () => {
      const message = {
        from: '1234567890@c.us',
        body: 'pesan tidak valid'
      };

      await whatsappService.handleMessage(message);

      expect(whatsappService.client.sendMessage).toHaveBeenCalledWith(
        message.from,
        expect.stringContaining('Bantuan Penggunaan Bot')
      );
    });

    it('should handle unregistered numbers', async () => {
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

    it('should handle expired activation code', async () => {
      // Expire the activation code
      await prisma.activationCode.update({
        where: { id: activationCode.id },
        data: { expiresAt: new Date(Date.now() - 24 * 60 * 60 * 1000) }
      });

      const message = {
        from: '1234567890@c.us',
        body: 'catat pengeluaran 50000 untuk makan'
      };

      await whatsappService.handleMessage(message);

      expect(whatsappService.client.sendMessage).toHaveBeenCalledWith(
        message.from,
        expect.stringContaining('kode aktivasi telah kadaluarsa')
      );
    });
  });

  describe('Client Management', () => {
    it('should initialize WhatsApp client', async () => {
      await whatsappService.initialize();

      expect(whatsappService.client.initialize).toHaveBeenCalled();
    });

    it('should handle QR code generation', async () => {
      const qrCallback = jest.fn();
      whatsappService.client.on.mockImplementation((event, callback) => {
        if (event === 'qr') {
          qrCallback = callback;
        }
      });

      await whatsappService.initialize();
      qrCallback('test-qr-code');

      expect(whatsappService.client.on).toHaveBeenCalledWith('qr', expect.any(Function));
    });

    it('should handle client ready event', async () => {
      const readyCallback = jest.fn();
      whatsappService.client.on.mockImplementation((event, callback) => {
        if (event === 'ready') {
          readyCallback = callback;
        }
      });

      await whatsappService.initialize();
      readyCallback();

      expect(whatsappService.client.on).toHaveBeenCalledWith('ready', expect.any(Function));
    });

    it('should handle disconnection', async () => {
      const disconnectCallback = jest.fn();
      whatsappService.client.on.mockImplementation((event, callback) => {
        if (event === 'disconnected') {
          disconnectCallback = callback;
        }
      });

      await whatsappService.initialize();
      disconnectCallback();

      expect(whatsappService.client.on).toHaveBeenCalledWith('disconnected', expect.any(Function));
    });
  });
});
