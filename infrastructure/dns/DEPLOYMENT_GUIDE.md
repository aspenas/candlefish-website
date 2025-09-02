# Candlefish AI DNS Infrastructure Deployment Guide

## Prerequisites

### Required Tools
- AWS CLI (configured with appropriate permissions)
- Terraform >= 1.0
- Docker & Docker Compose
- OpenSSL
- curl
- dig/nslookup

### AWS Permissions Required
```json
{
    "Version": "2012-10-17",
    "Statement": [
        {
            "Effect": "Allow",
            "Action": [
                "route53:*",
                "acm:*",
                "ec2:DescribeVpcs",
                "ec2:DescribeSubnets",
                "elasticloadbalancing:*"
            ],
            "Resource": "*"
        }
    ]
}
```

### Environment Variables
Create `.env` file from `.env.example`:
```bash
cp .env.example .env
```

Required variables:
- `DOMAIN=candlefish.ai`
- `AWS_REGION=us-east-1`
- `SSL_EMAIL=admin@candlefish.ai`
- `POSTGRES_PASSWORD=secure_password`
- `SMTP_PASSWORD=smtp_password`

## Step-by-Step Deployment

### Phase 1: DNS Infrastructure (Route53)

1. **Initialize Terraform**
   ```bash
   cd route53/
   terraform init
   ```

2. **Configure VPC Settings**
   ```bash
   # Find your VPC ID and subnet IDs
   aws ec2 describe-vpcs --query 'Vpcs[?IsDefault==`true`].VpcId' --output text
   aws ec2 describe-subnets --filters "Name=vpc-id,Values=vpc-xxxxx" --query 'Subnets[?MapPublicIpOnLaunch==`true`].SubnetId' --output text
   ```

3. **Deploy Route53 and ALB**
   ```bash
   terraform plan -var="vpc_id=vpc-xxxxx" -var="public_subnet_ids=[\"subnet-xxxxx\",\"subnet-yyyyy\"]"
   terraform apply
   ```

4. **Note Outputs**
   ```bash
   # Save these values
   terraform output alb_dns_name
   terraform output zone_id
   terraform output certificate_arn
   ```

### Phase 2: SSL Certificate Setup

1. **Generate DH Parameters**
   ```bash
   sudo ./ssl/generate-dhparam.sh
   ```

2. **Setup Let's Encrypt**
   ```bash
   sudo ./ssl/certbot-config.sh setup
   ```

3. **Verify Certificate**
   ```bash
   sudo openssl x509 -in /etc/letsencrypt/live/candlefish.ai/cert.pem -text -noout
   ```

### Phase 3: Nginx Configuration

1. **Create Nginx Directories**
   ```bash
   sudo mkdir -p /etc/nginx/conf.d
   sudo mkdir -p /etc/nginx/includes
   sudo mkdir -p /var/log/nginx
   ```

2. **Copy Configuration Files**
   ```bash
   sudo cp nginx/nginx.conf /etc/nginx/
   sudo cp nginx/candlefish-ai.conf /etc/nginx/conf.d/
   sudo cp nginx/cors-config.conf /etc/nginx/includes/
   sudo cp nginx/rate-limiting.conf /etc/nginx/includes/
   sudo cp health/health-checks.conf /etc/nginx/includes/
   sudo cp ssl/ssl-config.conf /etc/nginx/includes/
   ```

3. **Test Configuration**
   ```bash
   sudo nginx -t
   ```

### Phase 4: Docker Services Deployment

1. **Start Core Services**
   ```bash
   # Start in order
   docker-compose up -d redis postgres
   docker-compose up -d api analytics router monitor config
   docker-compose up -d nginx certbot
   ```

2. **Verify Service Health**
   ```bash
   docker-compose ps
   docker-compose logs -f nginx
   ```

3. **Test Health Endpoints**
   ```bash
   ./scripts/dns-diagnostics.sh quick
   ```

### Phase 5: Cloudflare Backup (Optional)

1. **Configure Cloudflare**
   ```bash
   cd cloudflare/
   terraform init
   ```

2. **Deploy Cloudflare Configuration**
   ```bash
   terraform plan -var="cloudflare_api_token=your_token" -var="origin_ip=your_alb_ip"
   terraform apply
   ```

### Phase 6: Monitoring Setup

1. **Start Monitoring Stack**
   ```bash
   # Add to docker-compose.yml if needed
   docker-compose up -d prometheus alertmanager grafana
   ```

2. **Configure Alerts**
   ```bash
   # Test alert configuration
   promtool check config monitoring/prometheus.yml
   promtool check rules monitoring/alert_rules.yml
   ```

## Validation and Testing

### DNS Validation
```bash
# Test DNS resolution
./scripts/dns-diagnostics.sh dns

# Verify all subdomains
for sub in api analytics router monitor config; do
  dig ${sub}.candlefish.ai +short
done
```

