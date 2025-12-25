/**
 * Network Manager - Handle RPC connections with fallbacks and pooling
 */

import { Connection, Commitment, ConnectionConfig } from '@solana/web3.js';
import { NETWORK, COMMITMENT, LIMITS } from '../utils/Constants';
import { NocturaError } from '../types';

export interface NetworkEndpoint {
  url: string;
  priority: number;
  healthy: boolean;
  lastCheck: Date;
}

export interface NetworkConfig {
  network: 'devnet' | 'testnet' | 'mainnet-beta';
  commitment?: Commitment;
  wsEndpoint?: string;
  timeout?: number;
}

/**
 * Network Manager with connection pooling and fallback
 */
export class NetworkManager {
  private endpoints: NetworkEndpoint[] = [];
  private activeConnection: Connection | null = null;
  private config: NetworkConfig;
  private healthCheckInterval: NodeJS.Timeout | null = null;

  constructor(config: NetworkConfig) {
    this.config = config;
    this.initializeEndpoints();
  }

  /**
   * Initialize endpoints for the selected network
   */
  private initializeEndpoints(): void {
    const networkEndpoints: Record<string, string[]> = {
      devnet: [
        'https://api.devnet.solana.com',
        'https://devnet.rpcpool.com',
      ],
      testnet: [
        'https://api.testnet.solana.com',
        'https://testnet.rpcpool.com',
      ],
      'mainnet-beta': [
        'https://api.mainnet-beta.solana.com',
        'https://mainnet.rpcpool.com',
        'https://solana-api.projectserum.com',
      ],
    };

    const urls = networkEndpoints[this.config.network] || [];
    this.endpoints = urls.map((url, index) => ({
      url,
      priority: index,
      healthy: true,
      lastCheck: new Date(),
    }));
  }

  /**
   * Get active connection or create one
   */
  public getConnection(): Connection {
    if (this.activeConnection) {
      return this.activeConnection;
    }

    const endpoint = this.getHealthyEndpoint();
    if (!endpoint) {
      throw new NocturaError(
        'NETWORK_ERROR',
        'No healthy RPC endpoints available'
      );
    }

    const connectionConfig: ConnectionConfig = {
      commitment: this.config.commitment || COMMITMENT.CONFIRMED,
      wsEndpoint: this.config.wsEndpoint,
    };

    this.activeConnection = new Connection(endpoint.url, connectionConfig);
    return this.activeConnection;
  }

  /**
   * Get the first healthy endpoint
   */
  private getHealthyEndpoint(): NetworkEndpoint | null {
    const healthy = this.endpoints
      .filter((e) => e.healthy)
      .sort((a, b) => a.priority - b.priority);

    return healthy[0] || null;
  }

  /**
   * Switch to fallback endpoint
   */
  public async switchToFallback(): Promise<void> {
    const currentEndpoint = this.endpoints.find((e) => e.healthy);
    if (currentEndpoint) {
      currentEndpoint.healthy = false;
      currentEndpoint.lastCheck = new Date();
    }

    const nextEndpoint = this.getHealthyEndpoint();
    if (!nextEndpoint) {
      throw new NocturaError(
        'NETWORK_ERROR',
        'All RPC endpoints are unavailable'
      );
    }

    // Create new connection with fallback endpoint
    this.activeConnection = new Connection(
      nextEndpoint.url,
      {
        commitment: this.config.commitment || COMMITMENT.CONFIRMED,
        wsEndpoint: this.config.wsEndpoint,
      }
    );

    console.log(`Switched to fallback RPC: ${nextEndpoint.url}`);
  }

  /**
   * Start health check for endpoints
   */
  public startHealthCheck(intervalMs: number = 60000): void {
    this.healthCheckInterval = setInterval(async () => {
      await this.checkEndpointsHealth();
    }, intervalMs);
  }

  /**
   * Stop health check
   */
  public stopHealthCheck(): void {
    if (this.healthCheckInterval) {
      clearInterval(this.healthCheckInterval);
      this.healthCheckInterval = null;
    }
  }

  /**
   * Check health of all endpoints
   */
  private async checkEndpointsHealth(): Promise<void> {
    const healthChecks = this.endpoints.map(async (endpoint) => {
      try {
        const connection = new Connection(endpoint.url, { commitment: 'confirmed' });
        const slot = await connection.getSlot();
        
        if (slot > 0) {
          endpoint.healthy = true;
          endpoint.lastCheck = new Date();
          return true;
        }
      } catch (error) {
        endpoint.healthy = false;
        endpoint.lastCheck = new Date();
        console.warn(`Endpoint ${endpoint.url} is unhealthy:`, error);
      }
      return false;
    });

    await Promise.allSettled(healthChecks);
  }

  /**
   * Get current network
   */
  public getNetwork(): string {
    return this.config.network;
  }

  /**
   * Get all endpoints with their status
   */
  public getEndpointsStatus(): NetworkEndpoint[] {
    return [...this.endpoints];
  }

  /**
   * Get current commitment level
   */
  public getCommitment(): Commitment {
    return this.config.commitment || COMMITMENT.CONFIRMED;
  }

  /**
   * Update commitment level
   */
  public setCommitment(commitment: Commitment): void {
    this.config.commitment = commitment;
    
    // Recreate connection with new commitment
    if (this.activeConnection) {
      const endpoint = this.getHealthyEndpoint();
      if (endpoint) {
        this.activeConnection = new Connection(endpoint.url, {
          commitment,
          wsEndpoint: this.config.wsEndpoint,
        });
      }
    }
  }

  /**
   * Test connection to RPC
   */
  public async testConnection(): Promise<boolean> {
    try {
      const connection = this.getConnection();
      const slot = await connection.getSlot();
      return slot > 0;
    } catch (error) {
      console.error('Connection test failed:', error);
      return false;
    }
  }

  /**
   * Get connection latency
   */
  public async getLatency(): Promise<number> {
    const start = Date.now();
    try {
      const connection = this.getConnection();
      await connection.getSlot();
      return Date.now() - start;
    } catch (error) {
      return -1;
    }
  }

  /**
   * Cleanup resources
   */
  public destroy(): void {
    this.stopHealthCheck();
    this.activeConnection = null;
  }
}

/**
 * Create a network manager instance
 */
export function createNetworkManager(config: NetworkConfig): NetworkManager {
  return new NetworkManager(config);
}
