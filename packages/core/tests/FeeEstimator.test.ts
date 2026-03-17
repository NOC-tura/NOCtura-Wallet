/**
 * Unit tests for FeeEstimator
 */

import { Connection, Transaction, SystemProgram, PublicKey, Keypair } from '@solana/web3.js';
import { FeeEstimator } from '../src/transactions/fee/FeeEstimator';

// Mock Connection
const mockConnection = {
  getLatestBlockhash: jest.fn().mockResolvedValue({
    blockhash: 'test-blockhash-12345',
    lastValidBlockHeight: 1000,
  }),
  getRecentPrioritizationFees: jest.fn().mockResolvedValue([
    { slot: 100, prioritizationFee: 1000 },
    { slot: 101, prioritizationFee: 2000 },
    { slot: 102, prioritizationFee: 5000 },
    { slot: 103, prioritizationFee: 8000 },
    { slot: 104, prioritizationFee: 10000 },
    { slot: 105, prioritizationFee: 15000 },
    { slot: 106, prioritizationFee: 20000 },
    { slot: 107, prioritizationFee: 50000 },
  ]),
  simulateTransaction: jest.fn().mockResolvedValue({
    value: {
      err: null,
      unitsConsumed: 50000,
    },
  }),
};

jest.mock('@solana/web3.js', () => {
  const original = jest.requireActual('@solana/web3.js');
  return {
    ...original,
    Connection: jest.fn().mockImplementation(() => mockConnection),
  };
});

