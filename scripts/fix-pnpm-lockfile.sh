#!/bin/bash
# Emergency fix script for pnpm lockfile version mismatch

echo "🚨 Emergency Fix: Regenerating lockfile with pnpm 8.15.6"

# Install correct pnpm version
npm install -g pnpm@8.15.6

# Remove existing lockfile
rm -f pnpm-lock.yaml

# Regenerate lockfile with correct version
pnpm install

# Verify lockfile version
echo "Verifying lockfile version:"
head -1 pnpm-lock.yaml

echo "✅ Lockfile regenerated. Ready to commit."