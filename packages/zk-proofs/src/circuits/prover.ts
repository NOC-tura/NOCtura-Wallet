/**
 * Proof Generation and Verification
 * 
 * Implements the prover logic for generating ZK proofs from witnesses.
 * Uses Groth16 proof system compatible with snarkjs.
 */

import {
  computeNoteCommitment,
  computeNullifier,
  computeMerkleNode,
  bufferToBigInt,
} from './poseidon';
import { MerkleTree } from './merkleTree';
import type { 
  TransferWitness, 
  WithdrawalWitness, 
  DepositWitness,
  PublicSignals 
} from './witness';

/**
 * Proof artifact structure (Groth16 format)
 */
export interface Groth16Proof {
  pi_a: [string, string, string];
  pi_b: [[string, string], [string, string], [string, string]];
  pi_c: [string, string, string];
  protocol: 'groth16';
  curve: 'bn128';
}

/**
 * Complete proof with public signals
 */
export interface ProofBundle {
  proof: Groth16Proof;
  publicSignals: string[];
}

/**
 * Prover configuration
 */
export interface ProverConfig {
  wasmPath?: string;
  zkeyPath?: string;
  useRemoteProver?: boolean;
  remoteProverUrl?: string;
}

/**
 * Local proof generator (uses snarkjs internally when available)
 */
export class LocalProver {
  private config: ProverConfig;
  private initialized: boolean = false;

  constructor(config: ProverConfig = {}) {
    this.config = config;
  }

  /**
   * Initialize the prover with circuit artifacts
   */
  async initialize(): Promise<void> {
    // In production, load WASM and zkey files
    this.initialized = true;
  }

  /**
   * Generate proof for a shielded transfer
   */
  async proveTransfer(witness: TransferWitness): Promise<ProofBundle> {
    this.ensureInitialized();
    
    // Verify witness constraints
    this.verifyTransferConstraints(witness);
    
    // In production, this would call snarkjs.groth16.fullProve()
    // For now, generate a deterministic placeholder proof
    const proof = this.generatePlaceholderProof(witness);
    
    const publicSignals = [
      witness.merkleRoot.toString(),
      ...witness.nullifiers.map(n => n.toString()),
      ...witness.outputCommitments.map(c => c.toString()),
    ];
    
    return { proof, publicSignals };
  }

  /**
   * Generate proof for a deposit
   */
  async proveDeposit(witness: DepositWitness): Promise<ProofBundle> {
    this.ensureInitialized();
    
    // Verify the commitment is correctly computed
    const expectedCommitment = computeNoteCommitment(
      witness.outputNote.owner,
      witness.outputNote.value,
      witness.randomness,
      witness.outputNote.assetType
    );
    
    if (expectedCommitment !== witness.outputNote.commitment) {
      throw new Error('Invalid note commitment');
    }
    
    const proof = this.generatePlaceholderProof(witness);
    
    const publicSignals = [
      witness.outputNote.commitment.toString(),
      witness.amount.toString(),
      bufferToBigInt(new TextEncoder().encode(witness.sourceAddress)).toString(),
    ];
    
    return { proof, publicSignals };
  }

  /**
   * Generate proof for a withdrawal
   */
  async proveWithdrawal(witness: WithdrawalWitness): Promise<ProofBundle> {
    this.ensureInitialized();
    
    // Verify Merkle proof
    if (!MerkleTree.verifyProof(witness.inputMerkleProof)) {
      throw new Error('Invalid Merkle proof');
    }
    
    // Verify nullifier computation
    const expectedNullifier = computeNullifier(
      witness.inputNote.commitment,
      witness.secretKey,
      BigInt(witness.inputNote.leafIndex)
    );
    
    if (expectedNullifier !== witness.nullifier) {
      throw new Error('Invalid nullifier');
    }
    
    const proof = this.generatePlaceholderProof(witness);
    
    const publicSignals = [
      witness.merkleRoot.toString(),
      witness.nullifier.toString(),
      witness.amount.toString(),
      bufferToBigInt(new TextEncoder().encode(witness.recipientAddress)).toString(),
    ];
    
    if (witness.changeCommitment) {
      publicSignals.push(witness.changeCommitment.toString());
    }
    
    return { proof, publicSignals };
  }

