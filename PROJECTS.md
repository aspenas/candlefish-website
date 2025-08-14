# 🐠 Candlefish AI - Project Directory

## 🎯 Core Applications

| Hotkey | Project | Path | Description |
|--------|---------|------|-------------|
| `cfweb` | **Website** | `/apps/website` | Main candlefish.ai site, landing pages, marketing |
| `cftemp` / `cftemporal` | **Temporal Platform** | `/candlefish-temporal-platform` | Workflow orchestration & Paintbox integration |
| `cf` | **Root** | `/` | Project root, configs, deployment scripts |

## 🏗️ Active Projects

### 💼 Enterprise Tools

| Hotkey | Project | Path | Description |
|--------|---------|------|-------------|
| `cfpaint` | **Paintbox** | `/projects/paintbox` | Painting contractor business management platform |
| `cffogg` | **Fogg Calendar** | `/projects/fogg/calendar` | Smart calendar & scheduling system |
| `cfprom` | **PromoterOS** | `/projects/promoterOS` | Event promoter management system |

### 🛠️ Business Solutions

| Hotkey | Project | Path | Description |
|--------|---------|------|-------------|
| `cfbrew` | **Brewkit** | `/projects/brewkit` | Brewery management & inventory system |
| `cfcrown` | **Crown Trophy** | `/projects/crowntrophy` | Trophy & awards e-commerce platform |
| `cfbart` | **BART** | `/projects/bart-clean-core` | Business Analysis & Reporting Tool |

## 📁 Project Structure

```
candlefish-ai/
├── 📱 apps/
│   └── website/                  → Marketing site & docs
├── ⚙️ candlefish-temporal-platform/ → Workflow orchestration
│   ├── src/
│   │   ├── workflows/            → Temporal workflows
│   │   ├── activities/           → Temporal activities
│   │   ├── paintbox/             → Paintbox integration
│   │   └── graphql/              → GraphQL API
│   └── frontend/                 → UI for workflows
├── 🚀 projects/
│   ├── paintbox/                 → Contractor platform
│   ├── fogg/
│   │   └── calendar/             → Smart scheduling
│   ├── promoterOS/               → Event management
│   ├── brewkit/                  → Brewery tools
│   ├── crowntrophy/              → Awards platform
│   └── bart-clean-core/          → Analytics engine
├── 🔧 config/                    → Global configs
├── 📦 packages/                  → Shared packages
└── 🏗️ infrastructure/            → Deploy & CI/CD
```

## ⚡ Quick Commands

### Navigation

```bash
cf          # Go to root
cfweb       # Website project
cftemp      # Temporal platform (or cftemporal)
cfpaint     # Paintbox project
cffogg      # Fogg calendar
cfprom      # PromoterOS
cfbrew      # Brewkit
cfcrown     # Crown Trophy
cfbart      # BART analytics
```

### Project Actions

```bash
cfbuild     # Build current project
cftest      # Run tests
cfdeploy    # Deploy to production
```

## 🎨 Project Categories

### ⚙️ **Infrastructure & Platform**

- **Temporal Platform** - Workflow orchestration for all Candlefish services
- **Website** - Marketing & lead generation

### 🏢 **B2B SaaS**

- **Paintbox** - Vertical SaaS for painting contractors
- **PromoterOS** - Event industry management
- **Brewkit** - Brewery operations platform

### 📊 **Analytics & Data**

- **BART** - Business intelligence engine
- **Fogg Calendar** - AI-powered scheduling

### 🛍️ **E-Commerce**

- **Crown Trophy** - Awards marketplace

## 📈 Project Status

| Project | Stage | Stack | Status |
|---------|-------|-------|--------|
| Website | Production | Next.js, React | 🟢 Active |
| Temporal Platform | Development | TypeScript, Temporal, GraphQL | 🟡 Development |
| Paintbox | Beta | Next.js, Postgres | 🟡 Development |
| Fogg Calendar | Alpha | Python, FastAPI | 🟡 Development |
| PromoterOS | Planning | TypeScript | 🔵 Planning |
| Brewkit | MVP | React, Node | 🟡 Development |
| Crown Trophy | Production | Next.js | 🟢 Active |
| BART | Beta | Python, React | 🟡 Development |

## 🔗 Quick Links

| Type | Command | Description |
|------|---------|-------------|
| **Docs** | `cat ~/candlefish-ai/README.md` | Main documentation |
| **Shortcuts** | `cfhelp` | Show all shortcuts |
| **Status** | `candlefish_status` | Environment status |
| **Deploy** | `deploy_candlefish` | Deploy to production |

---
*Use any `cf*` command to jump directly to a project. Type `cfhelp` for all commands.*
