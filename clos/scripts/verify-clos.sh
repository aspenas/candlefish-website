#!/bin/bash

# CLOS System Verification Script
# Comprehensive testing of all CLOS components

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}======================================${NC}"
echo -e "${BLUE}   CLOS System Verification Suite${NC}"
echo -e "${BLUE}======================================${NC}"

CLOS_ROOT="/Users/patricksmith/candlefish-ai/clos"
FAILED_TESTS=0
PASSED_TESTS=0

# Function to test a condition
test_condition() {
    local test_name="$1"
    local command="$2"
    local expected_result="${3:-0}"
    
    echo -n -e "Testing: ${test_name}... "
    
    if eval "$command" >/dev/null 2>&1; then
        if [ "$expected_result" = "0" ]; then
            echo -e "${GREEN}✓${NC}"
            ((PASSED_TESTS++))
        else
            echo -e "${RED}✗ (expected failure)${NC}"
            ((FAILED_TESTS++))
        fi
    else
        if [ "$expected_result" != "0" ]; then
            echo -e "${GREEN}✓ (expected failure)${NC}"
            ((PASSED_TESTS++))
        else
            echo -e "${RED}✗${NC}"
            ((FAILED_TESTS++))
        fi
    fi
}

# Test 1: Check if CLOS binary exists
test_condition "CLOS binary exists" "[ -f $CLOS_ROOT/clos ]"

# Test 2: Check if Docker is running
test_condition "Docker daemon is running" "docker info"

# Test 3: Check Docker networks
test_condition "CLOS network exists" "docker network inspect clos-network"

# Test 4: Check PostgreSQL container
test_condition "PostgreSQL container running" "docker ps | grep clos-postgres"

# Test 5: Check Redis container
test_condition "Redis container running" "docker ps | grep clos-redis"

# Test 6: Check Caddy container
test_condition "Caddy container running" "docker ps | grep clos-caddy"

# Test 7: PostgreSQL connectivity
test_condition "PostgreSQL is accessible" "nc -zv localhost 5432"

# Test 8: Redis connectivity
test_condition "Redis is accessible" "nc -zv localhost 6379"

# Test 9: Caddy HTTP connectivity
test_condition "Caddy HTTP is accessible" "nc -zv localhost 80"

# Test 10: SQLite registry database
test_condition "Registry database exists" "[ -f $CLOS_ROOT/.clos/registry.db ]"

# Test 11: CLOS configuration
test_condition "CLOS config exists" "[ -f $CLOS_ROOT/.clos/config.yaml ]"

# Test 12: Shell integration
test_condition "Shell integration sourced" "type clos_status"

# Test 13: Check PostgreSQL health
test_condition "PostgreSQL health check" "docker exec clos-postgres pg_isready -U candlefish"

# Test 14: Check Redis health
test_condition "Redis health check" "docker exec clos-redis redis-cli ping | grep PONG"

# Test 15: Check Caddy admin API
test_condition "Caddy admin API" "curl -sf http://localhost:2019/config/"

# Test 16: Test CLOS CLI status command
test_condition "CLOS status command" "$CLOS_ROOT/clos status"

# Test 17: Port allocation check
test_condition "Port 3000 is free or managed" "$CLOS_ROOT/clos check 3000"

# Test 18: Check for port conflicts
echo -e "\n${BLUE}Checking for port conflicts...${NC}"
COMMON_PORTS=(3000 3100 3200 4000 4100 5432 6379 8080 8501 8787)
for port in "${COMMON_PORTS[@]}"; do
    if lsof -i ":$port" | grep -v "clos-" >/dev/null 2>&1; then
        echo -e "${YELLOW}Warning: Port $port is in use by non-CLOS process${NC}"
    fi
done

# Test 19: Docker Compose files validity
echo -e "\n${BLUE}Validating Docker Compose files...${NC}"
for compose_file in $CLOS_ROOT/deployment/services/*.yml; do
    if [ -f "$compose_file" ]; then
        filename=$(basename "$compose_file")
        test_condition "Compose file $filename" "docker-compose -f $compose_file config"
    fi
done

# Test 20: Service health endpoints
echo -e "\n${BLUE}Testing service health endpoints...${NC}"
if curl -sf http://localhost:80 >/dev/null 2>&1; then
    echo -e "Caddy status page: ${GREEN}✓${NC}"
    ((PASSED_TESTS++))
else
    echo -e "Caddy status page: ${RED}✗${NC}"
    ((FAILED_TESTS++))
fi

# Summary
echo -e "\n${BLUE}======================================${NC}"
echo -e "${BLUE}         Test Summary${NC}"
echo -e "${BLUE}======================================${NC}"
echo -e "Passed: ${GREEN}$PASSED_TESTS${NC}"
echo -e "Failed: ${RED}$FAILED_TESTS${NC}"

if [ $FAILED_TESTS -eq 0 ]; then
    echo -e "\n${GREEN}All tests passed! CLOS is fully operational.${NC}"
    exit 0
else
    echo -e "\n${YELLOW}Some tests failed. Run '$CLOS_ROOT/scripts/diagnose-clos.sh' for detailed diagnostics.${NC}"
    exit 1
fi