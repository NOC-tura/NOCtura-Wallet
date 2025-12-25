#!/bin/bash
set -e

echo "🚀 Setting up Noctura Wallet development environment..."

# Check prerequisites
echo "📋 Checking prerequisites..."

if ! command -v node &> /dev/null; then
  echo "❌ Node.js is not installed. Please install Node.js >= 18.0.0"
  exit 1
fi

if ! command -v pnpm &> /dev/null; then
  echo "📦 Installing pnpm..."
  npm install -g pnpm
fi

echo "✅ Node.js version: $(node --version)"
echo "✅ pnpm version: $(pnpm --version)"

# Install dependencies
echo ""
echo "📦 Installing dependencies..."
pnpm install

# Build packages
echo ""
echo "🏗️  Building packages..."
pnpm run build

# Optional: Setup git hooks
if [ -d .git ]; then
  echo ""
  echo "🔗 Setting up git hooks..."
  pnpm run prepare
fi

echo ""
echo "✅ Setup complete!"
echo ""
echo "📚 Next steps:"
echo "   1. Start development: pnpm run dev"
echo "   2. Run tests: pnpm run test"
echo "   3. Check formatting: pnpm run format"
echo ""
