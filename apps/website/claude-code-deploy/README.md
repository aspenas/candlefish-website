# @candlefish-ai/claude-code-deploy

Professional agent deployment and integration toolkit for Claude Code with comprehensive NPM authentication and template management.

## Features

- **47 Professional Agents** - Complete catalog of production-ready development templates
- **Claude Code Integration** - Seamless setup with `.claude/settings.json` configuration
- **NPM Authentication** - Secure token verification and scope access management
- **Template Management** - Download, cache, and customize agent templates
- **Interactive Configuration** - Guided setup with validation and best practices
- **Multi-Category Support** - Backend, Frontend, Full-stack, Mobile, DevOps, AI/ML, Data, Security

## Quick Start

### Installation

```bash
# Install globally for CLI access
npm install -g @candlefish-ai/claude-code-deploy

# Or use directly with npx
npx @candlefish-ai/claude-code-deploy --help
```

### Basic Usage

```bash
# Initialize configuration
claude-deploy init

# Authenticate with NPM
claude-deploy auth

# List available agents
claude-deploy list

# Deploy an agent
claude-deploy deploy express-api
```

## Commands

### `claude-deploy init`

Initialize Claude Code deployment configuration with automatic system checks.

```bash
claude-deploy init [options]

Options:
  -f, --force              Force reinitialize existing configuration
  --skip-auth              Skip NPM authentication check
  --config-path <path>     Custom configuration path
```

**What it does:**
- Checks Claude Code installation
- Verifies NPM authentication
- Creates deployment configuration
- Sets up Claude Code integration
- Configures MCP servers

### `claude-deploy auth`

Manage NPM authentication and verify access tokens.

```bash
claude-deploy auth [options]

Options:
  --token <token>          NPM authentication token
  --check-only             Only verify existing authentication
```

