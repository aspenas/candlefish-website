# Claude.candlefish.ai Dashboard - Context Management Document
Generated: 2025-08-08

## 🎯 Project Overview
The claude.candlefish.ai dashboard is a React-based family portal application that provides secure access to confidential documents and business status updates. It requires comprehensive cleanup and world-class UI/UX enhancements.

## 📍 Current State

### Architecture
- **Framework**: React 18.3.1 with TypeScript 5.8.3
- **Build Tool**: Vite 5.4.19 
- **Styling**: Tailwind CSS 3.4.17 with custom animations
- **Routing**: React Router 6.30.1
- **Deployment**: Netlify (multiple sites)
- **Bundling**: Code-split chunks (vendor, router, animations, three.js)

### Project Structure
```
/Users/patricksmith/candlefish-ai/
├── apps/website/               # Main dashboard application
│   ├── src/
│   │   ├── components/         # Shared React components
│   │   ├── pages/             # HomePage, NotFoundPage
│   │   ├── family-dashboard/   # Family portal components
│   │   │   └── ui/            # Dashboard UI components
│   │   └── App.tsx            # Main app with routing
│   ├── dist/                  # Build output (multiple versions)
│   ├── public/                # Static assets
│   ├── netlify/               # Serverless functions
│   └── scripts/               # Deployment scripts
```

### Active Components
1. **Public Website** (`/src/pages/HomePage.tsx`)
   - Marketing content with WebGL particles
   - GSAP scroll animations
   - Responsive design

2. **Family Dashboard** (`/src/family-dashboard/`)
   - Document grid with confidential links
   - Governance information
   - Shadow Credits system
   - Insights bar and triggers

## 🔴 Critical Issues

### 1. Visual Formatting Problems
- **Tables Cutoff**: Content overflows viewport without scrolling
- **Mobile Responsiveness**: Dashboard not optimized for mobile devices
- **Scrolling**: Overflow content not accessible
- **Component Layout**: Grid system needs refinement

### 2. Installation Complexity
- No single install command
- Multiple package managers (pnpm, npm)
- Dependency conflicts with extraneous packages
- Missing unified setup script

### 3. Git Repository Chaos
- **40+ uncommitted changes** across multiple directories
- Deleted files not staged
- Modified submodules
- Untracked deployment scripts and templates

### 4. Deployment Script Fragmentation
- 4+ different deployment scripts
- Inconsistent site IDs
- Manual API calls instead of CLI usage
- No unified deployment strategy

## 🚀 Enhancement Requirements

### World-Class UI/UX Improvements

#### Visual Design
- [ ] Implement fluid responsive grid system
- [ ] Add smooth page transitions
- [ ] Enhance micro-interactions
- [ ] Implement dark/light mode toggle
- [ ] Add loading skeletons for async content
- [ ] Create consistent component library

#### Performance
- [ ] Current bundle: 112.72 kB gzipped
- [ ] Target: < 100 kB initial load
- [ ] Implement progressive enhancement
- [ ] Add service worker for offline support
- [ ] Optimize image loading with lazy loading

#### Accessibility
- [ ] WCAG 2.1 AA compliance
- [ ] Keyboard navigation support
- [ ] Screen reader optimization
- [ ] Focus management
- [ ] High contrast mode support

#### Security
- [ ] Current Grade: B → Target: A+
- [ ] Implement stricter CSP policies
- [ ] Add rate limiting to functions
- [ ] Enhance authentication flow
- [ ] Implement session management

## 📦 Dependencies Status

### Core Dependencies
```json
{
  "react": "^18.3.1",
  "react-dom": "^18.3.1",
  "react-router-dom": "^6.24.1",
  "tailwindcss": "^3.4.4",
  "vite": "^5.3.4",
  "typescript": "^5.5.3"
}
```

### Extraneous Packages to Remove
- webpack-cli modules
- gsap (moved to manual chunks)
- Various build tools duplicates

## 🛠️ Technical Debt

### Code Quality
- Missing TypeScript strict mode
- No ESLint auto-fix on save
- Inconsistent code formatting
- Missing pre-commit hooks

### Testing
- No unit tests
- No E2E tests
- No visual regression tests
- No performance benchmarks

### Documentation
- Missing API documentation
- No component storybook
- Incomplete deployment guide
- No troubleshooting guide

## 🎯 Priority Action Items

### Immediate (P0)
1. **Fix Visual Issues**
   - Implement scrollable containers
   - Fix table overflow
   - Add responsive breakpoints

2. **Simplify Installation**
   - Create unified setup script
   - Document all environment variables
   - Add dependency check script

