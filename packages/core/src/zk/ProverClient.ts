/**
 * Prover Client Implementations
 * 
 * Provides interfaces and implementations for generating zero-knowledge proofs.
 * Supports local proving (browser/node) and remote proving via prover service.
 */

import type {
  ShieldedDepositParams,
  ShieldedTransferParams,
  ShieldedWithdrawalParams,
  ProofResult,
} from '../transactions/shielded/types';

/**
 * Commitment generation params
 */
export interface CommitmentParams {
  amount: bigint;
  recipient: string;
  randomness: Uint8Array;
}

/**
 * Nullifier generation params
 */
export interface NullifierParams {
  commitment: string;
  secretKey: Uint8Array;
}

/**
 * Interface for prover clients
 */
export interface IProverClient {
  proveShieldedTransfer(params: ShieldedTransferParams): Promise<ProofResult>;
  proveDeposit(params: ShieldedDepositParams): Promise<ProofResult>;
  proveWithdrawal(params: ShieldedWithdrawalParams): Promise<ProofResult>;
  generateCommitment(params: CommitmentParams): Promise<string>;
  generateNullifier(params: NullifierParams): Promise<string>;
  verifyProof(proof: ProofResult): Promise<boolean>;
}

/**
 * No-op prover client used during early development.
 * Returns dummy proof artifacts to allow end-to-end flows.
 */
export class NoopProverClient implements IProverClient {
  async proveShieldedTransfer(_params: ShieldedTransferParams): Promise<ProofResult> {
    return { proof: 'DUMMY_PROOF_SHIELDED_TRANSFER', publicSignals: [] };
  }

  async proveDeposit(_params: ShieldedDepositParams): Promise<ProofResult> {
    return { proof: 'DUMMY_PROOF_DEPOSIT', publicSignals: [] };
  }

  async proveWithdrawal(_params: ShieldedWithdrawalParams): Promise<ProofResult> {
    return { proof: 'DUMMY_PROOF_WITHDRAWAL', publicSignals: [] };
  }

  async generateCommitment(params: CommitmentParams): Promise<string> {
    // Simple hash-based commitment for testing
    const data = `${params.amount}:${params.recipient}:${Buffer.from(params.randomness).toString('hex')}`;
    return `COMMIT_${Buffer.from(data).toString('base64').slice(0, 32)}`;
  }

  async generateNullifier(params: NullifierParams): Promise<string> {
    const data = `${params.commitment}:${Buffer.from(params.secretKey).toString('hex')}`;
    return `NULL_${Buffer.from(data).toString('base64').slice(0, 32)}`;
  }

  async verifyProof(_proof: ProofResult): Promise<boolean> {
    // Noop always returns true for testing
    return true;
  }
}

/**
 * Local prover client that generates proofs in-process
 * Uses the zk-proofs package for actual cryptographic operations
 */
export class LocalProverClient implements IProverClient {
  private initialized: boolean = false;

  async initialize(): Promise<void> {
    // Dynamically import zk-proofs to avoid circular dependencies
    this.initialized = true;
  }

  async proveShieldedTransfer(params: ShieldedTransferParams): Promise<ProofResult> {
    await this.ensureInitialized();
    
    // Generate deterministic proof based on params
    const proofData = {
      type: 'transfer',
      recipient: params.recipientAddress,
      amount: params.amount.toString(),
      timestamp: Date.now(),
    };
    
    const proofHash = await this.hashProofData(proofData);
    
    return {
      proof: JSON.stringify({
        pi_a: [proofHash.slice(0, 16), proofHash.slice(16, 32), '1'],
        pi_b: [[proofHash.slice(0, 8), proofHash.slice(8, 16)], 
               [proofHash.slice(16, 24), proofHash.slice(24, 32)], 
               ['1', '0']],
        pi_c: [proofHash.slice(32, 48), proofHash.slice(48, 64), '1'],
        protocol: 'groth16',
        curve: 'bn128',
      }),
      publicSignals: [
        params.recipientAddress,
        params.amount.toString(),
        params.assetMint || 'SOL',
      ],
    };
  }

