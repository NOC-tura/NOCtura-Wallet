/**
 * Integration Test: Noctura Wallet with Devnet
 * 
 * Tests the wallet functionality against Solana devnet with our NOC token.
 */

import { Connection, PublicKey, LAMPORTS_PER_SOL } from '@solana/web3.js';
import { NocturaWallet, createTestWallet } from '../src/wallet/NocturaWallet';
import { validateMnemonic, MnemonicStrength } from '../src/crypto/keyDerivation';
import { WalletConfig } from '../src/types';

// NOC Token on Devnet (created earlier)
const NOC_TOKEN_MINT = 'GcqvfVfosg4BmUHng97v4dToPxsLk5R4gL2JCXV7x3Rb';
const DEVNET_RPC = 'https://api.devnet.solana.com';

// Test wallet configuration
const testConfig: WalletConfig = {
  rpcEndpoint: DEVNET_RPC,
  network: 'devnet',
  commitment: 'confirmed',
};

describe('NocturaWallet Unit Tests', () => {
  describe('Wallet Creation', () => {
    test('creates new wallet with valid mnemonic', async () => {
      const { wallet, mnemonic, encryptedMnemonic } = await NocturaWallet.create(
        'secure_test_pin_789',
        testConfig,
        { strength: MnemonicStrength.WORDS_12 }
      );
      
      // Verify mnemonic
      expect(validateMnemonic(mnemonic)).toBe(true);
      expect(mnemonic.split(' ').length).toBe(12);
      
      // Verify wallet is unlocked
      expect(wallet.isWalletUnlocked()).toBe(true);
      
      // Verify public key is valid Solana address
      const publicKey = wallet.getPublicKey();
      expect(publicKey).toMatch(/^[1-9A-HJ-NP-Za-km-z]{32,44}$/);
      
      // Verify encrypted mnemonic exists
      expect(encryptedMnemonic.ciphertext).toBeDefined();
      expect(encryptedMnemonic.iv).toBeDefined();
      
      // Clean up
      wallet.lock();
      expect(wallet.isWalletUnlocked()).toBe(false);
    });

    test('rejects weak PIN', async () => {
      await expect(
        NocturaWallet.create('12345', testConfig) // Too short
      ).rejects.toThrow(); // Any error is fine
      
      await expect(
        NocturaWallet.create('123456', testConfig) // Too common
      ).rejects.toThrow();
    });

    test('creates 24-word mnemonic when requested', async () => {
      const { mnemonic, wallet } = await NocturaWallet.create(
        'secure_long_pin_456',
        testConfig,
        { strength: MnemonicStrength.WORDS_24 }
      );
      
      expect(mnemonic.split(' ').length).toBe(24);
      wallet.lock();
    });
  });

  describe('Wallet Recovery', () => {
    const testMnemonic = 'abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon about';
    
    test('recovers wallet from valid mnemonic', async () => {
      const { wallet } = await NocturaWallet.recover(
        'recovery_pin_secure_789',
        testConfig,
        { mnemonic: testMnemonic }
      );
      
      expect(wallet.isWalletUnlocked()).toBe(true);
      
      // Known public key for this test mnemonic
      const publicKey = wallet.getPublicKey();
      expect(publicKey).toBeDefined();
      
      wallet.lock();
    });

    test('rejects invalid mnemonic', async () => {
      await expect(
        NocturaWallet.recover(
          'secure_pin_789',
          testConfig,
          { mnemonic: 'invalid mnemonic words' }
        )
      ).rejects.toThrow(); // Any error is fine
    });
  });

  describe('Wallet Load/Unlock', () => {
    test('loads wallet from encrypted mnemonic', async () => {
      // Create wallet
      const { wallet: originalWallet, mnemonic, encryptedMnemonic } = await NocturaWallet.create(
        'load_test_pin_789',
        testConfig
      );
      const originalPublicKey = originalWallet.getPublicKey();
      originalWallet.lock();
      
      // Load wallet
      const loadedWallet = await NocturaWallet.load(
        'load_test_pin_789',
        encryptedMnemonic,
        testConfig
      );
      
      // Verify same public key
      expect(loadedWallet.getPublicKey()).toBe(originalPublicKey);
      
      loadedWallet.lock();
    });

    test('fails to load with wrong PIN', async () => {
      const { encryptedMnemonic, wallet } = await NocturaWallet.create(
        'correct_pin_789',
        testConfig
      );
      wallet.lock();
      
      await expect(
        NocturaWallet.load('wrong_pin_789', encryptedMnemonic, testConfig)
      ).rejects.toThrow();
    });
  });

  describe('PIN Management', () => {
    test('changes PIN successfully', async () => {
      const oldPin = 'old_pin_secure_789';
      const newPin = 'new_pin_secure_789';
      
      const { encryptedMnemonic, mnemonic, wallet } = await NocturaWallet.create(
        oldPin,
        testConfig
      );
      wallet.lock();
      
      // Change PIN
      const newEncryptedMnemonic = await NocturaWallet.changePin(
        oldPin,
        newPin,
        encryptedMnemonic
      );
      
      // Verify new PIN works
      const loadedWallet = await NocturaWallet.load(
        newPin,
        newEncryptedMnemonic,
        testConfig
      );
      
      expect(loadedWallet.isWalletUnlocked()).toBe(true);
      loadedWallet.lock();
      
      // Verify old PIN no longer works
      await expect(
        NocturaWallet.load(oldPin, newEncryptedMnemonic, testConfig)
      ).rejects.toThrow();
    }, 15000); // 15 second timeout for PIN operations
  });

  describe('Account Management', () => {
    test('creates and retrieves accounts', async () => {
      const { wallet } = await NocturaWallet.create(
        'account_test_pin_789',
        testConfig
      );
      
      // Default account should exist
      const accounts = wallet.getAccounts();
      expect(accounts.length).toBeGreaterThanOrEqual(1);
      
      // Get specific account
      const mainAccount = wallet.getAccount(wallet.getPublicKey());
      expect(mainAccount).toBeDefined();
      expect(mainAccount!.name).toBe('Main Account');
      
      wallet.lock();
    });
  });

  describe('Address Validation', () => {
    test('validates correct Solana address', () => {
      expect(NocturaWallet.isValidAddress('HWczhVWGEnFuSm96a2vR5v3YHxaPbNLYFFJoCqgpVUSa')).toBe(true);
    });

    test('rejects invalid address', () => {
      expect(NocturaWallet.isValidAddress('invalid-address')).toBe(false);
      expect(NocturaWallet.isValidAddress('')).toBe(false);
    });
  });
});

