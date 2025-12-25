# SDK Package

TypeScript SDK for integrating Noctura Wallet into applications.

## Features

- **Wallet Management**: Create and manage wallets
- **Transparent Transactions**: Build and send standard transactions
- **Shielded Transactions**: Create privacy-preserving transactions
- **Swaps**: Execute token swaps
- **Staking**: Participate in staking
- **Governance**: Vote on proposals
- **Compliance**: Generate audit tokens and view keys

## Installation

```bash
npm install @noctura/sdk
# or
pnpm add @noctura/sdk
```

## Quick Start

```typescript
import { NocturaSDK } from '@noctura/sdk';

const sdk = new NocturaSDK({
  rpcEndpoint: 'https://api.devnet.solana.com',
});

// Create wallet
const wallet = await sdk.wallet.create();

// Send transparent transaction
const txHash = await sdk.transactions.transparent.send({
  to: recipientAddress,
  amount: 1000000, // in lamports
});

// Send shielded transaction
const shieldedTx = await sdk.transactions.shielded.send({
  to: recipientAddress,
  amount: 1000000,
  token: 'SOL',
});
```

See [examples/](./examples) for more examples.

## API Documentation

See [../../docs/API_REFERENCE.md](../../docs/API_REFERENCE.md).
