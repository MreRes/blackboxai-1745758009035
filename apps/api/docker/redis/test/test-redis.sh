#!/bin/bash
set -e

# Configuration
REDIS_PASSWORD="${REDIS_PASSWORD:-}"
LOG_DIR="/redis/logs"
TEST_KEY_PREFIX="test:redis:"
TEST_RESULTS_FILE="${LOG_DIR}/test_results.log"

# Function to log messages
log() {
    echo "[$(date +'%Y-%m-%d %H:%M:%S')] $1" | tee -a "$TEST_RESULTS_FILE"
}

# Function to execute Redis commands
redis_cmd() {
    if [ -n "$REDIS_PASSWORD" ]; then
        redis-cli -a "$REDIS_PASSWORD" "$@"
    else
        redis-cli "$@"
    }
}

# Function to run a test case
run_test() {
    local test_name=$1
    local test_cmd=$2
    local expected_result=$3

    log "Running test: $test_name"
    local result
    result=$(eval "$test_cmd")

    if [ "$result" = "$expected_result" ]; then
        log "✅ Test passed: $test_name"
        return 0
    else
        log "❌ Test failed: $test_name"
        log "Expected: $expected_result"
        log "Got: $result"
        return 1
    }
}

# Function to clean up test keys
cleanup_test_keys() {
    log "Cleaning up test keys..."
    redis_cmd keys "${TEST_KEY_PREFIX}*" | while read -r key; do
        redis_cmd del "$key"
    done
}

# Test basic operations
test_basic_operations() {
    log "Testing basic Redis operations..."

    # Test SET/GET
    run_test "SET/GET" \
        "redis_cmd set ${TEST_KEY_PREFIX}test1 'hello' && redis_cmd get ${TEST_KEY_PREFIX}test1" \
        "hello"

    # Test DELETE
    run_test "DELETE" \
        "redis_cmd del ${TEST_KEY_PREFIX}test1 && redis_cmd exists ${TEST_KEY_PREFIX}test1" \
        "0"

    # Test INCR
    run_test "INCR" \
        "redis_cmd set ${TEST_KEY_PREFIX}counter 1 && redis_cmd incr ${TEST_KEY_PREFIX}counter && redis_cmd get ${TEST_KEY_PREFIX}counter" \
        "2"
}

# Test data types
test_data_types() {
    log "Testing Redis data types..."

    # Test List
    run_test "LIST" \
        "redis_cmd lpush ${TEST_KEY_PREFIX}list a b c && redis_cmd lrange ${TEST_KEY_PREFIX}list 0 -1 | tr '\n' ' '" \
        "c b a "

    # Test Set
    run_test "SET" \
        "redis_cmd sadd ${TEST_KEY_PREFIX}set a b c && redis_cmd scard ${TEST_KEY_PREFIX}set" \
        "3"

    # Test Hash
    run_test "HASH" \
        "redis_cmd hset ${TEST_KEY_PREFIX}hash field1 value1 && redis_cmd hget ${TEST_KEY_PREFIX}hash field1" \
        "value1"

    # Test Sorted Set
    run_test "SORTED SET" \
        "redis_cmd zadd ${TEST_KEY_PREFIX}zset 1 one && redis_cmd zscore ${TEST_KEY_PREFIX}zset one" \
        "1"
}

# Test expiration
test_expiration() {
    log "Testing key expiration..."

    run_test "EXPIRATION" \
        "redis_cmd setex ${TEST_KEY_PREFIX}expire 1 'temp' && sleep 2 && redis_cmd exists ${TEST_KEY_PREFIX}expire" \
        "0"
}

# Test persistence
test_persistence() {
    log "Testing persistence..."

    # Test RDB save
    run_test "RDB SAVE" \
        "redis_cmd save && test -f /redis/data/dump.rdb && echo 'exists'" \
        "exists"

    # Test AOF if enabled
    if redis_cmd config get appendonly | grep -q "yes"; then
        run_test "AOF FILE" \
            "test -f /redis/data/appendonly.aof && echo 'exists'" \
            "exists"
    fi
}

# Test memory limits
test_memory_limits() {
    log "Testing memory limits..."

    # Get maxmemory setting
    local maxmemory
    maxmemory=$(redis_cmd config get maxmemory | tail -n 1)

    run_test "MEMORY LIMIT" \
        "test $maxmemory -gt 0 && echo 'valid'" \
        "valid"
}

# Test pub/sub
test_pubsub() {
    log "Testing pub/sub functionality..."

    # Start subscriber in background
    redis_cmd subscribe ${TEST_KEY_PREFIX}channel > /tmp/pubsub_test &
    local sub_pid=$!

    # Wait for subscriber to start
    sleep 1

    # Publish message
    redis_cmd publish ${TEST_KEY_PREFIX}channel "test message"

    # Wait for message to be received
    sleep 1

    # Kill subscriber
    kill $sub_pid

    # Check if message was received
    run_test "PUB/SUB" \
        "grep -q 'test message' /tmp/pubsub_test && echo 'received'" \
        "received"

    rm -f /tmp/pubsub_test
}

# Test replication if configured
test_replication() {
    log "Testing replication status..."

    local role
    role=$(redis_cmd info replication | grep "role:" | cut -d: -f2 | tr -d '[:space:]')

    if [ "$role" = "slave" ]; then
        run_test "REPLICATION" \
            "redis_cmd info replication | grep 'master_link_status:' | cut -d: -f2 | tr -d '[:space:]'" \
            "up"
    else
        log "Skipping replication test (not a replica)"
    fi
}

# Test client connection limits
test_client_limits() {
    log "Testing client connection limits..."

    local max_clients
    max_clients=$(redis_cmd config get maxclients | tail -n 1)

    run_test "CLIENT LIMITS" \
        "test $max_clients -gt 0 && echo 'valid'" \
        "valid"
}

# Main test function
main() {
    log "Starting Redis tests..."

    # Create test results file
    mkdir -p "$LOG_DIR"
    : > "$TEST_RESULTS_FILE"

    # Run all tests
    test_basic_operations
    test_data_types
    test_expiration
    test_persistence
    test_memory_limits
    test_pubsub
    test_replication
    test_client_limits

    # Clean up
    cleanup_test_keys

    # Print test results summary
    local total_tests
    local passed_tests
    local failed_tests
    
    total_tests=$(grep -c "Running test:" "$TEST_RESULTS_FILE")
    passed_tests=$(grep -c "✅ Test passed:" "$TEST_RESULTS_FILE")
    failed_tests=$(grep -c "❌ Test failed:" "$TEST_RESULTS_FILE")

    log "Test Summary:"
    log "Total tests: $total_tests"
    log "Passed: $passed_tests"
    log "Failed: $failed_tests"

    # Exit with failure if any tests failed
    test "$failed_tests" -eq 0
}

# Execute main function
main

# Exit with success
exit 0
