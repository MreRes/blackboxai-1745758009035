import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';

const resources = {
  en: {
    translation: {
      login: {
        username: 'Username',
        password: 'Password',
        signIn: 'Sign In',
        adminLogin: 'Admin Login',
        userLogin: 'User Login',
      },
      dashboard: {
        welcome: 'Welcome',
        financialSummary: 'Financial Summary',
        recentTransactions: 'Recent Transactions',
        budgetStatus: 'Budget Status',
        reports: 'Reports',
      },
      transactions: {
        title: 'Transactions',
        add: 'Add Transaction',
        edit: 'Edit Transaction',
        delete: 'Delete Transaction',
        filter: 'Filter',
        dateRange: 'Date Range',
        source: 'Source',
        type: 'Type',
        category: 'Category',
        amount: 'Amount',
        description: 'Description',
      },
      budgets: {
        title: 'Budgets',
        add: 'Add Budget',
        edit: 'Edit Budget',
        delete: 'Delete Budget',
        analytics: 'Budget Analytics',
      },
      reports: {
        title: 'Reports',
        daily: 'Daily',
        monthly: 'Monthly',
        yearly: 'Yearly',
      },
      chatbot: {
        title: 'Chatbot',
        sendMessage: 'Send Message',
        placeholder: 'Type your message here...',
      },
      admin: {
        userManagement: 'User Management',
        systemSettings: 'System Settings',
        whatsappSessions: 'WhatsApp Sessions',
        activationCodes: 'Activation Codes',
        backups: 'Backups',
      },
      errors: {
        required: 'This field is required',
        invalid: 'Invalid input',
        loginFailed: 'Login failed. Please check your credentials.',
      },
      buttons: {
        submit: 'Submit',
        cancel: 'Cancel',
        save: 'Save',
        logout: 'Logout',
      }
    }
  },
  id: {
    translation: {
      login: {
        username: 'Nama Pengguna',
        password: 'Kata Sandi',
        signIn: 'Masuk',
        adminLogin: 'Masuk Admin',
        userLogin: 'Masuk Pengguna',
      },
      dashboard: {
        welcome: 'Selamat Datang',
        financialSummary: 'Ringkasan Keuangan',
        recentTransactions: 'Transaksi Terbaru',
        budgetStatus: 'Status Anggaran',
        reports: 'Laporan',
      },
      transactions: {
        title: 'Transaksi',
        add: 'Tambah Transaksi',
        edit: 'Ubah Transaksi',
        delete: 'Hapus Transaksi',
        filter: 'Filter',
        dateRange: 'Rentang Tanggal',
        source: 'Sumber',
        type: 'Tipe',
        category: 'Kategori',
        amount: 'Jumlah',
        description: 'Deskripsi',
      },
      budgets: {
        title: 'Anggaran',
        add: 'Tambah Anggaran',
        edit: 'Ubah Anggaran',
        delete: 'Hapus Anggaran',
        analytics: 'Analisis Anggaran',
      },
      reports: {
        title: 'Laporan',
        daily: 'Harian',
        monthly: 'Bulanan',
        yearly: 'Tahunan',
      },
      chatbot: {
        title: 'Chatbot',
        sendMessage: 'Kirim Pesan',
        placeholder: 'Ketik pesan Anda di sini...',
      },
      admin: {
        userManagement: 'Manajemen Pengguna',
        systemSettings: 'Pengaturan Sistem',
        whatsappSessions: 'Sesi WhatsApp',
        activationCodes: 'Kode Aktivasi',
        backups: 'Cadangan',
      },
      errors: {
        required: 'Kolom ini wajib diisi',
        invalid: 'Input tidak valid',
        loginFailed: 'Gagal masuk. Periksa kembali kredensial Anda.',
      },
      buttons: {
        submit: 'Kirim',
        cancel: 'Batal',
        save: 'Simpan',
        logout: 'Keluar',
      }
    }
  }
};

i18n
  .use(initReactI18next)
  .init({
    resources,
    lng: 'id', // default language
    fallbackLng: 'en',
    interpolation: {
      escapeValue: false,
    },
  });

export default i18n;
