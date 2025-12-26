/**
 * Noctura SDK - TypeScript SDK for Noctura Wallet
 */

import {
  WalletManager,
  AccountManager,
  NetworkManager,
  TokenRegistry,
  TransparentTxBuilder,
  ShieldedTxBuilder,
  NoopProverClient,
  WalletConfig,
  NetworkConfig,
} from '@noctura/core';
import { Keypair } from '@solana/web3.js';

/**
 * Main SDK class
 */
export class NocturaSDK {
  public wallet: WalletManager;
  public accounts: AccountManager;
  public network: NetworkManager;
  public tokens: TokenRegistry;
  public txBuilder: TransparentTxBuilder;
  public shieldedTx: ShieldedTxBuilder;
  
  private config: WalletConfig;

  constructor(config: WalletConfig) {
    this.config = config;

    // Initialize network manager
    const networkConfig: NetworkConfig = {
      network: config.network || 'devnet',
      commitment: config.commitment,
    };
    this.network = new NetworkManager(networkConfig);

    // Create a temporary keypair for wallet manager initialization
    // In production, this would be replaced with actual key management
    const keypair = Keypair.generate();
    this.wallet = new WalletManager(keypair, config);

    // Initialize managers
    this.accounts = new AccountManager();
    this.tokens = new TokenRegistry();
    this.txBuilder = new TransparentTxBuilder(this.network.getConnection());
    this.shieldedTx = new ShieldedTxBuilder(
      this.network.getConnection(),
      new NoopProverClient()
    );
  }

  /**
   * Initialize SDK (load token lists, etc.)
   */
  public async initialize(): Promise<void> {
    try {
      await this.tokens.loadTokenList();
      this.network.startHealthCheck();
      console.log('Noctura SDK initialized');
    } catch (error) {
      console.error('SDK initialization error:', error);
      throw error;
    }
  }

  /**
   * Get SDK configuration
   */
  public getConfig(): WalletConfig {
    return this.config;
  }

  /**
   * Test connection
   */
  public async testConnection(): Promise<boolean> {
    return this.network.testConnection();
  }

  /**
   * Get connection latency
   */
  public async getLatency(): Promise<number> {
    return this.network.getLatency();
  }

  /**
   * Initialize SDK with existing keypair
   */
  public static createWithKeypair(
    keypair: Keypair,
    config: WalletConfig
  ): NocturaSDK {
    const sdk = new NocturaSDK(config);
    sdk.wallet = new WalletManager(keypair, config);
    return sdk;
  }

  /**
   * Cleanup resources
   */
  public destroy(): void {
    this.network.destroy();
  }
}

// Re-export core types
export * from '@noctura/core';
