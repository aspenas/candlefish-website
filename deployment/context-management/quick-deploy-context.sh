#!/bin/bash

# Quick Security Dashboard Deployment Context Generator
# Optimized for immediate use

echo "Security Dashboard Deployment Context - Quick Reference"
echo "========================================================"
echo ""
echo "📍 Project: /Users/patricksmith/candlefish-ai"
echo "🌿 Branch: $(git branch --show-current)"
echo "🔖 Commit: $(git rev-parse --short HEAD)"
echo ""

echo "🐳 Running Services:"
docker ps --format "table {{.Names}}\t{{.Ports}}\t{{.Status}}" | grep -E "security|prometheus|grafana|redis" || echo "None"
echo ""

echo "🚀 Quick Deployment Commands:"
echo "----------------------------"
echo "1. Build images:"
echo "   cd apps/security-dashboard && docker build -t security-dashboard:latest ."
echo ""
echo "2. Run locally:"
echo "   docker-compose -f deployment/docker-compose.security-dashboard.yml up -d"
echo ""
echo "3. Deploy to Kubernetes:"
echo "   kubectl apply -f deployment/k8s/security-dashboard/"
echo ""
echo "4. Check status:"
echo "   kubectl get pods -n security-dashboard"
echo "   curl http://localhost:8080/health"
echo ""

echo "📊 Monitoring:"
echo "-------------"
echo "Prometheus: http://localhost:9091"
echo "Grafana: http://localhost:3003 (admin/admin)"
echo ""

echo "🔧 Troubleshooting:"
echo "------------------"
echo "Logs: docker logs security-dashboard-backend"
echo "Shell: docker exec -it security-dashboard-backend sh"
echo "Rollback: ./scripts/deployment/rollback-procedures.sh"
echo ""

echo "📦 Context Package Info:"
echo "-----------------------"
echo "Full runbook: SECURITY_DASHBOARD_DEPLOYMENT_RUNBOOK.md"
echo "Token estimate: ~8,500 tokens"
echo "Opus 4.1 capacity: 2,000,000 input / 400,000 output"
echo ""

echo "✅ Context ready for deployment!"