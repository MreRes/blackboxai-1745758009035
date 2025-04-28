import api from './api';

export const whatsappApi = {
  // Mengambil riwayat chat dari backend
  getChatHistory: () => api.get('/whatsapp/chat-history'),

  // Mengirim pesan ke WhatsApp bot
  sendMessage: (message: string) => api.post('/whatsapp/send-message', { message }),

  // Mendapatkan status koneksi WhatsApp
  getConnectionStatus: () => api.get('/whatsapp/status'),

  // Mendapatkan QR code untuk login WhatsApp
  getQRCode: () => api.get('/whatsapp/qr-code'),

  // Mengelola sesi WhatsApp (misal: logout)
  terminateSession: (sessionId: string) => api.post(`/whatsapp/terminate-session/${sessionId}`),
};
