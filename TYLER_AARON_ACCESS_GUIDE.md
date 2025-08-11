# Candlefish AI Dashboard - Team Access Guide

## For Tyler & Aaron

Welcome to the Candlefish AI dashboard! This guide will help you get started with accessing and using the enhanced dashboard system.

## 🚀 Quick Start

### One-Command Installation
```bash
npx @candlefish/create-dashboard setup
```
This single command handles everything - dependencies, configuration, and initial build.

## 🔑 Access Credentials

### 1. Figma API Token
The Figma token has been securely stored in AWS Secrets Manager.

**To retrieve the token:**
```bash
aws secretsmanager get-secret-value --secret-id "figma-api-token" --region us-west-2
```

**Prerequisites:**
- AWS CLI installed and configured
- IAM permissions for Secrets Manager access
- Region: us-west-2

### 2. Dashboard URLs
- **Production Site**: https://candlefish.ai
- **Family Dashboard**: https://candlefish.ai/docs/privileged/family
- **GitHub Repository**: https://github.com/aspenas/candlefish-ai

## 📦 Project Structure

```
/Users/patricksmith/candlefish-ai/
├── apps/website/           # Main dashboard application
│   ├── src/               # React source code
│   ├── dist/              # Production build
│   └── package.json       # Dependencies & scripts
├── packages/
│   └── create-dashboard/  # NPX installation package
└── CLAUDE.md             # Project configuration
```

## 🛠️ Development Workflow

### Local Development
```bash
# Navigate to the project
cd /Users/patricksmith/candlefish-ai/apps/website

# Install dependencies (if needed)
npm install

# Start development server
npm run dev

# Build for production
npm run build

# Deploy to Netlify
npm run deploy
```

### Available Commands
- `npm run dev` - Start development server on http://localhost:5173
- `npm run build` - Build for production
- `npm run preview` - Preview production build locally
- `npm run deploy` - Deploy to Netlify
- `npm run lint` - Run ESLint
- `npm run typecheck` - Check TypeScript types
- `npm run family:build` - Build family dashboard
- `npm run family:dev` - Development server for family dashboard

## 🎨 Key Features

### Visual Enhancements
- ✅ **Fixed table scrolling** - All tables now have proper horizontal scrolling
- ✅ **Responsive design** - Works perfectly on mobile, tablet, and desktop
- ✅ **Modern UI components** - Cards, buttons, and navigation with hover effects
- ✅ **Loading states** - Professional spinners and error boundaries
- ✅ **Dark theme** - Elegant dark mode with cyan accents

### Technical Improvements
- **Bundle size**: 110KB compressed (excellent performance)
- **Code splitting**: Lazy loading for optimal load times
- **TypeScript**: Full type safety
- **React 18**: Latest features and optimizations
- **Tailwind CSS**: Utility-first styling

## 🔐 Security Configuration

### Environment Variables
Create a `.env` file in `/apps/website/` with:
```env
# API Configuration
VITE_API_URL=https://api.candlefish.ai
VITE_API_KEY=your-api-key

# Figma Integration
VITE_FIGMA_TOKEN=your-figma-token

# Feature Flags
VITE_ENABLE_ANALYTICS=true
VITE_ENABLE_MONITORING=true
```

### AWS Secrets Access
You'll need AWS credentials configured:
```bash
aws configure
# Enter your AWS Access Key ID
# Enter your AWS Secret Access Key
# Default region: us-west-2
# Default output format: json
```

## 📚 Documentation

### Component Documentation
- `/apps/website/src/components/` - All React components
- `/apps/website/src/family-dashboard/` - Family dashboard specific components
- `/apps/website/INSTALLATION_GUIDE.md` - Detailed installation guide
- `/apps/website/DEPLOYMENT_SUMMARY.md` - Deployment information

### API Integration
The dashboard can integrate with:
- Figma API (design sync)
- AWS services (secrets, storage)
- Netlify Functions (serverless backend)

## 🚨 Troubleshooting

### Common Issues

**Build fails with "Cannot find module 'gsap'"**
```bash
npm install gsap
```

**Netlify deployment fails**
```bash
# Make sure you're in the correct directory
cd /Users/patricksmith/candlefish-ai/apps/website
# Build first, then deploy
npm run build
npm run deploy
```

**AWS Secrets Manager access denied**
- Ensure your IAM user has `secretsmanager:GetSecretValue` permission
- Check you're using the correct region (us-west-2)

## 📞 Support

### Contact
- **Patrick**: Project owner and primary contact
- **GitHub Issues**: https://github.com/aspenas/candlefish-ai/issues
- **Slack**: Use the message copied to clipboard earlier

### Resources
- [React Documentation](https://react.dev)
- [Tailwind CSS](https://tailwindcss.com)
- [Netlify Docs](https://docs.netlify.com)
- [AWS Secrets Manager](https://docs.aws.amazon.com/secretsmanager/)

## ✅ Next Steps

1. **Clone the repository**:
   ```bash
   git clone https://github.com/aspenas/candlefish-ai.git
   cd candlefish-ai
   ```

2. **Install and setup**:
   ```bash
   npx @candlefish/create-dashboard setup
   ```

3. **Retrieve Figma token**:
   ```bash
   aws secretsmanager get-secret-value --secret-id "figma-api-token" --region us-west-2
   ```

4. **Start developing**:
   ```bash
   cd apps/website
   npm run dev
   ```

## 🎉 Welcome to the Team!

The dashboard is now live at https://candlefish.ai with all enhancements. Everything is set up for you to start contributing. The installation system has been simplified to a single command, and all credentials are securely stored in AWS Secrets Manager.

Happy coding! 🚀
