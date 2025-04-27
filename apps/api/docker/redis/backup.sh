#!/bin/bash
set -e

# Configuration
BACKUP_DIR="/redis/backups"
MAX_BACKUPS=7  # Keep last 7 days of backups
BACKUP_PREFIX="redis_backup"
S3_BUCKET="${REDIS_BACKUP_S3_BUCKET:-}"
REDIS_PASSWORD="${REDIS_PASSWORD:-}"

# Function to log messages
log() {
    echo "[$(date +'%Y-%m-%d %H:%M:%S')] $1"
}

# Function to execute Redis commands
redis_cmd() {
    if [ -n "$REDIS_PASSWORD" ]; then
        redis-cli -a "$REDIS_PASSWORD" "$@"
    else
        redis-cli "$@"
    fi
}

# Function to create backup filename
get_backup_filename() {
    local timestamp=$(date +%Y%m%d_%H%M%S)
    echo "${BACKUP_PREFIX}_${timestamp}"
}

# Function to compress backup
compress_backup() {
    local input_file=$1
    local output_file="${input_file}.gz"
    gzip -c "$input_file" > "$output_file"
    rm "$input_file"
    echo "$output_file"
}

# Function to upload to S3
upload_to_s3() {
    local file=$1
    if [ -n "$S3_BUCKET" ]; then
        log "Uploading backup to S3: $file"
        aws s3 cp "$file" "s3://${S3_BUCKET}/redis-backups/$(basename "$file")"
    fi
}

# Function to cleanup old backups
cleanup_old_backups() {
    log "Cleaning up old backups..."
    
    # Local cleanup
    cd "$BACKUP_DIR"
    ls -1t ${BACKUP_PREFIX}* 2>/dev/null | tail -n +$((MAX_BACKUPS + 1)) | xargs -r rm

    # S3 cleanup
    if [ -n "$S3_BUCKET" ]; then
        log "Cleaning up old backups from S3..."
        aws s3 ls "s3://${S3_BUCKET}/redis-backups/" | sort -r | tail -n +$((MAX_BACKUPS + 1)) | while read -r line; do
            filename=$(echo "$line" | awk '{print $4}')
            aws s3 rm "s3://${S3_BUCKET}/redis-backups/$filename"
        done
    fi
}

# Function to verify backup
verify_backup() {
    local backup_file=$1
    local temp_dir=$(mktemp -d)
    
    log "Verifying backup: $backup_file"
    
    # Create temporary Redis instance for verification
    local temp_redis_port=6380
    local temp_redis_conf="${temp_dir}/redis.conf"
    
    cat > "$temp_redis_conf" <<EOF
port ${temp_redis_port}
dir ${temp_dir}
EOF

    # Start temporary Redis instance
    redis-server "$temp_redis_conf" --daemonize yes

    # Wait for Redis to start
    sleep 2

    # Decompress and restore backup
    gunzip -c "$backup_file" | redis-cli -p "$temp_redis_port" --pipe

    # Verify data
    local key_count=$(redis-cli -p "$temp_redis_port" dbsize)
    
    # Stop temporary Redis instance
    redis-cli -p "$temp_redis_port" shutdown

    # Cleanup
    rm -rf "$temp_dir"

    if [ "$key_count" -gt 0 ]; then
        log "Backup verification successful: $key_count keys found"
        return 0
    else
        log "Backup verification failed: no keys found"
        return 1
    fi
}

# Main backup process
main() {
    log "Starting Redis backup process..."

    # Create backup directory if it doesn't exist
    mkdir -p "$BACKUP_DIR"

    # Generate backup filename
    local backup_file="${BACKUP_DIR}/$(get_backup_filename)"

    # Save current database
    log "Creating backup: $backup_file"
    if ! redis_cmd save; then
        log "Error: SAVE command failed"
        exit 1
    fi

    # Copy dump.rdb to backup location
    cp /redis/data/dump.rdb "$backup_file"

    # Compress backup
    backup_file=$(compress_backup "$backup_file")
    log "Backup compressed: $backup_file"

    # Verify backup
    if verify_backup "$backup_file"; then
        log "Backup verification successful"
        
        # Upload to S3 if configured
        upload_to_s3 "$backup_file"
        
        # Cleanup old backups
        cleanup_old_backups
        
        log "Backup process completed successfully"
    else
        log "Error: Backup verification failed"
        rm "$backup_file"
        exit 1
    fi
}

# Execute main function
main

# Exit successfully
exit 0
