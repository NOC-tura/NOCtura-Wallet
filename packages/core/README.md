# Noctura Core Package

Core wallet and transaction functionality for Noctura Wallet.

## Features

- **Wallet Management**: Create and manage wallet accounts
- **Key Derivation**: Hierarchical deterministic key generation
- **Transparent Transactions**: Standard Solana transaction building and signing
- **Shielded Transactions**: Privacy-preserving transaction creation with ZK-proofs
- **Token Management**: Token registry and balance tracking
- **Swap Functionality**: DEX integration for both transparent and shielded modes
- **Cross-Mode Transfers**: Seamless movement between transparent and shielded accounts

## Structure

```
src/
├── wallet/           # Wallet management
├── crypto/           # Cryptographic operations
├── transactions/     # Transaction building and signing
├── tokens/           # Token registry and management
├── swap/             # Swap engines
├── storage/          # Encrypted storage
├── network/          # Network connectivity
└── utils/            # Utilities
```

## Getting Started

See [../../docs/DEVELOPER_GUIDE.md](../../docs/DEVELOPER_GUIDE.md) for setup instructions.
