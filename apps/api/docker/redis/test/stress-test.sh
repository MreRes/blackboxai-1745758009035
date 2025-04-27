#!/bin/bash
set -e

# Configuration
REDIS_PASSWORD="${REDIS_PASSWORD:-}"
LOG_DIR="/redis/logs"
STRESS_RESULTS_FILE="${LOG_DIR}/stress_test_results.log"
STRESS_KEY_PREFIX="stress:redis:"
DURATION=300  # Test duration in seconds
MAX_CLIENTS=1000  # Maximum number of simultaneous clients
RAMP_UP_TIME=60  # Time in seconds to ramp up to max clients
DATA_SIZES=(100 1000 10000)  # Different data sizes to test in bytes

# Function to log messages
log() {
    echo "[$(date +'%Y-%m-%d %H:%M:%S')] $1" | tee -a "$STRESS_RESULTS_FILE"
}

# Function to execute Redis commands
redis_cmd() {
    if [ -n "$REDIS_PASSWORD" ]; then
        redis-cli -a "$REDIS_PASSWORD" "$@"
    else
        redis-cli "$@"
    fi
}

# Function to monitor Redis stats
monitor_redis() {
    while true; do
        local info
        info=$(redis_cmd info all)
        
        # Extract key metrics
        local connected_clients
        connected_clients=$(echo "$info" | grep "connected_clients:" | cut -d: -f2)
        
        local used_memory
        used_memory=$(echo "$info" | grep "used_memory_human:" | cut -d: -f2)
        
        local ops_per_sec
        ops_per_sec=$(echo "$info" | grep "instantaneous_ops_per_sec:" | cut -d: -f2)
        
        local hit_rate
        hit_rate=$(echo "$info" | awk '/keyspace_hits:|keyspace_misses:/{hits=$2}END{print hits}')
        
        log "Stats: clients=$connected_clients, memory=$used_memory, ops/sec=$ops_per_sec, hit_rate=$hit_rate"
        
        sleep 5
    done
}

# Function to generate random data
generate_data() {
    local size=$1
    head -c "$size" /dev/urandom | base64 | tr -d '\n'
}

# Function to simulate write load
simulate_writes() {
    local client_id=$1
    local data_size=$2
    local data
    data=$(generate_data "$data_size")
    
    while true; do
        local key="${STRESS_KEY_PREFIX}${client_id}:$(date +%s%N)"
        redis_cmd set "$key" "$data" >/dev/null
        sleep 0.1
    done
}

# Function to simulate read load
simulate_reads() {
    local client_id=$1
    
    while true; do
        local keys
        keys=$(redis_cmd keys "${STRESS_KEY_PREFIX}*" | shuf -n 10)
        for key in $keys; do
            redis_cmd get "$key" >/dev/null
        done
        sleep 0.1
    done
}

# Function to simulate mixed workload
simulate_mixed() {
    local client_id=$1
    local data_size=$2
    local data
    data=$(generate_data "$data_size")
    
    while true; do
        # 70% reads, 30% writes
        if [ $((RANDOM % 10)) -lt 7 ]; then
            # Read operation
            local keys
            keys=$(redis_cmd keys "${STRESS_KEY_PREFIX}*" | shuf -n 1)
            redis_cmd get "$keys" >/dev/null
        else
            # Write operation
            local key="${STRESS_KEY_PREFIX}${client_id}:$(date +%s%N)"
            redis_cmd set "$key" "$data" >/dev/null
        fi
        sleep 0.1
    done
}

# Function to monitor system resources
monitor_system() {
    while true; do
        log "System Stats:"
        log "CPU Usage: $(top -bn1 | grep "Cpu(s)" | awk '{print $2}')%"
        log "Memory Usage: $(free -m | awk 'NR==2{printf "%.2f%%", $3*100/$2}')"
        log "Disk I/O: $(iostat -x 1 1 | awk '/^sd/{print $0}')"
        sleep 5
    done
}

# Function to run stress test
run_stress_test() {
    local test_type=$1
    local data_size=$2
    local pids=()
    
    log "Starting $test_type stress test with ${data_size}B payload"
    
    # Start monitoring
    monitor_redis &
    monitor_pid=$!
    monitor_system &
    system_monitor_pid=$!
    
    # Ramp up clients
    local clients_per_second=$((MAX_CLIENTS / RAMP_UP_TIME))
    for ((i=1; i<=MAX_CLIENTS; i++)); do
        case "$test_type" in
            "write")
                simulate_writes "$i" "$data_size" &
                ;;
            "read")
                simulate_reads "$i" &
                ;;
            "mixed")
                simulate_mixed "$i" "$data_size" &
                ;;
        esac
        pids+=($!)
        
        if [ $((i % clients_per_second)) -eq 0 ]; then
            sleep 1
        fi
    done
    
    log "All clients started. Running test for $DURATION seconds..."
    sleep "$DURATION"
    
    # Cleanup
    for pid in "${pids[@]}"; do
        kill "$pid" 2>/dev/null || true
    done
    kill "$monitor_pid" 2>/dev/null || true
    kill "$system_monitor_pid" 2>/dev/null || true
    
    # Clean up test keys
    redis_cmd keys "${STRESS_KEY_PREFIX}*" | while read -r key; do
        redis_cmd del "$key"
    done
}

# Function to analyze results
analyze_results() {
    log "\nTest Results Analysis:"
    
    # Parse logs for key metrics
    local avg_ops
    avg_ops=$(grep "ops/sec" "$STRESS_RESULTS_FILE" | awk -F'=' '{sum+=$2} END {print sum/NR}')
    
    local max_memory
    max_memory=$(grep "memory=" "$STRESS_RESULTS_FILE" | awk -F'=' '{print $2}' | sort -r | head -n1)
    
    local avg_clients
    avg_clients=$(grep "clients=" "$STRESS_RESULTS_FILE" | awk -F'=' '{sum+=$2} END {print sum/NR}')
    
    log "Average Operations/sec: $avg_ops"
    log "Peak Memory Usage: $max_memory"
    log "Average Connected Clients: $avg_clients"
    
    # Check for errors
    local error_count
    error_count=$(grep -c "error" "$STRESS_RESULTS_FILE" || true)
    log "Total Errors: $error_count"
}

# Main function
main() {
    log "Starting Redis stress test..."
    
    # Create results file
    mkdir -p "$LOG_DIR"
    : > "$STRESS_RESULTS_FILE"
    
    # Run different types of stress tests
    for size in "${DATA_SIZES[@]}"; do
        run_stress_test "write" "$size"
        run_stress_test "read" "$size"
        run_stress_test "mixed" "$size"
    done
    
    # Analyze results
    analyze_results
    
    log "Stress test completed. Results saved to: $STRESS_RESULTS_FILE"
}

# Execute main function
main

# Exit successfully
exit 0
