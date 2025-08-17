#!/bin/bash

# Candlefish Auth Service Deployment Script
# Usage: ./scripts/deploy.sh [environment] [options]

set -e

# Configuration
PROJECT_NAME="candlefish-auth-service"
REGISTRY="ghcr.io/candlefish-ai"
SERVICE_NAME="auth-service"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Default values
ENVIRONMENT="${1:-development}"
BUILD_PUSH="true"
RUN_TESTS="true"
SKIP_HEALTH_CHECK="false"

# Parse arguments
while [[ $# -gt 0 ]]; do
  case $1 in
    -e|--environment)
      ENVIRONMENT="$2"
      shift 2
      ;;
    --no-build)
      BUILD_PUSH="false"
      shift
      ;;
    --no-tests)
      RUN_TESTS="false"
      shift
      ;;
    --skip-health-check)
      SKIP_HEALTH_CHECK="true"
      shift
      ;;
    -h|--help)
      echo "Usage: $0 [environment] [options]"
      echo "Environments: development, staging, production"
      echo "Options:"
      echo "  -e, --environment    Set deployment environment"
      echo "      --no-build       Skip building and pushing container"
      echo "      --no-tests       Skip running tests"
      echo "      --skip-health-check Skip health check after deployment"
      echo "  -h, --help          Show this help message"
      exit 0
      ;;
    *)
      echo "Unknown option $1"
      exit 1
      ;;
  esac
done

# Validate environment
if [[ ! "$ENVIRONMENT" =~ ^(development|staging|production)$ ]]; then
  echo -e "${RED}Error: Invalid environment '$ENVIRONMENT'. Must be development, staging, or production.${NC}"
  exit 1
fi

echo -e "${BLUE}🚀 Deploying Auth Service to ${ENVIRONMENT}${NC}"

# Check prerequisites
check_prerequisites() {
  echo -e "${YELLOW}Checking prerequisites...${NC}"

  # Check if Docker is running
  if ! docker info > /dev/null 2>&1; then
    echo -e "${RED}Error: Docker is not running${NC}"
    exit 1
  fi

  # Check if AWS CLI is configured for non-development environments
  if [[ "$ENVIRONMENT" != "development" ]]; then
    if ! aws sts get-caller-identity > /dev/null 2>&1; then
      echo -e "${RED}Error: AWS CLI not configured${NC}"
      exit 1
    fi
  fi

  # Check if required environment variables are set
  if [[ "$ENVIRONMENT" != "development" ]]; then
    required_vars=("AWS_REGION")
    for var in "${required_vars[@]}"; do
      if [[ -z "${!var}" ]]; then
        echo -e "${RED}Error: Environment variable $var is not set${NC}"
        exit 1
      fi
    done
  fi

  echo -e "${GREEN}✅ Prerequisites check passed${NC}"
}

# Run tests
run_tests() {
  if [[ "$RUN_TESTS" == "true" ]]; then
    echo -e "${YELLOW}Running tests...${NC}"

    # Start test dependencies
    docker-compose -f docker-compose.test.yml up -d postgres redis

    # Wait for services to be ready
    sleep 10

    # Run tests
    npm test
    npm run test:coverage

    # Cleanup test environment
    docker-compose -f docker-compose.test.yml down -v

    echo -e "${GREEN}✅ Tests passed${NC}"
  else
    echo -e "${YELLOW}⏭️  Skipping tests${NC}"
  fi
}

# Build and push container
build_and_push() {
  if [[ "$BUILD_PUSH" == "true" ]]; then
    echo -e "${YELLOW}Building container image...${NC}"

    # Get git commit hash for tagging
    GIT_COMMIT=$(git rev-parse --short HEAD)
    GIT_BRANCH=$(git rev-parse --abbrev-ref HEAD)
    TIMESTAMP=$(date +%Y%m%d-%H%M%S)

    # Build image
    IMAGE_TAG="${REGISTRY}/${SERVICE_NAME}:${GIT_BRANCH}-${GIT_COMMIT}-${TIMESTAMP}"
    LATEST_TAG="${REGISTRY}/${SERVICE_NAME}:latest"

    docker build -t "$IMAGE_TAG" -t "$LATEST_TAG" .

    if [[ "$ENVIRONMENT" != "development" ]]; then
      echo -e "${YELLOW}Pushing container image...${NC}"
      docker push "$IMAGE_TAG"
      if [[ "$GIT_BRANCH" == "main" ]]; then
        docker push "$LATEST_TAG"
      fi
      echo -e "${GREEN}✅ Container image pushed: $IMAGE_TAG${NC}"
    else
      echo -e "${GREEN}✅ Container image built: $IMAGE_TAG${NC}"
    fi
  else
    echo -e "${YELLOW}⏭️  Skipping container build${NC}"
  fi
}

# Deploy to environment
deploy() {
  echo -e "${YELLOW}Deploying to ${ENVIRONMENT}...${NC}"

  case "$ENVIRONMENT" in
    development)
      deploy_development
      ;;
    staging)
      deploy_staging
      ;;
    production)
      deploy_production
      ;;
  esac
}

