FROM postgres:14-alpine

# Install required packages
RUN apk add --no-cache \
    python3 \
    py3-pip \
    aws-cli \
    curl \
    jq \
    tzdata

# Set timezone
ENV TZ=UTC

# Create backup directory
RUN mkdir -p /backups

# Copy backup scripts
COPY docker/backup/scripts /scripts
RUN chmod +x /scripts/*

# Install Python dependencies
COPY docker/backup/requirements.txt /tmp/
RUN pip3 install --no-cache-dir -r /tmp/requirements.txt

# Environment variables with defaults
ENV POSTGRES_HOST=postgres \
    POSTGRES_PORT=5432 \
    POSTGRES_DB=financial_bot \
    POSTGRES_USER=admin \
    BACKUP_SCHEDULE="0 0 * * *" \
    BACKUP_RETENTION_DAYS=30 \
    BACKUP_PREFIX=db_backup \
    HEALTHCHECK_PORT=8080

# Create backup user and set permissions
RUN adduser -D backup && \
    chown -R backup:backup /backups /scripts

# Switch to backup user
USER backup

# Start backup service
CMD ["/scripts/entrypoint.sh"]

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
    CMD curl -f http://localhost:${HEALTHCHECK_PORT}/health || exit 1
