// Mock WhatsApp Web Client
class Client {
  constructor() {
    this.isReady = false;
    this.qr = null;
    this.eventHandlers = {};
  }

  async initialize() {
    this.isReady = true;
    if (this.eventHandlers['ready']) {
      this.eventHandlers['ready']();
    }
    return Promise.resolve();
  }

  async destroy() {
    this.isReady = false;
    return Promise.resolve();
  }

  on(event, handler) {
    this.eventHandlers[event] = handler;
    if (event === 'qr') {
      // Simulate QR code generation
      setTimeout(() => {
        handler('mock-qr-code-data');
      }, 100);
    }
  }

  async sendMessage(to, content) {
    return Promise.resolve({
      id: 'mock-message-id',
      timestamp: Date.now(),
      from: 'mock-sender',
      to,
      content
    });
  }

  async getState() {
    return this.isReady ? 'CONNECTED' : 'DISCONNECTED';
  }
}

// Mock Local Auth Strategy
class LocalAuth {
  constructor() {
    this.sessions = new Map();
  }

  async save() {
    return Promise.resolve();
  }
}

module.exports = {
  Client,
  LocalAuth,
  // Mock events
  Events: {
    READY: 'ready',
    QR_RECEIVED: 'qr',
    AUTHENTICATED: 'authenticated',
    MESSAGE_RECEIVED: 'message',
    DISCONNECTED: 'disconnected'
  },
  // Mock message types
  MessageTypes: {
    TEXT: 'text',
    IMAGE: 'image',
    DOCUMENT: 'document'
  }
};
