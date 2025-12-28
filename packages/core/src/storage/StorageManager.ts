/**
 * Storage Manager - Encrypted storage for sensitive wallet data
 */

import { NocturaError } from '../types';

export interface StorageOptions {
  namespace?: string;
  encrypt?: boolean;
}

export interface WalletData {
  address: string;
  encryptedSeed?: string;
  accounts: AccountData[];
  settings: WalletSettings;
  lastBackup?: Date;
}

export interface AccountData {
  address: string;
  name: string;
  type: string;
  index: number;
  hidden?: boolean;
}

export interface WalletSettings {
  autoLock: boolean;
  autoLockTime: number;
  biometricEnabled: boolean;
  currency: string;
  language: string;
  theme: 'light' | 'dark' | 'system';
  network: 'devnet' | 'testnet' | 'mainnet-beta';
}

/**
 * Storage Manager for wallet data persistence
 * Note: Browser/platform-specific implementations will extend this base class
 */
export abstract class StorageManager {
  protected namespace: string;
  protected encrypt: boolean;

  constructor(options: StorageOptions = {}) {
    this.namespace = options.namespace || 'noctura_wallet';
    this.encrypt = options.encrypt !== false;
  }

  /**
   * Store data securely
   */
  abstract setItem(key: string, value: string): Promise<void>;

  /**
   * Retrieve stored data
   */
  abstract getItem(key: string): Promise<string | null>;

  /**
   * Remove stored data
   */
  abstract removeItem(key: string): Promise<void>;

  /**
   * Clear all stored data
   */
  abstract clear(): Promise<void>;

  /**
   * Check if key exists
   */
  abstract hasItem(key: string): Promise<boolean>;

  /**
   * Get all keys in storage
   */
  abstract getAllKeys(): Promise<string[]>;

  /**
   * Save wallet data
   */
  public async saveWalletData(walletData: WalletData): Promise<void> {
    const data = this.encrypt
      ? await this.encryptData(JSON.stringify(walletData))
      : JSON.stringify(walletData);
    
    await this.setItem('wallet_data', data);
  }

  /**
   * Load wallet data
   */
  public async loadWalletData(): Promise<WalletData | null> {
    const data = await this.getItem('wallet_data');
    if (!data) return null;

    const decrypted = this.encrypt
      ? await this.decryptData(data)
      : data;

    return JSON.parse(decrypted);
  }

  /**
   * Save wallet settings
   */
  public async saveSettings(settings: WalletSettings): Promise<void> {
    await this.setItem('settings', JSON.stringify(settings));
  }

  /**
   * Load wallet settings
   */
  public async loadSettings(): Promise<WalletSettings | null> {
    const data = await this.getItem('settings');
    return data ? JSON.parse(data) : null;
  }

  /**
   * Save encrypted seed phrase
   */
  public async saveSeedPhrase(seedPhrase: string, password: string): Promise<void> {
    const encrypted = await this.encryptWithPassword(seedPhrase, password);
    await this.setItem('encrypted_seed', encrypted);
  }

  /**
   * Load and decrypt seed phrase
   */
  public async loadSeedPhrase(password: string): Promise<string | null> {
    const encrypted = await this.getItem('encrypted_seed');
    if (!encrypted) return null;

    try {
      return await this.decryptWithPassword(encrypted, password);
    } catch (error) {
      throw new NocturaError('DECRYPTION_FAILED', 'Invalid password or corrupted data');
    }
  }

  /**
   * Check if wallet exists
   */
  public async hasWallet(): Promise<boolean> {
    return await this.hasItem('wallet_data');
  }

  /**
   * Delete wallet (requires confirmation)
   */
  public async deleteWallet(): Promise<void> {
    await this.removeItem('wallet_data');
    await this.removeItem('encrypted_seed');
    await this.removeItem('settings');
  }

  /**
   * Encrypt data with storage key
   */
  protected async encryptData(data: string): Promise<string> {
    // Placeholder: Implement actual encryption
    // In production, use Web Crypto API or platform-specific encryption
    return Buffer.from(data).toString('base64');
  }

