/**
 * Noctura HD Wallet - Hierarchical Deterministic Wallet
 * 
 * This is the main wallet class that integrates:
 * - BIP39 mnemonic generation and recovery
 * - BIP44 hierarchical key derivation
 * - Secure encrypted storage
 * - Transparent and shielded account management
 * - Solana blockchain interaction
 */

import { Connection, Keypair, PublicKey, LAMPORTS_PER_SOL } from '@solana/web3.js';
import {
  generateMnemonic,
  validateMnemonic,
  deriveKeySet,
  deriveMultipleAccounts,
  MnemonicStrength,
  DerivedKeySet,
  secureWipe,
} from '../crypto/keyDerivation';
import {
  encryptMnemonic,
  decryptMnemonic,
  encryptWalletState,
  decryptWalletState,
  validatePinStrength,
  generateEncryptionKey,
  EncryptedData,
} from '../crypto/secureStorage';
import {
  WalletAccount,
  WalletConfig,
  AccountType,
  TokenBalance,
  NocturaError,
} from '../types';

/**
 * Wallet state that gets persisted (encrypted)
 */
export interface WalletState {
  version: number;
  createdAt: string;
  lastAccessedAt: string;
  accounts: SerializedAccount[];
  settings: WalletSettings;
}

/**
 * Serialized account for storage
 */
interface SerializedAccount {
  address: string;
  name: string;
  type: AccountType;
  derivationIndex: number;
  createdAt: string;
}

/**
 * Wallet settings
 */
export interface WalletSettings {
  network: 'devnet' | 'testnet' | 'mainnet';
  currency: string;
  autoLockMinutes: number;
  biometricsEnabled: boolean;
}

/**
 * Wallet creation options
 */
export interface CreateWalletOptions {
  name?: string;
  strength?: MnemonicStrength;
  passphrase?: string;
}

/**
 * Wallet recovery options
 */
export interface RecoverWalletOptions {
  mnemonic: string;
  passphrase?: string;
  name?: string;
}

/**
 * Noctura HD Wallet Class
 */
export class NocturaWallet {
  private connection: Connection;
  private config: WalletConfig;
  private keySet: DerivedKeySet | null = null;
  private mnemonic: string | null = null;
  private accounts: Map<string, WalletAccount> = new Map();
  private isUnlocked: boolean = false;
  private encryptionKey: Uint8Array | null = null;
  
  // Static version for state format
  private static readonly STATE_VERSION = 1;

  constructor(config: WalletConfig) {
    this.config = config;
    this.connection = new Connection(
      config.rpcEndpoint,
      config.commitment || 'confirmed'
    );
  }

  /**
   * Create a new wallet with a fresh mnemonic
   */
  static async create(
    pin: string,
    config: WalletConfig,
    options: CreateWalletOptions = {}
  ): Promise<{ wallet: NocturaWallet; mnemonic: string; encryptedMnemonic: EncryptedData }> {
    // Validate PIN strength
    const pinValidation = validatePinStrength(pin);
    if (!pinValidation.valid) {
      throw new NocturaError('WEAK_PIN', pinValidation.errors.join(', '));
    }

    // Generate mnemonic
    const mnemonic = generateMnemonic(options.strength || MnemonicStrength.WORDS_24);
    
    // Encrypt mnemonic with PIN
    const encryptedMnemonic = await encryptMnemonic(mnemonic, pin);
    
    // Create wallet instance
    const wallet = new NocturaWallet(config);
    
    // Unlock with the mnemonic
    await wallet.unlock(mnemonic, options.passphrase);
    
    // Create default transparent account
    await wallet.createAccount('Main Account', AccountType.TRANSPARENT, 0);
    
    return {
      wallet,
      mnemonic,
      encryptedMnemonic,
    };
  }

  /**
   * Recover wallet from mnemonic
   */
  static async recover(
    pin: string,
    config: WalletConfig,
    options: RecoverWalletOptions
  ): Promise<{ wallet: NocturaWallet; encryptedMnemonic: EncryptedData }> {
    // Validate mnemonic
    if (!validateMnemonic(options.mnemonic)) {
      throw new NocturaError('INVALID_MNEMONIC', 'The provided mnemonic phrase is invalid');
    }
    
    // Validate PIN
    const pinValidation = validatePinStrength(pin);
    if (!pinValidation.valid) {
      throw new NocturaError('WEAK_PIN', pinValidation.errors.join(', '));
    }
    
    // Encrypt mnemonic
    const encryptedMnemonic = await encryptMnemonic(options.mnemonic, pin);
    
    // Create and unlock wallet
    const wallet = new NocturaWallet(config);
    await wallet.unlock(options.mnemonic, options.passphrase);
    
    // Create default account
    await wallet.createAccount(options.name || 'Recovered Account', AccountType.TRANSPARENT, 0);
    
    return {
      wallet,
      encryptedMnemonic,
    };
  }

