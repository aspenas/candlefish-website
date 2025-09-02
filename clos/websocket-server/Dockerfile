# CLOS WebSocket Server - Real-time Analytics Events
# Optimized for high-throughput WebSocket connections

FROM node:20-alpine AS base

# Install system dependencies
RUN apk update && \
    apk add --no-cache \
    dumb-init \
    curl \
    ca-certificates && \
    apk upgrade && \
    rm -rf /var/cache/apk/*

# Create non-root user
RUN addgroup -g 1001 -S nodejs
RUN adduser -S wsserver -u 1001 -G nodejs

WORKDIR /app

# Stage 1: Dependencies
FROM base AS deps
COPY package*.json ./
COPY pnpm-lock.yaml* ./

RUN npm install -g pnpm@8.15.0
RUN pnpm install --frozen-lockfile --prod

# Stage 2: Build
FROM base AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Build TypeScript
RUN npm install -g pnpm@8.15.0
RUN pnpm install --frozen-lockfile
RUN npm run build

# Stage 3: Production runner
FROM base AS runner
WORKDIR /app

# Environment
ENV NODE_ENV=production
ENV PORT=8001
ENV WS_HEARTBEAT_INTERVAL=30000
ENV WS_MAX_CONNECTIONS=10000

# Copy files
COPY --from=deps /app/node_modules ./node_modules
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/package.json ./

# Clean up
RUN npm uninstall -g pnpm

# Security
RUN chown -R wsserver:nodejs /app
USER wsserver

# Health check for WebSocket server
HEALTHCHECK --interval=30s --timeout=5s --start-period=30s --retries=3 \
  CMD curl -f http://localhost:8001/health || exit 1

# Expose WebSocket port
EXPOSE 8001

# Start WebSocket server with proper signal handling
ENTRYPOINT ["dumb-init", "--"]
CMD ["node", "dist/websocket-server.js"]