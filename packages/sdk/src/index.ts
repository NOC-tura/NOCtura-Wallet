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
  LocalProverClient,
  RemoteProverClient,
  createProverClient,
  WalletConfig,
  NetworkConfig,
  type IProverClient,
} from '@noctura/core';
import { Keypair } from '@solana/web3.js';

/**
 * Extended SDK configuration
 */
export interface NocturaSDKConfig extends WalletConfig {
  prover?: {
    type: 'local' | 'remote' | 'noop';
    remoteUrl?: string;
    timeout?: number;
  };
}

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
  
  private config: NocturaSDKConfig;
  private proverClient: IProverClient;

  constructor(config: NocturaSDKConfig) {
    this.config = config;

    // Initialize network manager
    const networkConfig: NetworkConfig = {
      network: (config.network as NetworkConfig['network']) || 'devnet',
      commitment: config.commitment,
    };
    this.network = new NetworkManager(networkConfig);

    // Create a temporary keypair for wallet manager initialization
    // In production, this would be replaced with actual key management
    const keypair = Keypair.generate();
    this.wallet = new WalletManager(keypair, config);

    // Initialize prover client based on config
    this.proverClient = createProverClient({
      type: config.prover?.type || 'local',
      remoteUrl: config.prover?.remoteUrl,
      timeout: config.prover?.timeout,
    });

    // Initialize managers
    this.accounts = new AccountManager();
    this.tokens = new TokenRegistry();
    this.txBuilder = new TransparentTxBuilder(this.network.getConnection());
    this.shieldedTx = new ShieldedTxBuilder(
      this.network.getConnection(),
      this.proverClient
    );
  }

  /**
   * Initialize SDK (load token lists, etc.)
   */
  public async initialize(): Promise<void> {
    try {
      await this.tokens.loadTokenList();
      this.network.startHealthCheck();
      
      // Initialize local prover if applicable
      if (this.proverClient instanceof LocalProverClient) {
        await this.proverClient.initialize();
      }
      
      console.log('Noctura SDK initialized');
    } catch (error) {
      console.error('SDK initialization error:', error);
      throw error;
    }
  }

  /**
   * Get SDK configuration
   */
  public getConfig(): NocturaSDKConfig {
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
   * Update prover client (e.g., switch from local to remote)
   */
  public setProverClient(client: IProverClient): void {
    this.proverClient = client;
    this.shieldedTx = new ShieldedTxBuilder(
      this.network.getConnection(),
      this.proverClient
    );
  }

  /**
   * Connect to remote prover service
   */
  public connectToRemoteProver(url: string, timeout?: number): void {
    const client = new RemoteProverClient(url, timeout);
    this.setProverClient(client);
  }

  /**
   * Initialize SDK with existing keypair
   */
  public static createWithKeypair(
    keypair: Keypair,
    config: NocturaSDKConfig
  ): NocturaSDK {
    const sdk = new NocturaSDK(config);
    sdk.wallet = new WalletManager(keypair, config);
    return sdk;
  }

  /**
   * Create SDK configured for remote prover
   */
  public static createWithRemoteProver(
    walletConfig: WalletConfig,
    proverUrl: string,
    proverTimeout?: number
  ): NocturaSDK {
    return new NocturaSDK({
      ...walletConfig,
      prover: {
        type: 'remote',
        remoteUrl: proverUrl,
        timeout: proverTimeout,
      },
    });
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
