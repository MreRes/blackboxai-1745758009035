# Use Redis Alpine as base image
FROM redis:alpine

# Install additional packages
RUN apk add --no-cache \
    bash \
    bc \
    curl \
    jq \
    tzdata

# Set timezone
ENV TZ=UTC

# Create directories
RUN mkdir -p /redis/data /redis/conf

# Copy configuration files
COPY redis.conf /redis/conf/
COPY healthcheck.sh /usr/local/bin/
RUN chmod +x /usr/local/bin/healthcheck.sh

# Create Redis user and set permissions
RUN adduser -D -H -u 1000 redis && \
    chown -R redis:redis /redis && \
    chmod 777 /redis/data

# Switch to Redis user
USER redis

# Set working directory
WORKDIR /redis

# Expose Redis port
EXPOSE 6379

# Set up volumes
VOLUME ["/redis/data"]

# Health check
HEALTHCHECK --interval=30s --timeout=5s --start-period=5s --retries=3 \
    CMD /usr/local/bin/healthcheck.sh

# Start Redis with custom configuration
CMD ["redis-server", "/redis/conf/redis.conf"]

# Add labels
LABEL maintainer="Your Name <your.email@example.com>" \
      version="1.0" \
      description="Redis server for WhatsApp Financial Bot" \
      org.opencontainers.image.source="https://github.com/yourusername/financial-bot" \
      org.opencontainers.image.licenses="MIT"

# Set environment variables for Redis configuration
ENV REDIS_MAXMEMORY="2gb" \
    REDIS_MAXMEMORY_POLICY="allkeys-lru" \
    REDIS_APPENDONLY="yes" \
    REDIS_SAVE="900 1 300 10 60 10000" \
    REDIS_DATABASES="16"

# Add custom scripts directory
COPY scripts/ /redis/scripts/
RUN chmod -R +x /redis/scripts/

# Add initialization script
COPY docker-entrypoint.sh /usr/local/bin/
RUN chmod +x /usr/local/bin/docker-entrypoint.sh

# Use custom entrypoint
ENTRYPOINT ["docker-entrypoint.sh"]

# Default command
CMD ["redis-server", "/redis/conf/redis.conf"]

# Add backup script
COPY backup.sh /redis/scripts/
RUN chmod +x /redis/scripts/backup.sh

# Create backup directory
RUN mkdir -p /redis/backups && \
    chown redis:redis /redis/backups

# Add monitoring script
COPY monitor.sh /redis/scripts/
RUN chmod +x /redis/scripts/monitor.sh

# Add cleanup script
COPY cleanup.sh /redis/scripts/
RUN chmod +x /redis/scripts/cleanup.sh

# Create log directory
RUN mkdir -p /redis/logs && \
    chown redis:redis /redis/logs

# Set up log rotation
COPY logrotate.conf /etc/logrotate.d/redis

# Add custom commands
COPY commands/ /redis/commands/
RUN chmod -R +x /redis/commands/

# Set up metrics export for Prometheus
EXPOSE 9121

# Add Redis exporter
COPY redis_exporter /usr/local/bin/
RUN chmod +x /usr/local/bin/redis_exporter

# Start Redis exporter alongside Redis
CMD ["sh", "-c", "redis-server /redis/conf/redis.conf & redis_exporter"]

# Add documentation
COPY docs/ /redis/docs/

# Add version file
RUN echo "1.0.0" > /redis/VERSION

# Add license
COPY LICENSE /redis/

# Add readme
COPY README.md /redis/

# Add configuration templates
COPY templates/ /redis/templates/

# Set up default configuration
RUN cp /redis/templates/redis.conf.template /redis/conf/redis.conf

# Add initialization scripts
COPY init.d/ /redis/init.d/
RUN chmod -R +x /redis/init.d/

# Set up automatic backups
RUN echo "0 0 * * * /redis/scripts/backup.sh" >> /var/spool/cron/crontabs/redis

# Set up monitoring
RUN echo "*/5 * * * * /redis/scripts/monitor.sh" >> /var/spool/cron/crontabs/redis

# Set up cleanup
RUN echo "0 1 * * * /redis/scripts/cleanup.sh" >> /var/spool/cron/crontabs/redis
