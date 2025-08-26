#!/bin/bash

# Security Dashboard Local Management Script
# Zero cost staging environment management

GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

case "$1" in
    start)
        echo "🚀 Starting Security Dashboard (Local/Free)..."
        
        # Start Redis
        docker start security-redis 2>/dev/null || \
        docker run -d --name security-redis -p 6379:6379 redis:7-alpine
        
        # Start Prometheus  
        docker start security-prometheus 2>/dev/null || \
        docker run -d --name security-prometheus -p 9091:9090 prom/prometheus:latest
        
        # Start Grafana
        docker start security-grafana 2>/dev/null || \
        docker run -d --name security-grafana \
            -e GF_SECURITY_ADMIN_PASSWORD=admin123 \
            -e GF_SECURITY_ADMIN_USER=admin \
            -p 3003:3000 grafana/grafana:latest
        
        sleep 3
        echo -e "${GREEN}✅ Services Started!${NC}"
        $0 status
        ;;
        
    stop)
        echo "🛑 Stopping Security Dashboard..."
        docker stop security-redis security-prometheus security-grafana 2>/dev/null
        echo -e "${YELLOW}Services stopped${NC}"
        ;;
        
    restart)
        $0 stop
        sleep 2
        $0 start
        ;;
        
    status)
        echo "📊 Security Dashboard Status:"
        echo "=============================="
        docker ps --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}" | grep -E "NAME|security-" || echo "No services running"
        
        echo -e "\n🌐 Access URLs:"
        echo "  Redis:      redis://localhost:6379"
        echo "  Prometheus: http://localhost:9091"  
        echo "  Grafana:    http://localhost:3003 (admin/admin123)"
        
        echo -e "\n💰 Cost: ${GREEN}$0/month${NC} (running locally)"
        ;;
        
    logs)
        SERVICE=${2:-all}
        if [ "$SERVICE" = "all" ]; then
            docker logs -f security-redis security-prometheus security-grafana 2>/dev/null
        else
            docker logs -f security-$SERVICE 2>/dev/null
        fi
        ;;
        
    test)
        echo "🧪 Testing Services..."
        
        # Test Redis
        echo -n "Redis: "
        if docker exec security-redis redis-cli ping > /dev/null 2>&1; then
            echo -e "${GREEN}✓ Working${NC}"
        else
            echo -e "${RED}✗ Failed${NC}"
        fi
        
        # Test Prometheus
        echo -n "Prometheus: "
        if curl -s http://localhost:9091/-/healthy > /dev/null 2>&1; then
            echo -e "${GREEN}✓ Working${NC}"
        else
            echo -e "${RED}✗ Failed${NC}"
        fi
        
        # Test Grafana
        echo -n "Grafana: "
        if curl -s http://localhost:3003/api/health > /dev/null 2>&1; then
            echo -e "${GREEN}✓ Working${NC}"
        else
            echo -e "${RED}✗ Failed${NC}"
        fi
        ;;
        
    demo)
        echo "🎭 Starting Demo Mode..."
        echo "========================"
        
        # Generate some sample data in Redis
        echo "Inserting sample security events..."
        docker exec security-redis redis-cli <<EOF
ZADD security:events:critical $(date +%s) "Kong Admin API exposed on HTTP"
ZADD security:events:high $(date +%s) "Multiple failed login attempts detected"
ZADD security:events:medium $(date +%s) "Unusual API traffic pattern observed"
HSET security:stats total_events 1247
HSET security:stats critical_count 3
HSET security:stats resolved_today 18
EOF
        
        echo -e "${GREEN}✅ Demo data loaded${NC}"
        echo ""
        echo "📊 View in Grafana: http://localhost:3003"
        echo "   Username: admin"
        echo "   Password: admin123"
        ;;
        
    clean)
        echo "🧹 Cleaning up all containers and data..."
        docker stop security-redis security-prometheus security-grafana 2>/dev/null
        docker rm security-redis security-prometheus security-grafana 2>/dev/null
        echo -e "${GREEN}✅ Cleanup complete${NC}"
        ;;
        
    *)
        echo "Security Dashboard Local Manager (FREE - $0/month)"
        echo "=================================================="
        echo "Usage: $0 {start|stop|restart|status|logs|test|demo|clean}"
        echo ""
        echo "Commands:"
        echo "  start   - Start all services"
        echo "  stop    - Stop all services"
        echo "  restart - Restart all services"
        echo "  status  - Show service status"
        echo "  logs    - View logs (optional: logs redis/prometheus/grafana)"
        echo "  test    - Test service connectivity"
        echo "  demo    - Load demo data"
        echo "  clean   - Remove all containers"
        echo ""
        echo "💡 This runs 100% locally with zero AWS costs!"
        ;;
esac