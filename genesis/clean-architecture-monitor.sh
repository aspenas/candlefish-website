#!/bin/bash

# CANDLEFISH AI - CLEAN ARCHITECTURE MONITOR
# Real-time monitoring of architecture health metrics
# Run with: ./clean-architecture-monitor.sh

set -e

echo "📊 CANDLEFISH AI - CLEAN ARCHITECTURE MONITOR"
echo "============================================="
echo ""

# Color codes
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m'

# Calculate architecture metrics
calculate_metrics() {
    echo -e "${CYAN}Calculating architecture health metrics...${NC}"
    echo ""
    
    # 1. SOLID Score
    echo -e "${BLUE}[SOLID Principles Analysis]${NC}"
    
    # Check for God Objects (>500 lines)
    god_objects=$(find ../5470_S_Highline_Circle ../apps ../brand/website -name "*.go" -o -name "*.ts" -o -name "*.tsx" 2>/dev/null | xargs wc -l | awk '$1 > 500 {print $2}' | wc -l)
    
    # Check for single responsibility (files with multiple exports)
    multi_export=$(find ../5470_S_Highline_Circle ../apps -name "*.ts" -o -name "*.tsx" 2>/dev/null | xargs grep -l "export.*export.*export" | wc -l)
    
    # Calculate SOLID score
    solid_violations=$((god_objects + multi_export))
    solid_score=$((10 - (solid_violations / 10)))
    if [ $solid_score -lt 0 ]; then solid_score=0; fi
    
    echo "  God Objects Found: $god_objects"
    echo "  Multi-Export Files: $multi_export"
    echo -e "  ${YELLOW}SOLID Score: $solid_score/10${NC}"
    echo ""
    
    # 2. Clean Architecture Layers
    echo -e "${BLUE}[Clean Architecture Layers]${NC}"
    
    # Check for proper layer separation
    domain_files=$(find .. -path "*/domain/*" -type f 2>/dev/null | wc -l)
    usecase_files=$(find .. -path "*/application/*" -o -path "*/usecases/*" -type f 2>/dev/null | wc -l)
    infra_files=$(find .. -path "*/infrastructure/*" -type f 2>/dev/null | wc -l)
    
    echo "  Domain Layer Files: $domain_files"
    echo "  Use Case Layer Files: $usecase_files"
    echo "  Infrastructure Layer Files: $infra_files"
    
    if [ $domain_files -gt 0 ] && [ $usecase_files -gt 0 ] && [ $infra_files -gt 0 ]; then
        echo -e "  ${GREEN}✓ Layer separation detected${NC}"
    else
        echo -e "  ${RED}✗ Missing clean architecture layers${NC}"
    fi
    echo ""
    
    # 3. Database Access Patterns
    echo -e "${BLUE}[Database Access Patterns]${NC}"
    
    # Check for direct SQL in handlers
    direct_sql=$(find ../5470_S_Highline_Circle/backend/handlers -name "*.go" 2>/dev/null | xargs grep -l "SELECT\|INSERT\|UPDATE\|DELETE" | wc -l)
    
    # Check for repository pattern
    repo_files=$(find .. -name "*repository*.go" -o -name "*Repository.ts" 2>/dev/null | wc -l)
    
    echo "  Direct SQL in Handlers: $direct_sql"
    echo "  Repository Pattern Files: $repo_files"
    
    if [ $direct_sql -eq 0 ] && [ $repo_files -gt 0 ]; then
        echo -e "  ${GREEN}✓ Clean data access layer${NC}"
    else
        echo -e "  ${RED}✗ Database logic mixed with business logic${NC}"
    fi
    echo ""
    
    # 4. Dependency Analysis
    echo -e "${BLUE}[Dependency Direction]${NC}"
    
    # Check for circular dependencies
    circular_deps=$(find .. -name "*.go" -o -name "*.ts" 2>/dev/null | xargs grep -l "import.*cycle" | wc -l)
    
    # Check for dependency injection
    di_patterns=$(find .. -type f \( -name "*.go" -o -name "*.ts" \) 2>/dev/null | xargs grep -l "interface.*Repository\|interface.*Service" | wc -l)
    
    echo "  Circular Dependencies: $circular_deps"
    echo "  DI Patterns Found: $di_patterns"
    
    if [ $circular_deps -eq 0 ] && [ $di_patterns -gt 10 ]; then
        echo -e "  ${GREEN}✓ Clean dependency flow${NC}"
    else
        echo -e "  ${YELLOW}⚠ Dependency issues detected${NC}"
    fi
    echo ""
    
    # 5. Test Coverage
    echo -e "${BLUE}[Test Coverage]${NC}"
    
    # Count test files
    test_files=$(find .. -name "*_test.go" -o -name "*.test.ts" -o -name "*.spec.ts" 2>/dev/null | wc -l)
    source_files=$(find .. -name "*.go" -o -name "*.ts" -o -name "*.tsx" 2>/dev/null | grep -v test | grep -v spec | wc -l)
    
    if [ $source_files -gt 0 ]; then
        coverage_ratio=$((test_files * 100 / source_files))
    else
        coverage_ratio=0
    fi
    
    echo "  Test Files: $test_files"
    echo "  Source Files: $source_files"
    echo -e "  ${YELLOW}Coverage Ratio: $coverage_ratio%${NC}"
    echo ""
    
    # 6. Security Issues
    echo -e "${BLUE}[Security Analysis]${NC}"
    
    # Check for hardcoded secrets
    secrets=$(find .. -type f \( -name "*.go" -o -name "*.ts" -o -name "*.js" \) 2>/dev/null | xargs grep -l "password.*=.*['\"].*['\"]" | wc -l)
    
    # Check for SQL injection risks
    sql_injection=$(find .. -type f 2>/dev/null | xargs grep -l "fmt.Sprintf.*SELECT\|string.*+.*SELECT" 2>/dev/null | wc -l)
    
    echo "  Hardcoded Secrets: $secrets"
    echo "  SQL Injection Risks: $sql_injection"
    
    if [ $secrets -eq 0 ] && [ $sql_injection -eq 0 ]; then
        echo -e "  ${GREEN}✓ No critical security issues${NC}"
    else
        echo -e "  ${RED}✗ Security vulnerabilities found${NC}"
    fi
    echo ""
    
    # 7. Performance Metrics
    echo -e "${BLUE}[Performance Metrics]${NC}"
    
    # Check bundle sizes if build exists
    if [ -d "../5470_S_Highline_Circle/frontend/dist" ]; then
        bundle_size=$(du -sh ../5470_S_Highline_Circle/frontend/dist 2>/dev/null | awk '{print $1}')
        echo "  Frontend Bundle Size: $bundle_size"
    fi
    
    # Check for memory leaks patterns
    memory_leaks=$(find .. -name "*.go" 2>/dev/null | xargs grep -l "defer.*Close()" | wc -l)
    echo "  Proper Resource Cleanup: $memory_leaks files"
    echo ""
}

