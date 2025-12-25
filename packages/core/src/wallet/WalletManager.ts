/**
 * Wallet Manager - Main entry point for wallet operations
 */

import { Keypair, PublicKey, Connection } from '@solana/web3.js';
import {
  WalletAccount,
  WalletMode,
  WalletConfig,
  AccountType,
  InvalidAddressError,
} from '../types';

/**
 * Main wallet manager class
 */
export class WalletManager {
  private connection: Connection;
  private keypair: Keypair;
  private accounts: Map<string, WalletAccount> = new Map();
  private config: WalletConfig;

  constructor(keypair: Keypair, config: WalletConfig) {
    this.keypair = keypair;
    this.config = config;
    this.connection = new Connection(
      config.rpcEndpoint,
      config.commitment || 'confirmed'
    );
  }

  /**
   * Get the wallet's public key
   */
  public getPublicKey(): string {
    return this.keypair.publicKey.toString();
  }

  /**
   * Get connection instance
   */
  public getConnection(): Connection {
    return this.connection;
  }

  /**
   * Validate a Solana address
   */
  public validateAddress(address: string): boolean {
    try {
      new PublicKey(address);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Get all accounts
   */
  public getAccounts(): WalletAccount[] {
    return Array.from(this.accounts.values());
  }

  /**
   * Get account by address
   */
  public getAccount(address: string): WalletAccount | undefined {
    return this.accounts.get(address);
  }

  /**
   * Add a new account
   */
  public addAccount(account: WalletAccount): void {
    this.accounts.set(account.address, account);
  }

  /**
   * Get wallet configuration
   */
  public getConfig(): WalletConfig {
    return this.config;
  }
}

/**
 * Create a new wallet manager
 */
export function createWalletManager(
  keypair: Keypair,
  config: WalletConfig
): WalletManager {
  return new WalletManager(keypair, config);
}

export * from '../types';
