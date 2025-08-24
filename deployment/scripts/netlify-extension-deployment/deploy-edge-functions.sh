#!/bin/bash

# ======================================================================
# Netlify Edge Functions Deployment
# Deploy Edge Functions to optimize performance and add features
# ======================================================================

set -euo pipefail

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
EDGE_FUNCTIONS_DIR="${SCRIPT_DIR}/edge-functions"

# Create directories
mkdir -p "${EDGE_FUNCTIONS_DIR}"

log_info() { echo -e "${BLUE}ℹ${NC} $1"; }
log_success() { echo -e "${GREEN}✓${NC} $1"; }
log_error() { echo -e "${RED}✗${NC} $1"; }

# Create authentication edge function
create_auth_edge_function() {
    log_info "Creating authentication edge function..."

    cat > "${EDGE_FUNCTIONS_DIR}/auth.ts" <<'EOF'
import type { Context } from "@netlify/edge-functions";
import jwt from "jsonwebtoken";

export default async (request: Request, context: Context) => {
  const url = new URL(request.url);

  // Skip auth for public paths
  const publicPaths = ["/", "/api/health", "/favicon.ico", "/_next/static"];
  if (publicPaths.some(path => url.pathname.startsWith(path))) {
    return context.next();
  }

  // Get authorization header
  const authHeader = request.headers.get("authorization");

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return new Response("Unauthorized", { status: 401 });
  }

  const token = authHeader.substring(7);

  try {
    // Verify JWT token
    const decoded = jwt.verify(token, context.env.JWT_SECRET);

    // Add user info to request headers
    const modifiedRequest = new Request(request, {
      headers: new Headers(request.headers)
    });
    modifiedRequest.headers.set("x-user-id", decoded.sub);
    modifiedRequest.headers.set("x-user-role", decoded.role);

    return context.next({ request: modifiedRequest });
  } catch (error) {
    return new Response("Invalid token", { status: 401 });
  }
};

export const config = {
  path: "/api/*"
};
EOF

    log_success "Authentication edge function created"
}

# Create rate limiting edge function
create_rate_limit_edge_function() {
    log_info "Creating rate limiting edge function..."

    cat > "${EDGE_FUNCTIONS_DIR}/rate-limit.ts" <<'EOF'
import type { Context } from "@netlify/edge-functions";

const RATE_LIMIT_WINDOW = 60 * 1000; // 1 minute
const MAX_REQUESTS = 100;

// In-memory store (replace with Redis in production)
const requestCounts = new Map<string, { count: number; resetTime: number }>();

export default async (request: Request, context: Context) => {
  const clientIp = context.ip;
  const now = Date.now();

  // Get or create rate limit entry
  let rateLimit = requestCounts.get(clientIp);

  if (!rateLimit || now > rateLimit.resetTime) {
    rateLimit = {
      count: 0,
      resetTime: now + RATE_LIMIT_WINDOW
    };
  }

  rateLimit.count++;
  requestCounts.set(clientIp, rateLimit);

  // Check if rate limit exceeded
  if (rateLimit.count > MAX_REQUESTS) {
    return new Response("Rate limit exceeded", {
      status: 429,
      headers: {
        "X-RateLimit-Limit": MAX_REQUESTS.toString(),
        "X-RateLimit-Remaining": "0",
        "X-RateLimit-Reset": rateLimit.resetTime.toString(),
        "Retry-After": Math.ceil((rateLimit.resetTime - now) / 1000).toString()
      }
    });
  }

  // Add rate limit headers to response
  const response = await context.next();
  const modifiedResponse = new Response(response.body, response);

  modifiedResponse.headers.set("X-RateLimit-Limit", MAX_REQUESTS.toString());
  modifiedResponse.headers.set("X-RateLimit-Remaining", (MAX_REQUESTS - rateLimit.count).toString());
  modifiedResponse.headers.set("X-RateLimit-Reset", rateLimit.resetTime.toString());

  return modifiedResponse;
};

export const config = {
  path: "/api/*"
};
EOF

    log_success "Rate limiting edge function created"
}

