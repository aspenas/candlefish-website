# Production Dockerfile for Candlefish.ai Website
# Multi-stage build for optimal image size and security
# Supports bioluminescent candlefish animation features

# Use specific version for reproducible builds
ARG NODE_VERSION=18.19.0
ARG ALPINE_VERSION=3.19

# Stage 1: Dependencies installation
FROM node:${NODE_VERSION}-alpine${ALPINE_VERSION} AS deps

# Security: Create non-root user early
RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 nextjs

# Security: Install security updates
RUN apk upgrade --no-cache && \
    apk add --no-cache dumb-init tini

# Performance: Set working directory
WORKDIR /app

# Security: Change ownership of app directory
RUN chown -R nextjs:nodejs /app
USER nextjs

# Copy package files with correct ownership
COPY --chown=nextjs:nodejs package*.json ./

# Install only production dependencies with security audit
RUN npm ci --only=production --ignore-scripts && \
    npm audit --audit-level=high && \
    npm cache clean --force

# Stage 2: Builder stage
FROM node:${NODE_VERSION}-alpine${ALPINE_VERSION} AS builder

# Security updates and build tools
RUN apk upgrade --no-cache && \
    apk add --no-cache python3 make g++ libc6-compat

# Performance: Set working directory
WORKDIR /app

# Security: Create non-root user
RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 nextjs

# Copy package files
COPY --chown=nextjs:nodejs package*.json ./

# Install all dependencies (including devDependencies for build)
RUN npm ci --include=dev

# Copy source code with correct ownership
COPY --chown=nextjs:nodejs . .

# Set build environment variables
ENV NEXT_TELEMETRY_DISABLED=1
ENV NODE_ENV=production
ENV NODE_OPTIONS="--max_old_space_size=4096"

# Build optimizations for bioluminescent animation
ENV NEXT_SHARP=1
ENV NEXT_DISABLE_ESLINT_PLUGIN=true

# Switch to non-root user for build
USER nextjs

# Build the application with optimizations
RUN npm run build && \
    npm prune --production

# Stage 3: Runner stage - final production image
FROM node:${NODE_VERSION}-alpine${ALPINE_VERSION} AS runner

# Security: Install only necessary packages and security updates
RUN apk upgrade --no-cache && \
    apk add --no-cache \
        dumb-init \
        tini \
        ca-certificates \
        tzdata && \
    rm -rf /var/cache/apk/*

# Performance: Set working directory
WORKDIR /app

# Security: Create non-root user for runtime
RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 nextjs

# Set production environment variables
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV PORT=3000
ENV HOSTNAME="0.0.0.0"
ENV TZ=UTC

# Performance optimizations for bioluminescent animation
ENV NODE_OPTIONS="--max_old_space_size=2048"
ENV UV_THREADPOOL_SIZE=128

# Copy runtime dependencies from deps stage
COPY --from=deps --chown=nextjs:nodejs /app/node_modules ./node_modules

# Copy built application from builder stage
COPY --from=builder --chown=nextjs:nodejs /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

# Copy health check script
COPY --chown=nextjs:nodejs scripts/healthcheck.js ./

# Security: Switch to non-root user
USER nextjs

# Expose port
EXPOSE 3000

# Health check with bioluminescent animation specific endpoints
HEALTHCHECK --interval=30s --timeout=10s --start-period=15s --retries=3 \
  CMD node healthcheck.js

# Use tini as PID 1 for proper signal handling
ENTRYPOINT ["/sbin/tini", "--"]
CMD ["node", "server.js"]