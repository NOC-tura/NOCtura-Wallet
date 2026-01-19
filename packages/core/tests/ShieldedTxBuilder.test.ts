/**
 * Unit tests for ShieldedTxBuilder
 */

import { Connection, PublicKey } from '@solana/web3.js';
import { ShieldedTxBuilder } from '../src/transactions/shielded/ShieldedTxBuilder';
import { NoopProverClient, LocalProverClient } from '../src/zk/ProverClient';
import type { ShieldedTransferParams, ShieldedDepositParams, ShieldedWithdrawalParams } from '../src/transactions/shielded/types';

// Mock Connection
jest.mock('@solana/web3.js', () => {
  const original = jest.requireActual('@solana/web3.js');
  return {
    ...original,
    Connection: jest.fn().mockImplementation(() => ({
      simulateTransaction: jest.fn().mockResolvedValue({ value: { err: null } }),
      getLatestBlockhash: jest.fn().mockResolvedValue({
        blockhash: 'test-blockhash',
        lastValidBlockHeight: 1000,
      }),
    })),
  };
});

describe('ShieldedTxBuilder', () => {
  let connection: Connection;
  let builderWithNoop: ShieldedTxBuilder;
  let builderWithLocal: ShieldedTxBuilder;

  const validAddress = '9WzDXwBbmkg8ZTbNMqUxvQRAyrZzDsGYdLVL9zYtAWWM';

  beforeEach(async () => {
    connection = new Connection('https://api.devnet.solana.com');
    builderWithNoop = new ShieldedTxBuilder(connection, new NoopProverClient());
    
    const localProver = new LocalProverClient();
    await localProver.initialize();
    builderWithLocal = new ShieldedTxBuilder(connection, localProver);
  });

  describe('buildShieldedTransfer', () => {
    const transferParams: ShieldedTransferParams = {
      recipientAddress: validAddress,
      amount: 1000000000n,
      feeLevel: 'medium',
    };

    it('should build transfer transaction with noop prover', async () => {
      const result = await builderWithNoop.buildShieldedTransfer(transferParams);
      
      expect(result.transaction).toBeDefined();
      expect(result.proof).toBeDefined();
      expect(result.proof.proof).toBe('DUMMY_PROOF_SHIELDED_TRANSFER');
    });

    it('should build transfer transaction with local prover', async () => {
      const result = await builderWithLocal.buildShieldedTransfer(transferParams);
      
      expect(result.transaction).toBeDefined();
      expect(result.proof).toBeDefined();
      
      const proofObj = JSON.parse(result.proof.proof);
      expect(proofObj.protocol).toBe('groth16');
    });

    it('should include proof in transaction memo', async () => {
      const result = await builderWithNoop.buildShieldedTransfer(transferParams);
      
      const instructions = result.transaction.instructions;
      expect(instructions.length).toBe(1);
      
      // Check it's a memo instruction
      const memoProgram = new PublicKey('MemoSq4gqABAXKb96qnH8TysNcWxMyWCqXgDLGmfcHr');
      expect(instructions[0].programId.equals(memoProgram)).toBe(true);
    });

    it('should throw for invalid recipient address', async () => {
      const invalidParams: ShieldedTransferParams = {
        ...transferParams,
        recipientAddress: 'invalid-address',
      };
      
      await expect(builderWithNoop.buildShieldedTransfer(invalidParams))
        .rejects.toThrow('Invalid recipient address');
    });

    it('should include optional memo', async () => {
      const paramsWithMemo: ShieldedTransferParams = {
        ...transferParams,
        memo: 'Test payment',
      };
      
      const result = await builderWithNoop.buildShieldedTransfer(paramsWithMemo);
      const data = result.transaction.instructions[0].data.toString();
      
      expect(data).toContain('Test payment');
    });
  });

  describe('buildDeposit', () => {
    const depositParams: ShieldedDepositParams = {
      sourceAddress: validAddress,
      amount: 500000000n,
      feeLevel: 'medium',
    };

    it('should build deposit transaction', async () => {
      const result = await builderWithNoop.buildDeposit(depositParams);
      
      expect(result.transaction).toBeDefined();
      expect(result.proof).toBeDefined();
    });

    it('should throw for invalid source address', async () => {
      const invalidParams: ShieldedDepositParams = {
        ...depositParams,
        sourceAddress: 'not-a-valid-address',
      };
      
      await expect(builderWithNoop.buildDeposit(invalidParams))
        .rejects.toThrow('Invalid source address');
    });

    it('should support SPL token deposits', async () => {
      const tokenParams: ShieldedDepositParams = {
        ...depositParams,
        assetMint: 'So11111111111111111111111111111111111111112',
      };
      
      const result = await builderWithNoop.buildDeposit(tokenParams);
      const data = result.transaction.instructions[0].data.toString();
      
      expect(data).toContain('So11111111111111111111111111111111111111112');
    });
  });

  describe('buildWithdrawal', () => {
    const withdrawalParams: ShieldedWithdrawalParams = {
      recipientAddress: validAddress,
      amount: 250000000n,
      feeLevel: 'high',
    };

    it('should build withdrawal transaction', async () => {
      const result = await builderWithNoop.buildWithdrawal(withdrawalParams);
      
      expect(result.transaction).toBeDefined();
      expect(result.proof).toBeDefined();
    });

    it('should throw for invalid recipient address', async () => {
      const invalidParams: ShieldedWithdrawalParams = {
        ...withdrawalParams,
        recipientAddress: 'bad-address',
      };
      
      await expect(builderWithNoop.buildWithdrawal(invalidParams))
        .rejects.toThrow('Invalid recipient address');
    });
  });

  describe('simulate', () => {
    it('should return true for valid transaction', async () => {
      const { transaction } = await builderWithNoop.buildShieldedTransfer({
        recipientAddress: validAddress,
        amount: 1000000000n,
      });
      
      const result = await builderWithNoop.simulate(transaction);
      expect(result).toBe(true);
    });

    it('should return false when simulation fails', async () => {
      // Override mock for this test
      (connection.simulateTransaction as jest.Mock).mockResolvedValueOnce({
        value: { err: { InstructionError: [0, 'Error'] } },
      });
      
      const { transaction } = await builderWithNoop.buildShieldedTransfer({
        recipientAddress: validAddress,
        amount: 1000000000n,
      });
      
      const result = await builderWithNoop.simulate(transaction);
      expect(result).toBe(false);
    });
  });
});
