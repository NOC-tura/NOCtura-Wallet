#!/bin/bash
set -e

echo "✨ Formatting all packages..."

pnpm run format

echo ""
echo "✅ Formatting complete!"