deploy_development() {
  echo -e "${YELLOW}Starting development environment...${NC}"

  # Stop any existing containers
  docker-compose down

  # Start services
  docker-compose up -d

  echo -e "${GREEN}✅ Development environment started${NC}"
  echo -e "${BLUE}Auth Service: http://localhost:3001${NC}"
  echo -e "${BLUE}PgAdmin: http://localhost:8080 (admin@candlefish.ai / admin123)${NC}"
  echo -e "${BLUE}Redis Commander: http://localhost:8081${NC}"
}

deploy_staging() {
  echo -e "${YELLOW}Deploying to staging environment...${NC}"

  # Update ECS service
  aws ecs update-service \
    --cluster auth-service-staging \
    --service auth-service \
    --force-new-deployment \
    --region "${AWS_REGION:-us-east-1}"

  # Wait for deployment
  echo -e "${YELLOW}Waiting for deployment to complete...${NC}"
  aws ecs wait services-stable \
    --cluster auth-service-staging \
    --services auth-service \
    --region "${AWS_REGION:-us-east-1}"

  echo -e "${GREEN}✅ Deployed to staging${NC}"
}

deploy_production() {
  echo -e "${YELLOW}Deploying to production environment...${NC}"

  # Production deployment with extra confirmation
  echo -e "${RED}⚠️  You are about to deploy to PRODUCTION${NC}"
  read -p "Are you sure you want to continue? (yes/no): " -r
  if [[ ! $REPLY =~ ^[Yy][Ee][Ss]$ ]]; then
    echo -e "${YELLOW}Deployment cancelled${NC}"
    exit 0
  fi

  # Blue-green deployment
  aws ecs update-service \
    --cluster auth-service-production \
    --service auth-service \
    --force-new-deployment \
    --region "${AWS_REGION:-us-east-1}"

  # Wait for deployment
  echo -e "${YELLOW}Waiting for production deployment to complete...${NC}"
  aws ecs wait services-stable \
    --cluster auth-service-production \
    --services auth-service \
    --region "${AWS_REGION:-us-east-1}"

  echo -e "${GREEN}✅ Deployed to production${NC}"
}

# Health check
health_check() {
  if [[ "$SKIP_HEALTH_CHECK" == "true" ]]; then
    echo -e "${YELLOW}⏭️  Skipping health check${NC}"
    return
  fi

  echo -e "${YELLOW}Running health check...${NC}"

  case "$ENVIRONMENT" in
    development)
      HEALTH_URL="http://localhost:3001/health"
      ;;
    staging)
      HEALTH_URL="https://auth-staging.candlefish.ai/health"
      ;;
    production)
      HEALTH_URL="https://auth.candlefish.ai/health"
      ;;
  esac

  # Wait for service to be ready
  sleep 30

  # Retry health check
  for i in {1..10}; do
    if curl -f -s "$HEALTH_URL" > /dev/null; then
      echo -e "${GREEN}✅ Health check passed${NC}"

      # Additional checks for JWKS endpoint
      JWKS_URL="${HEALTH_URL%/health}/.well-known/jwks.json"
      if curl -f -s "$JWKS_URL" > /dev/null; then
        echo -e "${GREEN}✅ JWKS endpoint check passed${NC}"
      else
        echo -e "${YELLOW}⚠️  JWKS endpoint check failed${NC}"
      fi

      return 0
    fi
    echo -e "${YELLOW}Health check attempt $i failed, retrying in 10s...${NC}"
    sleep 10
  done

  echo -e "${RED}❌ Health check failed after 10 attempts${NC}"
  exit 1
}

# Show deployment info
show_info() {
  echo -e "\n${BLUE}🎉 Deployment complete!${NC}"
  echo -e "${BLUE}Environment: ${ENVIRONMENT}${NC}"

  case "$ENVIRONMENT" in
    development)
      echo -e "${BLUE}Health Check: http://localhost:3001/health${NC}"
      echo -e "${BLUE}JWKS Endpoint: http://localhost:3001/.well-known/jwks.json${NC}"
      echo -e "${BLUE}API Docs: http://localhost:3001/api-docs${NC}"
      ;;
    staging)
      echo -e "${BLUE}Health Check: https://auth-staging.candlefish.ai/health${NC}"
      echo -e "${BLUE}JWKS Endpoint: https://auth-staging.candlefish.ai/.well-known/jwks.json${NC}"
      ;;
    production)
      echo -e "${BLUE}Health Check: https://auth.candlefish.ai/health${NC}"
      echo -e "${BLUE}JWKS Endpoint: https://auth.candlefish.ai/.well-known/jwks.json${NC}"
      ;;
  esac
}

# Main execution
main() {
  check_prerequisites
  run_tests
  build_and_push
  deploy
  health_check
  show_info
}

# Run main function
main "$@"
