# Multi-stage build for Projects Subgraph
FROM node:18-alpine AS base

# Set working directory
WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci --only=production && npm cache clean --force

# Development stage
FROM base AS development
RUN npm ci
COPY . .
RUN npm run build
EXPOSE 4004
CMD ["npm", "run", "dev"]

# Production build stage
FROM base AS build
RUN npm ci
COPY . .
RUN npm run build

# Production runtime stage
FROM node:18-alpine AS production

# Create app user for security
RUN addgroup -g 1001 -S nodejs && \
    adduser -S appuser -u 1001

# Set working directory
WORKDIR /app

# Copy production dependencies
COPY --from=base /app/node_modules ./node_modules
COPY --from=build /app/dist ./dist
COPY --from=build /app/package*.json ./
COPY --from=build /app/schema.graphql ./

# Set ownership and permissions
RUN chown -R appuser:nodejs /app
USER appuser

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
    CMD node -e "const http = require('http'); http.get('http://localhost:4004/.well-known/apollo/server-health', (res) => process.exit(res.statusCode === 200 ? 0 : 1));"

# Expose port
EXPOSE 4004

# Set production environment
ENV NODE_ENV=production \
    PORT=4004

# Start the application
CMD ["npm", "start"]
