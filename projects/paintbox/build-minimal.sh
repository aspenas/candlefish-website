#!/bin/bash

echo "🚀 Minimal build for deployment"

# Backup package.json
cp package.json package.json.backup

# Create minimal package.json with only essential deps
cat > package.json << 'EOF'
{
  "name": "paintbox-app",
  "version": "0.1.0",
  "private": true,
  "scripts": {
    "dev": "next dev",
    "build": "next build",
    "start": "next start",
    "lint": "next lint"
  },
  "dependencies": {
    "@heroicons/react": "^2.1.5",
    "@radix-ui/react-dialog": "^1.1.14",
    "@radix-ui/react-popover": "^1.1.14",
    "@radix-ui/react-select": "^2.2.5",
    "@radix-ui/react-switch": "^1.2.5",
    "@radix-ui/react-tooltip": "^1.2.7",
    "class-variance-authority": "^0.7.1",
    "clsx": "^2.1.1",
    "date-fns": "^3.6.0",
    "decimal.js": "^10.6.0",
    "lucide-react": "^0.534.0",
    "next": "15.4.5",
    "react": "19.1.0",
    "react-dom": "19.1.0",
    "tailwind-merge": "^3.3.1",
    "typescript": "^5.8.3",
    "zustand": "^5.0.7"
  },
  "devDependencies": {
    "@tailwindcss/postcss": "^4.1.11",
    "@types/node": "^20.19.9",
    "@types/react": "^19",
    "@types/react-dom": "^19",
    "autoprefixer": "^10.4.21",
    "eslint": "^9",
    "eslint-config-next": "15.4.5",
    "tailwindcss": "^4"
  }
}
EOF

# Install minimal deps
echo "Installing minimal dependencies..."
rm -rf node_modules package-lock.json
npm install

# Build
echo "Building..."
NODE_OPTIONS="--max-old-space-size=4096" npm run build

# Restore original package.json
mv package.json.backup package.json

echo "✅ Build complete!"
