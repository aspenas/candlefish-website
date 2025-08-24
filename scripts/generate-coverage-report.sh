#!/bin/bash

# Comprehensive coverage report generation script
# Usage: ./scripts/generate-coverage-report.sh [--upload] [--badges]

set -euo pipefail

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
COVERAGE_DIR="coverage"
REPORTS_DIR="test-results"
BADGES_DIR="badges"
MIN_COVERAGE=80
MIN_FRONTEND_COVERAGE=85

echo -e "${BLUE}🧪 Starting comprehensive coverage report generation...${NC}"

# Clean previous coverage data
echo -e "${YELLOW}Cleaning previous coverage data...${NC}"
rm -rf $COVERAGE_DIR $REPORTS_DIR $BADGES_DIR
mkdir -p $COVERAGE_DIR $REPORTS_DIR $BADGES_DIR

# Function to check coverage threshold
check_coverage_threshold() {
    local coverage_file=$1
    local threshold=$2
    local component_name=$3

    if [ ! -f "$coverage_file" ]; then
        echo -e "${RED}❌ Coverage file not found: $coverage_file${NC}"
        return 1
    fi

    # Extract coverage percentage from Jest coverage summary
    local coverage=$(node -e "
        const fs = require('fs');
        const coverage = JSON.parse(fs.readFileSync('$coverage_file', 'utf8'));
        const total = coverage.total;
        const statements = total.statements.pct;
        const branches = total.branches.pct;
        const functions = total.functions.pct;
        const lines = total.lines.pct;
        const average = (statements + branches + functions + lines) / 4;
        console.log(Math.round(average * 100) / 100);
    ")

    echo -e "${BLUE}$component_name coverage: ${coverage}%${NC}"

    if (( $(echo "$coverage >= $threshold" | bc -l) )); then
        echo -e "${GREEN}✅ $component_name meets coverage threshold (${threshold}%)${NC}"
        return 0
    else
        echo -e "${RED}❌ $component_name below coverage threshold (${threshold}%)${NC}"
        return 1
    fi
}

# Function to generate coverage badge
generate_coverage_badge() {
    local coverage=$1
    local component=$2
    local color="red"

    if (( $(echo "$coverage >= 90" | bc -l) )); then
        color="brightgreen"
    elif (( $(echo "$coverage >= 80" | bc -l) )); then
        color="green"
    elif (( $(echo "$coverage >= 70" | bc -l) )); then
        color="yellow"
    elif (( $(echo "$coverage >= 60" | bc -l) )); then
        color="orange"
    fi

    # Generate badge using shields.io format
    local badge_url="https://img.shields.io/badge/coverage-${coverage}%25-${color}"
    echo "$badge_url" > "$BADGES_DIR/${component}-coverage-badge.txt"
}

# Run unit tests with coverage
echo -e "${BLUE}📊 Running unit tests with coverage...${NC}"

# Backend tests
echo -e "${YELLOW}Running backend inventory tests...${NC}"
npm run test:backend:inventory -- --coverage --coverageDirectory=$COVERAGE_DIR/backend 2>&1 | tee $REPORTS_DIR/backend-test-output.log

# GraphQL tests
echo -e "${YELLOW}Running GraphQL resolver tests...${NC}"
npm run test:graphql -- --coverage --coverageDirectory=$COVERAGE_DIR/graphql 2>&1 | tee $REPORTS_DIR/graphql-test-output.log

# Frontend tests
echo -e "${YELLOW}Running frontend React tests...${NC}"
npm run test:frontend:inventory -- --coverage --coverageDirectory=$COVERAGE_DIR/frontend 2>&1 | tee $REPORTS_DIR/frontend-test-output.log

# Mobile tests
echo -e "${YELLOW}Running React Native mobile tests...${NC}"
npm run test:mobile:inventory -- --coverage --coverageDirectory=$COVERAGE_DIR/mobile 2>&1 | tee $REPORTS_DIR/mobile-test-output.log

# Merge coverage reports
echo -e "${BLUE}📈 Merging coverage reports...${NC}"
npx nyc merge $COVERAGE_DIR $COVERAGE_DIR/merged-coverage.json

# Generate combined HTML report
npx nyc report --reporter=html --report-dir=$COVERAGE_DIR/html --temp-dir=$COVERAGE_DIR

# Generate JSON summary for threshold checking
npx nyc report --reporter=json-summary --report-dir=$COVERAGE_DIR --temp-dir=$COVERAGE_DIR

# Check coverage thresholds
echo -e "${BLUE}🎯 Checking coverage thresholds...${NC}"
threshold_passed=true

# Check individual component thresholds
if [ -f "$COVERAGE_DIR/backend/coverage-summary.json" ]; then
    check_coverage_threshold "$COVERAGE_DIR/backend/coverage-summary.json" $MIN_COVERAGE "Backend" || threshold_passed=false
fi

if [ -f "$COVERAGE_DIR/graphql/coverage-summary.json" ]; then
    check_coverage_threshold "$COVERAGE_DIR/graphql/coverage-summary.json" $MIN_COVERAGE "GraphQL" || threshold_passed=false
fi

if [ -f "$COVERAGE_DIR/frontend/coverage-summary.json" ]; then
    check_coverage_threshold "$COVERAGE_DIR/frontend/coverage-summary.json" $MIN_FRONTEND_COVERAGE "Frontend" || threshold_passed=false
fi

if [ -f "$COVERAGE_DIR/mobile/coverage-summary.json" ]; then
    check_coverage_threshold "$COVERAGE_DIR/mobile/coverage-summary.json" $MIN_COVERAGE "Mobile" || threshold_passed=false
fi

# Generate coverage badges if requested
if [[ "${1:-}" == "--badges" ]] || [[ "${2:-}" == "--badges" ]]; then
    echo -e "${BLUE}🏷️  Generating coverage badges...${NC}"

    # Generate badges for each component
    for coverage_file in "$COVERAGE_DIR"/*/coverage-summary.json; do
        if [ -f "$coverage_file" ]; then
            component=$(basename $(dirname $coverage_file))
            coverage=$(node -e "
                const coverage = require('$PWD/$coverage_file');
                const total = coverage.total;
                const average = (total.statements.pct + total.branches.pct + total.functions.pct + total.lines.pct) / 4;
                console.log(Math.round(average * 100) / 100);
            ")
            generate_coverage_badge $coverage $component
        fi
    done

    echo -e "${GREEN}✅ Coverage badges generated in $BADGES_DIR/${NC}"
fi

# Upload to Codecov if requested
if [[ "${1:-}" == "--upload" ]] || [[ "${2:-}" == "--upload" ]]; then
    echo -e "${BLUE}☁️  Uploading coverage to Codecov...${NC}"

    if command -v codecov &> /dev/null; then
        # Upload individual coverage files
        for lcov_file in "$COVERAGE_DIR"/*/lcov.info; do
            if [ -f "$lcov_file" ]; then
                component=$(basename $(dirname $lcov_file))
                codecov -f "$lcov_file" -F "$component" || echo -e "${YELLOW}⚠️  Failed to upload $component coverage${NC}"
            fi
        done

        # Upload merged coverage
        if [ -f "$COVERAGE_DIR/lcov.info" ]; then
            codecov -f "$COVERAGE_DIR/lcov.info" -F "merged" || echo -e "${YELLOW}⚠️  Failed to upload merged coverage${NC}"
        fi
    else
        echo -e "${YELLOW}⚠️  Codecov CLI not installed, skipping upload${NC}"
    fi
fi

# Generate coverage summary report
echo -e "${BLUE}📋 Generating coverage summary...${NC}"
cat > $REPORTS_DIR/coverage-summary.md << EOF
# Test Coverage Report

Generated on: $(date)

## Coverage Summary

| Component | Statements | Branches | Functions | Lines | Total |
|-----------|------------|----------|-----------|-------|-------|
EOF

# Add coverage data for each component
for coverage_file in "$COVERAGE_DIR"/*/coverage-summary.json; do
    if [ -f "$coverage_file" ]; then
        component=$(basename $(dirname $coverage_file))
        node -e "
            const coverage = require('$PWD/$coverage_file');
            const total = coverage.total;
            const avg = Math.round(((total.statements.pct + total.branches.pct + total.functions.pct + total.lines.pct) / 4) * 100) / 100;
            console.log('| ' + '$component'.charAt(0).toUpperCase() + '$component'.slice(1) + ' | ' + total.statements.pct + '% | ' + total.branches.pct + '% | ' + total.functions.pct + '% | ' + total.lines.pct + '% | ' + avg + '% |');
        " >> $REPORTS_DIR/coverage-summary.md
    fi
done

cat >> $REPORTS_DIR/coverage-summary.md << EOF

## Threshold Status

- Minimum Coverage: ${MIN_COVERAGE}%
- Frontend Minimum: ${MIN_FRONTEND_COVERAGE}%
- Status: $(if [ "$threshold_passed" = true ]; then echo "✅ PASSED"; else echo "❌ FAILED"; fi)

## Reports

- HTML Report: [coverage/html/index.html](coverage/html/index.html)
- JSON Summary: [coverage/coverage-summary.json](coverage/coverage-summary.json)
- LCOV Report: [coverage/lcov.info](coverage/lcov.info)

$(if [ -d "$BADGES_DIR" ] && [ "$(ls -A $BADGES_DIR)" ]; then
    echo "## Coverage Badges"
    echo
    for badge_file in "$BADGES_DIR"/*-coverage-badge.txt; do
        if [ -f "$badge_file" ]; then
            component=$(basename "$badge_file" -coverage-badge.txt)
            badge_url=$(cat "$badge_file")
            echo "- $component: ![$component Coverage]($badge_url)"
        fi
    done
fi)
EOF

# Final status
echo -e "${BLUE}📊 Coverage report generation complete!${NC}"
echo -e "${BLUE}📁 Reports available in: $REPORTS_DIR${NC}"
echo -e "${BLUE}🌐 HTML report: $COVERAGE_DIR/html/index.html${NC}"

if [ "$threshold_passed" = true ]; then
    echo -e "${GREEN}🎉 All coverage thresholds met!${NC}"
    exit 0
else
    echo -e "${RED}💥 Some coverage thresholds not met. Check the report for details.${NC}"
    exit 1
fi
