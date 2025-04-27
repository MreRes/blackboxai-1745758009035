const { Client, LocalAuth } = require('whatsapp-web.js');
const qrcode = require('qrcode');
const { PrismaClient } = require('@prisma/client');
const { createLogger } = require('../utils/logger');
const { NlpManager } = require('node-nlp');

const prisma = new PrismaClient();
const logger = createLogger('whatsapp-service');

class WhatsAppService {
  constructor() {
    this.client = null;
    this.nlpManager = new NlpManager({ languages: ['id'] }); // Indonesian language
    this.initNLP();
  }

  async initNLP() {
    // Add Indonesian language understanding
    // Transaction related intents
    this.nlpManager.addDocument('id', 'catat pengeluaran {amount} untuk {category}', 'transaction.expense');
    this.nlpManager.addDocument('id', 'saya menghabiskan {amount} untuk {category}', 'transaction.expense');
    this.nlpManager.addDocument('id', 'bayar {amount} untuk {category}', 'transaction.expense');
    
    this.nlpManager.addDocument('id', 'catat pemasukan {amount} dari {category}', 'transaction.income');
    this.nlpManager.addDocument('id', 'terima {amount} dari {category}', 'transaction.income');
    this.nlpManager.addDocument('id', 'dapat {amount} dari {category}', 'transaction.income');

    // Report related intents
    this.nlpManager.addDocument('id', 'laporan keuangan', 'report.summary');
    this.nlpManager.addDocument('id', 'ringkasan transaksi', 'report.transactions');
    this.nlpManager.addDocument('id', 'lihat budget', 'report.budget');

    // Add more training data as needed
    await this.nlpManager.train();
  }

  async initialize() {
    this.client = new Client({
      authStrategy: new LocalAuth(),
      puppeteer: {
        headless: true,
        args: ['--no-sandbox', '--disable-setuid-sandbox']
      }
    });

    this.client.on('qr', async (qr) => {
      // Generate QR code
      const qrImage = await qrcode.toDataURL(qr);
      // Store QR code or emit event
      logger.info('New QR code generated');
    });

    this.client.on('ready', () => {
      logger.info('WhatsApp client is ready');
    });

    this.client.on('message', async (message) => {
      try {
        await this.handleMessage(message);
      } catch (error) {
        logger.error('Error handling message:', error);
      }
    });

    await this.client.initialize();
  }

  async handleMessage(message) {
    const phoneNumber = message.from.split('@')[0];
    
    // Find user by phone number
    const user = await prisma.user.findUnique({
      where: { phoneNumber },
      include: { activationCode: true }
    });

    if (!user || !user.isActive) {
      await message.reply('Maaf, nomor Anda belum terdaftar atau tidak aktif.');
      return;
    }

    if (!user.activationCode?.isActive || user.activationCode?.expiresAt < new Date()) {
      await message.reply('Kode aktivasi Anda telah kadaluarsa. Silakan hubungi admin.');
      return;
    }

    // Process message with NLP
    const result = await this.nlpManager.process('id', message.body);

    switch (result.intent) {
      case 'transaction.expense':
        await this.handleExpenseTransaction(message, user, result);
        break;
      case 'transaction.income':
        await this.handleIncomeTransaction(message, user, result);
        break;
      case 'report.summary':
        await this.sendFinancialSummary(message, user);
        break;
      case 'report.transactions':
        await this.sendTransactionHistory(message, user);
        break;
      case 'report.budget':
        await this.sendBudgetStatus(message, user);
        break;
      default:
        await this.sendHelpMessage(message);
    }
  }

  async handleExpenseTransaction(message, user, nlpResult) {
    try {
      const amount = this.extractAmount(nlpResult);
      const category = this.extractCategory(nlpResult);

      if (!amount || !category) {
        await message.reply('Format tidak valid. Contoh: "catat pengeluaran 50000 untuk makan"');
        return;
      }

      const transaction = await prisma.transaction.create({
        data: {
          userId: user.id,
          type: 'EXPENSE',
          amount: parseFloat(amount),
          category,
          source: 'whatsapp',
          description: message.body
        }
      });

      await message.reply(`✅ Pengeluaran sebesar Rp${amount} untuk ${category} berhasil dicatat.`);
    } catch (error) {
      logger.error('Error handling expense:', error);
      await message.reply('Maaf, terjadi kesalahan saat mencatat pengeluaran.');
    }
  }

