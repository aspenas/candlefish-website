#!/bin/bash

# PERFORMANCE MONITORING SCRIPT
# Tracks key metrics before and after optimizations

set -e

echo "📊 PERFORMANCE MONITORING REPORT"
echo "================================"
echo "Timestamp: $(date)"
echo ""

# Color codes
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m'

# Configuration
FRONTEND_DIR="./frontend"
BACKEND_DIR="./backend"
SITE_URL="${SITE_URL:-http://localhost:5173}"
API_URL="${API_URL:-http://localhost:8080}"

# 1. BUNDLE SIZE ANALYSIS
echo -e "${CYAN}=== BUNDLE SIZE ANALYSIS ===${NC}"
if [ -d "$FRONTEND_DIR/dist" ]; then
    cd "$FRONTEND_DIR"
    
    # Total bundle size
    TOTAL_SIZE=$(find dist -name "*.js" -o -name "*.css" 2>/dev/null | xargs du -ch | grep total | awk '{print $1}')
    echo "Total bundle size: $TOTAL_SIZE"
    
    # Individual chunks
    echo ""
    echo "Largest assets:"
    du -sh dist/assets/* 2>/dev/null | sort -hr | head -5
    
    # Check for code splitting
    CHUNK_COUNT=$(ls dist/assets/*.js 2>/dev/null | wc -l)
    echo ""
    if [ "$CHUNK_COUNT" -gt 5 ]; then
        echo -e "${GREEN}✓ Code splitting detected: $CHUNK_COUNT chunks${NC}"
    else
        echo -e "${YELLOW}⚠ Limited code splitting: only $CHUNK_COUNT chunks${NC}"
    fi
    
    cd - > /dev/null
fi

# 2. MEMORY USAGE
echo ""
echo -e "${CYAN}=== MEMORY USAGE ===${NC}"

# Frontend (Node/npm processes)
NODE_MEM=$(ps aux | grep -E "node|npm" | grep -v grep | awk '{sum+=$6} END {printf "%.1f", sum/1024}' 2>/dev/null || echo "0")
echo "Node.js processes: ${NODE_MEM}MB"

# Backend (Go processes)
GO_MEM=$(ps aux | grep -E "go|inventory" | grep -v grep | awk '{sum+=$6} END {printf "%.1f", sum/1024}' 2>/dev/null || echo "0")
echo "Go backend processes: ${GO_MEM}MB"

# Total
TOTAL_MEM=$(echo "$NODE_MEM + $GO_MEM" | bc 2>/dev/null || echo "N/A")
echo "Total memory usage: ${TOTAL_MEM}MB"

# 3. LOAD TIME TESTING
echo ""
echo -e "${CYAN}=== LOAD TIME TESTING ===${NC}"

# Test frontend load time
if curl -s --head "$SITE_URL" > /dev/null 2>&1; then
    START=$(date +%s%3N)
    curl -s -o /dev/null -w "Connect: %{time_connect}s\nTTFB: %{time_starttransfer}s\nTotal: %{time_total}s\n" "$SITE_URL"
    END=$(date +%s%3N)
    LOAD_TIME=$((END - START))
    
    # Check if under target
    if [ "$LOAD_TIME" -lt 2000 ]; then
        echo -e "${GREEN}✓ Load time: ${LOAD_TIME}ms (under 2s target)${NC}"
    else
        echo -e "${YELLOW}⚠ Load time: ${LOAD_TIME}ms (above 2s target)${NC}"
    fi
else
    echo -e "${RED}Frontend not accessible at $SITE_URL${NC}"
fi

# 4. API RESPONSE TIME
echo ""
echo -e "${CYAN}=== API RESPONSE TIME ===${NC}"

if curl -s --head "$API_URL/api/health" > /dev/null 2>&1; then
    # Test API endpoints
    for endpoint in "/api/health" "/api/items" "/api/stats"; do
        RESPONSE_TIME=$(curl -s -o /dev/null -w "%{time_total}" "$API_URL$endpoint" 2>/dev/null)
        RESPONSE_MS=$(echo "$RESPONSE_TIME * 1000" | bc | cut -d. -f1)
        
        if [ "$RESPONSE_MS" -lt 100 ]; then
            echo -e "${GREEN}✓ $endpoint: ${RESPONSE_MS}ms${NC}"
        elif [ "$RESPONSE_MS" -lt 500 ]; then
            echo -e "${YELLOW}⚠ $endpoint: ${RESPONSE_MS}ms${NC}"
        else
            echo -e "${RED}✗ $endpoint: ${RESPONSE_MS}ms (slow)${NC}"
        fi
    done
else
    echo -e "${RED}API not accessible at $API_URL${NC}"
fi

# 5. CACHE HIT RATE
echo ""
echo -e "${CYAN}=== CACHE ANALYSIS ===${NC}"

# Check Redis if available
if command -v redis-cli &> /dev/null; then
    REDIS_INFO=$(redis-cli INFO stats 2>/dev/null | grep -E "keyspace_hits|keyspace_misses" || echo "")
    if [ -n "$REDIS_INFO" ]; then
        HITS=$(echo "$REDIS_INFO" | grep "keyspace_hits" | cut -d: -f2 | tr -d '\r')
        MISSES=$(echo "$REDIS_INFO" | grep "keyspace_misses" | cut -d: -f2 | tr -d '\r')
        if [ "$HITS" -gt 0 ] || [ "$MISSES" -gt 0 ]; then
            TOTAL=$((HITS + MISSES))
            HIT_RATE=$(echo "scale=2; $HITS * 100 / $TOTAL" | bc)
            echo "Redis cache hit rate: ${HIT_RATE}%"
            
            if (( $(echo "$HIT_RATE > 80" | bc -l) )); then
                echo -e "${GREEN}✓ Good cache performance${NC}"
            else
                echo -e "${YELLOW}⚠ Cache hit rate below 80%${NC}"
            fi
        fi
    fi
else
    echo "Redis not available for cache analysis"
fi

# 6. DATABASE PERFORMANCE
echo ""
echo -e "${CYAN}=== DATABASE PERFORMANCE ===${NC}"

# Check for database connection
if [ -f "$BACKEND_DIR/database.db" ]; then
    DB_SIZE=$(du -sh "$BACKEND_DIR/database.db" | awk '{print $1}')
    echo "Database size: $DB_SIZE"
fi

# 7. OPTIMIZATION STATUS
echo ""
echo -e "${CYAN}=== OPTIMIZATION STATUS ===${NC}"

# Check if optimizations are applied
echo "Checking applied optimizations:"

# Code splitting check
if [ -f "$FRONTEND_DIR/src/utils/lazyRoutes.tsx" ]; then
    echo -e "${GREEN}✓ Code splitting implemented${NC}"
else
    echo -e "${RED}✗ Code splitting not found${NC}"
fi

# LRU Cache check
if [ -f "$FRONTEND_DIR/src/services/cache.ts" ]; then
    echo -e "${GREEN}✓ LRU cache service implemented${NC}"
else
    echo -e "${RED}✗ LRU cache not found${NC}"
fi

# Chart.js removal check
if grep -q "chart.js" "$FRONTEND_DIR/package.json" 2>/dev/null; then
    echo -e "${RED}✗ chart.js still present${NC}"
else
    echo -e "${GREEN}✓ chart.js removed${NC}"
fi

# Memory fix check (Go backend)
if [ -f "$BACKEND_DIR/services/database_optimization.go" ]; then
    if grep -q "startCleanupRoutine" "$BACKEND_DIR/services/database_optimization.go" 2>/dev/null; then
        echo -e "${GREEN}✓ Memory leak fix applied${NC}"
    else
        echo -e "${RED}✗ Memory leak fix not applied${NC}"
    fi
fi

# 8. PERFORMANCE SCORE
echo ""
echo -e "${CYAN}=== PERFORMANCE SCORE ===${NC}"

SCORE=0
MAX_SCORE=100

# Bundle size (30 points)
if [ -n "$TOTAL_SIZE" ]; then
    SIZE_KB=$(echo "$TOTAL_SIZE" | sed 's/[^0-9]//g')
    if [ "$SIZE_KB" -lt 1000 ]; then
        SCORE=$((SCORE + 30))
        echo -e "${GREEN}✓ Bundle size: excellent (+30)${NC}"
    elif [ "$SIZE_KB" -lt 2000 ]; then
        SCORE=$((SCORE + 20))
        echo -e "${YELLOW}⚠ Bundle size: good (+20)${NC}"
    else
        SCORE=$((SCORE + 10))
        echo -e "${RED}✗ Bundle size: needs improvement (+10)${NC}"
    fi
fi

# Memory usage (20 points)
if [ -n "$TOTAL_MEM" ] && [ "$TOTAL_MEM" != "N/A" ]; then
    MEM_INT=${TOTAL_MEM%.*}
    if [ "$MEM_INT" -lt 300 ]; then
        SCORE=$((SCORE + 20))
        echo -e "${GREEN}✓ Memory usage: excellent (+20)${NC}"
    elif [ "$MEM_INT" -lt 450 ]; then
        SCORE=$((SCORE + 10))
        echo -e "${YELLOW}⚠ Memory usage: acceptable (+10)${NC}"
    else
        echo -e "${RED}✗ Memory usage: high (+0)${NC}"
    fi
fi

# Load time (30 points)
if [ -n "$LOAD_TIME" ]; then
    if [ "$LOAD_TIME" -lt 2000 ]; then
        SCORE=$((SCORE + 30))
        echo -e "${GREEN}✓ Load time: excellent (+30)${NC}"
    elif [ "$LOAD_TIME" -lt 3000 ]; then
        SCORE=$((SCORE + 20))
        echo -e "${YELLOW}⚠ Load time: good (+20)${NC}"
    else
        SCORE=$((SCORE + 10))
        echo -e "${RED}✗ Load time: needs improvement (+10)${NC}"
    fi
fi

# Optimizations applied (20 points)
OPT_COUNT=0
[ -f "$FRONTEND_DIR/src/utils/lazyRoutes.tsx" ] && OPT_COUNT=$((OPT_COUNT + 1))
[ -f "$FRONTEND_DIR/src/services/cache.ts" ] && OPT_COUNT=$((OPT_COUNT + 1))
! grep -q "chart.js" "$FRONTEND_DIR/package.json" 2>/dev/null && OPT_COUNT=$((OPT_COUNT + 1))
grep -q "startCleanupRoutine" "$BACKEND_DIR/services/database_optimization.go" 2>/dev/null && OPT_COUNT=$((OPT_COUNT + 1))

OPT_SCORE=$((OPT_COUNT * 5))
SCORE=$((SCORE + OPT_SCORE))
echo -e "${BLUE}Optimizations applied: $OPT_COUNT/4 (+$OPT_SCORE)${NC}"

# Final score
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo -e "${CYAN}TOTAL PERFORMANCE SCORE: $SCORE/$MAX_SCORE${NC}"
if [ "$SCORE" -ge 80 ]; then
    echo -e "${GREEN}Grade: A - Excellent${NC}"
elif [ "$SCORE" -ge 70 ]; then
    echo -e "${GREEN}Grade: B - Good${NC}"
elif [ "$SCORE" -ge 60 ]; then
    echo -e "${YELLOW}Grade: C - Acceptable${NC}"
elif [ "$SCORE" -ge 50 ]; then
    echo -e "${YELLOW}Grade: D - Needs Improvement${NC}"
else
    echo -e "${RED}Grade: F - Critical Issues${NC}"
fi
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

# Save results
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
LOG_FILE="performance_${TIMESTAMP}.log"
echo ""
echo "Saving results to: $LOG_FILE"

# Generate recommendations
echo ""
echo -e "${CYAN}=== RECOMMENDATIONS ===${NC}"

if [ "$SCORE" -lt 80 ]; then
    echo "Priority actions to improve performance:"
    
    [ ! -f "$FRONTEND_DIR/src/utils/lazyRoutes.tsx" ] && echo "1. Apply code splitting: ./frontend/apply-optimizations.sh"
    [ "$SIZE_KB" -gt 2000 ] && echo "2. Reduce bundle size: analyze with 'npm run build -- --analyze'"
    [ "$MEM_INT" -gt 450 ] && echo "3. Apply memory fixes: ./backend/apply-memory-fix.sh"
    [ "$LOAD_TIME" -gt 2000 ] && echo "4. Deploy CDN: aws cloudfront create-distribution"
    [ ! -f "$FRONTEND_DIR/src/services/cache.ts" ] && echo "5. Implement caching: already in apply-optimizations.sh"
else
    echo -e "${GREEN}Performance is excellent! Continue monitoring.${NC}"
fi

echo ""
echo "Run this script periodically to track improvements."
echo "For continuous monitoring, add to cron:"
echo "  */30 * * * * $PWD/monitor-performance.sh >> performance.log"