# Create geolocation edge function
create_geolocation_edge_function() {
    log_info "Creating geolocation edge function..."

    cat > "${EDGE_FUNCTIONS_DIR}/geolocation.ts" <<'EOF'
import type { Context } from "@netlify/edge-functions";

export default async (request: Request, context: Context) => {
  const geo = context.geo;

  // Add geolocation headers
  const response = await context.next();
  const modifiedResponse = new Response(response.body, response);

  // Add geolocation data to headers
  modifiedResponse.headers.set("X-User-Country", geo?.country?.code || "US");
  modifiedResponse.headers.set("X-User-City", geo?.city || "Unknown");
  modifiedResponse.headers.set("X-User-Timezone", geo?.timezone || "UTC");
  modifiedResponse.headers.set("X-User-Latitude", geo?.latitude?.toString() || "0");
  modifiedResponse.headers.set("X-User-Longitude", geo?.longitude?.toString() || "0");

  // Customize content based on location
  if (geo?.country?.code === "EU") {
    // Add GDPR notice for EU users
    modifiedResponse.headers.set("X-GDPR-Required", "true");
  }

  return modifiedResponse;
};

export const config = {
  path: "/*"
};
EOF

    log_success "Geolocation edge function created"
}

# Create A/B testing edge function
create_ab_testing_edge_function() {
    log_info "Creating A/B testing edge function..."

    cat > "${EDGE_FUNCTIONS_DIR}/ab-testing.ts" <<'EOF'
import type { Context } from "@netlify/edge-functions";

const EXPERIMENTS = {
  "homepage-hero": {
    variants: ["control", "variant-a", "variant-b"],
    traffic: [0.34, 0.33, 0.33] // Traffic distribution
  },
  "cta-button": {
    variants: ["blue", "green", "orange"],
    traffic: [0.5, 0.25, 0.25]
  }
};

function selectVariant(experimentId: string, userId: string): string {
  const experiment = EXPERIMENTS[experimentId];
  if (!experiment) return "control";

  // Use consistent hashing to ensure same user always gets same variant
  const hash = userId.split("").reduce((acc, char) => {
    return ((acc << 5) - acc) + char.charCodeAt(0);
  }, 0);

  const random = Math.abs(hash) / 2147483647; // Normalize to 0-1

  let cumulative = 0;
  for (let i = 0; i < experiment.variants.length; i++) {
    cumulative += experiment.traffic[i];
    if (random < cumulative) {
      return experiment.variants[i];
    }
  }

  return experiment.variants[0];
}

export default async (request: Request, context: Context) => {
  const url = new URL(request.url);

  // Get or create user ID from cookie
  const cookies = request.headers.get("cookie") || "";
  let userId = cookies.match(/ab_user_id=([^;]+)/)?.[1];

  if (!userId) {
    userId = crypto.randomUUID();
  }

  // Select variants for all active experiments
  const variants: Record<string, string> = {};
  for (const experimentId in EXPERIMENTS) {
    variants[experimentId] = selectVariant(experimentId, userId);
  }

  // Add experiment data to request
  const modifiedRequest = new Request(request, {
    headers: new Headers(request.headers)
  });
  modifiedRequest.headers.set("x-ab-variants", JSON.stringify(variants));

  // Get response
  const response = await context.next({ request: modifiedRequest });
  const modifiedResponse = new Response(response.body, response);

  // Set cookie to persist user ID
  modifiedResponse.headers.append(
    "Set-Cookie",
    `ab_user_id=${userId}; Path=/; Max-Age=2592000; SameSite=Lax`
  );

  // Add experiment headers for client-side use
  modifiedResponse.headers.set("X-AB-Variants", JSON.stringify(variants));

  return modifiedResponse;
};

export const config = {
  path: "/*"
};
EOF

    log_success "A/B testing edge function created"
}

