# Multi-stage production Dockerfile for NANDA API
# Stage 1: Build stage
FROM node:20-alpine AS builder

# Set working directory
WORKDIR /app

# Install build dependencies
RUN apk add --no-cache python3 make g++ git

# Copy package files
COPY package*.json ./

# Install all dependencies (needed for build)
RUN npm install && npm cache clean --force

# Copy source code
COPY src ./src
COPY tsconfig.json ./

# Install ts-node for development deployment
RUN npm install -g ts-node

# Stage 2: Production stage
FROM node:20-alpine AS production

# Create non-root user
RUN addgroup -g 1001 -S nanda && \
    adduser -S nanda -u 1001

# Install runtime dependencies
RUN apk add --no-cache \
    dumb-init \
    curl \
    ca-certificates \
    tzdata

# Install ts-node globally
RUN npm install -g ts-node

# Set timezone
ENV TZ=UTC

# Set working directory
WORKDIR /app

# Copy application from builder stage
COPY --from=builder --chown=nanda:nanda /app/src ./src
COPY --from=builder --chown=nanda:nanda /app/tsconfig.json ./tsconfig.json
COPY --from=builder --chown=nanda:nanda /app/node_modules ./node_modules
COPY --from=builder --chown=nanda:nanda /app/package.json ./

# Create necessary directories
RUN mkdir -p /app/logs /app/tmp && \
    chown -R nanda:nanda /app

# Switch to non-root user
USER nanda

# Expose port
EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
    CMD curl -f http://localhost:3000/health || exit 1

# Set environment variables
ENV NODE_ENV=production
ENV PORT=3000
ENV LOG_LEVEL=info

# Use dumb-init to handle signals properly
ENTRYPOINT ["dumb-init", "--"]

# Start the application with ts-node
CMD ["ts-node", "src/index.ts"]
