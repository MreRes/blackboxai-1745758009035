#!/bin/bash
set -e

# Configuration
METRICS_DIR="/redis/metrics"
LOG_DIR="/redis/logs"
ALERT_THRESHOLD_MEMORY=80  # Memory usage alert threshold (%)
ALERT_THRESHOLD_CLIENTS=1000  # Connected clients alert threshold
REDIS_PASSWORD="${REDIS_PASSWORD:-}"
PROMETHEUS_ENABLED="${PROMETHEUS_ENABLED:-true}"
ALERT_WEBHOOK_URL="${ALERT_WEBHOOK_URL:-}"

# Function to log messages
log() {
    echo "[$(date +'%Y-%m-%d %H:%M:%S')] $1" | tee -a "${LOG_DIR}/monitor.log"
}

# Function to execute Redis commands
redis_cmd() {
    if [ -n "$REDIS_PASSWORD" ]; then
        redis-cli -a "$REDIS_PASSWORD" "$@"
    else
        redis-cli "$@"
    fi
}

# Function to send alerts
send_alert() {
    local message=$1
    local severity=${2:-warning}
    
    log "ALERT ($severity): $message"
    
    if [ -n "$ALERT_WEBHOOK_URL" ]; then
        curl -s -X POST "$ALERT_WEBHOOK_URL" \
            -H "Content-Type: application/json" \
            -d "{
                \"text\": \"Redis Alert ($severity): $message\",
                \"timestamp\": \"$(date -u +"%Y-%m-%dT%H:%M:%SZ")\"
            }" || true
    fi
}

# Function to collect memory metrics
collect_memory_metrics() {
    local info=$(redis_cmd info memory)
    local used_memory=$(echo "$info" | grep "used_memory:" | cut -d: -f2)
    local used_memory_peak=$(echo "$info" | grep "used_memory_peak:" | cut -d: -f2)
    local total_system_memory=$(echo "$info" | grep "total_system_memory:" | cut -d: -f2)
    
    # Calculate memory usage percentage
    local memory_usage=$((used_memory * 100 / total_system_memory))
    
    # Write metrics
    cat > "${METRICS_DIR}/memory.prom" <<EOF
redis_memory_used_bytes $used_memory
redis_memory_peak_bytes $used_memory_peak
redis_memory_total_bytes $total_system_memory
redis_memory_usage_percent $memory_usage
EOF

    # Check for alerts
    if [ "$memory_usage" -gt "$ALERT_THRESHOLD_MEMORY" ]; then
        send_alert "High memory usage: ${memory_usage}%"
    fi
}

# Function to collect client metrics
collect_client_metrics() {
    local info=$(redis_cmd info clients)
    local connected_clients=$(echo "$info" | grep "connected_clients:" | cut -d: -f2)
    local blocked_clients=$(echo "$info" | grep "blocked_clients:" | cut -d: -f2)
    
    # Write metrics
    cat > "${METRICS_DIR}/clients.prom" <<EOF
redis_connected_clients $connected_clients
redis_blocked_clients $blocked_clients
EOF

    # Check for alerts
    if [ "$connected_clients" -gt "$ALERT_THRESHOLD_CLIENTS" ]; then
        send_alert "High number of connected clients: $connected_clients"
    fi
}

# Function to collect command statistics
collect_command_stats() {
    local info=$(redis_cmd info commandstats)
    
    # Process and write command stats
    echo "$info" | grep "cmdstat_" | while read -r line; do
        local cmd=$(echo "$line" | cut -d: -f1 | sed 's/cmdstat_//')
        local calls=$(echo "$line" | grep -o 'calls=[0-9]*' | cut -d= -f2)
        local usec=$(echo "$line" | grep -o 'usec=[0-9]*' | cut -d= -f2)
        
        echo "redis_command_calls{command=\"$cmd\"} $calls" >> "${METRICS_DIR}/commands.prom"
        echo "redis_command_usec{command=\"$cmd\"} $usec" >> "${METRICS_DIR}/commands.prom"
    done
}

# Function to collect keyspace metrics
collect_keyspace_metrics() {
    local info=$(redis_cmd info keyspace)
    
    # Process and write keyspace stats
    echo "$info" | grep "db" | while read -r line; do
        local db=$(echo "$line" | cut -d: -f1)
        local keys=$(echo "$line" | grep -o 'keys=[0-9]*' | cut -d= -f2)
        local expires=$(echo "$line" | grep -o 'expires=[0-9]*' | cut -d= -f2)
        
        cat >> "${METRICS_DIR}/keyspace.prom" <<EOF
redis_keyspace_keys{db="$db"} $keys
redis_keyspace_expires{db="$db"} $expires
EOF
    done
}

# Function to collect persistence metrics
collect_persistence_metrics() {
    local info=$(redis_cmd info persistence)
    local rdb_changes=$(echo "$info" | grep "rdb_changes_since_last_save:" | cut -d: -f2)
    local last_save=$(echo "$info" | grep "rdb_last_save_time:" | cut -d: -f2)
    
    # Write metrics
    cat > "${METRICS_DIR}/persistence.prom" <<EOF
redis_rdb_changes_since_last_save $rdb_changes
redis_rdb_last_save_timestamp $last_save
EOF

    # Alert if too many changes without save
    if [ "$rdb_changes" -gt 10000 ]; then
        send_alert "High number of unsaved changes: $rdb_changes"
    fi
}

# Function to collect replication metrics
collect_replication_metrics() {
    local info=$(redis_cmd info replication)
    local role=$(echo "$info" | grep "role:" | cut -d: -f2)
    
    if [ "$role" = "slave" ]; then
        local master_link_status=$(echo "$info" | grep "master_link_status:" | cut -d: -f2)
        local master_last_io=$(echo "$info" | grep "master_last_io_seconds_ago:" | cut -d: -f2)
        
        cat > "${METRICS_DIR}/replication.prom" <<EOF
redis_slave_status{status="$master_link_status"} 1
redis_slave_last_io_seconds $master_last_io
EOF

        # Alert on replication issues
        if [ "$master_link_status" != "up" ]; then
            send_alert "Replication link is down" "critical"
        fi
    fi
}

# Main monitoring function
main() {
    # Create directories if they don't exist
    mkdir -p "$METRICS_DIR" "$LOG_DIR"
    
    log "Starting Redis monitoring..."
    
    # Collect all metrics
    collect_memory_metrics
    collect_client_metrics
    collect_command_stats
    collect_keyspace_metrics
    collect_persistence_metrics
    collect_replication_metrics
    
    # Update Prometheus metrics if enabled
    if [ "$PROMETHEUS_ENABLED" = "true" ]; then
        # Combine all metrics files
        cat "${METRICS_DIR}"/*.prom > "${METRICS_DIR}/metrics"
    fi
    
    log "Monitoring completed successfully"
}

# Execute main function
main

# Exit successfully
exit 0
