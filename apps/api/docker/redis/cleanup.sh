#!/bin/bash
set -e

# Configuration
LOG_DIR="/redis/logs"
REDIS_PASSWORD="${REDIS_PASSWORD:-}"
MAX_MEMORY_USAGE=80  # Maximum memory usage percentage
KEY_EXPIRY_DAYS=30  # Default expiry for old keys
BACKUP_RETENTION_DAYS=7  # Number of days to keep backups
METRICS_RETENTION_HOURS=24  # Hours to keep metrics data
LOG_RETENTION_DAYS=7  # Days to keep log files

# Function to log messages
log() {
    echo "[$(date +'%Y-%m-%d %H:%M:%S')] $1" | tee -a "${LOG_DIR}/cleanup.log"
}

# Function to execute Redis commands
redis_cmd() {
    if [ -n "$REDIS_PASSWORD" ]; then
        redis-cli -a "$REDIS_PASSWORD" "$@"
    else
        redis-cli "$@"
    fi
}

# Function to get current memory usage percentage
get_memory_usage() {
    local info=$(redis_cmd info memory)
    local used_memory=$(echo "$info" | grep "used_memory:" | cut -d: -f2)
    local total_system_memory=$(echo "$info" | grep "total_system_memory:" | cut -d: -f2)
    echo $((used_memory * 100 / total_system_memory))
}

# Function to clean up old keys
cleanup_old_keys() {
    log "Starting key cleanup..."

    # Get all keys
    local keys=$(redis_cmd keys "*")
    local current_time=$(date +%s)
    local expiry_threshold=$((current_time - (KEY_EXPIRY_DAYS * 24 * 60 * 60)))
    local cleaned_count=0

    for key in $keys; do
        # Check key idle time
        local idle_time=$(redis_cmd object idletime "$key")
        
        # Check if key has been idle for more than threshold
        if [ "$idle_time" -gt "$expiry_threshold" ]; then
            redis_cmd del "$key"
            cleaned_count=$((cleaned_count + 1))
        fi
    done

    log "Cleaned up $cleaned_count old keys"
}

# Function to clean up expired keys
cleanup_expired_keys() {
    log "Starting expired keys cleanup..."
    
    # Get initial count of keys
    local initial_count=$(redis_cmd dbsize)
    
    # Delete expired keys
    redis_cmd expire "*" 0
    
    # Get final count of keys
    local final_count=$(redis_cmd dbsize)
    local cleaned_count=$((initial_count - final_count))
    
    log "Cleaned up $cleaned_count expired keys"
}

# Function to clean up metrics data
cleanup_metrics() {
    log "Starting metrics cleanup..."
    
    local metrics_dir="/redis/metrics"
    if [ -d "$metrics_dir" ]; then
        # Remove old metric files
        find "$metrics_dir" -type f -mtime +1 -delete
        
        # Compress older metrics (but not today's)
        find "$metrics_dir" -type f -mtime +0 -name "*.prom" -exec gzip {} \;
    fi
}

# Function to clean up log files
cleanup_logs() {
    log "Starting log cleanup..."
    
    # Remove old log files
    find "$LOG_DIR" -type f -name "*.log" -mtime +${LOG_RETENTION_DAYS} -delete
    
    # Compress logs older than 1 day
    find "$LOG_DIR" -type f -name "*.log" -mtime +1 -exec gzip {} \;
}

# Function to clean up backup files
cleanup_backups() {
    log "Starting backup cleanup..."
    
    local backup_dir="/redis/backups"
    if [ -d "$backup_dir" ]; then
        # Remove old backup files
        find "$backup_dir" -type f -name "redis_backup_*" -mtime +${BACKUP_RETENTION_DAYS} -delete
    fi
}

# Function to optimize memory usage
optimize_memory() {
    log "Starting memory optimization..."
    
    # Get current memory usage
    local memory_usage=$(get_memory_usage)
    
    if [ "$memory_usage" -gt "$MAX_MEMORY_USAGE" ]; then
        log "High memory usage detected: ${memory_usage}%"
        
        # Try to free up memory
        redis_cmd memory purge
        
        # Trigger active defragmentation if available
        if redis_cmd config get activedefrag | grep -q "yes"; then
            redis_cmd memory defrag
        fi
        
        # Get new memory usage
        local new_memory_usage=$(get_memory_usage)
        log "Memory usage after optimization: ${new_memory_usage}%"
    else
        log "Memory usage is within acceptable limits: ${memory_usage}%"
    fi
}

# Function to clean up temporary files
cleanup_temp_files() {
    log "Starting temporary files cleanup..."
    
    # Clean up temporary files in Redis working directory
    find /redis/data -type f -name "temp-*" -delete
    find /redis/data -type f -name "*.tmp" -delete
}

# Function to vacuum the append-only file
cleanup_aof() {
    log "Starting AOF cleanup..."
    
    # Check if AOF is enabled
    if redis_cmd config get appendonly | grep -q "yes"; then
        # Trigger AOF rewrite if needed
        local aof_size=$(stat -f %z /redis/data/appendonly.aof 2>/dev/null || echo 0)
        local threshold=$((1024 * 1024 * 100))  # 100MB
        
        if [ "$aof_size" -gt "$threshold" ]; then
            log "Triggering AOF rewrite..."
            redis_cmd bgrewriteaof
        fi
    fi
}

# Main cleanup function
main() {
    log "Starting Redis cleanup process..."
    
    # Run all cleanup tasks
    cleanup_expired_keys
    cleanup_old_keys
    optimize_memory
    cleanup_metrics
    cleanup_logs
    cleanup_backups
    cleanup_temp_files
    cleanup_aof
    
    log "Cleanup process completed successfully"
}

# Execute main function
main

# Exit successfully
exit 0