# Create image optimization edge function
create_image_optimization_edge_function() {
    log_info "Creating image optimization edge function..."

    cat > "${EDGE_FUNCTIONS_DIR}/image-optimization.ts" <<'EOF'
import type { Context } from "@netlify/edge-functions";

const SUPPORTED_FORMATS = ["webp", "avif"];

export default async (request: Request, context: Context) => {
  const url = new URL(request.url);

  // Only process image requests
  if (!url.pathname.match(/\.(jpg|jpeg|png|gif)$/i)) {
    return context.next();
  }

  // Get accept header to check supported formats
  const accept = request.headers.get("accept") || "";

  // Determine best format
  let format = "original";
  for (const fmt of SUPPORTED_FORMATS) {
    if (accept.includes(`image/${fmt}`)) {
      format = fmt;
      break;
    }
  }

  // Get query parameters for resizing
  const width = url.searchParams.get("w");
  const height = url.searchParams.get("h");
  const quality = url.searchParams.get("q") || "80";

  // Build transformation URL
  const transformations = [];
  if (width) transformations.push(`w_${width}`);
  if (height) transformations.push(`h_${height}`);
  if (format !== "original") transformations.push(`fm_${format}`);
  transformations.push(`q_${quality}`);

  // If no transformations needed, pass through
  if (transformations.length === 0) {
    return context.next();
  }

  // Rewrite to Netlify's image CDN
  const transformedUrl = `/.netlify/images?url=${encodeURIComponent(url.pathname)}&${transformations.join("&")}`;

  return Response.redirect(new URL(transformedUrl, url.origin), 302);
};

export const config = {
  path: "/images/*"
};
EOF

    log_success "Image optimization edge function created"
}

# Create cache control edge function
create_cache_control_edge_function() {
    log_info "Creating cache control edge function..."

    cat > "${EDGE_FUNCTIONS_DIR}/cache-control.ts" <<'EOF'
import type { Context } from "@netlify/edge-functions";

const CACHE_RULES = {
  // Static assets - long cache
  "/static": "public, max-age=31536000, immutable",
  "/_next/static": "public, max-age=31536000, immutable",
  "/fonts": "public, max-age=31536000, immutable",

  // Images - medium cache
  "/images": "public, max-age=86400, stale-while-revalidate=604800",

  // API responses - short cache
  "/api": "private, max-age=0, must-revalidate",

  // HTML pages - no cache
  "/": "public, max-age=0, must-revalidate",
};

function getCacheControl(pathname: string): string {
  for (const [prefix, cacheControl] of Object.entries(CACHE_RULES)) {
    if (pathname.startsWith(prefix)) {
      return cacheControl;
    }
  }

  // Default cache control
  return "public, max-age=3600";
}

export default async (request: Request, context: Context) => {
  const url = new URL(request.url);
  const response = await context.next();

  // Create modified response with cache headers
  const modifiedResponse = new Response(response.body, response);

  // Set cache control header
  const cacheControl = getCacheControl(url.pathname);
  modifiedResponse.headers.set("Cache-Control", cacheControl);

  // Add CDN cache tags for purging
  if (url.pathname.startsWith("/api/")) {
    modifiedResponse.headers.set("CDN-Cache-Tag", `api,${url.pathname}`);
  } else {
    modifiedResponse.headers.set("CDN-Cache-Tag", `static,${url.pathname}`);
  }

  // Add timing headers
  modifiedResponse.headers.set("X-Edge-Request-Id", context.requestId);
  modifiedResponse.headers.set("X-Edge-Location", context.geo?.city || "Unknown");

  return modifiedResponse;
};

export const config = {
  path: "/*"
};
EOF

    log_success "Cache control edge function created"
}

