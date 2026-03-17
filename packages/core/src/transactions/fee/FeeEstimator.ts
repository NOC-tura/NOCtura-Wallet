/**
 * Fee Estimator - Calculate transaction fees
 */

import { Connection, Transaction, PublicKey } from '@solana/web3.js';
import type { PriorityLevel } from '../../types';

/**
 * Fee estimate result
 */
export interface FeeEstimate {
  baseFee: number;
  priorityFee: number;
  totalFee: number;
  feeInSOL: number;
}

/**
 * Network fee statistics
 */
export interface NetworkFeeStats {
  low: number;     // 25th percentile
  medium: number;  // 50th percentile
  high: number;    // 75th percentile
  veryHigh: number; // 90th percentile
  lastUpdated: Date;
}

/**
 * Fee Estimator for transaction fees
 */
export class FeeEstimator {
  private connection: Connection;
  private cachedFees: NetworkFeeStats | null = null;
  private cacheExpiry: number = 30_000; // 30 seconds

  constructor(connection: Connection) {
    this.connection = connection;
  }

  /**
   * Estimate fees for a transaction
   */
  public async estimateFee(
    transaction: Transaction,
    priorityLevel: PriorityLevel = 'medium'
  ): Promise<FeeEstimate> {
    try {
      // Get recent blockhash for fee calculation
      const { blockhash } = await this.connection.getLatestBlockhash();
      transaction.recentBlockhash = blockhash;

      let baseFee: number;
      
      // Try to compile message if fee payer is set
      if (transaction.feePayer && transaction.instructions.length > 0) {
        try {
          const message = transaction.compileMessage();
          baseFee = message.header.numRequiredSignatures * 5000; // 5000 lamports per signature
        } catch {
          // Fallback to instruction-based estimation
          baseFee = Math.max(1, transaction.instructions.length) * 5000;
        }
      } else {
        // Estimate based on instruction count
        baseFee = Math.max(1, transaction.instructions.length) * 5000;
      }

      // Add priority fee based on level
      const priorityFee = this.getPriorityFee(priorityLevel);

      const totalFee = baseFee + priorityFee;

      return {
        baseFee,
        priorityFee,
        totalFee,
        feeInSOL: totalFee / 1e9,
      };
    } catch (error) {
      throw new Error(`Fee estimation failed: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Estimate fees for SPL token transfer
   */
  public async estimateTokenTransferFee(
    priorityLevel: PriorityLevel = 'medium'
  ): Promise<FeeEstimate> {
    try {
      // Token transfer typically requires 2 signatures
      const baseFee = 2 * 5000;
      const priorityFee = this.getPriorityFee(priorityLevel);
      const totalFee = baseFee + priorityFee;

      return {
        baseFee,
        priorityFee,
        totalFee,
        feeInSOL: totalFee / 1e9,
      };
    } catch (error) {
      throw new Error(`Token fee estimation failed: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Get priority fee based on level
   */
  private getPriorityFee(level: PriorityLevel): number {
    switch (level) {
      case 'low':
        return 1000;
      case 'medium':
        return 5000;
      case 'high':
        return 10000;
    }
  }

  /**
   * Estimate shielded transaction fee (includes proof verification)
   */
  public async estimateShieldedFee(
    priorityLevel: PriorityLevel = 'medium'
  ): Promise<FeeEstimate> {
    try {
      // Shielded transactions require additional compute for proof verification
      const baseFee = 10000; // Higher base fee for proof verification
      const priorityFee = this.getPriorityFee(priorityLevel);
      const proofVerificationFee = 50000; // Additional fee for ZK proof verification

      const totalFee = baseFee + priorityFee + proofVerificationFee;

      return {
        baseFee,
        priorityFee,
        totalFee,
        feeInSOL: totalFee / 1e9,
      };
    } catch (error) {
      throw new Error(`Shielded fee estimation failed: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Get current network fees (average from recent blocks)
   */
  public async getNetworkFees(): Promise<NetworkFeeStats> {
    try {
      // Check cache
      if (this.cachedFees && Date.now() - this.cachedFees.lastUpdated.getTime() < this.cacheExpiry) {
        return this.cachedFees;
      }

      // Fetch recent priority fee stats from the network
      const recentFees = await this.connection.getRecentPrioritizationFees();
      
      if (recentFees.length === 0) {
        // Return defaults if no data available
        this.cachedFees = {
          low: 1_000,
          medium: 5_000,
          high: 10_000,
          veryHigh: 50_000,
          lastUpdated: new Date(),
        };
        return this.cachedFees;
      }

      // Sort fees and calculate percentiles
      const fees = recentFees.map(f => f.prioritizationFee).sort((a, b) => a - b);
      
      const percentile = (arr: number[], p: number) => {
        const index = Math.ceil((p / 100) * arr.length) - 1;
        return arr[Math.max(0, index)];
      };

      this.cachedFees = {
        low: Math.max(1_000, percentile(fees, 25)),
        medium: Math.max(5_000, percentile(fees, 50)),
        high: Math.max(10_000, percentile(fees, 75)),
        veryHigh: Math.max(50_000, percentile(fees, 90)),
        lastUpdated: new Date(),
      };

      return this.cachedFees;
    } catch (error) {
      // Return defaults on error
      return {
        low: 1_000,
        medium: 5_000,
        high: 10_000,
        veryHigh: 50_000,
        lastUpdated: new Date(),
      };
    }
  }

  /**
   * Estimate compute units for a transaction
   */
  public async estimateComputeUnits(
    transaction: Transaction,
    feePayer: PublicKey
  ): Promise<number> {
    try {
      // Simulate to get actual compute units
      const simulation = await this.connection.simulateTransaction(transaction);
      
      if (simulation.value.unitsConsumed) {
        // Add 20% buffer
        return Math.ceil(simulation.value.unitsConsumed * 1.2);
      }
      
      // Default estimate based on instruction count
      return Math.max(200_000, transaction.instructions.length * 50_000);
    } catch {
      // Default for simple transactions
      return 200_000;
    }
  }

  /**
   * Get recommended priority fee for current conditions
   */
  public async getRecommendedPriorityFee(
    priorityLevel: PriorityLevel = 'medium'
  ): Promise<number> {
    const networkFees = await this.getNetworkFees();
    
    switch (priorityLevel) {
      case 'low':
        return networkFees.low;
      case 'medium':
        return networkFees.medium;
      case 'high':
        return networkFees.high;
      default:
        return networkFees.medium;
    }
  }

  /**
   * Clear cached fees
   */
  public clearCache(): void {
    this.cachedFees = null;
  }
}
