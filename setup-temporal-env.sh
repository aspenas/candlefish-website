#!/bin/bash

# Setup Temporal Environment Variables
# This script loads Temporal configuration from AWS Secrets Manager

set -e

echo "🔧 Setting up Temporal environment..."

# Load Temporal API key from AWS Secrets Manager
export TEMPORAL_API_KEY=$(aws secretsmanager get-secret-value --secret-id temporal/api-key --query SecretString --output text 2>/dev/null)

if [ -z "$TEMPORAL_API_KEY" ]; then
    echo "❌ Error: Could not load Temporal API key from AWS Secrets Manager"
    exit 1
fi

echo "✅ Temporal API key loaded successfully"

# Set other Temporal environment variables
export TEMPORAL_ADDRESS="hgipo.tmprl.cloud:7233"
export TEMPORAL_NAMESPACE="default"
export TEMPORAL_CLIENT_CERT_PATH=""
export TEMPORAL_CLIENT_KEY_PATH=""
export TEMPORAL_SKIP_HOST_VERIFICATION="false"

# GraphQL server configuration
export GRAPHQL_PORT="${GRAPHQL_PORT:-4000}"
export NODE_ENV="${NODE_ENV:-development}"

echo "📊 Environment variables set:"
echo "  - TEMPORAL_ADDRESS: $TEMPORAL_ADDRESS"
echo "  - TEMPORAL_NAMESPACE: $TEMPORAL_NAMESPACE"
echo "  - GRAPHQL_PORT: $GRAPHQL_PORT"
echo "  - NODE_ENV: $NODE_ENV"

# Execute the provided command with the environment variables
if [ $# -gt 0 ]; then
    echo ""
    echo "🚀 Running: $@"
    echo ""
    exec "$@"
else
    echo ""
    echo "✅ Environment ready. Run your commands with Temporal configuration loaded."
    echo ""
fi