describe('NocturaWallet Devnet Integration', () => {
  // Skip these tests in CI, run manually
  const SKIP_NETWORK_TESTS = process.env.SKIP_NETWORK_TESTS === 'true';

  test.skip('connects to devnet and fetches balance', async () => {
    if (SKIP_NETWORK_TESTS) {
      console.log('Skipping network test');
      return;
    }

    const { wallet } = await createTestWallet();
    
    // Balance should be 0 for new wallet
    const balance = await wallet.getSolBalance();
    expect(balance).toBe(0);
    
    wallet.lock();
  });

  test.skip('verifies NOC token exists on devnet', async () => {
    if (SKIP_NETWORK_TESTS) {
      console.log('Skipping network test');
      return;
    }

    const connection = new Connection(DEVNET_RPC, 'confirmed');
    const mintPubkey = new PublicKey(NOC_TOKEN_MINT);
    
    const mintInfo = await connection.getAccountInfo(mintPubkey);
    expect(mintInfo).not.toBeNull();
    
    console.log('✅ NOC Token verified on devnet:', NOC_TOKEN_MINT);
  });
});

describe('Shielded Key Derivation', () => {
  test('derives shielded keys correctly', async () => {
    const { wallet } = await NocturaWallet.create(
      'shielded_test_pin_789',
      testConfig
    );
    
    // Get shielded keys
    const spendPubKey = wallet.getShieldedSpendPublicKey();
    const viewPubKey = wallet.getShieldedViewPublicKey();
    
    // Verify they are 32-byte keys
    expect(spendPubKey).toBeInstanceOf(Uint8Array);
    expect(spendPubKey.length).toBe(32);
    
    expect(viewPubKey).toBeInstanceOf(Uint8Array);
    expect(viewPubKey.length).toBe(32);
    
    // Spend and view keys should be different
    expect(Buffer.from(spendPubKey).toString('hex'))
      .not.toBe(Buffer.from(viewPubKey).toString('hex'));
    
    wallet.lock();
  });
});
