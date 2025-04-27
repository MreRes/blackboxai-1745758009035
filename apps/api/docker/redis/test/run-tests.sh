#!/bin/bash
set -e

# Configuration
LOG_DIR="/redis/logs"
TEST_RESULTS_FILE="${LOG_DIR}/test_results.log"
REDIS_PASSWORD="${REDIS_PASSWORD:-}"
SKIP_STRESS_TEST="${SKIP_STRESS_TEST:-false}"

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
    done
}

# Function to check if Redis is running
check_redis() {
    if ! redis_cmd ping >/dev/null 2>&1; then
        log "Error: Redis is not running"
        return 1
    fi
    return 0
}

# Function to run a test suite
run_test_suite() {
    local test_script=$1
    local test_name=$2
    local start_time
    local end_time
    local duration

    log "Starting $test_name..."
    start_time=$(date +%s)

    if [ -x "$test_script" ]; then
        if "$test_script"; then
            end_time=$(date +%s)
            duration=$((end_time - start_time))
            log "✅ $test_name completed successfully (Duration: ${duration}s)"
            return 0
        else
            end_time=$(date +%s)
            duration=$((end_time - start_time))
            log "❌ $test_name failed (Duration: ${duration}s)"
            return 1
        fi
    else
        log "Error: Test script $test_script is not executable"
        return 1
    fi
}

# Function to prepare test environment
prepare_environment() {
    log "Preparing test environment..."

    # Create log directory
    mkdir -p "$LOG_DIR"
    : > "$TEST_RESULTS_FILE"

    # Make test scripts executable
    chmod +x ./*.sh

    # Clear Redis database
    redis_cmd flushall

    # Set up test configuration
    redis_cmd config set maxmemory "2gb"
    redis_cmd config set maxmemory-policy "allkeys-lru"
    redis_cmd config set appendonly "yes"
    redis_cmd config set save "900 1 300 10 60 10000"

    log "Test environment prepared"
}

# Function to generate test report
generate_report() {
    local total_tests=$1
    local passed_tests=$2
    local failed_tests=$3
    local start_time=$4
    local end_time=$5

    local duration=$((end_time - start_time))
    local success_rate=$(( (passed_tests * 100) / total_tests ))

    log "\n=============================="
    log "Test Execution Report"
    log "=============================="
    log "Total Tests: $total_tests"
    log "Passed: $passed_tests"
    log "Failed: $failed_tests"
    log "Success Rate: ${success_rate}%"
    log "Total Duration: ${duration}s"
    log "=============================="

    # Generate detailed report
    {
        echo "Redis Test Report"
        echo "Generated: $(date)"
        echo
        echo "System Information:"
        echo "Redis Version: $(redis_cmd info server | grep redis_version)"
        echo "OS: $(uname -a)"
        echo "Memory: $(free -h)"
        echo
        echo "Test Results:"
        echo "------------"
        grep -E "^\\[.*\\] (Starting|✅|❌)" "$TEST_RESULTS_FILE"
        echo
        echo "Performance Metrics:"
        echo "------------------"
        redis_cmd info stats
        echo
        echo "Memory Usage:"
        echo "------------"
        redis_cmd info memory
    } > "${LOG_DIR}/test_report.txt"
}

# Main function
main() {
    local start_time
    local end_time
    local total_tests=0
    local passed_tests=0
    local failed_tests=0

    log "Starting Redis test suite..."
    start_time=$(date +%s)

    # Check Redis
    if ! check_redis; then
        log "Redis check failed. Exiting."
        exit 1
    fi

    # Prepare environment
    prepare_environment

    # Run basic tests
    total_tests=$((total_tests + 1))
    if run_test_suite "./test-redis.sh" "Basic Tests"; then
        passed_tests=$((passed_tests + 1))
    else
        failed_tests=$((failed_tests + 1))
    fi

    # Run benchmark tests
    total_tests=$((total_tests + 1))
    if run_test_suite "./benchmark-redis.sh" "Benchmark Tests"; then
        passed_tests=$((passed_tests + 1))
    else
        failed_tests=$((failed_tests + 1))
    fi

    # Run stress tests if not skipped
    if [ "$SKIP_STRESS_TEST" != "true" ]; then
        total_tests=$((total_tests + 1))
        if run_test_suite "./stress-test.sh" "Stress Tests"; then
            passed_tests=$((passed_tests + 1))
        else
            failed_tests=$((failed_tests + 1))
        fi
    fi

    # Generate report
    end_time=$(date +%s)
    generate_report "$total_tests" "$passed_tests" "$failed_tests" "$start_time" "$end_time"

    log "Test execution completed. Full report available at: ${LOG_DIR}/test_report.txt"

    # Exit with failure if any tests failed
    [ "$failed_tests" -eq 0 ]
}

# Execute main function
main

# Exit with success
exit 0
