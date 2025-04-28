# Build stage
FROM node:18-alpine AS builder

WORKDIR /app

# Copy package files
COPY package*.json ./
COPY apps/api/package*.json ./apps/api/

# Configure npm to retry on network failures
RUN npm config set fetch-retries 5 && \
    npm config set fetch-retry-mintimeout 2000 && \
    npm config set fetch-retry-maxtimeout 120000

# Install dependencies
RUN npm install

# Copy Prisma schema and generate client
COPY apps/api/prisma ./apps/api/prisma
RUN cd apps/api && npx prisma generate

# Copy source code
COPY apps/api ./apps/api

# Install Chromium for Puppeteer
RUN apk add --no-cache \
    chromium \
    nss \
    freetype \
    freetype-dev \
    harfbuzz \
    ca-certificates \
    ttf-freefont

# Set Puppeteer environment variables
ENV PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true \
    PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium-browser

# Create directory for WhatsApp sessions
RUN mkdir -p /app/whatsapp-sessions && chmod 777 /app/whatsapp-sessions

# Expose port
EXPOSE 3001

# Set environment variables
ENV NODE_ENV=production \
    PORT=3001

# Start the application
CMD ["node", "apps/api/src/index.js"]
