/**
 * Basic Transfer Example
 * Demonstrates how to perform a simple SOL transfer
 */

import { NocturaSDK } from '@noctura/sdk';
import { Keypair, PublicKey } from '@solana/web3.js';

async function basicTransfer() {
  // Initialize SDK
  const sdk = new NocturaSDK({
    rpcEndpoint: 'https://api.devnet.solana.com',
    network: 'devnet',
  });

  console.log('Noctura Wallet - Basic Transfer Example');
  console.log('======================================\n');

  // Get wallet info
  const walletAddress = sdk.wallet.getPublicKey();
  console.log(`Wallet Address: ${walletAddress}`);

  // Validate recipient address (in real usage, user would input this)
  const recipientAddress = 'So11111111111111111111111111111111111111112'; // wSOL token example
  const isValid = sdk.wallet.validateAddress(recipientAddress);

  if (!isValid) {
    console.error('Invalid recipient address');
    return;
  }

  console.log(`Recipient: ${recipientAddress}`);
  console.log('Amount: 1000000 lamports (0.001 SOL)');

  // In a real application:
  // 1. Build transaction using TransparentTxBuilder
  // 2. Sign with user's keypair
  // 3. Send via RPC
  // 4. Monitor confirmation

  console.log('\n✅ Example setup complete');
  console.log('   To execute: Implement transaction building and signing');
}

// Run example
basicTransfer().catch(console.error);