# Generate health score
generate_health_score() {
    echo -e "${CYAN}═══════════════════════════════════════${NC}"
    echo -e "${CYAN}       ARCHITECTURE HEALTH SCORE        ${NC}"
    echo -e "${CYAN}═══════════════════════════════════════${NC}"
    echo ""
    
    # Calculate overall score
    total_score=0
    max_score=100
    
    # SOLID Score (30 points)
    solid_points=$((solid_score * 3))
    total_score=$((total_score + solid_points))
    
    # Layer Separation (20 points)
    if [ $domain_files -gt 0 ] && [ $usecase_files -gt 0 ]; then
        total_score=$((total_score + 20))
    fi
    
    # Repository Pattern (20 points)
    if [ $direct_sql -eq 0 ] && [ $repo_files -gt 5 ]; then
        total_score=$((total_score + 20))
    fi
    
    # Test Coverage (20 points)
    coverage_points=$((coverage_ratio / 5))
    if [ $coverage_points -gt 20 ]; then coverage_points=20; fi
    total_score=$((total_score + coverage_points))
    
    # Security (10 points)
    if [ $secrets -eq 0 ] && [ $sql_injection -eq 0 ]; then
        total_score=$((total_score + 10))
    fi
    
    # Display score with color coding
    if [ $total_score -ge 80 ]; then
        echo -e "  ${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
        echo -e "  ${GREEN}  Overall Health: $total_score/100 - EXCELLENT${NC}"
        echo -e "  ${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    elif [ $total_score -ge 60 ]; then
        echo -e "  ${YELLOW}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
        echo -e "  ${YELLOW}  Overall Health: $total_score/100 - MODERATE${NC}"
        echo -e "  ${YELLOW}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    else
        echo -e "  ${RED}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
        echo -e "  ${RED}  Overall Health: $total_score/100 - CRITICAL${NC}"
        echo -e "  ${RED}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    fi
    echo ""
    
    # Recommendations
    echo -e "${CYAN}[Recommendations]${NC}"
    if [ $solid_score -lt 7 ]; then
        echo "  • Refactor god objects and improve single responsibility"
    fi
    if [ $domain_files -eq 0 ]; then
        echo "  • Implement domain layer with business entities"
    fi
    if [ $direct_sql -gt 0 ]; then
        echo "  • Extract database queries to repository layer"
    fi
    if [ $coverage_ratio -lt 60 ]; then
        echo "  • Increase test coverage to at least 80%"
    fi
    if [ $secrets -gt 0 ] || [ $sql_injection -gt 0 ]; then
        echo "  • Fix security vulnerabilities immediately"
    fi
    echo ""
}

# Progress tracking
track_progress() {
    echo -e "${CYAN}[Progress Since Last Check]${NC}"
    
    # Store current metrics
    metrics_file="/tmp/candlefish-metrics-$(date +%Y%m%d).txt"
    echo "solid_score=$solid_score" > "$metrics_file"
    echo "domain_files=$domain_files" >> "$metrics_file"
    echo "test_files=$test_files" >> "$metrics_file"
    echo "direct_sql=$direct_sql" >> "$metrics_file"
    
    # Compare with previous if exists
    prev_metrics="/tmp/candlefish-metrics-$(date -d yesterday +%Y%m%d).txt" 2>/dev/null || true
    if [ -f "$prev_metrics" ]; then
        source "$prev_metrics"
        echo "  SOLID Score Change: $((solid_score - prev_solid_score))"
        echo "  Domain Files Added: $((domain_files - prev_domain_files))"
        echo "  Test Files Added: $((test_files - prev_test_files))"
    else
        echo "  First run - no previous metrics to compare"
    fi
    echo ""
}

# Main execution
main() {
    while true; do
        clear
        echo "📊 CANDLEFISH AI - CLEAN ARCHITECTURE MONITOR"
        echo "============================================="
        echo "Timestamp: $(date '+%Y-%m-%d %H:%M:%S')"
        echo ""
        
        calculate_metrics
        generate_health_score
        track_progress
        
        echo -e "${CYAN}Press Ctrl+C to exit, refreshing in 60 seconds...${NC}"
        sleep 60
    done
}

# Run if not sourced
if [ "${BASH_SOURCE[0]}" = "${0}" ]; then
    main
fi