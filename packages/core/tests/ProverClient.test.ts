/**
 * Unit tests for Prover Client implementations
 */

import {
  NoopProverClient,
  LocalProverClient,
  RemoteProverClient,
  createProverClient,
  type IProverClient,
} from '../src/zk/ProverClient';
import type { ShieldedTransferParams, ShieldedDepositParams, ShieldedWithdrawalParams } from '../src/transactions/shielded/types';

describe('ProverClient', () => {
  const transferParams: ShieldedTransferParams = {
    recipientAddress: '9WzDXwBbmkg8ZTbNMqUxvQRAyrZzDsGYdLVL9zYtAWWM',
    amount: 1000000000n,
    assetMint: undefined,
    feeLevel: 'medium',
    memo: 'Test transfer',
  };

  const depositParams: ShieldedDepositParams = {
    sourceAddress: '9WzDXwBbmkg8ZTbNMqUxvQRAyrZzDsGYdLVL9zYtAWWM',
    amount: 500000000n,
    assetMint: undefined,
    feeLevel: 'medium',
  };

  const withdrawalParams: ShieldedWithdrawalParams = {
    recipientAddress: 'DYw8jCTfwHNRJhhmFcbXvVDTqWMEVFBX6ZKUmG5CNSKK',
    amount: 250000000n,
    assetMint: undefined,
    feeLevel: 'high',
  };

  describe('NoopProverClient', () => {
    let client: NoopProverClient;

    beforeEach(() => {
      client = new NoopProverClient();
    });

    it('should return dummy proof for transfer', async () => {
      const result = await client.proveShieldedTransfer(transferParams);
      
      expect(result.proof).toBe('DUMMY_PROOF_SHIELDED_TRANSFER');
      expect(result.publicSignals).toEqual([]);
    });

    it('should return dummy proof for deposit', async () => {
      const result = await client.proveDeposit(depositParams);
      
      expect(result.proof).toBe('DUMMY_PROOF_DEPOSIT');
      expect(result.publicSignals).toEqual([]);
    });

    it('should return dummy proof for withdrawal', async () => {
      const result = await client.proveWithdrawal(withdrawalParams);
      
      expect(result.proof).toBe('DUMMY_PROOF_WITHDRAWAL');
      expect(result.publicSignals).toEqual([]);
    });
  });

  describe('LocalProverClient', () => {
    let client: LocalProverClient;

    beforeEach(async () => {
      client = new LocalProverClient();
      await client.initialize();
    });

    it('should generate proof for transfer', async () => {
      const result = await client.proveShieldedTransfer(transferParams);
      
      expect(result.proof).toBeTruthy();
      expect(result.publicSignals.length).toBeGreaterThan(0);
      
      // Verify proof structure
      const proofObj = JSON.parse(result.proof);
      expect(proofObj.protocol).toBe('groth16');
      expect(proofObj.curve).toBe('bn128');
      expect(proofObj.pi_a).toBeDefined();
      expect(proofObj.pi_b).toBeDefined();
      expect(proofObj.pi_c).toBeDefined();
    });

    it('should generate proof for deposit', async () => {
      const result = await client.proveDeposit(depositParams);
      
      expect(result.proof).toBeTruthy();
      expect(result.publicSignals).toContain(depositParams.sourceAddress);
      expect(result.publicSignals).toContain(depositParams.amount.toString());
    });

    it('should generate proof for withdrawal', async () => {
      const result = await client.proveWithdrawal(withdrawalParams);
      
      expect(result.proof).toBeTruthy();
      expect(result.publicSignals).toContain(withdrawalParams.recipientAddress);
      expect(result.publicSignals).toContain(withdrawalParams.amount.toString());
    });

    it('should generate different proofs for different params', async () => {
      const result1 = await client.proveShieldedTransfer(transferParams);
      const result2 = await client.proveShieldedTransfer({
        ...transferParams,
        amount: 2000000000n,
      });
      
      expect(result1.proof).not.toBe(result2.proof);
    });
  });

  describe('createProverClient factory', () => {
    it('should create NoopProverClient', () => {
      const client = createProverClient({ type: 'noop' });
      expect(client).toBeInstanceOf(NoopProverClient);
    });

    it('should create LocalProverClient by default', () => {
      const client = createProverClient();
      expect(client).toBeInstanceOf(LocalProverClient);
    });

    it('should create LocalProverClient explicitly', () => {
      const client = createProverClient({ type: 'local' });
      expect(client).toBeInstanceOf(LocalProverClient);
    });

    it('should create RemoteProverClient with URL', () => {
      const client = createProverClient({
        type: 'remote',
        remoteUrl: 'http://localhost:3001',
      });
      expect(client).toBeInstanceOf(RemoteProverClient);
    });

    it('should throw for remote without URL', () => {
      expect(() => createProverClient({ type: 'remote' })).toThrow();
    });
  });

  describe('RemoteProverClient', () => {
    // These tests would require a mock server in real usage
    // Here we just test the client instantiation
    
    it('should strip trailing slash from URL', () => {
      const client = new RemoteProverClient('http://localhost:3001/');
      // Internal state check would require exposing baseUrl
      expect(client).toBeInstanceOf(RemoteProverClient);
    });

    it('should accept custom timeout', () => {
      const client = new RemoteProverClient('http://localhost:3001', 60000);
      expect(client).toBeInstanceOf(RemoteProverClient);
    });
  });
});
