#!/bin/bash
set -e

# Configuration
REDIS_PASSWORD="${REDIS_PASSWORD:-}"
LOG_DIR="/redis/logs"

# Function to log messages
log() {
    echo "[$(date +'%Y-%m-%d %H:%M:%S')] $1" | tee -a "${LOG_DIR}/init.log"
}

# Function to execute Redis commands
redis_cmd() {
    if [ -n "$REDIS_PASSWORD" ]; then
        redis-cli -a "$REDIS_PASSWORD" "$@"
    else
        redis-cli "$@"
    fi
}

# Function to wait for Redis to be ready
wait_for_redis() {
    local retries=30
    local wait_time=1

    while ! redis_cmd ping >/dev/null 2>&1; do
        retries=$((retries - 1))
        if [ "$retries" -le 0 ]; then
            log "Error: Redis is not responding"
            exit 1
        fi
        log "Waiting for Redis to be ready... ($retries attempts left)"
        sleep $wait_time
    done
}

# Function to initialize Redis configuration
init_config() {
    log "Initializing Redis configuration..."

    # Set memory limit
    redis_cmd config set maxmemory "${REDIS_MAXMEMORY:-2gb}"
    redis_cmd config set maxmemory-policy "${REDIS_MAXMEMORY_POLICY:-allkeys-lru}"

    # Set persistence options
    redis_cmd config set appendonly "${REDIS_APPENDONLY:-yes}"
    redis_cmd config set appendfsync "${REDIS_APPENDFSYNC:-everysec}"

    # Set security options
    if [ -n "$REDIS_PASSWORD" ]; then
        redis_cmd config set requirepass "$REDIS_PASSWORD"
    fi

    # Set performance options
    redis_cmd config set tcp-keepalive 300
    redis_cmd config set timeout 0
    redis_cmd config set tcp-backlog 511

    # Set client options
    redis_cmd config set maxclients "${REDIS_MAXCLIENTS:-10000}"

    # Enable active defragmentation
    redis_cmd config set activedefrag yes
    redis_cmd config set active-defrag-threshold-lower 10
    redis_cmd config set active-defrag-threshold-upper 100

    log "Redis configuration initialized"
}

# Function to initialize system keys
init_system_keys() {
    log "Initializing system keys..."

    # Set system metadata
    redis_cmd hset system:info \
        version "1.0.0" \
        initialized_at "$(date -u +"%Y-%m-%dT%H:%M:%SZ")" \
        environment "${NODE_ENV:-production}"

    # Set rate limiting defaults
    redis_cmd hset system:rate_limits \
        default_window 3600 \
        default_max_requests 1000 \
        api_window 60 \
        api_max_requests 100

    # Set cache configuration
    redis_cmd hset system:cache \
        default_ttl 3600 \
        max_ttl 86400 \
        min_ttl 60

    # Set maintenance windows
    redis_cmd hset system:maintenance \
        backup_window "0 0 * * *" \
        cleanup_window "0 1 * * *" \
        defrag_window "0 2 * * *"

    log "System keys initialized"
}

# Function to initialize metrics
init_metrics() {
    log "Initializing metrics collection..."

    # Create metrics keys with TTL
    local metrics_ttl=3600  # 1 hour

    # Initialize counter metrics
    redis_cmd set "metrics:requests:total" 0 EX $metrics_ttl
    redis_cmd set "metrics:errors:total" 0 EX $metrics_ttl
    redis_cmd set "metrics:cache:hits" 0 EX $metrics_ttl
    redis_cmd set "metrics:cache:misses" 0 EX $metrics_ttl

    # Initialize gauge metrics
    redis_cmd set "metrics:connections:current" 0 EX $metrics_ttl
    redis_cmd set "metrics:memory:used" 0 EX $metrics_ttl

    # Initialize sorted sets for time series data
    redis_cmd del "metrics:response_times"
    redis_cmd del "metrics:error_rates"

    log "Metrics initialized"
}

# Function to initialize pub/sub channels
init_pubsub() {
    log "Initializing pub/sub channels..."

    # Create channel configurations
    redis_cmd hset pubsub:channels:system \
        type "system" \
        description "System-wide notifications" \
        created_at "$(date -u +"%Y-%m-%dT%H:%M:%SZ")"

    redis_cmd hset pubsub:channels:alerts \
        type "alerts" \
        description "System alerts and warnings" \
        created_at "$(date -u +"%Y-%m-%dT%H:%M:%SZ")"

    redis_cmd hset pubsub:channels:metrics \
        type "metrics" \
        description "Real-time metrics updates" \
        created_at "$(date -u +"%Y-%m-%dT%H:%M:%SZ")"

    log "Pub/sub channels initialized"
}

# Function to initialize backup metadata
init_backup() {
    log "Initializing backup metadata..."

    # Set backup configuration
    redis_cmd hset backup:config \
        schedule "${BACKUP_SCHEDULE:-0 0 * * *}" \
        retention_days "${BACKUP_RETENTION_DAYS:-7}" \
        compress "true" \
        max_backups 10

    # Initialize backup history
    redis_cmd del backup:history

    log "Backup metadata initialized"
}

# Main initialization function
main() {
    log "Starting Redis initialization..."

    # Wait for Redis to be ready
    wait_for_redis

    # Run initialization steps
    init_config
    init_system_keys
    init_metrics
    init_pubsub
    init_backup

    # Mark initialization as complete
    redis_cmd set system:initialized "$(date -u +"%Y-%m-%dT%H:%M:%SZ")"

    log "Redis initialization completed successfully"
}

# Execute main function
main

# Exit successfully
exit 0
