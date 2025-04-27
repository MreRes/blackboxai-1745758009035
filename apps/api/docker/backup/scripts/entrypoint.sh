#!/bin/sh
set -e

echo "Starting backup service..."

# Validate environment variables
if [ -z "$POSTGRES_HOST" ] || [ -z "$POSTGRES_DB" ] || [ -z "$POSTGRES_USER" ]; then
    echo "Error: Required environment variables are not set"
    exit 1
fi

# Start health check server
python3 /scripts/healthcheck.py &

# Function to create backup
create_backup() {
    TIMESTAMP=$(date +%Y%m%d_%H%M%S)
    BACKUP_FILE="${BACKUP_PREFIX}_${TIMESTAMP}.sql.gz"
    
    echo "Creating backup: $BACKUP_FILE"
    
    # Create backup
    PGPASSWORD=$POSTGRES_PASSWORD pg_dump \
        -h $POSTGRES_HOST \
        -p $POSTGRES_PORT \
        -U $POSTGRES_USER \
        -d $POSTGRES_DB \
        | gzip > "/backups/$BACKUP_FILE"
    
    # Upload to S3 if configured
    if [ ! -z "$S3_BUCKET" ]; then
        echo "Uploading backup to S3: $S3_BUCKET"
        aws s3 cp "/backups/$BACKUP_FILE" "s3://$S3_BUCKET/backups/"
    fi
    
    # Clean up old backups
    cleanup_old_backups
    
    echo "Backup completed: $BACKUP_FILE"
}

# Function to clean up old backups
cleanup_old_backups() {
    echo "Cleaning up old backups..."
    
    find /backups -type f -name "${BACKUP_PREFIX}_*.sql.gz" -mtime +${BACKUP_RETENTION_DAYS} -delete
    
    if [ ! -z "$S3_BUCKET" ]; then
        # List and delete old backups from S3
        aws s3 ls "s3://$S3_BUCKET/backups/" | while read -r line; do
            timestamp=$(echo "$line" | awk '{print $1}')
            file=$(echo "$line" | awk '{print $4}')
            if [ $(( ($(date +%s) - $(date -d "$timestamp" +%s)) / 86400 )) -gt $BACKUP_RETENTION_DAYS ]; then
                aws s3 rm "s3://$S3_BUCKET/backups/$file"
            fi
        done
    fi
}

# Function to verify backup
verify_backup() {
    BACKUP_FILE=$1
    echo "Verifying backup: $BACKUP_FILE"
    
    # Create temporary database for verification
    TEST_DB="verify_${RANDOM}"
    createdb -h $POSTGRES_HOST -p $POSTGRES_PORT -U $POSTGRES_USER $TEST_DB
    
    # Restore backup to test database
    gunzip -c "/backups/$BACKUP_FILE" | psql -h $POSTGRES_HOST -p $POSTGRES_PORT -U $POSTGRES_USER -d $TEST_DB
    
    # Verify restoration
    if psql -h $POSTGRES_HOST -p $POSTGRES_PORT -U $POSTGRES_USER -d $TEST_DB -c "\dt" > /dev/null 2>&1; then
        echo "Backup verification successful"
        dropdb -h $POSTGRES_HOST -p $POSTGRES_PORT -U $POSTGRES_USER $TEST_DB
        return 0
    else
        echo "Backup verification failed"
        dropdb -h $POSTGRES_HOST -p $POSTGRES_PORT -U $POSTGRES_USER $TEST_DB
        return 1
    fi
}

# Create initial backup
create_backup

# Set up cron job for scheduled backups
if [ ! -z "$BACKUP_SCHEDULE" ]; then
    echo "Setting up scheduled backups: $BACKUP_SCHEDULE"
    echo "$BACKUP_SCHEDULE /scripts/backup.sh >> /var/log/cron.log 2>&1" > /tmp/crontab
    crontab /tmp/crontab
    crond -f &
fi

# Keep container running
tail -f /dev/null
