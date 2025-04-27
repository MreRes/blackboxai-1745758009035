#!/bin/sh
set -e

# Get Redis password from environment variable
REDIS_PASSWORD=${REDIS_PASSWORD:-""}

# Function to execute Redis command with password if set
redis_cmd() {
    if [ -n "$REDIS_PASSWORD" ]; then
        redis-cli -a "$REDIS_PASSWORD" "$@"
    else
        redis-cli "$@"
    fi
}

# Check if Redis is responding
PING_RESULT=$(redis_cmd ping)
if [ "$PING_RESULT" != "PONG" ]; then
    echo "Redis is not responding (PING failed)"
    exit 1
fi

# Check if Redis can write
SET_RESULT=$(redis_cmd set health_check "ok" ex 10)
if [ "$SET_RESULT" != "OK" ]; then
    echo "Redis write test failed"
    exit 1
fi

# Check if Redis can read
GET_RESULT=$(redis_cmd get health_check)
if [ "$GET_RESULT" != "ok" ]; then
    echo "Redis read test failed"
    exit 1
fi

# Check memory usage
MEMORY_USAGE=$(redis_cmd info memory | grep "used_memory_human:" | cut -d: -f2 | tr -d '[:space:]')
MEMORY_LIMIT="2G"

# Convert memory values to bytes for comparison
to_bytes() {
    local value=$1
    local unit=${value: -1}
    local number=${value%?}
    case $unit in
        K) echo "$number * 1024" | bc ;;
        M) echo "$number * 1024 * 1024" | bc ;;
        G) echo "$number * 1024 * 1024 * 1024" | bc ;;
        *) echo "$number" ;;
    esac
}

USED_BYTES=$(to_bytes "$MEMORY_USAGE")
LIMIT_BYTES=$(to_bytes "$MEMORY_LIMIT")

if [ "$USED_BYTES" -gt "$LIMIT_BYTES" ]; then
    echo "Redis memory usage exceeds limit ($MEMORY_USAGE > $MEMORY_LIMIT)"
    exit 1
fi

# Check replication status if slave
ROLE=$(redis_cmd info replication | grep "role:" | cut -d: -f2 | tr -d '[:space:]')
if [ "$ROLE" = "slave" ]; then
    MASTER_LINK_STATUS=$(redis_cmd info replication | grep "master_link_status:" | cut -d: -f2 | tr -d '[:space:]')
    if [ "$MASTER_LINK_STATUS" != "up" ]; then
        echo "Redis replication is not synchronized"
        exit 1
    fi
fi

# Check persistence status
LAST_SAVE=$(redis_cmd lastsave)
CURRENT_TIME=$(date +%s)
SAVE_AGE=$((CURRENT_TIME - LAST_SAVE))

if [ "$SAVE_AGE" -gt 3600 ]; then  # More than 1 hour
    echo "Redis persistence check failed (last save was $SAVE_AGE seconds ago)"
    exit 1
fi

# Check for any errors in the log
ERROR_COUNT=$(redis_cmd info stats | grep "rejected_connections:" | cut -d: -f2 | tr -d '[:space:]')
if [ "$ERROR_COUNT" -gt 0 ]; then
    echo "Redis has rejected connections: $ERROR_COUNT"
    exit 1
fi

# Check connected clients
CLIENT_COUNT=$(redis_cmd info clients | grep "connected_clients:" | cut -d: -f2 | tr -d '[:space:]')
MAX_CLIENTS=10000

if [ "$CLIENT_COUNT" -gt "$MAX_CLIENTS" ]; then
    echo "Too many connected clients: $CLIENT_COUNT > $MAX_CLIENTS"
    exit 1
fi

# Check keyspace hits/misses ratio
KEYSPACE_HITS=$(redis_cmd info stats | grep "keyspace_hits:" | cut -d: -f2 | tr -d '[:space:]')
KEYSPACE_MISSES=$(redis_cmd info stats | grep "keyspace_misses:" | cut -d: -f2 | tr -d '[:space:]')
TOTAL_OPS=$((KEYSPACE_HITS + KEYSPACE_MISSES))

if [ "$TOTAL_OPS" -gt 0 ]; then
    HIT_RATIO=$((KEYSPACE_HITS * 100 / TOTAL_OPS))
    if [ "$HIT_RATIO" -lt 50 ]; then
        echo "Cache hit ratio is low: $HIT_RATIO%"
        # Don't exit with error, just warn
    fi
fi

# All checks passed
echo "Redis health check passed"
exit 0
