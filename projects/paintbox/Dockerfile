# Paintbox Frontend - Multi-stage Docker Build
# Security-focused production container

# Build stage
FROM node:20-alpine AS builder

# Set working directory
WORKDIR /app

# Install security updates and build dependencies
RUN apk update && apk upgrade && \
    apk add --no-cache libc6-compat dumb-init && \
    rm -rf /var/cache/apk/*

# Create non-root user
RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 nextjs

# Copy package files
COPY package*.json ./
COPY tsconfig.json ./
COPY next.config.js ./

# Install dependencies with security audit
RUN npm ci --only=production --no-audit --prefer-offline && \
    npm cache clean --force

# Copy source code (no secrets in build context)
COPY . .

# Remove sensitive files from build context
RUN rm -f .env* && \
    rm -rf logs/* && \
    rm -rf coverage/

# Build application
ENV NEXT_TELEMETRY_DISABLED=1
ENV NODE_ENV=production
RUN npm run build

# Production stage
FROM node:20-alpine AS runner

# Security updates
RUN apk update && apk upgrade && \
    apk add --no-cache dumb-init curl && \
    rm -rf /var/cache/apk/*

# Set production environment
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

WORKDIR /app

# Create non-root user
RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 nextjs

# Copy built application
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static
COPY --from=builder --chown=nextjs:nodejs /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/bart3.20.xlsx ./bart3.20.xlsx

# Copy package.json for runtime dependencies
COPY --from=builder --chown=nextjs:nodejs /app/package.json ./package.json

# Create secure directories
RUN mkdir -p logs tmp && \
    chown -R nextjs:nodejs logs tmp && \
    chmod 755 logs tmp

# Set correct permissions and remove unnecessary files
RUN chmod -R 755 /app && \
    chown -R nextjs:nodejs /app && \
    rm -rf /tmp/* /var/tmp/* /root/.npm /home/nextjs/.npm

# Security: Set read-only filesystem (except for logs and tmp)
VOLUME ["/app/logs", "/app/tmp"]

# Switch to non-root user
USER nextjs

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=60s --retries=3 \
    CMD curl -f http://localhost:3000/api/health || exit 1

# Expose port
EXPOSE 3000

# Use dumb-init for proper signal handling
ENTRYPOINT ["dumb-init", "--"]

# Start application
CMD ["node", "server.js"]