describe('FeeEstimator', () => {
  let estimator: FeeEstimator;
  let connection: Connection;
  let testKeypair: Keypair;

  beforeEach(() => {
    jest.clearAllMocks();
    connection = new Connection('https://api.devnet.solana.com');
    estimator = new FeeEstimator(connection);
    testKeypair = Keypair.generate();
    estimator.clearCache();
  });

  describe('estimateFee', () => {
    it('should estimate fee for a transaction with low priority', async () => {
      const tx = new Transaction();
      tx.add(
        SystemProgram.transfer({
          fromPubkey: testKeypair.publicKey,
          toPubkey: Keypair.generate().publicKey,
          lamports: 1000000,
        })
      );
      tx.feePayer = testKeypair.publicKey;

      const estimate = await estimator.estimateFee(tx, 'low');

      expect(estimate.baseFee).toBeGreaterThan(0);
      expect(estimate.priorityFee).toBe(1000);
      expect(estimate.totalFee).toBe(estimate.baseFee + estimate.priorityFee);
      expect(estimate.feeInSOL).toBe(estimate.totalFee / 1e9);
    });

    it('should estimate fee with medium priority', async () => {
      const tx = new Transaction();
      tx.add(
        SystemProgram.transfer({
          fromPubkey: testKeypair.publicKey,
          toPubkey: Keypair.generate().publicKey,
          lamports: 1000000,
        })
      );
      tx.feePayer = testKeypair.publicKey;

      const estimate = await estimator.estimateFee(tx, 'medium');

      expect(estimate.priorityFee).toBe(5000);
    });

    it('should estimate fee with high priority', async () => {
      const tx = new Transaction();
      tx.add(
        SystemProgram.transfer({
          fromPubkey: testKeypair.publicKey,
          toPubkey: Keypair.generate().publicKey,
          lamports: 1000000,
        })
      );
      tx.feePayer = testKeypair.publicKey;

      const estimate = await estimator.estimateFee(tx, 'high');

      expect(estimate.priorityFee).toBe(10000);
    });

    it('should handle transaction with multiple signatures', async () => {
      const tx = new Transaction();
      // Add multiple instructions that require signatures
      tx.add(
        SystemProgram.transfer({
          fromPubkey: testKeypair.publicKey,
          toPubkey: Keypair.generate().publicKey,
          lamports: 1000000,
        })
      );
      tx.feePayer = testKeypair.publicKey;

      const estimate = await estimator.estimateFee(tx);

      expect(estimate.baseFee).toBeGreaterThan(0);
    });
  });

  describe('estimateTokenTransferFee', () => {
    it('should estimate fee for token transfer with default priority', async () => {
      const estimate = await estimator.estimateTokenTransferFee();

      expect(estimate.baseFee).toBe(10000); // 2 signatures * 5000
      expect(estimate.priorityFee).toBe(5000); // medium default
      expect(estimate.totalFee).toBe(15000);
    });

    it('should estimate fee for token transfer with high priority', async () => {
      const estimate = await estimator.estimateTokenTransferFee('high');

      expect(estimate.priorityFee).toBe(10000);
    });
  });

  describe('estimateShieldedFee', () => {
    it('should estimate fee for shielded transaction', async () => {
      const estimate = await estimator.estimateShieldedFee();

      expect(estimate.baseFee).toBe(10000);
      expect(estimate.totalFee).toBeGreaterThan(estimate.baseFee + estimate.priorityFee);
      // Should include proof verification fee
      expect(estimate.totalFee).toBe(10000 + 5000 + 50000);
    });

    it('should estimate fee for shielded transaction with high priority', async () => {
      const estimate = await estimator.estimateShieldedFee('high');

      expect(estimate.priorityFee).toBe(10000);
    });
  });

  describe('getNetworkFees', () => {
    it('should fetch network fee statistics', async () => {
      const fees = await estimator.getNetworkFees();

      expect(fees.low).toBeGreaterThan(0);
      expect(fees.medium).toBeGreaterThanOrEqual(fees.low);
      expect(fees.high).toBeGreaterThanOrEqual(fees.medium);
      expect(fees.veryHigh).toBeGreaterThanOrEqual(fees.high);
      expect(fees.lastUpdated).toBeInstanceOf(Date);
    });

    it('should cache network fees', async () => {
      const fees1 = await estimator.getNetworkFees();
      const fees2 = await estimator.getNetworkFees();

      // Should only call the RPC once due to caching
      expect(mockConnection.getRecentPrioritizationFees).toHaveBeenCalledTimes(1);
      expect(fees1.lastUpdated.getTime()).toBe(fees2.lastUpdated.getTime());
    });

    it('should return defaults when no recent fees available', async () => {
      mockConnection.getRecentPrioritizationFees.mockResolvedValueOnce([]);
      estimator.clearCache();

      const fees = await estimator.getNetworkFees();

      expect(fees.low).toBe(1000);
      expect(fees.medium).toBe(5000);
      expect(fees.high).toBe(10000);
      expect(fees.veryHigh).toBe(50000);
    });

    it('should return defaults on RPC error', async () => {
      mockConnection.getRecentPrioritizationFees.mockRejectedValueOnce(new Error('RPC error'));
      estimator.clearCache();

      const fees = await estimator.getNetworkFees();

      expect(fees.low).toBe(1000);
      expect(fees.medium).toBe(5000);
    });
  });

  describe('estimateComputeUnits', () => {
    it('should estimate compute units from simulation', async () => {
      const tx = new Transaction();
      tx.add(
        SystemProgram.transfer({
          fromPubkey: testKeypair.publicKey,
          toPubkey: Keypair.generate().publicKey,
          lamports: 1000000,
        })
      );

      const { blockhash } = await connection.getLatestBlockhash();
      tx.recentBlockhash = blockhash;
      tx.feePayer = testKeypair.publicKey;

      const units = await estimator.estimateComputeUnits(tx, testKeypair.publicKey);

      // Should be simulated units + 20% buffer
      expect(units).toBe(Math.ceil(50000 * 1.2));
    });

    it('should return default for simulation without units consumed', async () => {
      mockConnection.simulateTransaction.mockResolvedValueOnce({
        value: {
          err: null,
          unitsConsumed: undefined,
        },
      });

      const tx = new Transaction();
      tx.add(
        SystemProgram.transfer({
          fromPubkey: testKeypair.publicKey,
          toPubkey: Keypair.generate().publicKey,
          lamports: 1000000,
        })
      );

      const units = await estimator.estimateComputeUnits(tx, testKeypair.publicKey);

      expect(units).toBeGreaterThanOrEqual(200000);
    });
  });

  describe('getRecommendedPriorityFee', () => {
    it('should get recommended fee for low priority', async () => {
      const fee = await estimator.getRecommendedPriorityFee('low');

      expect(fee).toBeGreaterThanOrEqual(1000);
    });

    it('should get recommended fee for medium priority', async () => {
      const fee = await estimator.getRecommendedPriorityFee('medium');

      expect(fee).toBeGreaterThanOrEqual(5000);
    });

    it('should get recommended fee for high priority', async () => {
      const fee = await estimator.getRecommendedPriorityFee('high');

      expect(fee).toBeGreaterThanOrEqual(10000);
    });
  });

  describe('clearCache', () => {
    it('should clear cached fees', async () => {
      await estimator.getNetworkFees();
      expect(mockConnection.getRecentPrioritizationFees).toHaveBeenCalledTimes(1);

      estimator.clearCache();
      await estimator.getNetworkFees();

      expect(mockConnection.getRecentPrioritizationFees).toHaveBeenCalledTimes(2);
    });
  });
});
