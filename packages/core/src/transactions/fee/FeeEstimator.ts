/**
 * Fee Estimator - Calculate transaction fees
 */

import { Connection, Transaction, PublicKey } from '@solana/web3.js';
import { FEES } from '../../utils/Constants';
import { NocturaError } from '../../types';

export interface FeeEstimate {
  baseFee: number; // lamports
  priorityFee: number; // lamports
  totalFee: number; // lamports
  feeInSOL: number;
}

export type PriorityLevel = 'low' | 'medium' | 'high';

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

      // Get fee for transaction
      const fee = await this.connection.getFeeForMessage(
        transaction.compileMessage(),
        'confirmed'
      );

      const baseFee = fee.value || FEES.SIGNATURE_FEE;
      const priorityFee = this.getPriorityFee(priorityLevel);
      const totalFee = baseFee + priorityFee;

      return {
        baseFee,
        priorityFee,
        totalFee,
        feeInSOL: totalFee / 1e9,
      };
    } catch (error) {
      console.error('Fee estimation error:', error);
      
      // Return default estimate if RPC call fails
      const baseFee = FEES.SIGNATURE_FEE;
      const priorityFee = this.getPriorityFee(priorityLevel);
      const totalFee = baseFee + priorityFee;

      return {
        baseFee,
        priorityFee,
        totalFee,
        feeInSOL: totalFee / 1e9,
      };
    }
  }

  /**
   * Get priority fee based on level
   */
  private getPriorityFee(level: PriorityLevel): number {
    switch (level) {
      case 'low':
        return FEES.PRIORITY_FEE.LOW;
      case 'medium':
        return FEES.PRIORITY_FEE.MEDIUM;
      case 'high':
        return FEES.PRIORITY_FEE.HIGH;
      default:
        return FEES.PRIORITY_FEE.MEDIUM;
    }
  }

  /**
   * Estimate fee for multiple transactions
   */
  public async estimateBatchFees(
    transactions: Transaction[],
    priorityLevel: PriorityLevel = 'medium'
  ): Promise<FeeEstimate[]> {
    const estimates = await Promise.all(
      transactions.map((tx) => this.estimateFee(tx, priorityLevel))
    );
    return estimates;
  }

  /**
   * Get recommended priority level based on network congestion
   */
  public async getRecommendedPriorityLevel(): Promise<PriorityLevel> {
    try {
      const perfSamples = await this.connection.getRecentPerformanceSamples(1);
      
      if (perfSamples.length > 0) {
        const sample = perfSamples[0];
        const tps = sample.numTransactions / sample.samplePeriodSecs;
        
        // Adjust priority based on TPS
        if (tps > 3000) return 'high';
        if (tps > 2000) return 'medium';
        return 'low';
      }
    } catch (error) {
      console.warn('Could not determine network congestion:', error);
    }

    return 'medium'; // Default
  }

  /**
   * Calculate total fees for account rent exemption
   */
  public async calculateRentExemption(dataSize: number): Promise<number> {
    try {
      const rentExemption = await this.connection.getMinimumBalanceForRentExemption(
        dataSize
      );
      return rentExemption;
    } catch (error) {
      throw new NocturaError(
        'FEE_CALCULATION_ERROR',
        'Failed to calculate rent exemption'
      );
    }
  }

  /**
   * Get estimated cost for creating token account
   */
  public async getTokenAccountCreationCost(): Promise<number> {
    // Token account size is 165 bytes
    return this.calculateRentExemption(165);
  }
}
