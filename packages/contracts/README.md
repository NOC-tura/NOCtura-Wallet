# Contracts Package

Solana smart programs for Noctura Wallet.

## Programs

### Privacy Layer
Main protocol program for shielded transactions and state management.

### Token Vault
SPL token vault for shielded token swaps.

### Staking
Relayer staking and reward distribution.

### Governance
DAO governance for protocol decisions.

## Building Contracts

```bash
# Build all programs
anchor build

# Build specific program
anchor build -p privacy-layer

# Deploy to devnet
anchor deploy --provider.cluster devnet
```

## Testing

```bash
anchor test
```

See [../../docs/ARCHITECTURE.md](../../docs/ARCHITECTURE.md) for smart contract design.
