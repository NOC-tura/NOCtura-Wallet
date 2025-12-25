# Architecture

Noctura Wallet architecture documentation.

## System Overview

```
┌─────────────────────────────────────────────────────────┐
│                    Frontend Applications                 │
│  (Browser Extension, Mobile, Desktop, Web DApp)         │
└──────────────┬──────────────────────────────────────────┘
               │
┌──────────────▼──────────────────────────────────────────┐
│                     SDK Layer (@noctura/sdk)            │
│        (Wallet, Transactions, Compliance, etc)          │
└──────────────┬──────────────────────────────────────────┘
               │
┌──────────────▼──────────────────────────────────────────┐
│                   Core Packages                          │
│  (Core, ZK-Proofs, Mixing, Compliance, Contracts)       │
└──────────────┬──────────────────────────────────────────┘
               │
┌──────────────▼──────────────────────────────────────────┐
│                  Backend Services                        │
│  (API, Prover, Relayer, Indexer, Oracle, etc)          │
└──────────────┬──────────────────────────────────────────┘
               │
┌──────────────▼──────────────────────────────────────────┐
│                Solana Blockchain                         │
│        (Smart Programs & On-Chain State)                │
└─────────────────────────────────────────────────────────┘
```

## Component Details

### Frontend Layer
- Browser Extension: Chrome/Firefox/Edge
- Mobile: iOS and Android (React Native)
- Desktop: Cross-platform (Tauri)
- Web DApp: Next.js web interface

### SDK Layer
Single TypeScript SDK providing:
- Wallet management
- Transaction building
- Compliance tools
- Staking interface
- Governance participation

### Core Packages
- **@noctura/core**: Wallet, transactions, crypto
- **@noctura/zk-proofs**: SNARK/STARK proof systems
- **@noctura/mixing**: Relayer network and mixing
- **@noctura/compliance**: Audit and regulatory tools
- **@noctura/contracts**: Solana smart programs

### Backend Services
- **API Server**: REST API for all operations
- **Prover Service**: Generate ZK-proofs
- **Relayer Service**: Mix transactions
- **Indexer**: Track on-chain state
- **Price Oracle**: Token price feeds
- **Notification Service**: User notifications

## Transaction Flow

### Transparent Transaction
1. User initiates transfer via frontend
2. SDK builds transaction
3. User signs with wallet
4. Transaction sent to blockchain
5. Blockchain processes and updates state

### Shielded Transaction
1. User initiates shielded transfer
2. SDK builds transaction structure
3. Prover generates ZK-proof
4. Relayer mixes with other transactions
5. Batched transaction sent to blockchain
6. Blockchain verifies proof and updates state

## Security Considerations

- Hardware wallet support
- Biometric authentication
- Encrypted key storage
- Regular security audits
- Isolated proof generation
- Rate limiting and DOS protection

See [../../docs/SECURITY.md](../../docs/SECURITY.md) for details.