**Authentication Setup:**
1. Get your NPM token from [npmjs.com/settings/tokens](https://www.npmjs.com/settings/tokens)
2. Run `claude-deploy auth` and enter your token
3. The tool verifies access to @candlefish-ai scope
4. Optionally configures your `.npmrc` file

### `claude-deploy list`

Display all available agents with filtering and search capabilities.

```bash
claude-deploy list [options]

Options:
  -c, --category <category>  Filter by category
  -s, --search <term>        Search agents by name or description
  --json                     Output in JSON format
```

**Examples:**
```bash
# List all agents
claude-deploy list

# List backend agents only
claude-deploy list -c backend

# Search for React agents
claude-deploy list -s react

# Get JSON output for scripting
claude-deploy list --json
```

### `claude-deploy deploy <agent-name>`

Deploy a specific agent with full template and configuration setup.

```bash
claude-deploy deploy <agent-name> [options]

Options:
  -p, --path <path>        Target deployment path
  --template <template>    Specific template version
  --no-interactive         Run in non-interactive mode
  --config <config>        JSON configuration string
```

**Examples:**
```bash
# Deploy Express API with interactive setup
claude-deploy deploy express-api

# Deploy to specific path
claude-deploy deploy react-dashboard -p /projects/my-dashboard

# Deploy with JSON configuration
claude-deploy deploy fastapi-server --config '{"port":"8000","author":"John Doe"}'
```

### `claude-deploy status`

Check system status and configuration health.

```bash
claude-deploy status [options]

Options:
  --verbose                Show detailed status information
```

## Available Agents

### Backend Development (6 agents)

| Agent | Description | Technologies |
|-------|-------------|--------------|
| `express-api` | Production-ready Express.js API server | Node.js, Express, MongoDB, JWT |
| `fastapi-server` | High-performance Python API server | Python, FastAPI, PostgreSQL, SQLAlchemy |
| `graphql-server` | Modern GraphQL server with subscriptions | Node.js, Apollo Server, GraphQL, Redis |
| `microservice-template` | Docker-ready microservice | Node.js, Docker, Kubernetes, Prometheus |
| `serverless-functions` | AWS Lambda functions | Node.js, AWS Lambda, API Gateway, DynamoDB |
| `spring-boot-api` | Enterprise Java API | Java, Spring Boot, PostgreSQL, Spring Security |

### Frontend Development (6 agents)

| Agent | Description | Technologies |
|-------|-------------|--------------|
| `react-dashboard` | Modern React admin dashboard | React, Material-UI, Chart.js, Redux Toolkit |
| `vue-spa` | Vue 3 single page application | Vue 3, Vuetify, Vue Router, Pinia |
| `angular-enterprise` | Enterprise Angular application | Angular, NgRx, Angular Material, RxJS |
| `nextjs-website` | SEO-optimized Next.js website | Next.js, React, Tailwind CSS, Vercel |
| `svelte-app` | Lightweight Svelte application | Svelte, SvelteKit, TypeScript, Tailwind CSS |
| `progressive-web-app` | PWA with offline capability | React, Service Worker, Workbox, IndexedDB |

### Full-Stack Development (5 agents)

| Agent | Description | Technologies |
|-------|-------------|--------------|
| `mern-stack` | Complete MERN stack application | MongoDB, Express, React, Node.js |
| `mean-stack` | Angular-based MEAN stack | MongoDB, Express, Angular, Node.js |
| `django-fullstack` | Django with React frontend | Django, React, PostgreSQL, Django REST Framework |
| `rails-webapp` | Full-featured Rails application | Ruby on Rails, Turbo, Stimulus, PostgreSQL |
| `laravel-app` | Modern Laravel application | PHP, Laravel, Livewire, Inertia.js |

### Mobile Development (5 agents)

| Agent | Description | Technologies |
|-------|-------------|--------------|
| `react-native-app` | Cross-platform mobile app | React Native, Expo, Redux Toolkit, React Navigation |
| `flutter-app` | Flutter mobile application | Flutter, Dart, Provider, Firebase |
| `ionic-hybrid` | Ionic hybrid app | Ionic, Angular, Capacitor, TypeScript |
| `swift-ios-app` | Native iOS application | Swift, SwiftUI, Core Data, Combine |
| `kotlin-android-app` | Modern Android app | Kotlin, Jetpack Compose, Room, ViewModel |

### DevOps & Infrastructure (5 agents)

| Agent | Description | Technologies |
|-------|-------------|--------------|
| `docker-compose-stack` | Multi-service Docker setup | Docker, Docker Compose, Nginx, PostgreSQL |
| `kubernetes-deployment` | Kubernetes manifests | Kubernetes, Helm, Prometheus, Grafana |
| `terraform-infrastructure` | Infrastructure as Code | Terraform, AWS, Azure, GCP |
| `ci-cd-pipeline` | Complete CI/CD setup | GitHub Actions, Docker, AWS, SonarQube |
| `monitoring-stack` | Monitoring and observability | Prometheus, Grafana, ElasticSearch, Kibana |

### AI & Machine Learning (5 agents)

| Agent | Description | Technologies |
|-------|-------------|--------------|
| `ml-api-server` | Machine learning API | Python, FastAPI, scikit-learn, TensorFlow |
| `llm-chatbot` | LLM-powered chatbot | Python, OpenAI API, Anthropic, FastAPI |
| `computer-vision-api` | Image processing API | Python, OpenCV, TensorFlow, YOLO |
| `nlp-text-analysis` | Natural language processing | Python, spaCy, NLTK, Transformers |
| `recommendation-engine` | ML recommendation system | Python, Pandas, scikit-learn, Surprise |

### Data Engineering (5 agents)

| Agent | Description | Technologies |
|-------|-------------|--------------|
| `etl-pipeline` | Extract, transform, load pipeline | Python, Apache Airflow, Pandas, PostgreSQL |
| `data-warehouse` | Modern data warehouse setup | dbt, Snowflake, BigQuery, Looker |
| `real-time-analytics` | Streaming analytics platform | Apache Kafka, Spark Streaming, Elasticsearch |
| `data-api-gateway` | Unified data access API | GraphQL, Apollo Federation, Redis, PostgreSQL |
| `business-intelligence` | BI dashboard with KPI tracking | Python, Dash, Plotly, Pandas |

### Security & Compliance (5 agents)

| Agent | Description | Technologies |
|-------|-------------|--------------|
| `auth-service` | Comprehensive authentication service | Node.js, OAuth2, JWT, Redis |
| `api-security-gateway` | Security-first API gateway | Kong, Nginx, Redis, OAuth2 |
| `encryption-service` | Encryption and key management | Python, HashiCorp Vault, AWS KMS, cryptography |
| `security-scanner` | Security vulnerability scanner | Python, Bandit, Safety, OWASP ZAP |
| `compliance-monitor` | Compliance monitoring system | Python, Elasticsearch, Kibana, PostgreSQL |

## Configuration

### Global Configuration

Configuration is stored in `~/.claude-deploy/config.json`:

```json
{
  "version": "1.0.0",
  "initialized": true,
  "npmRegistry": "https://registry.npmjs.org/",
  "claudePath": "/usr/local/bin/claude-code",
  "agents": {
    "defaultCategory": "backend",
    "defaultPath": "/Users/username/projects",
    "autoInstallDependencies": true,
    "autoInitializeClaude": true
  },
  "templates": {
    "cacheEnabled": true,
    "cacheExpiry": 86400000,
    "autoUpdate": true
  }
}
```

### Project Configuration

Each deployed project gets Claude Code integration in `.claude/project.json`:

```json
{
  "projectName": "my-express-api",
  "projectType": "backend",
  "technologies": ["Node.js", "Express", "MongoDB"],
  "configuredBy": "@candlefish-ai/claude-code-deploy",
  "settings": {
    "autoSave": true,
    "aiAssistance": true,
    "codeAnalysis": true
  }
}
```

## Claude Code Integration

### MCP Servers Configuration

Automatically configures MCP servers in `~/.claude/settings.json`:

```json
{
  "mcpServers": {
    "postgres": {
      "command": "npx",
      "args": ["@modelcontextprotocol/server-postgres"]
    },
    "github": {
      "command": "npx", 
      "args": ["@modelcontextprotocol/server-github"]
    },
    "aws": {
      "command": "npx",
      "args": ["@modelcontextprotocol/server-aws"]
    }
  }
}
```

### Project Instructions

Each project includes Claude-specific instructions in `.claude/instructions.md`:

- Technology-specific best practices
- Architecture guidelines
- Common commands and workflows
- Debugging and optimization tips

## Advanced Usage

### Batch Deployment

Deploy multiple agents programmatically:

```javascript
const { deploy } = require('@candlefish-ai/claude-code-deploy');

const agents = ['express-api', 'react-dashboard', 'docker-compose-stack'];

for (const agent of agents) {
  await deploy(agent, {
    path: `/projects/${agent}`,
    interactive: false,
    config: JSON.stringify({
      projectName: `my-${agent}`,
      author: 'Development Team'
    })
  });
}
```

### Custom Templates

Use custom template sources:

```bash
# Set custom template URL
claude-deploy deploy express-api --template https://github.com/my-org/custom-templates
```

### Environment Integration

Integrate with CI/CD pipelines:

```yaml
# GitHub Actions example
- name: Deploy Agent
  run: |
    npx @candlefish-ai/claude-code-deploy deploy express-api \
      --no-interactive \
      --config '{"projectName":"${{ github.event.repository.name }}","author":"${{ github.actor }}"}'
```

## Troubleshooting

### Common Issues

**NPM Authentication Failed**
```bash
# Check token validity
claude-deploy auth --check-only

# Reconfigure authentication
claude-deploy auth
```

**Claude Code Not Found**
```bash
# Install Claude Code
curl -fsSL https://claude.ai/install.sh | sh

# Verify installation
which claude-code
```

**Template Download Failed**
```bash
# Clear cache and retry
rm -rf ~/.claude-deploy/templates
claude-deploy deploy <agent-name>
```

**Permission Denied**
```bash
# Fix ownership
sudo chown -R $(whoami) ~/.claude-deploy

# Reset permissions
chmod 755 ~/.claude-deploy
```

### Debug Mode

Enable verbose logging:

```bash
DEBUG=claude-deploy* claude-deploy deploy express-api --verbose
```

### Cache Management

```bash
# Clear template cache
rm -rf ~/.claude-deploy/templates

# View cache status
claude-deploy status --verbose
```

## Contributing

We welcome contributions! Please see our [Contributing Guide](CONTRIBUTING.md) for details.

### Development Setup

```bash
# Clone repository
git clone https://github.com/candlefish-ai/claude-code-deploy.git
cd claude-code-deploy

# Install dependencies
npm install

# Run tests
npm test

# Test locally
npm link
claude-deploy --help
```

### Adding New Agents

1. Add agent definition to `lib/agents.js`
2. Create template in `templates/` directory
3. Add tests for the new agent
4. Update documentation

## License

MIT License - see [LICENSE](LICENSE) file for details.

## Support

- 📧 Email: support@candlefish.ai
- 💬 Discord: [Candlefish AI Community](https://discord.gg/candlefish-ai)
- 🐛 Issues: [GitHub Issues](https://github.com/candlefish-ai/claude-code-deploy/issues)
- 📚 Documentation: [docs.candlefish.ai](https://docs.candlefish.ai)

## Changelog

See [CHANGELOG.md](CHANGELOG.md) for version history and updates.

---

**Built with ❤️ by [Candlefish AI](https://candlefish.ai)**
