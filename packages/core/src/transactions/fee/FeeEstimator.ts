/**
 * Fee Estimator - Calculate transaction fees
 */

import { Connection, Transaction } from '@solana/web3.js';
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
 * Fee Estimator for transaction fees
 */
export class FeeEstimator {
  private connection: Connection;

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

      // Get base fee from transaction size
      const message = transaction.compileMessage();
      const baseFee = message.header.numRequiredSignatures * 5000; // 5000 lamports per signature

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
  public async getNetworkFees(): Promise<{ low: number; medium: number; high: number }> {
    try {
      // In production, this would analyze recent blocks
      // For now, return static values
      return {
        low: 1000,
        medium: 5000,
        high: 10000,
      };
    } catch (error) {
      throw new Error(`Network fee query failed: ${error instanceof Error ? error.message : String(error)}`);
    }
  }
}