### SSL Validation
```bash
# Check SSL certificates
./scripts/dns-diagnostics.sh ssl

# Test SSL configuration
for sub in api analytics router monitor config; do
  echo | openssl s_client -servername ${sub}.candlefish.ai -connect ${sub}.candlefish.ai:443 2>/dev/null | openssl x509 -noout -dates
done
```

### Service Validation
```bash
# Test all health endpoints
./scripts/dns-diagnostics.sh http

# Check response times
./scripts/dns-diagnostics.sh timing

# Generate comprehensive report
./scripts/dns-diagnostics.sh report
```

## Post-Deployment Configuration

### 1. Configure Monitoring Alerts

Update `monitoring/alert_rules.yml` with appropriate thresholds:
```yaml
# Example: adjust alert thresholds
- alert: HighResponseTime
  expr: probe_http_duration_seconds{job="blackbox-http"} > 2
  for: 5m
```

### 2. Setup Log Aggregation

Configure log shipping to your preferred log aggregation service:
```bash
# Example: Fluentd configuration
docker-compose up -d fluentd
```

### 3. Configure Backup Schedules

Setup regular backups:
```bash
# Add to crontab
0 2 * * * /path/to/ssl/certbot-config.sh backup
0 3 * * 0 /path/to/scripts/backup-config.sh
```

### 4. Performance Tuning

Adjust Nginx and application settings based on load:
```nginx
# In nginx.conf
worker_processes auto;
worker_connections 4096;

# Adjust rate limits in rate-limiting.conf
limit_req_zone $binary_remote_addr zone=api_global:10m rate=100r/s;
```

## Security Hardening

### 1. Firewall Configuration
```bash
# Example iptables rules
iptables -A INPUT -p tcp --dport 80 -j ACCEPT
iptables -A INPUT -p tcp --dport 443 -j ACCEPT
iptables -A INPUT -p tcp --dport 22 -s trusted_ip -j ACCEPT
```

### 2. Fail2Ban Setup
```bash
# Install and configure fail2ban
sudo apt install fail2ban
sudo cp /etc/fail2ban/jail.conf /etc/fail2ban/jail.local
```

### 3. Security Headers Validation
```bash
# Test security headers
curl -I https://api.candlefish.ai | grep -E "(X-Frame-Options|X-Content-Type-Options|Strict-Transport-Security)"
```

## Troubleshooting Common Issues

### Issue 1: DNS Not Resolving
```bash
# Check Route53 configuration
aws route53 list-resource-record-sets --hosted-zone-id YOUR_ZONE_ID

# Check DNS propagation
dig api.candlefish.ai @8.8.8.8
dig api.candlefish.ai @1.1.1.1
```

### Issue 2: SSL Certificate Issues
```bash
# Check certificate status
./ssl/certbot-config.sh info

# Force renewal
sudo ./ssl/certbot-config.sh force-renew

# Check certificate chain
openssl s_client -connect api.candlefish.ai:443 -showcerts
```

### Issue 3: Service Not Responding
```bash
# Check Docker service status
docker-compose ps

# Check logs
docker-compose logs api

# Test backend connectivity
curl -v http://localhost:8000/health
```

### Issue 4: Rate Limiting Issues
```bash
# Check nginx error logs
docker-compose logs nginx | grep "limiting requests"

# Adjust rate limits temporarily
# Edit nginx/rate-limiting.conf and reload
docker-compose exec nginx nginx -s reload
```

## Rollback Procedures

### DNS Rollback
```bash
cd route53/
terraform plan -destroy
terraform apply -target=aws_route53_record.api
```

### Service Rollback
```bash
# Rollback to previous images
docker-compose down
docker-compose pull candlefish/api:previous-tag
docker-compose up -d
```

### SSL Rollback
```bash
# Restore from backup
sudo cp /backup/letsencrypt-backup/latest/* /etc/letsencrypt/
sudo systemctl reload nginx
```

## Maintenance Tasks

### Weekly Tasks
- [ ] Check SSL certificate expiry status
- [ ] Review monitoring alerts and metrics
- [ ] Update security patches
- [ ] Backup configurations

### Monthly Tasks
- [ ] Review and rotate API keys
- [ ] Update DNS record TTLs if needed
- [ ] Performance optimization review
- [ ] Security audit

### Quarterly Tasks
- [ ] Disaster recovery testing
- [ ] Documentation updates
- [ ] Infrastructure cost optimization
- [ ] Technology stack updates

## Support and Escalation

### Level 1: Self-Service
1. Run diagnostic script: `./scripts/dns-diagnostics.sh report`
2. Check common issues in this guide
3. Review service logs: `docker-compose logs`

### Level 2: Team Support
1. Share diagnostic report
2. Provide reproduction steps
3. Include configuration changes made

### Level 3: Vendor Support
1. AWS Support (for Route53/ALB issues)
2. Cloudflare Support (for CDN issues)
3. Let's Encrypt Community (for SSL issues)

---

**Deployment Checklist Complete**: Use the checklist in README.md to verify all components are properly deployed and configured.

**Next Steps**: Monitor the infrastructure for 24-48 hours to ensure stability before declaring the deployment successful.