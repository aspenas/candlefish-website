#!/usr/bin/env bash
set -euo pipefail
APP="${1:-core}"
ENV="${2:-dev}"
OUT=".env"

aws secretsmanager get-secret-value \
  --secret-id "candlefish/${ENV}/${APP}" \
  --query 'SecretString' --output text > "${OUT}"

echo "Wrote ${OUT} from candlefish/${ENV}/${APP}"