  /**
   * Load wallet from encrypted storage
   */
  static async load(
    pin: string,
    encryptedMnemonic: EncryptedData,
    config: WalletConfig,
    passphrase?: string
  ): Promise<NocturaWallet> {
    // Decrypt mnemonic
    const mnemonic = await decryptMnemonic(encryptedMnemonic, pin);
    
    // Create and unlock wallet
    const wallet = new NocturaWallet(config);
    await wallet.unlock(mnemonic, passphrase);
    
    return wallet;
  }

  /**
   * Unlock wallet with mnemonic (internal use)
   */
  private async unlock(mnemonic: string, passphrase?: string): Promise<void> {
    if (!validateMnemonic(mnemonic)) {
      throw new NocturaError('INVALID_MNEMONIC', 'Invalid mnemonic phrase');
    }
    
    this.mnemonic = mnemonic;
    this.keySet = deriveKeySet(mnemonic, passphrase || '', 0);
    this.encryptionKey = generateEncryptionKey();
    this.isUnlocked = true;
  }

  /**
   * Lock the wallet (clear sensitive data from memory)
   */
  lock(): void {
    if (this.mnemonic) {
      // Note: Can't truly wipe strings in JS, but we can dereference
      this.mnemonic = null;
    }
    
    if (this.keySet) {
      // Wipe shielded keys
      if (this.keySet.shielded.spendKey.privateKey) {
        secureWipe(this.keySet.shielded.spendKey.privateKey);
      }
      if (this.keySet.shielded.viewKey.privateKey) {
        secureWipe(this.keySet.shielded.viewKey.privateKey);
      }
      if (this.keySet.shielded.disclosureKey.privateKey) {
        secureWipe(this.keySet.shielded.disclosureKey.privateKey);
      }
      this.keySet = null;
    }
    
    if (this.encryptionKey) {
      secureWipe(this.encryptionKey);
      this.encryptionKey = null;
    }
    
    this.isUnlocked = false;
  }

  /**
   * Check if wallet is unlocked
   */
  isWalletUnlocked(): boolean {
    return this.isUnlocked;
  }

  /**
   * Get the primary transparent public key
   */
  getPublicKey(): string {
    this.ensureUnlocked();
    return this.keySet!.transparent.publicKey;
  }

  /**
   * Get the primary keypair (for signing)
   */
  getKeypair(): Keypair {
    this.ensureUnlocked();
    return this.keySet!.transparent.keypair;
  }

  /**
   * Get shielded spend public key
   */
  getShieldedSpendPublicKey(): Uint8Array {
    this.ensureUnlocked();
    return this.keySet!.shielded.spendKey.publicKey;
  }

  /**
   * Get shielded view public key
   */
  getShieldedViewPublicKey(): Uint8Array {
    this.ensureUnlocked();
    return this.keySet!.shielded.viewKey.publicKey;
  }

  /**
   * Create a new account
   */
  async createAccount(
    name: string,
    type: AccountType,
    derivationIndex: number = 0
  ): Promise<WalletAccount> {
    this.ensureUnlocked();
    
    // Derive keys for this account index
    const accountKeySet = deriveKeySet(this.mnemonic!, '', derivationIndex);
    
    const account: WalletAccount = {
      address: accountKeySet.transparent.publicKey,
      publicKey: accountKeySet.transparent.publicKey,
      type,
      name,
      balance: BigInt(0),
      lamports: 0,
      createdAt: new Date(),
      tokens: [],
    };
    
    this.accounts.set(account.address, account);
    
    // Fetch current balance
    await this.refreshAccountBalance(account.address);
    
    return account;
  }

  /**
   * Get all accounts
   */
  getAccounts(): WalletAccount[] {
    return Array.from(this.accounts.values());
  }

  /**
   * Get account by address
   */
  getAccount(address: string): WalletAccount | undefined {
    return this.accounts.get(address);
  }

