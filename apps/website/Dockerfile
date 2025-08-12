# Multi-stage Dockerfile for Candlefish AI Website
# Optimized for production deployment with security and performance

# Build stage
FROM node:18-alpine AS builder

# Install security updates and build dependencies
RUN apk update && apk upgrade && \
    apk add --no-cache \
    dumb-init \
    git \
    && rm -rf /var/cache/apk/*

# Create non-root user for security
RUN addgroup -g 1001 -S nodejs && \
    adduser -S candlefish -u 1001

# Set working directory
WORKDIR /app

# Copy package files for better Docker layer caching
COPY package*.json ./
COPY tsconfig*.json ./
COPY vite.config.ts ./
COPY tailwind.config.js ./
COPY postcss.config.js ./

# Install dependencies (npm ci for deterministic builds)
RUN npm ci --only=production --ignore-scripts && \
    npm cache clean --force

# Copy source code
COPY src/ ./src/
COPY public/ ./public/
COPY index.html ./

# Build the application
ENV NODE_ENV=production
ENV VITE_BUILD_MODE=production
RUN npm run build

# Production stage
FROM nginx:1.25-alpine AS production

# Install security updates and runtime dependencies
RUN apk update && apk upgrade && \
    apk add --no-cache \
    dumb-init \
    curl \
    && rm -rf /var/cache/apk/*

# Create non-root user
RUN addgroup -g 1001 -S nginx-app && \
    adduser -S nginx-app -u 1001 -G nginx-app

# Copy built application from builder stage
COPY --from=builder --chown=nginx-app:nginx-app /app/dist /usr/share/nginx/html

# Copy custom nginx configuration
COPY nginx.conf /etc/nginx/nginx.conf
COPY nginx-default.conf /etc/nginx/conf.d/default.conf

# Create necessary directories with correct permissions
RUN mkdir -p /var/cache/nginx /var/log/nginx /var/run && \
    chown -R nginx-app:nginx-app /var/cache/nginx /var/log/nginx /var/run /usr/share/nginx/html && \
    chmod -R 755 /usr/share/nginx/html

# Health check script
COPY --chown=nginx-app:nginx-app healthcheck.sh /usr/local/bin/healthcheck.sh
RUN chmod +x /usr/local/bin/healthcheck.sh

# Security: Remove default nginx user and unnecessary files
RUN deluser nginx || true && \
    rm -rf /etc/nginx/conf.d/default.conf.bak

# Switch to non-root user
USER nginx-app

# Expose port
EXPOSE 8080

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
    CMD /usr/local/bin/healthcheck.sh

# Use dumb-init for proper signal handling
ENTRYPOINT ["dumb-init", "--"]

# Start nginx
CMD ["nginx", "-g", "daemon off;"]

# Development stage (for docker-compose development)
FROM node:18-alpine AS development

# Install development dependencies
RUN apk update && apk upgrade && \
    apk add --no-cache \
    dumb-init \
    git \
    && rm -rf /var/cache/apk/*

# Create non-root user
RUN addgroup -g 1001 -S nodejs && \
    adduser -S candlefish -u 1001

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install all dependencies (including dev dependencies)
RUN npm ci && npm cache clean --force

# Copy source code
COPY . .

# Switch to non-root user
USER candlefish

# Expose development port
EXPOSE 3000

# Health check for development
HEALTHCHECK --interval=30s --timeout=10s --start-period=10s --retries=3 \
    CMD curl -f http://localhost:3000/ || exit 1

# Start development server
CMD ["npm", "run", "dev"]

# Testing stage
FROM development AS testing

# Switch back to root to install test dependencies
USER root

# Install browsers for E2E testing
RUN apk add --no-cache \
    chromium \
    && rm -rf /var/cache/apk/*

# Install playwright
RUN npx playwright install-deps

# Switch back to non-root user
USER candlefish

# Run tests
CMD ["npm", "run", "test:all"]