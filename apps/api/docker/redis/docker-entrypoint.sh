#!/bin/bash
set -e

# Function to log messages
log() {
    echo "[$(date +'%Y-%m-%d %H:%M:%S')] $1"
}

# Function to check if Redis is running
is_redis_running() {
    redis-cli ping >/dev/null 2>&1
}

# Function to wait for Redis to be ready
wait_for_redis() {
    local retries=30
    local wait_time=1

    while ! is_redis_running; do
        if [ "$retries" -le 0 ]; then
            log "ERROR: Redis failed to start"
            exit 1
        fi
        log "Waiting for Redis to be ready... ($retries attempts left)"
        sleep $wait_time
        retries=$((retries - 1))
    done
}

# Function to configure Redis
configure_redis() {
    log "Configuring Redis..."

    # Create Redis configuration from template
    if [ -f "/redis/templates/redis.conf.template" ]; then
        envsubst < "/redis/templates/redis.conf.template" > "/redis/conf/redis.conf"
    fi

    # Set maxmemory from environment variable
    if [ ! -z "$REDIS_MAXMEMORY" ]; then
        sed -i "s/^maxmemory .*/maxmemory $REDIS_MAXMEMORY/" /redis/conf/redis.conf
    fi

    # Set maxmemory-policy from environment variable
    if [ ! -z "$REDIS_MAXMEMORY_POLICY" ]; then
        sed -i "s/^maxmemory-policy .*/maxmemory-policy $REDIS_MAXMEMORY_POLICY/" /redis/conf/redis.conf
    fi

    # Set appendonly from environment variable
    if [ ! -z "$REDIS_APPENDONLY" ]; then
        sed -i "s/^appendonly .*/appendonly $REDIS_APPENDONLY/" /redis/conf/redis.conf
    fi

    # Set save intervals from environment variable
    if [ ! -z "$REDIS_SAVE" ]; then
        # Remove existing save directives
        sed -i '/^save/d' /redis/conf/redis.conf
        # Add new save directives
        echo "$REDIS_SAVE" | tr ' ' '\n' | while read -r interval; do
            echo "save $interval" >> /redis/conf/redis.conf
        done
    fi

    # Set number of databases
    if [ ! -z "$REDIS_DATABASES" ]; then
        sed -i "s/^databases .*/databases $REDIS_DATABASES/" /redis/conf/redis.conf
    fi
}

# Function to initialize Redis
initialize_redis() {
    log "Initializing Redis..."

    # Create necessary directories
    mkdir -p /redis/data
    mkdir -p /redis/logs
    mkdir -p /redis/backups

    # Set correct permissions
    chown -R redis:redis /redis/data
    chown -R redis:redis /redis/logs
    chown -R redis:redis /redis/backups

    # Run initialization scripts
    if [ -d "/redis/init.d" ]; then
        for script in /redis/init.d/*.sh; do
            if [ -f "$script" ] && [ -x "$script" ]; then
                log "Running initialization script: $script"
                "$script"
            fi
        done
    fi
}

# Function to setup monitoring
setup_monitoring() {
    log "Setting up monitoring..."

    # Start Redis exporter if enabled
    if [ "${REDIS_EXPORTER_ENABLED:-true}" = "true" ]; then
        redis_exporter &
    fi

    # Setup log rotation
    if [ -f "/etc/logrotate.d/redis" ]; then
        log "Setting up log rotation..."
        logrotate -f /etc/logrotate.d/redis
    fi
}

# Function to setup backup schedule
setup_backup() {
    log "Setting up backup schedule..."

    # Start cron daemon if backup is enabled
    if [ "${REDIS_BACKUP_ENABLED:-true}" = "true" ]; then
        crond
    fi
}

# Main execution
log "Starting Redis initialization..."

# Configure Redis
configure_redis

# Initialize Redis
initialize_redis

# Setup monitoring
setup_monitoring

# Setup backup
setup_backup

# Start Redis server
log "Starting Redis server..."
exec "$@"
