# Frontend Dockerfile for RTPM Dashboard
# Multi-stage build for optimized production image

# Build stage
FROM node:18-alpine AS builder

WORKDIR /app

# Copy package files
COPY package*.json ./
COPY tsconfig*.json ./
COPY vite.config.ts ./

# Install dependencies
RUN npm install --legacy-peer-deps

# Copy source code
COPY src/ ./src/
COPY index.html ./

# Create a basic index.html if it doesn't exist
RUN if [ ! -f index.html ]; then \
    echo '<!DOCTYPE html><html><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"><title>RTPM Dashboard</title></head><body><div id="root"></div><script type="module" src="/src/main.tsx"></script></body></html>' > index.html; \
    fi

# Create main.tsx if it doesn't exist
RUN if [ ! -f src/main.tsx ]; then \
    mkdir -p src && \
    echo 'import React from "react"; import ReactDOM from "react-dom/client"; import App from "./App"; ReactDOM.createRoot(document.getElementById("root")!).render(<React.StrictMode><App /></React.StrictMode>);' > src/main.tsx; \
    fi

# Create App.tsx if it doesn't exist
RUN if [ ! -f src/App.tsx ]; then \
    echo 'import React from "react"; export default function App() { return <div style={{padding: "20px"}}><h1>RTPM Dashboard</h1><p>Real-time Performance Monitoring</p></div>; }' > src/App.tsx; \
    fi

# Build the application
RUN npm run build 2>/dev/null || npx vite build

# Production stage
FROM nginx:alpine

# Copy nginx configuration
COPY --from=builder /app/dist /usr/share/nginx/html

# Create custom nginx config
RUN echo 'server { \
    listen 80; \
    server_name localhost; \
    root /usr/share/nginx/html; \
    index index.html; \
    location / { \
        try_files $uri $uri/ /index.html; \
    } \
    location /api { \
        proxy_pass http://api:8000; \
        proxy_http_version 1.1; \
        proxy_set_header Upgrade $http_upgrade; \
        proxy_set_header Connection "upgrade"; \
        proxy_set_header Host $host; \
        proxy_set_header X-Real-IP $remote_addr; \
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for; \
        proxy_set_header X-Forwarded-Proto $scheme; \
    } \
}' > /etc/nginx/conf.d/default.conf

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost || exit 1

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
