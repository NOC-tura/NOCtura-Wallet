/**
 * Noctura SDK - TypeScript SDK for Noctura Wallet
 */

import { WalletManager, WalletConfig } from '@noctura/core';
import { Keypair } from '@solana/web3.js';

/**
 * Main SDK class
 */
export class NocturaSDK {
  public wallet: WalletManager;
  private config: WalletConfig;

  constructor(config: WalletConfig) {
    this.config = config;
    // Create a temporary keypair for wallet manager initialization
    // In production, this would be replaced with actual key management
    const keypair = Keypair.generate();
    this.wallet = new WalletManager(keypair, config);
  }

  /**
   * Get SDK configuration
   */
  public getConfig(): WalletConfig {
    return this.config;
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
}

// Re-export core types
export * from '@noctura/core';