  async handleIncomeTransaction(message, user, nlpResult) {
    try {
      const amount = this.extractAmount(nlpResult);
      const category = this.extractCategory(nlpResult);

      if (!amount || !category) {
        await message.reply('Format tidak valid. Contoh: "catat pemasukan 1000000 dari gaji"');
        return;
      }

      const transaction = await prisma.transaction.create({
        data: {
          userId: user.id,
          type: 'INCOME',
          amount: parseFloat(amount),
          category,
          source: 'whatsapp',
          description: message.body
        }
      });

      await message.reply(`✅ Pemasukan sebesar Rp${amount} dari ${category} berhasil dicatat.`);
    } catch (error) {
      logger.error('Error handling income:', error);
      await message.reply('Maaf, terjadi kesalahan saat mencatat pemasukan.');
    }
  }

  async sendFinancialSummary(message, user) {
    try {
      const today = new Date();
      const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);

      const transactions = await prisma.transaction.groupBy({
        by: ['type'],
        where: {
          userId: user.id,
          date: {
            gte: startOfMonth,
            lte: today
          }
        },
        _sum: {
          amount: true
        }
      });

      const income = transactions.find(t => t.type === 'INCOME')?._sum.amount || 0;
      const expenses = transactions.find(t => t.type === 'EXPENSE')?._sum.amount || 0;
      const balance = income - expenses;

      const summary = `📊 Ringkasan Keuangan Bulan Ini:\n\n` +
                     `📈 Pemasukan: Rp${income.toLocaleString()}\n` +
                     `📉 Pengeluaran: Rp${expenses.toLocaleString()}\n` +
                     `💰 Saldo: Rp${balance.toLocaleString()}`;

      await message.reply(summary);
    } catch (error) {
      logger.error('Error sending summary:', error);
      await message.reply('Maaf, terjadi kesalahan saat mengambil ringkasan keuangan.');
    }
  }

  async sendTransactionHistory(message, user) {
    try {
      const transactions = await prisma.transaction.findMany({
        where: {
          userId: user.id
        },
        orderBy: {
          date: 'desc'
        },
        take: 5
      });

      const history = transactions.map(t => 
        `${t.type === 'INCOME' ? '📈' : '📉'} ${t.date.toLocaleDateString()}\n` +
        `${t.category}: Rp${t.amount.toLocaleString()}`
      ).join('\n\n');

      await message.reply(`📝 5 Transaksi Terakhir:\n\n${history}`);
    } catch (error) {
      logger.error('Error sending history:', error);
      await message.reply('Maaf, terjadi kesalahan saat mengambil riwayat transaksi.');
    }
  }

  async sendBudgetStatus(message, user) {
    try {
      const budgets = await prisma.budget.findMany({
        where: {
          userId: user.id,
          OR: [
            { endDate: null },
            { endDate: { gte: new Date() } }
          ]
        }
      });

      const budgetStatus = await Promise.all(
        budgets.map(async (budget) => {
          const spending = await prisma.transaction.aggregate({
            where: {
              userId: user.id,
              category: budget.category,
              type: 'EXPENSE',
              date: {
                gte: budget.startDate,
                lte: budget.endDate || new Date()
              }
            },
            _sum: {
              amount: true
            }
          });

          const spent = spending._sum.amount || 0;
          const remaining = budget.amount - spent;
          const percentage = (spent / budget.amount) * 100;

          return `${budget.category}:\n` +
                 `Budget: Rp${budget.amount.toLocaleString()}\n` +
                 `Terpakai: Rp${spent.toLocaleString()} (${percentage.toFixed(1)}%)\n` +
                 `Sisa: Rp${remaining.toLocaleString()}`;
        })
      );

      await message.reply(`📊 Status Budget:\n\n${budgetStatus.join('\n\n')}`);
    } catch (error) {
      logger.error('Error sending budget status:', error);
      await message.reply('Maaf, terjadi kesalahan saat mengambil status budget.');
    }
  }

  async sendHelpMessage(message) {
    const help = `🤖 *Bantuan Penggunaan Bot*\n\n` +
                `1. Catat Pengeluaran:\n` +
                `   "catat pengeluaran [jumlah] untuk [kategori]"\n\n` +
                `2. Catat Pemasukan:\n` +
                `   "catat pemasukan [jumlah] dari [kategori]"\n\n` +
                `3. Lihat Laporan:\n` +
                `   - "laporan keuangan"\n` +
                `   - "ringkasan transaksi"\n` +
                `   - "lihat budget"`;

    await message.reply(help);
  }

  extractAmount(nlpResult) {
    // Extract amount from message using regex
    const amountMatch = nlpResult.utterance.match(/\d+/);
    return amountMatch ? amountMatch[0] : null;
  }

  extractCategory(nlpResult) {
    // Extract category from NLP entities
    const categoryEntity = nlpResult.entities.find(e => e.entity === 'category');
    return categoryEntity ? categoryEntity.value : null;
  }
}

module.exports = new WhatsAppService();
