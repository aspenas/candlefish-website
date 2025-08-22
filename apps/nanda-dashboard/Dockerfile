# Multi-stage production Dockerfile for NANDA Dashboard
# Stage 1: Build stage
FROM node:20-alpine AS builder

# Set working directory
WORKDIR /app

# Install build dependencies
RUN apk add --no-cache python3 make g++ git

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm install && npm cache clean --force

# Copy source code
COPY src ./src
COPY public ./public
COPY index.html ./
COPY vite.config.ts ./
COPY tsconfig.json ./
COPY tsconfig.node.json ./
COPY tailwind.config.js ./
COPY postcss.config.js ./

# Build the application
RUN npm run build

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

# Install sirv-cli globally for serving
RUN npm install -g sirv-cli

# Set timezone
ENV TZ=UTC

# Set working directory
WORKDIR /app

# Copy built application from builder stage
COPY --from=builder --chown=nanda:nanda /app/dist ./dist
COPY --from=builder --chown=nanda:nanda /app/package.json ./

# Create necessary directories
RUN mkdir -p /app/logs && \
    chown -R nanda:nanda /app

# Switch to non-root user
USER nanda

# Expose port
EXPOSE 3001

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
    CMD curl -f http://localhost:3001/health || exit 1

# Set environment variables
ENV NODE_ENV=production
ENV PORT=3001

# Use dumb-init to handle signals properly
ENTRYPOINT ["dumb-init", "--"]

# Start the application
CMD ["sirv", "dist", "--port", "3001", "--cors", "--single", "--host", "0.0.0.0"]
