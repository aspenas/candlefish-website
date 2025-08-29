# CLOS - Candlefish Localhost Orchestration System

A comprehensive Go-based orchestrator for managing local development services across multiple projects with intelligent port management, service discovery, and conflict resolution.

## Features

### 🚀 Core Capabilities
- **Intelligent Port Management**: Automatic port allocation with configurable ranges per project
- **Service Discovery**: SQLite-based registry tracking all services, ports, and metadata
- **Docker Integration**: Seamless Docker Compose management with health monitoring
- **Conflict Resolution**: Interactive conflict detection and resolution with multiple strategies
- **Web Dashboard**: Real-time monitoring and management interface
- **Concurrent Operations**: Thread-safe service management with proper synchronization

### 📊 Port Ranges
- **Core Services**: 5000-5999
- **Candlefish Frontend**: 3000-3099  
- **Security Dashboard**: 3100-3199
- **PKB**: 3200-3299
- **APIs**: 4000-4999

## Installation

### Prerequisites
- Go 1.21 or later
- Docker and Docker Compose
- SQLite3

### Quick Start

```bash
# Clone and build
git clone <repo>
cd clos
make build

# Initialize CLOS
./clos init

# Check system status  
./clos status

# Start a service group
./clos start security-dashboard

# Resolve conflicts interactively
./clos resolve

# Start web dashboard
./clos dashboard
```

### Development Setup

```bash
# Set up development environment
make demo-setup

# Run in development mode
make dev

# Run tests
make test

# Check dependencies
make check-deps
```

## Usage

### CLI Commands

#### System Management
```bash
clos init                    # Initialize CLOS system
clos status                  # Show all running services
clos config                  # Display current configuration
clos check <port>           # Check specific port usage
```

#### Service Management
```bash
clos start <group>          # Start service group
clos stop <group>           # Stop service group  
clos logs [service]         # Show service logs
```

#### Conflict Resolution
```bash
clos resolve                # Interactive conflict resolver
```

#### Monitoring
```bash
clos dashboard              # Start web dashboard
```

### Service Registration

Services are automatically registered when started through CLOS. Manual registration example:

```go
service := &types.Service{
    Name:      "my-api",
    Group:     "my-project", 
    Port:      4001,
    Status:    types.StatusRunning,
    HealthURL: "http://localhost:4001/health",
    Environment: map[string]string{
        "NODE_ENV": "development",
    },
    Tags: []string{"api", "nodejs"},
}

registry.RegisterService(service)
```

### Docker Compose Templates

CLOS uses templates to generate Docker Compose files. Create a template in `~/.clos/templates/`:

```yaml
# ~/.clos/templates/my-project.template.yml
version: '3.8'
services:
  my-api:
    image: my-api:latest
    ports:
      - "4001:3000"
    environment:
      - NODE_ENV=development
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:3000/health"]
      interval: 30s
      timeout: 10s
      retries: 3
    networks:
      - clos-network

networks:
  clos-network:
    external: true
```

### Configuration

CLOS uses YAML configuration stored in `~/.clos/config.yaml`:

```yaml
database:
  path: ~/.clos/registry.db
  timeout: 30s

docker:
  host: unix:///var/run/docker.sock
  compose_version: "3.8"
  network_name: clos-network
  templates_dir: ~/.clos/templates
  compose_files_dir: ~/.clos/compose

port_ranges:
  - project: core
    start_port: 5000
    end_port: 5999
  - project: candlefish-frontend  
    start_port: 3000
    end_port: 3099

dashboard:
  port: 8080
  host: localhost
  enabled: true

logging:
  level: info
  format: text
  file: ~/.clos/clos.log
```

## Architecture

### Core Components

