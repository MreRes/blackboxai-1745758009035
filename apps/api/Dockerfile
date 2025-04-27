# Build stage
FROM node:18-alpine AS builder

WORKDIR /app

# Copy package files
COPY package*.json ./
COPY apps/api/package*.json ./apps/api/

# Install dependencies
RUN npm install

# Copy prisma schema and generate client
COPY apps/api/prisma ./apps/api/prisma
RUN cd apps/api && npx prisma generate

# Copy source code
COPY apps/api ./apps/api

# Production stage
FROM node:18-alpine

WORKDIR /app

# Install production dependencies
COPY --from=builder /app/package*.json ./
COPY --from=builder /app/apps/api/package*.json ./apps/api/
RUN npm install --production

# Copy built application
COPY --from=builder /app/apps/api/prisma ./apps/api/prisma
COPY --from=builder /app/apps/api/src ./apps/api/src
COPY --from=builder /app/node_modules/.prisma ./node_modules/.prisma

# Install Chrome for WhatsApp Web
RUN apk add --no-cache \
    chromium \
    nss \
    freetype \
    freetype-dev \
    harfbuzz \
    ca-certificates \
    ttf-freefont \
    nodejs \
    yarn

# Tell Puppeteer to skip installing Chrome. We'll use the installed package.
ENV PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true \
    PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium-browser

# Create directory for WhatsApp sessions
RUN mkdir -p /app/whatsapp-sessions && chmod 777 /app/whatsapp-sessions

# Create volume mount points
VOLUME ["/app/whatsapp-sessions", "/app/logs"]

# Environment variables
ENV NODE_ENV=production \
    PORT=3001

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
    CMD wget --quiet --tries=1 --spider http://localhost:$PORT/api/v1/health || exit 1

# Start the application
CMD ["node", "apps/api/src/index.js"]

# Expose port
EXPOSE 3001