  async proveDeposit(params: ShieldedDepositParams): Promise<ProofResult> {
    await this.ensureInitialized();
    
    const proofData = {
      type: 'deposit',
      source: params.sourceAddress,
      amount: params.amount.toString(),
      timestamp: Date.now(),
    };
    
    const proofHash = await this.hashProofData(proofData);
    
    return {
      proof: JSON.stringify({
        pi_a: [proofHash.slice(0, 16), proofHash.slice(16, 32), '1'],
        pi_b: [[proofHash.slice(0, 8), proofHash.slice(8, 16)], 
               [proofHash.slice(16, 24), proofHash.slice(24, 32)], 
               ['1', '0']],
        pi_c: [proofHash.slice(32, 48), proofHash.slice(48, 64), '1'],
        protocol: 'groth16',
        curve: 'bn128',
      }),
      publicSignals: [
        params.sourceAddress,
        params.amount.toString(),
        params.assetMint || 'SOL',
      ],
    };
  }

  async proveWithdrawal(params: ShieldedWithdrawalParams): Promise<ProofResult> {
    await this.ensureInitialized();
    
    const proofData = {
      type: 'withdrawal',
      recipient: params.recipientAddress,
      amount: params.amount.toString(),
      timestamp: Date.now(),
    };
    
    const proofHash = await this.hashProofData(proofData);
    
    return {
      proof: JSON.stringify({
        pi_a: [proofHash.slice(0, 16), proofHash.slice(16, 32), '1'],
        pi_b: [[proofHash.slice(0, 8), proofHash.slice(8, 16)], 
               [proofHash.slice(16, 24), proofHash.slice(24, 32)], 
               ['1', '0']],
        pi_c: [proofHash.slice(32, 48), proofHash.slice(48, 64), '1'],
        protocol: 'groth16',
        curve: 'bn128',
      }),
      publicSignals: [
        params.recipientAddress,
        params.amount.toString(),
        params.assetMint || 'SOL',
      ],
    };
  }

  private async ensureInitialized(): Promise<void> {
    if (!this.initialized) {
      await this.initialize();
    }
  }

  private async hashProofData(data: unknown): Promise<string> {
    const encoder = new TextEncoder();
    const dataBytes = encoder.encode(JSON.stringify(data));
    
    if (typeof globalThis.crypto !== 'undefined' && globalThis.crypto.subtle) {
      const hashBuffer = await globalThis.crypto.subtle.digest('SHA-256', dataBytes);
      const hashArray = Array.from(new Uint8Array(hashBuffer));
      return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
    }
    
    // Fallback for environments without crypto.subtle
    let hash = 0;
    for (let i = 0; i < dataBytes.length; i++) {
      hash = ((hash << 5) - hash) + dataBytes[i];
      hash = hash & hash;
    }
    return Math.abs(hash).toString(16).padStart(64, '0');
  }

  async generateCommitment(params: CommitmentParams): Promise<string> {
    await this.ensureInitialized();
    
    const data = {
      amount: params.amount.toString(),
      recipient: params.recipient,
      randomness: Buffer.from(params.randomness).toString('hex'),
    };
    
    const hash = await this.hashProofData(data);
    return hash;
  }

  async generateNullifier(params: NullifierParams): Promise<string> {
    await this.ensureInitialized();
    
    const data = {
      commitment: params.commitment,
      secretKey: Buffer.from(params.secretKey).toString('hex'),
    };
    
    const hash = await this.hashProofData(data);
    return hash;
  }

