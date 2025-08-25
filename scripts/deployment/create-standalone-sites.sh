#!/bin/bash

set -e

echo "🚀 Creating Standalone Sites for Deployment"
echo "==========================================="

# Retrieve Vercel token securely from AWS Secrets Manager
VERCEL_TOKEN=$(aws secretsmanager get-secret-value --secret-id "vercel/deployment-token" --query SecretString --output text)
export VERCEL_TOKEN

# Verify token was retrieved successfully
if [ -z "$VERCEL_TOKEN" ]; then
  echo "❌ ERROR: Failed to retrieve Vercel token from AWS Secrets Manager"
  echo "   Make sure the secret 'vercel/deployment-token' exists and you have proper AWS credentials"
  exit 1
fi

echo "✅ Vercel token retrieved securely from AWS Secrets Manager"

# Function to create standalone Next.js app
create_standalone_app() {
  local site_name=$1
  local site_title=$2
  local domain=$3
  local project_dir="/tmp/${site_name}-standalone"

  echo "📦 Creating standalone $site_name..."

  # Clean up if exists
  rm -rf "$project_dir"

  # Create new Next.js app
  npx create-next-app@latest "$project_dir" \
    --typescript \
    --tailwind \
    --no-eslint \
    --app \
    --no-src-dir \
    --import-alias "@/*" \
    --no-install

  cd "$project_dir"

  # Create simple package.json
  cat > package.json << EOF
{
  "name": "$site_name",
  "version": "1.0.0",
  "private": true,
  "scripts": {
    "dev": "next dev",
    "build": "next build",
    "start": "next start"
  },
  "dependencies": {
    "next": "14.2.25",
    "react": "^18",
    "react-dom": "^18"
  },
  "devDependencies": {
    "@types/node": "^20",
    "@types/react": "^18",
    "@types/react-dom": "^18",
    "autoprefixer": "^10.4.20",
    "postcss": "^8",
    "tailwindcss": "^3.4.1",
    "typescript": "^5"
  }
}
EOF

  # Create page.tsx
  cat > app/page.tsx << EOF
export default function Home() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-900 to-slate-800 text-white">
      <nav className="border-b border-teal-500/20 bg-slate-900/80 backdrop-blur px-8 py-6">
        <div className="max-w-7xl mx-auto flex justify-between items-center">
          <h1 className="text-2xl font-bold text-teal-400">$site_title</h1>
          <div className="flex gap-8">
            <a href="/docs" className="text-slate-300 hover:text-teal-400 transition">Documentation</a>
            <a href="/api" className="text-slate-300 hover:text-teal-400 transition">API</a>
            <a href="/partners" className="text-slate-300 hover:text-teal-400 transition">Partners</a>
          </div>
        </div>
      </nav>

      <main className="px-8 py-16 max-w-7xl mx-auto">
        <section className="text-center mb-16">
          <h2 className="text-5xl font-bold mb-6">
            Build with <span className="text-teal-400">Operational Craft</span>
          </h2>
          <p className="text-xl text-slate-300 max-w-2xl mx-auto">
            World-class infrastructure and developer experience for building AI-powered applications
          </p>
        </section>

        <div className="grid md:grid-cols-3 gap-8 mb-16">
          <div className="p-8 bg-slate-800/50 border border-teal-500/20 rounded-lg">
            <h3 className="text-teal-400 text-xl font-semibold mb-4">Enterprise Ready</h3>
            <p className="text-slate-300">Production-grade infrastructure with 99.99% uptime SLA</p>
          </div>

          <div className="p-8 bg-slate-800/50 border border-teal-500/20 rounded-lg">
            <h3 className="text-teal-400 text-xl font-semibold mb-4">API First</h3>
            <p className="text-slate-300">GraphQL Federation with real-time subscriptions</p>
          </div>

          <div className="p-8 bg-slate-800/50 border border-teal-500/20 rounded-lg">
            <h3 className="text-teal-400 text-xl font-semibold mb-4">Developer Experience</h3>
            <p className="text-slate-300">World-class documentation and SDKs for every platform</p>
          </div>
        </div>

        <section className="text-center">
          <button className="px-8 py-4 bg-teal-500 text-white font-semibold rounded-lg hover:bg-teal-600 transition shadow-lg">
            Get Started →
          </button>
        </section>
      </main>

      <footer className="border-t border-teal-500/20 mt-32 px-8 py-8">
        <div className="max-w-7xl mx-auto text-center text-slate-400">
          <p>© 2025 Candlefish AI. Building systems that outlive their creators.</p>
        </div>
      </footer>
    </div>
  )
}
EOF

  # Create layout.tsx
  cat > app/layout.tsx << EOF
import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: '$site_title',
  description: 'Operational Craft for AI Applications',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  )
}
EOF

  # Deploy to Vercel
  echo "🚀 Deploying $site_name to Vercel..."
  vercel --prod --yes --token="$VERCEL_TOKEN" --name="$site_name"

  # Get deployment URL
  DEPLOYMENT_URL=$(vercel ls --token="$VERCEL_TOKEN" | grep "$site_name" | head -1 | awk '{print $2}')

  # Add custom domain
  if [ ! -z "$domain" ]; then
    echo "🌐 Adding domain $domain..."
    vercel domains add "$domain" "$site_name" --token="$VERCEL_TOKEN" || true
  fi

  echo "✅ $site_name deployed successfully!"
}

# Deploy all sites
echo "📦 Starting standalone deployment..."

# Documentation Site
create_standalone_app "docs-candlefish" "Candlefish Documentation" "docs.candlefish.ai"

# API Site
create_standalone_app "api-candlefish" "Candlefish API" "api.candlefish.ai"

# Partners Site
create_standalone_app "partners-candlefish" "Candlefish Partners" "partners.candlefish.ai"

echo ""
echo "✅ All sites deployed successfully!"
echo ""
echo "📊 Live Sites:"
echo "  1. Documentation: https://docs.candlefish.ai"
echo "  2. API Playground: https://api.candlefish.ai"
echo "  3. Partner Portal: https://partners.candlefish.ai"
echo ""
echo "🎉 The sites are now live with working versions!"