3. **Git Cleanup**
   - Review and commit/discard changes
   - Clean up submodules
   - Remove old build artifacts

### Short-term (P1)
1. **Consolidate Deployment**
   - Create single deploy command
   - Unify all deployment scripts
   - Add rollback capability

2. **UI Enhancement Phase 1**
   - Implement design system
   - Add component library
   - Create style guide

### Medium-term (P2)
1. **Performance Optimization**
   - Implement code splitting
   - Add resource hints
   - Optimize critical rendering path

2. **Testing Implementation**
   - Add unit test framework
   - Create E2E test suite
   - Implement CI/CD pipeline

## 🔐 Security Considerations

### Current Implementation
- Netlify Identity for authentication
- Role-based access control
- Protected routes with edge functions

### Required Enhancements
- [ ] Implement 2FA
- [ ] Add audit logging
- [ ] Enhance session management
- [ ] Add security headers monitoring

## 📊 Metrics & Monitoring

### Current State
- No performance monitoring
- No error tracking
- No user analytics
- No deployment metrics

### Target State
- Real-time performance monitoring
- Error tracking with Sentry
- Privacy-focused analytics
- Deployment success metrics

## 🚢 Deployment Strategy

### Current Process
- Manual builds
- Multiple deployment targets
- No staging environment
- No automated testing

### Target Process
- Automated CI/CD pipeline
- Preview deployments for PRs
- Staging → Production flow
- Automated rollback on failure

## 📝 Configuration Files

### Key Files to Review
- `/apps/website/vite.config.ts` - Build configuration
- `/apps/website/netlify.toml` - Deployment settings
- `/apps/website/tailwind.config.js` - Style configuration
- `/apps/website/tsconfig.json` - TypeScript settings

## 🔄 Migration Path

### Phase 1: Stabilization (Week 1)
- Fix critical visual issues
- Create unified setup script
- Clean up git repository
- Document current state

### Phase 2: Enhancement (Week 2-3)
- Implement design system
- Add component library
- Enhance responsive design
- Improve performance

### Phase 3: Excellence (Week 4+)
- Add advanced features
- Implement testing
- Optimize performance
- Complete documentation

## 📚 Reference Documentation

### Internal Docs
- `DEPLOYMENT_SUMMARY.md` - Current deployment status
- `DEPLOY_INSTRUCTIONS.md` - Manual deployment steps
- `FAMILY_DASHBOARD_AUTH_FIX.md` - Authentication setup

### External Resources
- [Vite Documentation](https://vitejs.dev/)
- [React 18 Features](https://react.dev/blog/2022/03/29/react-v18)
- [Tailwind CSS](https://tailwindcss.com/)
- [Netlify Functions](https://docs.netlify.com/functions/overview/)

## 🎯 Success Criteria

### Technical
- [ ] Single command installation
- [ ] < 3s initial load time
- [ ] 95+ Lighthouse score
- [ ] A+ security rating

### User Experience
- [ ] Intuitive navigation
- [ ] Responsive on all devices
- [ ] Accessible to all users
- [ ] Delightful interactions

### Development
- [ ] Clean git history
- [ ] Comprehensive documentation
- [ ] Automated testing
- [ ] Efficient deployment

## 🤝 Team Coordination

### Stakeholders
- **Product Owner**: Patrick Smith
- **Users**: Family members with role-based access
- **Deployment**: Netlify team account

### Communication
- Progress updates via dashboard
- Critical issues via direct notification
- Documentation in repository

## 🔮 Future Considerations

### Potential Enhancements
- Real-time collaboration features
- Advanced data visualization
- AI-powered insights
- Mobile native apps

### Scalability
- Microservices architecture
- Edge computing optimization
- Global CDN distribution
- Database optimization

---

## Next Agent Instructions

When working on this project:

1. **Always check** this context document first
2. **Prioritize** P0 items before any enhancements
3. **Test locally** before any deployment
4. **Document** all changes in commit messages
5. **Update** this document with progress

### Quick Commands
```bash
# Development
cd /Users/patricksmith/candlefish-ai/apps/website
npm install  # or pnpm install
npm run dev

# Build
npm run build

# Deploy
npm run deploy

# Family Dashboard Dev
npm run family:dev
npm run family:build
```

### Environment Variables
```bash
CF_ENV=production
NODE_ENV=production
AWS_REGION=us-east-1
CORS_ORIGINS=https://candlefish.ai,https://www.candlefish.ai
```

This context document should be referenced by all agents working on the claude.candlefish.ai dashboard project.
