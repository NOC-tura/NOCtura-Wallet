/**
 * Shielded Transfer Example
 * Demonstrates privacy-preserving transactions
 */

import { NocturaSDK, WalletMode } from '@noctura/sdk';

async function shieldedTransfer() {
  // Initialize SDK
  const sdk = new NocturaSDK({
    rpcEndpoint: 'https://api.devnet.solana.com',
    network: 'devnet',
  });

  console.log('Noctura Wallet - Shielded Transfer Example');
  console.log('==========================================\n');

  const walletAddress = sdk.wallet.getPublicKey();
  console.log(`Wallet Address: ${walletAddress}`);
  console.log(`Mode: ${WalletMode.SHIELDED}`);

  // Shielded transfer process:
  // 1. Build transaction with commitment
  // 2. Generate zero-knowledge proof
  // 3. Relay through mixing network
  // 4. Submit to blockchain
  // 5. Verify proof on-chain

  const recipient = 'So11111111111111111111111111111111111111112';
  const amount = 1000000; // 0.001 SOL

  console.log(`\nShielded Transfer Details:`);
  console.log(`  Recipient: ${recipient}`);
  console.log(`  Amount: ${amount} lamports`);
  console.log(`  Privacy: ✓ Transaction details hidden`);
  console.log(`  Status: Proof generation required`);

  console.log('\n✅ Example setup complete');
  console.log('   To execute: Implement proof generation and relayer submission');
}

// Run example
shieldedTransfer().catch(console.error);
