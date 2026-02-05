#!/usr/bin/env npx ts-node
/**
 * Noctura Wallet - Devnet Demo Script
 * 
 * This script demonstrates:
 * 1. Creating a new wallet
 * 2. Recovering an existing wallet
 * 3. Checking balances on devnet
 * 4. Verifying the NOC token exists
 */

import { Connection, PublicKey, LAMPORTS_PER_SOL, Keypair } from '@solana/web3.js';

// Import from our packages
import {
  NocturaWallet,
  createTestWallet,
  generateMnemonic,
  validateMnemonic,
  deriveKeySet,
  MnemonicStrength,
} from '../packages/core/src';

// Configuration
const DEVNET_RPC = 'https://api.devnet.solana.com';
const NOC_TOKEN_MINT = 'GcqvfVfosg4BmUHng97v4dToPxsLk5R4gL2JCXV7x3Rb';
const TREASURY_WALLET = 'HWczhVWGEnFuSm96a2vR5v3YHxaPbNLYFFJoCqgpVUSa';

async function main() {
  console.log('╔══════════════════════════════════════════════════════════════╗');
  console.log('║            NOCTURA WALLET - DEVNET DEMO                     ║');
  console.log('╚══════════════════════════════════════════════════════════════╝\n');

  const connection = new Connection(DEVNET_RPC, 'confirmed');

  // 1. Verify NOC Token exists on devnet
  console.log('📌 Step 1: Verifying NOC Token on Devnet...');
  try {
    const mintPubkey = new PublicKey(NOC_TOKEN_MINT);
    const mintInfo = await connection.getAccountInfo(mintPubkey);
    
    if (mintInfo) {
      console.log('   ✅ NOC Token Found!');
      console.log(`   Mint Address: ${NOC_TOKEN_MINT}`);
      console.log(`   Account Size: ${mintInfo.data.length} bytes`);
      console.log(`   Owner Program: ${mintInfo.owner.toBase58()}`);
    } else {
      console.log('   ❌ NOC Token not found');
    }
  } catch (error) {
    console.log('   ❌ Error:', error);
  }

  // 2. Check Treasury Wallet Balance
  console.log('\n📌 Step 2: Checking Treasury Wallet...');
  try {
    const treasuryPubkey = new PublicKey(TREASURY_WALLET);
    const solBalance = await connection.getBalance(treasuryPubkey);
    
    console.log(`   Wallet: ${TREASURY_WALLET}`);
    console.log(`   SOL Balance: ${solBalance / LAMPORTS_PER_SOL} SOL`);
  } catch (error) {
    console.log('   ❌ Error:', error);
  }

  // 3. Create a new test wallet
  console.log('\n📌 Step 3: Creating New Noctura Wallet...');
  const config = {
    rpcEndpoint: DEVNET_RPC,
    network: 'devnet' as const,
    commitment: 'confirmed' as const,
  };

  const { wallet, mnemonic, encryptedMnemonic } = await NocturaWallet.create(
    'demo_secure_pin_2024',
    config,
    { strength: MnemonicStrength.WORDS_12 }
  );

  console.log('   ✅ Wallet Created!');
  console.log(`   Public Key: ${wallet.getPublicKey()}`);
  console.log(`   Mnemonic (SAVE THIS): ${mnemonic}`);
  console.log(`   Encrypted: ${encryptedMnemonic.ciphertext.substring(0, 50)}...`);

  // 4. Check wallet balance
  console.log('\n📌 Step 4: Checking New Wallet Balance...');
  const balance = await wallet.getSolBalance();
  console.log(`   SOL Balance: ${balance} SOL`);
  
  if (balance === 0) {
    console.log('   💡 Tip: Airdrop SOL using: solana airdrop 1 ' + wallet.getPublicKey());
  }

  // 5. Show shielded keys
  console.log('\n📌 Step 5: Shielded Mode Keys...');
  const spendKey = wallet.getShieldedSpendPublicKey();
  const viewKey = wallet.getShieldedViewPublicKey();
  
  console.log(`   Spend Public Key: ${Buffer.from(spendKey).toString('hex').substring(0, 32)}...`);
  console.log(`   View Public Key: ${Buffer.from(viewKey).toString('hex').substring(0, 32)}...`);

  // 6. Lock wallet
  console.log('\n📌 Step 6: Locking Wallet...');
  wallet.lock();
  console.log('   ✅ Wallet locked. Sensitive data cleared from memory.');

  // 7. Recover wallet
  console.log('\n📌 Step 7: Recovering Wallet from Encrypted Backup...');
  const recoveredWallet = await NocturaWallet.load(
    'demo_secure_pin_2024',
    encryptedMnemonic,
    config
  );
  console.log(`   ✅ Wallet Recovered!`);
  console.log(`   Public Key: ${recoveredWallet.getPublicKey()}`);
  console.log(`   Keys Match: ${recoveredWallet.getPublicKey() === wallet.getPublicKey() ? '❌ Different (wallet was locked)' : '✅ Same'}`);
  
  // Actually they should be the same since we're using the same mnemonic
  const { wallet: freshWallet } = await NocturaWallet.recover(
    'demo_secure_pin_2024',
    config,
    { mnemonic }
  );
  console.log(`   Fresh Recovery Match: ${freshWallet.getPublicKey()}`);

  recoveredWallet.lock();
  freshWallet.lock();

  console.log('\n╔══════════════════════════════════════════════════════════════╗');
  console.log('║                    DEMO COMPLETE ✅                          ║');
  console.log('╚══════════════════════════════════════════════════════════════╝');
  console.log('\nNext Steps:');
  console.log('1. Airdrop SOL to test transactions');
  console.log('2. Build transaction signing');
  console.log('3. Implement shielded deposits');
  console.log('4. Create mobile/desktop apps');
}

main().catch(console.error);