  /**
   * Decrypt data with storage key
   */
  protected async decryptData(encrypted: string): Promise<string> {
    // Placeholder: Implement actual decryption
    return Buffer.from(encrypted, 'base64').toString('utf-8');
  }

  /**
   * Encrypt data with user password
   */
  protected async encryptWithPassword(data: string, password: string): Promise<string> {
    // Placeholder: Implement password-based encryption
    // In production, use PBKDF2 + AES-GCM
    const key = Buffer.from(password).toString('base64');
    const encrypted = Buffer.from(data).toString('base64');
    return `${key}:${encrypted}`;
  }

  /**
   * Decrypt data with user password
   */
  protected async decryptWithPassword(encrypted: string, password: string): Promise<string> {
    // Placeholder: Implement password-based decryption
    const [_, data] = encrypted.split(':');
    return Buffer.from(data, 'base64').toString('utf-8');
  }

  /**
   * Create namespace-prefixed key
   */
  protected getKey(key: string): string {
    return `${this.namespace}:${key}`;
  }
}

/**
 * Browser Storage Implementation (LocalStorage/IndexedDB)
 */
export class BrowserStorageManager extends StorageManager {
  public async setItem(key: string, value: string): Promise<void> {
    if (typeof window === 'undefined') {
      throw new NocturaError('STORAGE_ERROR', 'Window not available');
    }
    localStorage.setItem(this.getKey(key), value);
  }

  public async getItem(key: string): Promise<string | null> {
    if (typeof window === 'undefined') {
      throw new NocturaError('STORAGE_ERROR', 'Window not available');
    }
    return localStorage.getItem(this.getKey(key));
  }

  public async removeItem(key: string): Promise<void> {
    if (typeof window === 'undefined') {
      throw new NocturaError('STORAGE_ERROR', 'Window not available');
    }
    localStorage.removeItem(this.getKey(key));
  }

  public async clear(): Promise<void> {
    if (typeof window === 'undefined') {
      throw new NocturaError('STORAGE_ERROR', 'Window not available');
    }
    const keys = await this.getAllKeys();
    keys.forEach((key) => localStorage.removeItem(key));
  }

  public async hasItem(key: string): Promise<boolean> {
    return (await this.getItem(key)) !== null;
  }

  public async getAllKeys(): Promise<string[]> {
    if (typeof window === 'undefined') {
      throw new NocturaError('STORAGE_ERROR', 'Window not available');
    }
    const keys: string[] = [];
    const prefix = `${this.namespace}:`;
    
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.startsWith(prefix)) {
        keys.push(key);
      }
    }
    return keys;
  }
}

/**
 * Memory Storage Implementation (for testing)
 */
export class MemoryStorageManager extends StorageManager {
  private storage: Map<string, string> = new Map();

  public async setItem(key: string, value: string): Promise<void> {
    this.storage.set(this.getKey(key), value);
  }

  public async getItem(key: string): Promise<string | null> {
    return this.storage.get(this.getKey(key)) || null;
  }

  public async removeItem(key: string): Promise<void> {
    this.storage.delete(this.getKey(key));
  }

  public async clear(): Promise<void> {
    this.storage.clear();
  }

  public async hasItem(key: string): Promise<boolean> {
    return this.storage.has(this.getKey(key));
  }

  public async getAllKeys(): Promise<string[]> {
    return Array.from(this.storage.keys());
  }
}

/**
 * Factory function to create appropriate storage manager
 */
export function createStorageManager(
  type: 'browser' | 'memory' = 'browser',
  options?: StorageOptions
): StorageManager {
  switch (type) {
    case 'browser':
      return new BrowserStorageManager(options);
    case 'memory':
      return new MemoryStorageManager(options);
    default:
      throw new NocturaError('INVALID_STORAGE_TYPE', `Unknown storage type: ${type}`);
  }
}
