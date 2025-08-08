#!/usr/bin/env bash
set -euo pipefail

SECRET_NAME="candlefish/brand/figma/api_token"
REGION="us-west-2"

if ! command -v aws >/dev/null 2>&1; then
  echo "aws cli not found" >&2
  exit 1
fi

TOKEN=$(aws secretsmanager get-secret-value --secret-id "$SECRET_NAME" --region "$REGION" --query SecretString --output text)
echo "export FIGMA_TOKEN=$TOKEN"
