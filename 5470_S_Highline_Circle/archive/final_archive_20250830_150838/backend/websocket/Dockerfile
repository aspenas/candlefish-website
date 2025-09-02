# WebSocket server for real-time updates
FROM node:20-alpine AS builder

# Install build dependencies
RUN apk add --no-cache git python3 make g++

WORKDIR /app

# Copy package files
COPY package*.json ./
COPY yarn.lock* ./

# Install dependencies
RUN npm ci --only=production && npm cache clean --force

# Copy source code
COPY . .

# Build TypeScript if needed
RUN npm run build || true

# Production stage
FROM node:20-alpine

# Install runtime dependencies
RUN apk add --no-cache curl dumb-init

# Create app user for security
RUN addgroup -g 1001 appuser && \
    adduser -u 1001 -G appuser -s /bin/sh -D appuser

WORKDIR /app

# Copy built application
COPY --from=builder --chown=appuser:appuser /app/dist/ ./dist/
COPY --from=builder --chown=appuser:appuser /app/node_modules/ ./node_modules/
COPY --from=builder --chown=appuser:appuser /app/package*.json ./

# Switch to app user
USER appuser

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
    CMD curl -f http://localhost:8081/health || exit 1

# Expose WebSocket port
EXPOSE 8081

# Set environment variables
ENV NODE_ENV=production
ENV PORT=8081

# Use dumb-init for proper signal handling
ENTRYPOINT ["dumb-init", "--"]
CMD ["node", "dist/index.js"]