import axios from 'axios';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || 'http://localhost:3001/api/v1',
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add a request interceptor to include auth token
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// User Authentication
export const loginUser = (data) => api.post('/auth/login', data);

export const loginAdmin = (data) => api.post('/auth/admin/login', data);

// User Dashboard
export const fetchUserDashboard = () => api.get('/user/dashboard');

// Transactions
export const fetchTransactions = (params) => api.get('/transactions', { params });
export const addTransaction = (data) => api.post('/transactions', data);
export const updateTransaction = (id, data) => api.patch(`/transactions/${id}`, data);
export const deleteTransaction = (id) => api.delete(`/transactions/${id}`);

// Budgets
export const fetchBudgets = (params) => api.get('/budgets', { params });
export const addBudget = (data) => api.post('/budgets', data);
export const updateBudget = (id, data) => api.patch(`/budgets/${id}`, data);
export const deleteBudget = (id) => api.delete(`/budgets/${id}`);
export const fetchBudgetAnalytics = () => api.get('/budgets/analytics');

// Reports
export const fetchReportsSummary = (params) => api.get('/reports/summary', { params });

// WhatsApp Bot
export const fetchWhatsAppQRCode = () => api.get('/whatsapp/qr');
export const initializeWhatsApp = () => api.post('/whatsapp/initialize');
export const fetchWhatsAppStatus = () => api.get('/whatsapp/status');
export const sendWhatsAppMessage = (data) => api.post('/whatsapp/send', data);
export const fetchWhatsAppMessages = (userId, params) => api.get(`/whatsapp/messages/${userId}`, { params });

// Admin User Management
export const fetchUsers = (params) => api.get('/admin/users', { params });
export const createUser = (data) => api.post('/admin/users', data);
export const updateUser = (id, data) => api.patch(`/admin/users/${id}`, data);
export const deleteUser = (id) => api.delete(`/admin/users/${id}`);

// Admin Activation Codes
export const fetchActivationCodes = (params) => api.get('/admin/activation-codes', { params });
export const createActivationCode = (data) => api.post('/admin/activation-codes', data);
export const updateActivationCode = (id, data) => api.patch(`/admin/activation-codes/${id}`, data);
export const deleteActivationCode = (id) => api.delete(`/admin/activation-codes/${id}`);

// Admin System Settings
export const fetchSystemSettings = () => api.get('/admin/settings');
export const updateSystemSettings = (data) => api.put('/admin/settings', data);

// Admin WhatsApp Sessions
export const fetchWhatsAppSessions = (params) => api.get('/admin/whatsapp-sessions', { params });
export const deactivateWhatsAppSession = (id) => api.patch(`/admin/whatsapp-sessions/${id}/deactivate`);

// Admin Backup Management
export const createBackup = () => api.post('/admin/backups/create');
export const restoreBackup = (fileName, password) =>
  api.post(`/admin/backups/restore/${fileName}`, { password });
export const listBackups = () => api.get('/admin/backups/list');
export const deleteBackup = (fileName) => api.delete(`/admin/backups/${fileName}`);
export const updateBackupSchedule = (schedule) => api.put('/admin/backups/schedule', { schedule });
export const getBackupStatus = () => api.get('/admin/backups/status');

export default api;
