# Candlefish AI Monorepo Setup

## 🚀 Quick Start

### For GitHub Codespaces (Recommended)

1. Open in Codespaces - everything auto-configures via devcontainer
2. Load secrets: `bash scripts/secrets-bootstrap.sh <app> dev`
3. Start developing!

### For Local Development

```bash
# Install tools
corepack enable
corepack prepare pnpm@9.9.0 --activate
curl -LsSf https://astral.sh/uv/install.sh | sh

# Install dependencies
pnpm install --frozen-lockfile

# Setup pre-commit hooks
pre-commit install
```

## 📦 Repository Structure

```
candlefish-ai/
├── apps/              # Frontend applications
│   ├── paintbox/      # Paint estimation platform (Tyler)
│   ├── promoteros/    # Promoter management (Tyler)
│   └── crown-trophy/  # Trophy business app (Aaron)
├── services/          # Backend services
│   ├── crestron-ha/   # Home automation (Patrick)
│   └── nanda-index/   # NANDA AI agents (Patrick/Tyler)
├── libs/              # Shared libraries
│   ├── ts/            # TypeScript libraries
│   └── py/            # Python libraries
├── infra/             # Infrastructure (Aaron)
│   ├── devcontainer/  # Codespaces config
│   └── terraform/     # IaC definitions
└── scripts/           # Automation scripts
```

## 🔄 Workflow

### Daily Development

1. **Open Codespace or pull latest**
   ```bash
   git pull origin main
   ```

2. **Load environment variables**
   ```bash
   bash scripts/secrets-bootstrap.sh <app> dev
   ```

3. **Create feature branch**
   ```bash
   git checkout -b feat/<area>-<description>
   ```

4. **Develop with hot reload**
   ```bash
   pnpm -r dev  # All workspaces
   pnpm --filter paintbox dev  # Specific app
   ```

5. **Test changes**
   ```bash
   pnpm -r test
   pnpm -r lint
   ```

6. **Create PR**
   ```bash
   gh pr create
   ```

## 🔐 Secrets Management

### AWS Secrets Manager Structure
```
candlefish/
├── dev/
│   ├── core           # Shared dev secrets
│   ├── paintbox       # Paintbox dev
│   ├── promoteros     # PromoterOS dev
│   ├── crown-trophy   # Crown Trophy dev
│   ├── nanda-index    # NANDA dev
│   └── crestron-ha    # Crestron HA dev
├── stage/
│   └── ...            # Staging secrets
└── prod/
    └── ...            # Production secrets
```

### Loading Secrets
```bash
# Dev environment
bash scripts/secrets-bootstrap.sh paintbox dev

# Production (owners only)
bash scripts/secrets-bootstrap.sh paintbox prod
```

## 🔐 Deployment Secrets Matrix

### GitHub Repository Secrets

| Secret Name | Environment | Description | Set By |
|------------|------------|------------|--------|
| `NETLIFY_AUTH_TOKEN` | All | Netlify API token | Patrick |
| `PAINTBOX_SITE_ID` | All | Netlify site ID for Paintbox | Patrick |
| `PROMOTEROS_SITE_ID` | All | Netlify site ID for PromoterOS | Patrick |
| `CROWN_SITE_ID` | All | Netlify site ID for Crown Trophy | Patrick |
| `FLY_API_TOKEN` | All | Fly.io API token | Patrick |

### GitHub Environment Variables

| Variable | Environment | Description | Example |
|----------|------------|------------|---------|
| `AWS_ROLE_ARN` | preview/production | OIDC role for AWS | `arn:aws:iam::681214184463:role/github-actions` |
| `AWS_REGION` | preview/production | AWS region | `us-west-2` |

### AWS Secrets Manager Keys

| Secret Path | Environment | Used By | Contents |
|------------|------------|---------|----------|
| `candlefish/dev/paintbox` | Development | Paintbox app | DB_URL, API_KEY, etc |
| `candlefish/prod/paintbox` | Production | Paintbox app | DB_URL, API_KEY, etc |
| `candlefish/dev/promoteros` | Development | PromoterOS app | DB_URL, API_KEY, etc |
| `candlefish/prod/promoteros` | Production | PromoterOS app | DB_URL, API_KEY, etc |
| `candlefish/dev/crown-trophy` | Development | Crown Trophy app | DB_URL, API_KEY, etc |
| `candlefish/prod/crown-trophy` | Production | Crown Trophy app | DB_URL, API_KEY, etc |
| `candlefish/dev/nanda-index` | Development | NANDA service | DB_URL, AWS_ACCESS, etc |
| `candlefish/prod/nanda-index` | Production | NANDA service | DB_URL, AWS_ACCESS, etc |
| `candlefish/dev/crestron-ha` | Development | Crestron service | MQTT_URL, DEVICE_KEY, etc |
| `candlefish/prod/crestron-ha` | Production | Crestron service | MQTT_URL, DEVICE_KEY, etc |

