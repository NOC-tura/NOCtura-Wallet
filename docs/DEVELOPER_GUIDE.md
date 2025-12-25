# Developer Guide

Getting started with Noctura Wallet development.

## Prerequisites

- Node.js >= 18.0.0
- pnpm >= 8.0.0
- Rust (for smart contracts)
- Git
- Solana CLI (optional, for contract deployment)

## Initial Setup

```bash
# Clone repository
git clone https://github.com/NOC-tura/NOCtura-Wallet.git
cd noctura-wallet

# Install pnpm (if not installed)
npm install -g pnpm

# Install dependencies
pnpm install

# Build all packages
pnpm run build
```

## Development Workflow

### Starting Development

```bash
# Watch mode for all packages
pnpm run dev

# Run specific package
pnpm --filter @noctura/core run dev
```

### Testing

```bash
# Run all tests
pnpm run test

# Unit tests only
pnpm run test:unit

# Integration tests
pnpm run test:integration

# Watch mode
pnpm run test -- --watch
```

### Linting and Formatting

```bash
# Check for issues
pnpm run lint

# Fix formatting
pnpm run format

# Type checking
pnpm run type-check
```

## Project Structure

```
packages/      # Core libraries
apps/          # Frontend applications
backend/       # Backend services
docs/          # Documentation
tools/         # CLI and utilities
```

## Making Changes

1. Create a feature branch: `git checkout -b feature/name`
2. Make your changes
3. Run tests: `pnpm run test`
4. Run linting: `pnpm run lint`
5. Commit: `git commit -m "Description"`
6. Push: `git push origin feature/name`
7. Create Pull Request

## Environment Setup

For frontend development:

```bash
cp .env.example .env.local
# Edit .env.local with your configuration
```

## Building for Production

```bash
pnpm run build

# Build specific package
pnpm --filter @noctura/sdk run build
```

## Deployment

See deployment guides in `infrastructure/` for Docker, Kubernetes, and Terraform configurations.

## Troubleshooting

### Clear cache
```bash
pnpm run clean
pnpm install
```

### Rebuild
```bash
pnpm run build --force
```

See documentation in `docs/` for more details.