```
clos/
├── cmd/clos/                 # CLI entry point
│   ├── main.go              # Main application
│   └── commands.go          # Cobra commands
├── internal/
│   ├── registry/            # SQLite service registry
│   ├── docker/              # Docker Compose management  
│   ├── resolver/            # Conflict resolution
│   └── logger/              # Structured logging
├── pkg/
│   ├── types/               # Core data types
│   └── config/              # Configuration management
└── templates/               # Docker Compose templates
```

### Database Schema

```sql
-- Services registry
CREATE TABLE services (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    group_name TEXT NOT NULL, 
    port INTEGER UNIQUE NOT NULL,
    status TEXT NOT NULL,
    started_at DATETIME,
    stopped_at DATETIME,
    health_url TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Service metadata
CREATE TABLE service_tags (
    service_id TEXT,
    tag TEXT,
    PRIMARY KEY (service_id, tag)
);

CREATE TABLE service_environment (
    service_id TEXT,
    key TEXT,
    value TEXT, 
    PRIMARY KEY (service_id, key)
);
```

## Conflict Resolution

CLOS provides intelligent conflict resolution with multiple strategies:

### Detection
- **Port Conflicts**: Multiple services on same port
- **External Processes**: System processes blocking CLOS ports
- **Range Violations**: Services outside allocated ranges

### Resolution Options  
- **Automatic Reassignment**: Find alternative ports automatically
- **Interactive Selection**: Choose which service to move
- **Process Management**: Kill conflicting external processes
- **Manual Override**: Specify exact port assignments
- **Usage Analysis**: Detailed port utilization reports

### Example Resolution Flow

```bash
$ clos resolve

Detected 2 conflicts:

Conflict 1/2: Port 3000
Multiple CLOS services using port 3000: candlefish-frontend, test-app

How would you like to resolve this conflict?
  → Reassign ports automatically
    Choose which service to reassign  
    Stop conflicting services
    Skip this conflict

✓ Reassigned test-app from port 3000 to port 3004
```

## Development

### Project Structure

The project follows Go best practices with clear separation of concerns:

- **cmd/**: Application entry points
- **internal/**: Private application code
- **pkg/**: Public library code
- **templates/**: Resource templates

### Testing

```bash
# Unit tests
make test-unit

# Integration tests  
make test-integration

# Coverage report
make coverage

# Benchmarks
make benchmark
```

### Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests
5. Run `make lint fmt vet test`
6. Submit a pull request

## Production Deployment

### Binary Installation

```bash
# Build release binaries
make release

# Install system-wide
sudo cp releases/clos-linux-amd64 /usr/local/bin/clos
```

### Systemd Service

```ini
# /etc/systemd/system/clos-dashboard.service
[Unit]
Description=CLOS Dashboard
After=network.target

[Service] 
Type=simple
User=clos
ExecStart=/usr/local/bin/clos dashboard
Restart=always

[Install]
WantedBy=multi-user.target
```

### Docker Deployment

```dockerfile
FROM golang:1.21-alpine AS builder
WORKDIR /app
COPY . .
RUN make build

FROM alpine:latest
RUN apk add --no-cache docker-cli
COPY --from=builder /app/clos /usr/local/bin/
ENTRYPOINT ["clos"]
```

## Troubleshooting

### Common Issues

**Database locked errors:**
```bash
# Reset database
make db-reset
```

**Port conflicts:**
```bash
# Interactive resolution
clos resolve

# Check specific port
clos check 3000
```

**Docker connection issues:**
```bash
# Verify Docker access
docker ps

# Check CLOS network
docker network ls | grep clos
```

**Template errors:**
```bash
# Copy example templates
make setup-templates

# Verify templates directory
ls ~/.clos/templates/
```

### Debug Mode

```bash
# Enable verbose logging
clos --verbose status

# Check logs
tail -f ~/.clos/clos.log
```

## License

MIT License - see LICENSE file for details.

## Contributing

We welcome contributions! Please see our contributing guidelines and code of conduct.

---

**CLOS** - Simplifying localhost orchestration for complex development environments.