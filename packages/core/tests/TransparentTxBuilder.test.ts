/**
 * Unit tests for TransparentTxBuilder
 */

import { Connection, PublicKey, Keypair, LAMPORTS_PER_SOL, SystemProgram } from '@solana/web3.js';
import { TransparentTxBuilder } from '../src/transactions/transparent/TransparentTxBuilder';

// Mock Connection
const mockConnection = {
  getBalance: jest.fn(),
  getLatestBlockhash: jest.fn().mockResolvedValue({
    blockhash: 'test-blockhash-12345',
    lastValidBlockHeight: 1000,
  }),
  getAccountInfo: jest.fn(),
  simulateTransaction: jest.fn().mockResolvedValue({
    value: {
      err: null,
      logs: ['Program executed successfully'],
      unitsConsumed: 50000,
    },
  }),
  getRecentPrioritizationFees: jest.fn().mockResolvedValue([
    { slot: 100, prioritizationFee: 1000 },
    { slot: 101, prioritizationFee: 5000 },
    { slot: 102, prioritizationFee: 10000 },
  ]),
  sendRawTransaction: jest.fn(),
  confirmTransaction: jest.fn(),
  getTransaction: jest.fn(),
  getParsedAccountInfo: jest.fn(),
};

jest.mock('@solana/web3.js', () => {
  const original = jest.requireActual('@solana/web3.js');
  return {
    ...original,
    Connection: jest.fn().mockImplementation(() => mockConnection),
  };
});

// Mock SPL Token
jest.mock('@solana/spl-token', () => ({
  TOKEN_PROGRAM_ID: new (jest.requireActual('@solana/web3.js').PublicKey)('TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA'),
  createTransferInstruction: jest.fn().mockReturnValue({
    programId: new (jest.requireActual('@solana/web3.js').PublicKey)('TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA'),
    keys: [],
    data: Buffer.from([]),
  }),
  getAssociatedTokenAddress: jest.fn().mockResolvedValue(
    new (jest.requireActual('@solana/web3.js').PublicKey)('11111111111111111111111111111111')
  ),
  createAssociatedTokenAccountInstruction: jest.fn().mockReturnValue({
    programId: new (jest.requireActual('@solana/web3.js').PublicKey)('ATokenGPvbdGVxr1b2hvZbsiqW5xWH25efTNsLJA8knL'),
    keys: [],
    data: Buffer.from([]),
  }),
  getAccount: jest.fn(),
}));

