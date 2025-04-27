class MockRedisClient {
  constructor() {
    this.data = new Map();
    this.connected = false;
    this.eventHandlers = {};
  }

  async connect() {
    this.connected = true;
    if (this.eventHandlers['connect']) {
      this.eventHandlers['connect']();
    }
    return Promise.resolve();
  }

  async disconnect() {
    this.connected = false;
    if (this.eventHandlers['end']) {
      this.eventHandlers['end']();
    }
    return Promise.resolve();
  }

  on(event, handler) {
    this.eventHandlers[event] = handler;
  }

  async set(key, value, options = {}) {
    if (options.EX) {
      // Simulate expiry
      setTimeout(() => {
        this.data.delete(key);
      }, options.EX * 1000);
    }
    this.data.set(key, value);
    return Promise.resolve('OK');
  }

  async get(key) {
    return Promise.resolve(this.data.get(key) || null);
  }

  async del(key) {
    const existed = this.data.has(key);
    this.data.delete(key);
    return Promise.resolve(existed ? 1 : 0);
  }

  async incr(key) {
    const value = (parseInt(this.data.get(key) || '0', 10) + 1).toString();
    this.data.set(key, value);
    return Promise.resolve(parseInt(value, 10));
  }

  async expire(key, seconds) {
    if (this.data.has(key)) {
      setTimeout(() => {
        this.data.delete(key);
      }, seconds * 1000);
      return Promise.resolve(1);
    }
    return Promise.resolve(0);
  }

  async flushall() {
    this.data.clear();
    return Promise.resolve('OK');
  }

  // Additional Redis commands
  async hset(key, field, value) {
    const hash = this.data.get(key) || new Map();
    hash.set(field, value);
    this.data.set(key, hash);
    return Promise.resolve(1);
  }

  async hget(key, field) {
    const hash = this.data.get(key);
    return Promise.resolve(hash ? hash.get(field) : null);
  }

  async hgetall(key) {
    const hash = this.data.get(key);
    if (!hash) return Promise.resolve(null);
    return Promise.resolve(Object.fromEntries(hash));
  }

  async hdel(key, field) {
    const hash = this.data.get(key);
    if (!hash) return Promise.resolve(0);
    const existed = hash.delete(field);
    return Promise.resolve(existed ? 1 : 0);
  }

  async lpush(key, ...values) {
    const list = this.data.get(key) || [];
    list.unshift(...values);
    this.data.set(key, list);
    return Promise.resolve(list.length);
  }

  async rpush(key, ...values) {
    const list = this.data.get(key) || [];
    list.push(...values);
    this.data.set(key, list);
    return Promise.resolve(list.length);
  }

  async lrange(key, start, stop) {
    const list = this.data.get(key) || [];
    return Promise.resolve(list.slice(start, stop === -1 ? undefined : stop + 1));
  }

  async publish(channel, message) {
    if (this.eventHandlers['message']) {
      this.eventHandlers['message'](channel, message);
    }
    return Promise.resolve(0);
  }

  async subscribe(channel) {
    return Promise.resolve();
  }
}

// Export mock Redis client factory
module.exports = {
  createClient: () => new MockRedisClient()
};