### Setting Up Secrets

```bash
# 1. Create GitHub repository secrets (once)
gh secret set NETLIFY_AUTH_TOKEN --body "$NETLIFY_TOKEN"
gh secret set PAINTBOX_SITE_ID --body "site-id-here"
gh secret set PROMOTEROS_SITE_ID --body "site-id-here"
gh secret set CROWN_SITE_ID --body "site-id-here"
gh secret set FLY_API_TOKEN --body "$FLY_TOKEN"

# 2. Create GitHub environment variables
gh variable set AWS_ROLE_ARN --env preview --body "arn:aws:iam::681214184463:role/github-actions-preview"
gh variable set AWS_ROLE_ARN --env production --body "arn:aws:iam::681214184463:role/github-actions-prod"
gh variable set AWS_REGION --env preview --body "us-west-2"
gh variable set AWS_REGION --env production --body "us-west-2"

# 3. Create AWS secrets for each app
aws secretsmanager create-secret \
  --name "candlefish/dev/paintbox" \
  --secret-string '{"DATABASE_URL":"...", "REDIS_URL":"..."}'

# 4. Configure OIDC trust relationship
aws iam create-role --role-name github-actions \
  --assume-role-policy-document file://trust-policy.json
```

## 🤖 NANDA Agents

The monorepo includes NANDA autonomous agents for:
- Code review automation
- Deployment orchestration  
- Performance monitoring
- Security scanning

## 🛠️ Commands Reference

### Package Management
```bash
# Install all dependencies
pnpm install

# Add dependency to specific workspace
pnpm --filter paintbox add react

# Add dev dependency
pnpm --filter paintbox add -D @types/react

# Update dependencies
pnpm update --interactive --latest
```

### Building & Testing
```bash
# Build all
pnpm -r build

# Test all
pnpm -r test

# Lint all
pnpm -r lint

# Type check
pnpm -r typecheck

# Run specific app
pnpm --filter paintbox dev
```

### Python Services
```bash
# Install Python deps for a service
cd services/my-service
uv sync

# Run Python service
uv run python main.py

# Run tests
uv run pytest
```

## 🚀 Deployment

### Frontend Apps
- **Platform**: Netlify
- **Preview**: Auto-deployed on PR
- **Production**: Auto-deployed on merge to main

### Backend Services  
- **Platform**: Fly.io or AWS ECS
- **Staging**: Deployed on push to `staging`
- **Production**: Deployed on push to `main` with approval

### Workflows
- **Platform**: n8n Cloud
- **Config**: Stored in `services/*/workflows/`

## 👥 Team Access

| Team Member | GitHub | AWS Access | Areas |
|------------|--------|------------|-------|
| Patrick | @aspenas | Full (Owner) | All systems |
| Tyler | @tyler-robinson | Dev/Stage | Paintbox, PromoterOS |
| Aaron | @aaron-westphal | Dev + Infra | Crown Trophy, Infrastructure |

## 📚 Documentation

- [Architecture Overview](./docs/ARCHITECTURE.md)
- [API Documentation](./docs/API.md)
- [Deployment Guide](./docs/DEPLOYMENT.md)
- [Security Policies](./SECURITY.md)

## 🎯 Roadmap

- [ ] Migrate remaining legacy repos
- [ ] Setup monitoring with Grafana Cloud
- [ ] Implement GraphQL federation
- [ ] Add E2E testing with Playwright
- [ ] Setup feature flags system

## 🆘 Support

- **Slack**: #candlefish-dev
- **Issues**: [GitHub Issues](https://github.com/candlefish-enterprise/candlefish-ai/issues)
- **Wiki**: [Internal Wiki](https://github.com/candlefish-enterprise/candlefish-ai/wiki)

---

*Built with ❤️ by the Candlefish team*
