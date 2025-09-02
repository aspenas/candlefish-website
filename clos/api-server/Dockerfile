# CLOS API Server - Production Docker Image
# Analytics-enabled backend with security hardening

FROM node:20-alpine AS base

# Install security updates and dependencies
RUN apk update && \
    apk add --no-cache \
    dumb-init \
    curl \
    ca-certificates && \
    apk upgrade && \
    rm -rf /var/cache/apk/*

# Create non-root user
RUN addgroup -g 1001 -S nodejs
RUN adduser -S apiserver -u 1001 -G nodejs

WORKDIR /app

# Stage 1: Dependencies
FROM base AS deps
COPY package*.json ./
COPY pnpm-lock.yaml* ./

# Install pnpm and dependencies
RUN npm install -g pnpm@8.15.0
RUN pnpm install --frozen-lockfile --prod

# Stage 2: Development dependencies (for build)
FROM base AS dev-deps
COPY package*.json ./
COPY pnpm-lock.yaml* ./

RUN npm install -g pnpm@8.15.0
RUN pnpm install --frozen-lockfile

# Stage 3: Build
FROM base AS builder
WORKDIR /app
COPY --from=dev-deps /app/node_modules ./node_modules
COPY . .

# Build TypeScript
RUN npm run build

# Stage 4: Production runner
FROM base AS runner
WORKDIR /app

# Set environment
ENV NODE_ENV=production
ENV PORT=8000

# Copy production dependencies
COPY --from=deps /app/node_modules ./node_modules

# Copy built application
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/package.json ./
COPY --from=builder /app/src/analytics/schema.sql ./sql/

# Security: Remove package manager
RUN npm uninstall -g pnpm

# Set ownership
RUN chown -R apiserver:nodejs /app
USER apiserver

# Health check for analytics API
HEALTHCHECK --interval=30s --timeout=10s --start-period=30s --retries=3 \
  CMD curl -f http://localhost:8000/api/v1/health || exit 1

# Expose port
EXPOSE 8000

# Use dumb-init for proper signal handling
ENTRYPOINT ["dumb-init", "--"]
CMD ["node", "dist/server.js"]