-- Seed active services for CLOS Dashboard
-- Based on user requirements: Patrick (admin), Tyler, Aaron, James (users)

-- Insert initial services (active projects only)
INSERT INTO services (name, display_name, description, group_name, status, port, health_check_url, dependencies, environment, started_at)
VALUES 
  -- Core Infrastructure
  ('postgres-main', 'PostgreSQL Database', 'Main database server', 'infrastructure', 'running', 5432, 'http://localhost:5432/health', '[]'::jsonb, '{"version": "15", "max_connections": "100"}'::jsonb, NOW() - INTERVAL '7 days'),
  ('redis-cache', 'Redis Cache', 'In-memory cache and pub/sub', 'infrastructure', 'running', 6379, 'http://localhost:6379/health', '[]'::jsonb, '{"maxmemory": "256mb", "maxmemory_policy": "allkeys-lru"}'::jsonb, NOW() - INTERVAL '7 days'),
  ('prometheus', 'Prometheus Monitoring', 'Metrics collection and monitoring', 'monitoring', 'running', 9090, 'http://localhost:9090/-/healthy', '[]'::jsonb, '{"retention": "15d", "scrape_interval": "15s"}'::jsonb, NOW() - INTERVAL '7 days'),
  ('grafana', 'Grafana Dashboard', 'Metrics visualization', 'monitoring', 'running', 3000, 'http://localhost:3000/api/health', '["prometheus"]'::jsonb, '{"theme": "dark", "anonymous_access": "false"}'::jsonb, NOW() - INTERVAL '7 days'),
  
  -- CLOS Services
  ('clos-api', 'CLOS API Server', 'Main API server with authentication', 'api', 'running', 3501, 'http://localhost:3501/api/health', '["postgres-main", "redis-cache"]'::jsonb, '{"version": "2.0", "auth_enabled": "true"}'::jsonb, NOW() - INTERVAL '2 hours'),
  ('clos-dashboard', 'CLOS Web Dashboard', 'Web interface for service management', 'frontend', 'running', 3500, 'http://localhost:3500/api/health', '["clos-api"]'::jsonb, '{"framework": "Next.js 14", "ssr": "true"}'::jsonb, NOW() - INTERVAL '1 hour'),
  
  -- Candlefish AI Projects (Active)
  ('paintbox-api', 'Paintbox API', 'Paint estimation platform API', 'api', 'running', 4000, 'http://localhost:4000/health', '["postgres-main"]'::jsonb, '{"version": "1.2", "environment": "production"}'::jsonb, NOW() - INTERVAL '3 days'),
  ('paintbox-frontend', 'Paintbox Frontend', 'Paint estimation web app', 'frontend', 'running', 4001, 'http://localhost:4001/health', '["paintbox-api"]'::jsonb, '{"framework": "React", "build": "production"}'::jsonb, NOW() - INTERVAL '3 days'),
  ('temporal-worker', 'Temporal Worker', 'Workflow automation worker', 'automation', 'running', 4002, 'http://localhost:4002/health', '["postgres-main", "redis-cache"]'::jsonb, '{"workers": "4", "namespace": "default"}'::jsonb, NOW() - INTERVAL '5 days'),
  ('clark-county-scraper', 'Clark County Permit Scraper', 'Automated permit data collection', 'automation', 'running', 4003, 'http://localhost:4003/health', '["postgres-main"]'::jsonb, '{"schedule": "0 */6 * * *", "batch_size": "50"}'::jsonb, NOW() - INTERVAL '2 days'),
  
  -- Executive AI Assistant
  ('executive-ai', 'Executive AI Assistant', 'AI-powered executive assistant', 'ai', 'running', 5000, 'http://localhost:5000/health', '["postgres-main", "redis-cache"]'::jsonb, '{"model": "claude-3-opus", "max_tokens": "4096"}'::jsonb, NOW() - INTERVAL '1 day'),
  ('ai-knowledge-base', 'AI Knowledge Base', 'Vector database for AI context', 'ai', 'stopped', 5001, 'http://localhost:5001/health', '["postgres-main"]'::jsonb, '{"vector_store": "pgvector", "embedding_model": "text-embedding-3"}'::jsonb, NULL),
  
  -- Development Tools
  ('jupyter-notebook', 'Jupyter Notebook', 'Interactive Python notebook', 'development', 'stopped', 8888, 'http://localhost:8888/api', '[]'::jsonb, '{"kernel": "python3", "password_required": "true"}'::jsonb, NULL),
  ('code-server', 'VS Code Server', 'Web-based VS Code', 'development', 'stopped', 8080, 'http://localhost:8080/healthz', '[]'::jsonb, '{"auth": "password", "cert": "false"}'::jsonb, NULL),
  
  -- NANDA Agents (to be deployed)
  ('nanda-health-monitor', 'NANDA Health Monitor', 'Autonomous health monitoring agent', 'nanda', 'running', 6000, 'http://localhost:6000/health', '["clos-api", "redis-cache"]'::jsonb, '{"check_interval": "30", "alert_threshold": "3"}'::jsonb, NOW() - INTERVAL '30 minutes'),
  ('nanda-auto-healer', 'NANDA Auto Healer', 'Autonomous service recovery agent', 'nanda', 'stopped', 6001, 'http://localhost:6001/health', '["nanda-health-monitor"]'::jsonb, '{"max_restart_attempts": "3", "cooldown_period": "300"}'::jsonb, NULL),
  ('nanda-optimizer', 'NANDA Performance Optimizer', 'Autonomous performance tuning agent', 'nanda', 'stopped', 6002, 'http://localhost:6002/health', '["prometheus", "nanda-health-monitor"]'::jsonb, '{"optimization_threshold": "80", "analysis_window": "3600"}'::jsonb, NULL),
  ('nanda-security-scanner', 'NANDA Security Scanner', 'Autonomous security scanning agent', 'nanda', 'stopped', 6003, 'http://localhost:6003/health', '["clos-api"]'::jsonb, '{"scan_interval": "3600", "vulnerability_db": "nvd"}'::jsonb, NULL)
ON CONFLICT (name) DO UPDATE SET
  display_name = EXCLUDED.display_name,
  description = EXCLUDED.description,
  group_name = EXCLUDED.group_name,
  port = EXCLUDED.port,
  health_check_url = EXCLUDED.health_check_url,
  dependencies = EXCLUDED.dependencies,
  environment = EXCLUDED.environment,
  updated_at = CURRENT_TIMESTAMP;