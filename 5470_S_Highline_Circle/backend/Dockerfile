FROM golang:1.23-alpine AS builder

WORKDIR /app

# Install dependencies including build tools for SQLite
RUN apk add --no-cache git ca-certificates gcc musl-dev sqlite-dev

# Copy go mod files
COPY go.mod go.sum ./
RUN go mod download

# Copy source code
COPY . .

# Build the application with CGO enabled for SQLite support
RUN CGO_ENABLED=1 GOOS=linux go build -a -ldflags '-linkmode external -extldflags "-static"' -o main main.go

# Final stage
FROM alpine:latest

RUN apk --no-cache add ca-certificates postgresql-client python3 py3-pip aws-cli

WORKDIR /app

# Copy binary from builder
COPY --from=builder /app/main ./bin/main

# Copy database files
COPY schema.sql ./schema.sql
COPY migrate.sh ./migrate
COPY inventory_master.db ./inventory_master.db

# Ensure database has proper permissions
RUN chmod 666 inventory_master.db

# Copy data import scripts and files
COPY scripts/setup-production-db.py ./scripts/setup-production-db.py
COPY scripts/import-excel-data.py ./scripts/import-excel-data.py
COPY scripts/5470_furnishings_inventory.xlsx ./scripts/5470_furnishings_inventory.xlsx

# Install Python dependencies
RUN pip3 install --no-cache-dir --break-system-packages pandas psycopg2-binary python-dotenv openpyxl

# Make migration script executable
RUN chmod +x migrate

EXPOSE 8080

CMD ["bin/main"]
