# Mixing Package

Relayer network and transaction mixing protocol.

## Features

- **Relayer Nodes**: Run relayer infrastructure
- **Mixing Engine**: Mix and shuffle transactions
- **Transaction Batching**: Batch transactions for efficiency
- **Anonymity Sets**: Manage anonymity pools
- **Reward Distribution**: Distribute rewards to relayers
- **P2P Network**: Peer-to-peer communication

## Architecture

- Decentralized relayer network
- Voluntary participation
- Stake-based rewards
- Reputation system

## Structure

```
src/
├── relayer/    # Relayer node implementation
├── mixing/     # Mixing engine
├── pool/       # Shielded pool management
└── network/    # P2P networking
```

See [../../docs/MIXING_PROTOCOL.md](../../docs/MIXING_PROTOCOL.md) for details.