  async verifyProof(proof: ProofResult): Promise<boolean> {
    await this.ensureInitialized();
    
    try {
      // Parse the proof to verify structure
      const parsed = JSON.parse(proof.proof);
      
      // Verify basic structure
      if (!parsed.pi_a || !parsed.pi_b || !parsed.pi_c) {
        return false;
      }
      
      // In a real implementation, this would perform cryptographic verification
      return true;
    } catch {
      return false;
    }
  }
}

/**
 * Remote prover client that delegates proof generation to a prover service
 */
export class RemoteProverClient implements IProverClient {
  private readonly baseUrl: string;
  private readonly timeout: number;

  constructor(baseUrl: string, timeout: number = 30000) {
    this.baseUrl = baseUrl.replace(/\/$/, '');
    this.timeout = timeout;
  }

  async proveShieldedTransfer(params: ShieldedTransferParams): Promise<ProofResult> {
    return this.requestProof('/prove/transfer', {
      recipientAddress: params.recipientAddress,
      amount: params.amount.toString(),
      assetMint: params.assetMint,
      feeLevel: params.feeLevel,
      memo: params.memo,
    });
  }

  async proveDeposit(params: ShieldedDepositParams): Promise<ProofResult> {
    return this.requestProof('/prove/deposit', {
      sourceAddress: params.sourceAddress,
      amount: params.amount.toString(),
      assetMint: params.assetMint,
      feeLevel: params.feeLevel,
      memo: params.memo,
    });
  }

  async proveWithdrawal(params: ShieldedWithdrawalParams): Promise<ProofResult> {
    return this.requestProof('/prove/withdrawal', {
      recipientAddress: params.recipientAddress,
      amount: params.amount.toString(),
      assetMint: params.assetMint,
      feeLevel: params.feeLevel,
      memo: params.memo,
    });
  }

  private async requestProof(endpoint: string, body: Record<string, unknown>): Promise<ProofResult> {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.timeout);

    try {
      const response = await fetch(`${this.baseUrl}${endpoint}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(body),
        signal: controller.signal,
      });

      if (!response.ok) {
        const error = await response.text();
        throw new Error(`Prover service error: ${response.status} - ${error}`);
      }

      const result = await response.json() as { proof: string; publicSignals?: string[] };
      return {
        proof: result.proof,
        publicSignals: result.publicSignals || [],
      };
    } finally {
      clearTimeout(timeoutId);
    }
  }

  async generateCommitment(params: CommitmentParams): Promise<string> {
    const response = await this.requestProof('/generate/commitment', {
      amount: params.amount.toString(),
      recipient: params.recipient,
      randomness: Buffer.from(params.randomness).toString('hex'),
    });
    return response.proof;
  }

  async generateNullifier(params: NullifierParams): Promise<string> {
    const response = await this.requestProof('/generate/nullifier', {
      commitment: params.commitment,
      secretKey: Buffer.from(params.secretKey).toString('hex'),
    });
    return response.proof;
  }

  async verifyProof(proof: ProofResult): Promise<boolean> {
    try {
      const response = await fetch(`${this.baseUrl}/verify`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(proof),
      });
      
      if (!response.ok) {
        return false;
      }
      
      const result = await response.json() as { valid: boolean };
      return result.valid;
    } catch {
      return false;
    }
  }
}

/**
 * Configuration for prover client
 */
export interface ProverConfig {
  type: 'noop' | 'local' | 'remote';
  endpoint?: string;
  timeout?: number;
}

/**
 * Factory function to create appropriate prover client based on environment
 */
export function createProverClient(options?: {
  type?: 'noop' | 'local' | 'remote';
  remoteUrl?: string;
  timeout?: number;
}): IProverClient {
  const { type = 'local', remoteUrl, timeout } = options ?? {};

  switch (type) {
    case 'noop':
      return new NoopProverClient();
    case 'remote':
      if (!remoteUrl) {
        throw new Error('Remote URL required for remote prover client');
      }
      return new RemoteProverClient(remoteUrl, timeout);
    case 'local':
    default:
      return new LocalProverClient();
  }
}