# Create security headers edge function
create_security_headers_edge_function() {
    log_info "Creating security headers edge function..."

    cat > "${EDGE_FUNCTIONS_DIR}/security-headers.ts" <<'EOF'
import type { Context } from "@netlify/edge-functions";

const SECURITY_HEADERS = {
  "X-Frame-Options": "SAMEORIGIN",
  "X-Content-Type-Options": "nosniff",
  "X-XSS-Protection": "1; mode=block",
  "Referrer-Policy": "strict-origin-when-cross-origin",
  "Permissions-Policy": "camera=(), microphone=(), geolocation=()",
  "Strict-Transport-Security": "max-age=31536000; includeSubDomains; preload",
};

const CSP_DIRECTIVES = {
  "default-src": ["'self'"],
  "script-src": ["'self'", "'unsafe-inline'", "https://www.googletagmanager.com"],
  "style-src": ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
  "font-src": ["'self'", "https://fonts.gstatic.com"],
  "img-src": ["'self'", "data:", "https:"],
  "connect-src": ["'self'", "https://api.candlefish.ai"],
  "frame-src": ["'self'"],
  "object-src": ["'none'"],
  "base-uri": ["'self'"],
  "form-action": ["'self'"],
  "upgrade-insecure-requests": [],
};

function buildCSP(): string {
  return Object.entries(CSP_DIRECTIVES)
    .map(([directive, values]) => {
      if (values.length === 0) return directive;
      return `${directive} ${values.join(" ")}`;
    })
    .join("; ");
}

export default async (request: Request, context: Context) => {
  const response = await context.next();
  const modifiedResponse = new Response(response.body, response);

  // Add security headers
  for (const [header, value] of Object.entries(SECURITY_HEADERS)) {
    modifiedResponse.headers.set(header, value);
  }

  // Add CSP header
  modifiedResponse.headers.set("Content-Security-Policy", buildCSP());

  // Add CORS headers for API routes
  const url = new URL(request.url);
  if (url.pathname.startsWith("/api/")) {
    modifiedResponse.headers.set("Access-Control-Allow-Origin", "*");
    modifiedResponse.headers.set("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS");
    modifiedResponse.headers.set("Access-Control-Allow-Headers", "Content-Type, Authorization");
    modifiedResponse.headers.set("Access-Control-Max-Age", "86400");
  }

  return modifiedResponse;
};

export const config = {
  path: "/*"
};
EOF

    log_success "Security headers edge function created"
}

# Deploy edge functions to a specific site
deploy_to_site() {
    local site_name="$1"

    log_info "Deploying edge functions to ${site_name}..."

    # Create netlify.toml with edge functions configuration
    cat > "${EDGE_FUNCTIONS_DIR}/netlify.toml" <<EOF
# Edge Functions Configuration
[[edge_functions]]
  function = "auth"
  path = "/api/*"

[[edge_functions]]
  function = "rate-limit"
  path = "/api/*"

[[edge_functions]]
  function = "geolocation"
  path = "/*"

[[edge_functions]]
  function = "ab-testing"
  path = "/*"

[[edge_functions]]
  function = "image-optimization"
  path = "/images/*"

[[edge_functions]]
  function = "cache-control"
  path = "/*"

[[edge_functions]]
  function = "security-headers"
  path = "/*"
EOF

    # Deploy using Netlify CLI
    cd "${EDGE_FUNCTIONS_DIR}"

    if netlify link --name "${site_name}"; then
        if netlify deploy --prod --dir=. --functions=.; then
            log_success "Edge functions deployed to ${site_name}"
        else
            log_error "Failed to deploy edge functions to ${site_name}"
        fi
    else
        log_error "Failed to link to site ${site_name}"
    fi
}

# Main execution
main() {
    log_info "================================"
    log_info "Netlify Edge Functions Deployment"
    log_info "================================"
    echo ""

    # Create all edge functions
    create_auth_edge_function
    create_rate_limit_edge_function
    create_geolocation_edge_function
    create_ab_testing_edge_function
    create_image_optimization_edge_function
    create_cache_control_edge_function
    create_security_headers_edge_function

    echo ""
    log_success "All edge functions created in ${EDGE_FUNCTIONS_DIR}"

    # Deploy to sites if specified
    if [ $# -gt 0 ]; then
        for site in "$@"; do
            deploy_to_site "${site}"
        done
    else
        log_info "To deploy, run: $0 <site-name>"
        log_info "Example: $0 candlefish-main"
    fi
}

main "$@"