  /**
   * Verify transfer witness constraints
   */
  private verifyTransferConstraints(witness: TransferWitness): void {
    // Check value conservation
    const inputSum = witness.inputNotes.reduce((sum, n) => sum + n.value, 0n);
    const outputSum = witness.outputNotes.reduce((sum, n) => sum + n.value, 0n);
    const feeAmount = witness.feeAmount ?? 0n;
    
    if (inputSum !== outputSum + feeAmount) {
      throw new Error(`Value not conserved: ${inputSum} !== ${outputSum} + ${feeAmount}`);
    }
    
    // Verify each Merkle proof
    for (const proof of witness.inputMerkleProofs) {
      if (!MerkleTree.verifyProof(proof)) {
        throw new Error('Invalid Merkle proof in transfer');
      }
    }
    
    // Verify nullifiers
    for (let i = 0; i < witness.inputNotes.length; i++) {
      const note = witness.inputNotes[i];
      const expectedNullifier = computeNullifier(
        note.commitment,
        witness.secretKey,
        BigInt(note.leafIndex)
      );
      
      if (expectedNullifier !== note.nullifier) {
        throw new Error(`Invalid nullifier for input ${i}`);
      }
    }
    
    // Verify output commitments
    for (const note of witness.outputNotes) {
      const expectedCommitment = computeNoteCommitment(
        note.owner,
        note.value,
        note.randomness,
        note.assetType
      );
      
      if (expectedCommitment !== note.commitment) {
        throw new Error('Invalid output commitment');
      }
    }
  }

  /**
   * Generate a placeholder proof (for development)
   * In production, this would use actual ZK proving
   */
  private generatePlaceholderProof(_witness: unknown): Groth16Proof {
    // Generate deterministic but unique-looking proof values
    const timestamp = Date.now().toString(16);
    const randomPart = Math.random().toString(16).slice(2, 10);
    
    return {
      pi_a: [
        `0x${timestamp}a1${randomPart}`,
        `0x${timestamp}a2${randomPart}`,
        '0x1',
      ],
      pi_b: [
        [`0x${timestamp}b11${randomPart}`, `0x${timestamp}b12${randomPart}`],
        [`0x${timestamp}b21${randomPart}`, `0x${timestamp}b22${randomPart}`],
        ['0x1', '0x0'],
      ],
      pi_c: [
        `0x${timestamp}c1${randomPart}`,
        `0x${timestamp}c2${randomPart}`,
        '0x1',
      ],
      protocol: 'groth16',
      curve: 'bn128',
    };
  }

  private ensureInitialized(): void {
    if (!this.initialized) {
      throw new Error('Prover not initialized. Call initialize() first.');
    }
  }
}

/**
 * Proof verifier
 */
export class ProofVerifier {
  private verificationKey: unknown;

  constructor(verificationKey?: unknown) {
    this.verificationKey = verificationKey;
  }

  /**
   * Verify a Groth16 proof
   */
  async verify(proof: Groth16Proof, publicSignals: string[]): Promise<boolean> {
    // In production, this would use snarkjs.groth16.verify()
    // For now, do basic validation
    
    if (proof.protocol !== 'groth16') {
      return false;
    }
    
    if (proof.curve !== 'bn128') {
      return false;
    }
    
    if (!proof.pi_a || !proof.pi_b || !proof.pi_c) {
      return false;
    }
    
    // Validate public signals are present
    if (!publicSignals || publicSignals.length === 0) {
      return false;
    }
    
    // In development mode, accept placeholder proofs
    // In production, perform actual cryptographic verification
    return true;
  }

  /**
   * Verify nullifier hasn't been spent
   */
  async verifyNullifierUnspent(nullifier: bigint, spentNullifiers: Set<bigint>): Promise<boolean> {
    return !spentNullifiers.has(nullifier);
  }

  /**
   * Verify Merkle root is valid (exists in history)
   */
  async verifyMerkleRoot(root: bigint, validRoots: Set<bigint>): Promise<boolean> {
    return validRoots.has(root);
  }
}

/**
 * Encode proof for on-chain submission
 */
export function encodeProofForSolana(bundle: ProofBundle): Uint8Array {
  const encoder = new TextEncoder();
  const jsonStr = JSON.stringify(bundle);
  return encoder.encode(jsonStr);
}

/**
 * Decode proof from on-chain data
 */
export function decodeProofFromSolana(data: Uint8Array): ProofBundle {
  const decoder = new TextDecoder();
  const jsonStr = decoder.decode(data);
  return JSON.parse(jsonStr);
}