  /**
   * Refresh account balance from blockchain
   */
  async refreshAccountBalance(address: string): Promise<void> {
    const account = this.accounts.get(address);
    if (!account) {
      throw new NocturaError('ACCOUNT_NOT_FOUND', `Account ${address} not found`);
    }
    
    try {
      const publicKey = new PublicKey(address);
      const balance = await this.connection.getBalance(publicKey);
      
      account.lamports = balance;
      account.balance = BigInt(balance);
    } catch (error) {
      console.error(`Failed to fetch balance for ${address}:`, error);
    }
  }

  /**
   * Refresh all account balances
   */
  async refreshAllBalances(): Promise<void> {
    const promises = Array.from(this.accounts.keys()).map(
      address => this.refreshAccountBalance(address)
    );
    await Promise.all(promises);
  }

  /**
   * Get SOL balance in SOL units (not lamports)
   */
  async getSolBalance(address?: string): Promise<number> {
    const addr = address || this.getPublicKey();
    const account = this.accounts.get(addr);
    
    if (account) {
      return account.lamports / LAMPORTS_PER_SOL;
    }
    
    // Fetch directly if not in accounts
    const publicKey = new PublicKey(addr);
    const balance = await this.connection.getBalance(publicKey);
    return balance / LAMPORTS_PER_SOL;
  }

  /**
   * Get connection instance
   */
  getConnection(): Connection {
    return this.connection;
  }

  /**
   * Get wallet configuration
   */
  getConfig(): WalletConfig {
    return this.config;
  }

  /**
   * Export wallet state (encrypted)
   */
  async exportState(): Promise<EncryptedData> {
    this.ensureUnlocked();
    
    const state: WalletState = {
      version: NocturaWallet.STATE_VERSION,
      createdAt: new Date().toISOString(),
      lastAccessedAt: new Date().toISOString(),
      accounts: Array.from(this.accounts.values()).map(acc => ({
        address: acc.address,
        name: acc.name,
        type: acc.type,
        derivationIndex: 0, // TODO: Track this
        createdAt: acc.createdAt.toISOString(),
      })),
      settings: {
        network: this.config.network || 'devnet',
        currency: 'USD',
        autoLockMinutes: 5,
        biometricsEnabled: false,
      },
    };
    
    return encryptWalletState(state, this.encryptionKey!);
  }

  /**
   * Import wallet state
   */
  async importState(encrypted: EncryptedData): Promise<void> {
    this.ensureUnlocked();
    
    const state = await decryptWalletState(encrypted, this.encryptionKey!) as WalletState;
    
    // Validate version
    if (state.version > NocturaWallet.STATE_VERSION) {
      throw new NocturaError('INCOMPATIBLE_STATE', 'State version is newer than supported');
    }
    
    // Import accounts
    for (const serialized of state.accounts) {
      await this.createAccount(
        serialized.name,
        serialized.type,
        serialized.derivationIndex
      );
    }
  }

  /**
   * Change PIN (requires current PIN for verification)
   */
  static async changePin(
    oldPin: string,
    newPin: string,
    encryptedMnemonic: EncryptedData
  ): Promise<EncryptedData> {
    // Validate new PIN
    const pinValidation = validatePinStrength(newPin);
    if (!pinValidation.valid) {
      throw new NocturaError('WEAK_PIN', pinValidation.errors.join(', '));
    }
    
    // Decrypt with old PIN
    const mnemonic = await decryptMnemonic(encryptedMnemonic, oldPin);
    
    // Re-encrypt with new PIN
    return encryptMnemonic(mnemonic, newPin);
  }

  /**
   * Validate address format
   */
  static isValidAddress(address: string): boolean {
    try {
      new PublicKey(address);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Ensure wallet is unlocked before operations
   */
  private ensureUnlocked(): void {
    if (!this.isUnlocked || !this.keySet) {
      throw new NocturaError('WALLET_LOCKED', 'Wallet is locked. Please unlock first.');
    }
  }
}

/**
 * Quick helper to create a wallet for testing
 */
export async function createTestWallet(
  rpcUrl: string = 'https://api.devnet.solana.com'
): Promise<{ wallet: NocturaWallet; mnemonic: string }> {
  const config: WalletConfig = {
    rpcEndpoint: rpcUrl,
    network: 'devnet',
    commitment: 'confirmed',
  };
  
  const { wallet, mnemonic } = await NocturaWallet.create(
    'test_pin_secure_123',
    config,
    { strength: MnemonicStrength.WORDS_12 }
  );
  
  return { wallet, mnemonic };
}
