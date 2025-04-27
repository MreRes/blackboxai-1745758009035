#!/bin/bash
set -e

# Configuration
REDIS_PASSWORD="${REDIS_PASSWORD:-}"
LOG_DIR="/redis/logs"
BENCHMARK_RESULTS_FILE="${LOG_DIR}/benchmark_results.log"
BENCHMARK_KEY_PREFIX="bench:redis:"
ITERATIONS=3  # Number of times to run each test
CLIENTS=(50 100 200)  # Number of parallel clients to test
REQUESTS=100000  # Number of requests per test

# Function to log messages
log() {
    echo "[$(date +'%Y-%m-%d %H:%M:%S')] $1" | tee -a "$BENCHMARK_RESULTS_FILE"
}

# Function to execute Redis commands
redis_cmd() {
    if [ -n "$REDIS_PASSWORD" ]; then
        redis-cli -a "$REDIS_PASSWORD" "$@"
    else
        redis-cli "$@"
    }
}

# Function to execute Redis benchmark
redis_bench() {
    if [ -n "$REDIS_PASSWORD" ]; then
        redis-benchmark -a "$REDIS_PASSWORD" "$@"
    else
        redis-benchmark "$@"
    fi
}

# Function to clean up benchmark keys
cleanup_benchmark_keys() {
    log "Cleaning up benchmark keys..."
    redis_cmd keys "${BENCHMARK_KEY_PREFIX}*" | while read -r key; do
        redis_cmd del "$key"
    done
}

# Function to format numbers with commas
format_number() {
    printf "%'d" "$1"
}

# Function to calculate average from array
calculate_average() {
    local sum=0
    local count=0
    for value in "$@"; do
        sum=$((sum + value))
        count=$((count + 1))
    done
    echo $((sum / count))
}

# Function to run a single benchmark test
run_benchmark_test() {
    local test_name=$1
    local clients=$2
    local test_args=$3
    local results=()

    log "Running benchmark: $test_name with $clients clients"
    
    for ((i=1; i<=ITERATIONS; i++)); do
        log "Iteration $i of $ITERATIONS"
        
        # Run benchmark and capture requests per second
        local rps
        rps=$(redis_bench -h localhost -p 6379 \
            -n "$REQUESTS" \
            -c "$clients" \
            -P 16 \
            -d 256 \
            --threads 2 \
            -k 1 \
            --csv \
            $test_args | grep "rps" | cut -d',' -f2)
        
        results+=("$rps")
        log "Requests per second: $(format_number "$rps")"
    done

    # Calculate and return average
    calculate_average "${results[@]}"
}

# Function to run memory test
test_memory_usage() {
    log "Testing memory usage..."
    
    # Get initial memory
    local initial_memory
    initial_memory=$(redis_cmd info memory | grep "used_memory:" | cut -d: -f2)
    
    # Write test data
    for i in {1..10000}; do
        redis_cmd set "${BENCHMARK_KEY_PREFIX}key$i" "value$i" >/dev/null
    done
    
    # Get final memory
    local final_memory
    final_memory=$(redis_cmd info memory | grep "used_memory:" | cut -d: -f2)
    
    # Calculate memory per key
    local memory_per_key
    memory_per_key=$(( (final_memory - initial_memory) / 10000 ))
    
    log "Average memory per key: $memory_per_key bytes"
    
    cleanup_benchmark_keys
}

# Function to test different data types
benchmark_data_types() {
    log "Benchmarking different data types..."
    
    local clients=$1
    local results=()
    
    # String operations
    results+=("String SET: $(run_benchmark_test "String SET" "$clients" "-t set")")
    results+=("String GET: $(run_benchmark_test "String GET" "$clients" "-t get")")
    
    # Hash operations
    results+=("Hash HSET: $(run_benchmark_test "Hash HSET" "$clients" "-t hset")")
    results+=("Hash HGET: $(run_benchmark_test "Hash HGET" "$clients" "-t hget")")
    
    # List operations
    results+=("List LPUSH: $(run_benchmark_test "List LPUSH" "$clients" "-t lpush")")
    results+=("List RPOP: $(run_benchmark_test "List RPOP" "$clients" "-t rpop")")
    
    # Set operations
    results+=("Set SADD: $(run_benchmark_test "Set SADD" "$clients" "-t sadd")")
    results+=("Set SPOP: $(run_benchmark_test "Set SPOP" "$clients" "-t spop")")
    
    # Sorted Set operations
    results+=("Sorted Set ZADD: $(run_benchmark_test "Sorted Set ZADD" "$clients" "-t zadd")")
    results+=("Sorted Set ZRANGE: $(run_benchmark_test "Sorted Set ZRANGE" "$clients" "-t zrange")")
    
    # Print results
    log "\nResults for $clients clients:"
    printf "%s\n" "${results[@]}"
}

# Function to test pipeline performance
test_pipeline() {
    log "Testing pipeline performance..."
    
    for clients in "${CLIENTS[@]}"; do
        local pipeline_sizes=(1 10 50 100)
        
        for size in "${pipeline_sizes[@]}"; do
            local rps
            rps=$(run_benchmark_test "Pipeline size $size" "$clients" "-P $size")
            log "Pipeline size $size with $clients clients: $(format_number "$rps") requests/sec"
        done
    done
}

# Function to test latency
test_latency() {
    log "Testing latency..."
    
    redis_cmd config set latency-monitor-threshold 100
    
    # Generate some load
    redis_bench -n 10000 -q >/dev/null &
    
    # Monitor latency for 10 seconds
    log "Monitoring latency for 10 seconds..."
    redis_cmd latency history command
    
    sleep 10
    
    # Get latency report
    local latency_report
    latency_report=$(redis_cmd latency latest)
    log "Latency report: $latency_report"
}

# Main benchmark function
main() {
    log "Starting Redis benchmarks..."
    
    # Create benchmark results file
    mkdir -p "$LOG_DIR"
    : > "$BENCHMARK_RESULTS_FILE"
    
    # Log system info
    log "System Information:"
    log "CPU: $(nproc) cores"
    log "Memory: $(free -h | grep Mem | awk '{print $2}')"
    log "Redis Version: $(redis_cmd info server | grep redis_version)"
    
    # Run benchmarks for different numbers of clients
    for clients in "${CLIENTS[@]}"; do
        log "\nRunning benchmarks with $clients clients..."
        benchmark_data_types "$clients"
    done
    
    # Run pipeline tests
    test_pipeline
    
    # Run memory tests
    test_memory_usage
    
    # Run latency tests
    test_latency
    
    # Clean up
    cleanup_benchmark_keys
    
    log "\nBenchmark complete. Results saved to: $BENCHMARK_RESULTS_FILE"
}

# Execute main function
main

# Exit successfully
exit 0