describe('TransparentTxBuilder', () => {
  let builder: TransparentTxBuilder;
  let connection: Connection;
  let testKeypair: Keypair;
  const validAddress = '9WzDXwBbmkg8ZTbNMqUxvQRAyrZzDsGYdLVL9zYtAWWM';

  beforeEach(() => {
    jest.clearAllMocks();
    connection = new Connection('https://api.devnet.solana.com');
    builder = new TransparentTxBuilder(connection);
    testKeypair = Keypair.generate();
    
    // Default mock: sufficient balance
    mockConnection.getBalance.mockResolvedValue(10 * LAMPORTS_PER_SOL);
  });

  describe('buildTransfer', () => {
    it('should build a SOL transfer transaction', async () => {
      const params = {
        from: testKeypair.publicKey,
        to: validAddress,
        amount: 1 * LAMPORTS_PER_SOL,
      };

      const tx = await builder.buildTransfer(params);

      expect(tx).toBeDefined();
      expect(tx.instructions).toHaveLength(1);
      expect(tx.recentBlockhash).toBe('test-blockhash-12345');
      expect(tx.feePayer?.equals(testKeypair.publicKey)).toBe(true);
    });

    it('should throw InsufficientFundsError when balance is too low', async () => {
      mockConnection.getBalance.mockResolvedValue(0.001 * LAMPORTS_PER_SOL);

      const params = {
        from: testKeypair.publicKey,
        to: validAddress,
        amount: 5 * LAMPORTS_PER_SOL,
      };

      await expect(builder.buildTransfer(params)).rejects.toThrow('Insufficient balance');
    });

    it('should throw for invalid recipient address', async () => {
      const params = {
        from: testKeypair.publicKey,
        to: 'invalid-address',
        amount: 1 * LAMPORTS_PER_SOL,
      };

      await expect(builder.buildTransfer(params)).rejects.toThrow();
    });

    it('should throw for zero amount', async () => {
      const params = {
        from: testKeypair.publicKey,
        to: validAddress,
        amount: 0,
      };

      await expect(builder.buildTransfer(params)).rejects.toThrow();
    });
  });

  describe('buildTokenTransfer', () => {
    const mintAddress = 'GcqvfVfosg4BmUHng97v4dToPxsLk5R4gL2JCXV7x3Rb';

    it('should build a token transfer transaction', async () => {
      mockConnection.getAccountInfo.mockResolvedValue({ data: Buffer.from([]) }); // Account exists

      const params = {
        from: testKeypair.publicKey,
        to: validAddress,
        mint: mintAddress,
        amount: 100,
        decimals: 9,
      };

      const tx = await builder.buildTokenTransfer(params);

      expect(tx).toBeDefined();
      expect(tx.instructions.length).toBeGreaterThanOrEqual(1);
      expect(tx.recentBlockhash).toBe('test-blockhash-12345');
    });

    it('should create ATA if recipient does not have one', async () => {
      mockConnection.getAccountInfo.mockResolvedValue(null); // Account doesn't exist

      const params = {
        from: testKeypair.publicKey,
        to: validAddress,
        mint: mintAddress,
        amount: 100,
        decimals: 9,
      };

      const tx = await builder.buildTokenTransfer(params);

      // Should have 2 instructions: create ATA + transfer
      expect(tx.instructions.length).toBe(2);
    });
  });

  describe('addPriorityFee', () => {
    it('should add compute budget instructions for low priority', async () => {
      const params = {
        from: testKeypair.publicKey,
        to: validAddress,
        amount: 1 * LAMPORTS_PER_SOL,
      };

      let tx = await builder.buildTransfer(params);
      const originalLength = tx.instructions.length;

      tx = builder.addPriorityFee(tx, 'low');

      // Should have 2 new instructions (compute unit price + limit)
      expect(tx.instructions.length).toBe(originalLength + 2);
    });

    it('should add compute budget instructions for high priority', async () => {
      const params = {
        from: testKeypair.publicKey,
        to: validAddress,
        amount: 1 * LAMPORTS_PER_SOL,
      };

      let tx = await builder.buildTransfer(params);
      tx = builder.addPriorityFee(tx, 'high');

      // First instruction should be compute budget
      expect(tx.instructions[0].programId.toBase58()).toBe('ComputeBudget111111111111111111111111111111');
    });
  });

  describe('buildBatchTransfer', () => {
    it('should build batch transfer with multiple recipients', async () => {
      const recipient2 = Keypair.generate().publicKey.toBase58();
      const recipient3 = Keypair.generate().publicKey.toBase58();
      
      const params = {
        from: testKeypair.publicKey,
        transfers: [
          { to: validAddress, amount: 0.1 * LAMPORTS_PER_SOL },
          { to: recipient2, amount: 0.2 * LAMPORTS_PER_SOL },
          { to: recipient3, amount: 0.3 * LAMPORTS_PER_SOL },
        ],
      };

      const tx = await builder.buildBatchTransfer(params);

      expect(tx.instructions).toHaveLength(3);
    });

    it('should throw for empty transfers array', async () => {
      const params = {
        from: testKeypair.publicKey,
        transfers: [],
      };

      await expect(builder.buildBatchTransfer(params)).rejects.toThrow('No transfers provided');
    });

    it('should throw for too many transfers', async () => {
      const transfers = Array(25).fill(null).map(() => ({ 
        to: Keypair.generate().publicKey.toBase58(), 
        amount: 0.01 * LAMPORTS_PER_SOL 
      }));
      
      const params = {
        from: testKeypair.publicKey,
        transfers,
      };

      await expect(builder.buildBatchTransfer(params)).rejects.toThrow('Maximum 20 transfers');
    });

    it('should throw when total amount exceeds balance', async () => {
      mockConnection.getBalance.mockResolvedValue(0.5 * LAMPORTS_PER_SOL);
      const recipient2 = Keypair.generate().publicKey.toBase58();

      const params = {
        from: testKeypair.publicKey,
        transfers: [
          { to: validAddress, amount: 1 * LAMPORTS_PER_SOL },
          { to: recipient2, amount: 1 * LAMPORTS_PER_SOL },
        ],
      };

      await expect(builder.buildBatchTransfer(params)).rejects.toThrow('Insufficient balance');
    });
  });

  describe('simulateTransaction', () => {
    it('should return success for valid transaction', async () => {
      const params = {
        from: testKeypair.publicKey,
        to: validAddress,
        amount: 1 * LAMPORTS_PER_SOL,
      };

      const tx = await builder.buildTransfer(params);
      const result = await builder.simulateTransaction(tx);

      expect(result.success).toBe(true);
      expect(result.logs).toBeDefined();
      expect(result.unitsConsumed).toBe(50000);
    });

    it('should return failure for invalid transaction', async () => {
      mockConnection.simulateTransaction.mockResolvedValueOnce({
        value: {
          err: { InstructionError: [0, 'InvalidAccountData'] },
          logs: ['Error processing instruction'],
        },
      });

      const params = {
        from: testKeypair.publicKey,
        to: validAddress,
        amount: 1 * LAMPORTS_PER_SOL,
      };

      const tx = await builder.buildTransfer(params);
      const result = await builder.simulateTransaction(tx);

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });
  });

  describe('validateTransaction', () => {
    it('should validate a properly formed transaction', async () => {
      const params = {
        from: testKeypair.publicKey,
        to: validAddress,
        amount: 1 * LAMPORTS_PER_SOL,
      };

      const tx = await builder.buildTransfer(params);
      const isValid = await builder.validateTransaction(tx);

      expect(isValid).toBe(true);
    });
  });

  describe('estimateTransactionCost', () => {
    it('should estimate transaction cost', async () => {
      const params = {
        from: testKeypair.publicKey,
        to: validAddress,
        amount: 1 * LAMPORTS_PER_SOL,
      };

      const tx = await builder.buildTransfer(params);
      const cost = await builder.estimateTransactionCost(tx, 'medium');

      expect(cost).toBeGreaterThan(0);
    });
  });

  describe('getBalance', () => {
    it('should get SOL balance for a public key', async () => {
      mockConnection.getBalance.mockResolvedValue(5 * LAMPORTS_PER_SOL);

      const balance = await builder.getBalance(testKeypair.publicKey);

      expect(balance).toBe(5 * LAMPORTS_PER_SOL);
    });

    it('should get SOL balance for a string address', async () => {
      mockConnection.getBalance.mockResolvedValue(3 * LAMPORTS_PER_SOL);

      const balance = await builder.getBalance(validAddress);

      expect(balance).toBe(3 * LAMPORTS_PER_SOL);
    });
  });

  describe('buildMultiInstruction', () => {
    it('should build transaction with multiple instructions', async () => {
      const recipient2 = Keypair.generate().publicKey;
      
      const instruction1 = SystemProgram.transfer({
        fromPubkey: testKeypair.publicKey,
        toPubkey: new PublicKey(validAddress),
        lamports: 0.1 * LAMPORTS_PER_SOL,
      });

      const instruction2 = SystemProgram.transfer({
        fromPubkey: testKeypair.publicKey,
        toPubkey: recipient2,
        lamports: 0.2 * LAMPORTS_PER_SOL,
      });

      const tx = await builder.buildMultiInstruction(
        [instruction1, instruction2],
        testKeypair.publicKey
      );

      expect(tx.instructions).toHaveLength(2);
      expect(tx.feePayer?.equals(testKeypair.publicKey)).toBe(true);
    });

    it('should throw for empty instructions array', async () => {
      await expect(
        builder.buildMultiInstruction([], testKeypair.publicKey)
      ).rejects.toThrow('No instructions provided');
    });
  });
});
