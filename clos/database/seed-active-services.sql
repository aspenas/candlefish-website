-- Seed active services for CLOS Dashboard
-- Based on user requirements: Patrick (admin), Tyler, Aaron, James (users)

-- Insert initial services (active projects only)
INSERT INTO services (id, name, port, "group", status, health, cpu, memory, started_at, dependencies, config)
VALUES 
  -- Core Infrastructure
  ('postgres-main', 'PostgreSQL Database', 5432, 'infrastructure', 'running', 'healthy', 2.5, 256, NOW() - INTERVAL '7 days', '{}', '{"version": "15", "max_connections": 100}'),
  ('redis-cache', 'Redis Cache', 6379, 'infrastructure', 'running', 'healthy', 0.5, 64, NOW() - INTERVAL '7 days', '{}', '{"maxmemory": "256mb", "maxmemory-policy": "allkeys-lru"}'),
  ('prometheus', 'Prometheus Monitoring', 9090, 'monitoring', 'running', 'healthy', 1.2, 128, NOW() - INTERVAL '7 days', '{}', '{"retention": "15d", "scrape_interval": "15s"}'),
  ('grafana', 'Grafana Dashboard', 3000, 'monitoring', 'running', 'healthy', 0.8, 96, NOW() - INTERVAL '7 days', '["prometheus"]', '{"theme": "dark", "anonymous_access": false}'),
  
  -- CLOS Services
  ('clos-api', 'CLOS API Server', 3501, 'api', 'running', 'healthy', 1.5, 192, NOW() - INTERVAL '2 hours', '["postgres-main", "redis-cache"]', '{"version": "2.0", "auth_enabled": true}'),
  ('clos-dashboard', 'CLOS Web Dashboard', 3500, 'frontend', 'running', 'healthy', 0.7, 128, NOW() - INTERVAL '1 hour', '["clos-api"]', '{"framework": "Next.js 14", "ssr": true}'),
  
  -- Candlefish AI Projects (Active)
  ('paintbox-api', 'Paintbox API', 4000, 'api', 'running', 'healthy', 2.1, 256, NOW() - INTERVAL '3 days', '["postgres-main"]', '{"version": "1.2", "environment": "production"}'),
  ('paintbox-frontend', 'Paintbox Frontend', 4001, 'frontend', 'running', 'healthy', 1.0, 192, NOW() - INTERVAL '3 days', '["paintbox-api"]', '{"framework": "React", "build": "production"}'),
  ('temporal-worker', 'Temporal Worker', 4002, 'automation', 'running', 'healthy', 3.5, 512, NOW() - INTERVAL '5 days', '["postgres-main", "redis-cache"]', '{"workers": 4, "namespace": "default"}'),
  ('clark-county-scraper', 'Clark County Permit Scraper', 4003, 'automation', 'running', 'healthy', 1.8, 256, NOW() - INTERVAL '2 days', '["postgres-main"]', '{"schedule": "0 */6 * * *", "batch_size": 50}'),
  
  -- Executive AI Assistant
  ('executive-ai', 'Executive AI Assistant', 5000, 'ai', 'running', 'healthy', 4.2, 768, NOW() - INTERVAL '1 day', '["postgres-main", "redis-cache"]', '{"model": "claude-3-opus", "max_tokens": 4096}'),
  ('ai-knowledge-base', 'AI Knowledge Base', 5001, 'ai', 'stopped', 'unknown', 0, 0, NULL, '["postgres-main"]', '{"vector_store": "pgvector", "embedding_model": "text-embedding-3"}'),
  
  -- Development Tools
  ('jupyter-notebook', 'Jupyter Notebook', 8888, 'development', 'stopped', 'unknown', 0, 0, NULL, '{}', '{"kernel": "python3", "password_required": true}'),
  ('code-server', 'VS Code Server', 8080, 'development', 'stopped', 'unknown', 0, 0, NULL, '{}', '{"auth": "password", "cert": false}'),
  
  -- NANDA Agents (to be deployed)
  ('nanda-health-monitor', 'NANDA Health Monitor', 6000, 'nanda', 'running', 'healthy', 0.3, 64, NOW() - INTERVAL '30 minutes', '["clos-api", "redis-cache"]', '{"check_interval": 30, "alert_threshold": 3}'),
  ('nanda-auto-healer', 'NANDA Auto Healer', 6001, 'nanda', 'stopped', 'unknown', 0, 0, NULL, '["nanda-health-monitor"]', '{"max_restart_attempts": 3, "cooldown_period": 300}'),
  ('nanda-optimizer', 'NANDA Performance Optimizer', 6002, 'nanda', 'stopped', 'unknown', 0, 0, NULL, '["prometheus", "nanda-health-monitor"]', '{"optimization_threshold": 80, "analysis_window": 3600}'),
  ('nanda-security-scanner', 'NANDA Security Scanner', 6003, 'nanda', 'stopped', 'unknown', 0, 0, NULL, '["clos-api"]', '{"scan_interval": 3600, "vulnerability_db": "nvd"}')