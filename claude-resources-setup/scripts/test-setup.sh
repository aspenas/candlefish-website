#!/bin/bash
# Test script to validate the Claude resources setup

set -e

# Colors
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

echo -e "${BLUE}Claude Resources Setup Test${NC}"
echo "=========================="

# Test results
TESTS_PASSED=0
TESTS_FAILED=0

# Function to run a test
run_test() {
    local test_name="$1"
    local test_command="$2"

    echo -n "Testing: $test_name... "

    if eval "$test_command" &>/dev/null; then
        echo -e "${GREEN}✓ PASSED${NC}"
        ((TESTS_PASSED++))
    else
        echo -e "${RED}✗ FAILED${NC}"
        ((TESTS_FAILED++))
    fi
}

# Test 1: Check if repository structure is correct
run_test "Repository structure" "[ -d .github/workflows ] && [ -d scripts ] && [ -f README.md ]"

# Test 2: Check workflows
run_test "Sync upstream workflow" "[ -f .github/workflows/sync-upstream.yml ]"
run_test "Sync to projects workflow" "[ -f .github/workflows/sync-to-projects.yml ]"
run_test "Project template workflow" "[ -f .github/workflows/project-sync-template.yml ]"

# Test 3: Check scripts
run_test "Local setup script" "[ -f scripts/setup-local.sh ] && [ -x scripts/setup-local.sh ]"
run_test "Worktree setup script" "[ -f scripts/setup-worktree-claude.sh ] && [ -x scripts/setup-worktree-claude.sh ]"

# Test 4: Check documentation
run_test "Main README" "[ -f README.md ]"
run_test "Team onboarding guide" "[ -f TEAM_ONBOARDING.md ]"
run_test "Implementation guide" "[ -f IMPLEMENTATION_GUIDE.md ]"

# Test 5: Validate YAML files
echo -e "\n${YELLOW}Validating YAML files...${NC}"
for yaml in .github/workflows/*.yml; do
    if command -v yq &>/dev/null; then
        run_test "YAML validity: $(basename $yaml)" "yq eval '.' $yaml"
    else
        echo -e "${YELLOW}Skipping YAML validation (yq not installed)${NC}"
        break
    fi
done

# Test 6: Check script syntax
echo -e "\n${YELLOW}Checking shell script syntax...${NC}"
for script in scripts/*.sh; do
    run_test "Script syntax: $(basename $script)" "bash -n $script"
done

# Summary
echo -e "\n${BLUE}Test Summary${NC}"
echo "============"
echo -e "Tests passed: ${GREEN}$TESTS_PASSED${NC}"
echo -e "Tests failed: ${RED}$TESTS_FAILED${NC}"

if [ $TESTS_FAILED -eq 0 ]; then
    echo -e "\n${GREEN}✅ All tests passed! Ready for deployment.${NC}"
    exit 0
else
    echo -e "\n${RED}❌ Some tests failed. Please fix before deploying.${NC}"
    exit 1
fi
