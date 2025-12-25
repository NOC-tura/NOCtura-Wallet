#!/bin/bash
set -e

echo "🔍 Running linting for all packages..."

pnpm run lint

echo ""
echo "✅ Linting complete!"
