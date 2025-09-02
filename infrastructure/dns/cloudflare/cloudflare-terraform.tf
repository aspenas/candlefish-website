# Cloudflare DNS configuration as backup to Route53
terraform {
  required_providers {
    cloudflare = {
      source  = "cloudflare/cloudflare"
      version = "~> 4.0"
    }
  }
}

provider "cloudflare" {
  api_token = var.cloudflare_api_token
}

# Get the zone
data "cloudflare_zones" "candlefish" {
  filter {
    name = "candlefish.ai"
  }
}

locals {
  zone_id = data.cloudflare_zones.candlefish.zones[0].id
}

# DNS Records
resource "cloudflare_record" "api" {
  zone_id = local.zone_id
  name    = "api"
  value   = var.origin_ip
  type    = "A"
  ttl     = 300
  proxied = true
  comment = "Main API endpoint - proxied through Cloudflare"
}

resource "cloudflare_record" "analytics" {
  zone_id = local.zone_id
  name    = "analytics"
  value   = "api.candlefish.ai"
  type    = "CNAME"
  ttl     = 300
  proxied = true
  comment = "Analytics engine endpoint"
}

resource "cloudflare_record" "router" {
  zone_id = local.zone_id
  name    = "router"
  value   = "api.candlefish.ai"
  type    = "CNAME"
  ttl     = 300
  proxied = true
  comment = "AI model router endpoint"
}

resource "cloudflare_record" "monitor" {
  zone_id = local.zone_id
  name    = "monitor"
  value   = "api.candlefish.ai"
  type    = "CNAME"
  ttl     = 300
  proxied = true
  comment = "Error monitoring endpoint"
}

resource "cloudflare_record" "config" {
  zone_id = local.zone_id
  name    = "config"
  value   = "api.candlefish.ai"
  type    = "CNAME"
  ttl     = 300
  proxied = true
  comment = "Web dashboard endpoint"
}

# Security settings
resource "cloudflare_zone_settings_override" "candlefish_security" {
  zone_id = local.zone_id

  settings {
    # Security
    security_level = "medium"
    challenge_ttl  = 1800
    
    # SSL/TLS
    ssl = "strict"
    min_tls_version = "1.2"
    tls_1_3 = "on"
    automatic_https_rewrites = "on"
    
    # Performance
    brotli = "on"
    minify {
      css  = "on"
      js   = "on"
      html = "on"
    }
    
    # Caching
    browser_cache_ttl = 14400
    cache_level = "standard"
    
    # Other settings
    always_online = "on"
    development_mode = "off"
    hotlink_protection = "on"
    server_side_exclude = "on"
  }
}

# Rate limiting rules
resource "cloudflare_rate_limit" "api_rate_limit" {
  zone_id   = local.zone_id
  threshold = 100
  period    = 60
  action {
    mode     = "challenge"
    timeout  = 60
  }
  
  match {
    request {
      url_pattern = "api.candlefish.ai/*"
      schemes     = ["HTTP", "HTTPS"]
      methods     = ["GET", "POST", "PUT", "DELETE"]
    }
  }
  
  correlate {
    by = "nat"
  }
  
  disabled    = false
  description = "Rate limiting for API endpoints"
}

# Page rules for caching
resource "cloudflare_page_rule" "api_bypass_cache" {
  zone_id  = local.zone_id
  target   = "api.candlefish.ai/*"
  priority = 1
  
  actions {
    cache_level       = "bypass"
    security_level    = "medium"
    disable_apps      = true
    disable_performance = true
  }
}

resource "cloudflare_page_rule" "config_cache" {
  zone_id  = local.zone_id
  target   = "config.candlefish.ai/*"
  priority = 2
  
  actions {
    cache_level         = "standard"
    browser_cache_ttl   = 3600
    edge_cache_ttl      = 7200
  }
}

# Firewall rules
resource "cloudflare_filter" "block_bad_bots" {
  zone_id     = local.zone_id
  description = "Block known bad bots and scrapers"
  expression  = "(cf.client.bot) and not (cf.client.bot_category in {\"Search Engine Crawler\" \"Preview Link Generator\"})"
}

resource "cloudflare_firewall_rule" "block_bad_bots_rule" {
  zone_id     = local.zone_id
  description = "Block bad bots firewall rule"
  filter_id   = cloudflare_filter.block_bad_bots.id
  action      = "block"
  priority    = 1
}

# Access policy for admin endpoints
resource "cloudflare_access_application" "admin_app" {
  zone_id          = local.zone_id
  name             = "Admin Dashboard"
  domain           = "config.candlefish.ai"
  type             = "self_hosted"
  session_duration = "24h"
  
  cors_headers {
    allowed_methods = ["GET", "POST", "OPTIONS"]
    allowed_origins = ["https://config.candlefish.ai"]
    allow_credentials = true
    max_age = 600
  }
}

# Variables
variable "cloudflare_api_token" {
  description = "Cloudflare API token"
  type        = string
  sensitive   = true
}

variable "origin_ip" {
  description = "Origin server IP address"
  type        = string
}

# Outputs
output "zone_id" {
  description = "Cloudflare zone ID"
  value       = local.zone_id
}

output "name_servers" {
  description = "Cloudflare name servers"
  value       = data.cloudflare_zones.candlefish.zones[0].name_servers
}