/**
 * Witness Generation for ZK Proofs
 * 
 * Witnesses contain all private inputs needed to generate a ZK proof.
 * The prover uses witnesses to demonstrate knowledge without revealing the values.
 */

import type { SpendableNote, Note } from './note';
import type { MerkleProof } from './merkleTree';

/**
 * Witness for a shielded transfer
 * Proves: "I know notes that sum to the output amounts, with valid Merkle proofs"
 */
export interface TransferWitness {
  // Input notes (being spent)
  inputNotes: SpendableNote[];
  inputMerkleProofs: MerkleProof[];
  
  // Output notes (being created)
  outputNotes: Note[];
  
  // Owner's secret key for nullifier computation
  secretKey: bigint;
  
  // Public inputs (these become public signals)
  merkleRoot: bigint;
  nullifiers: bigint[];
  outputCommitments: bigint[];
  
  // Optional fee info
  feeAmount?: bigint;
}

/**
 * Witness for a deposit (transparent -> shielded)
 */
export interface DepositWitness {
  // The note being created
  outputNote: Note;
  
  // Source address (public)
  sourceAddress: string;
  
  // Amount being deposited (public)
  amount: bigint;
  
  // Asset type
  assetMint?: string;
  
  // Randomness for commitment
  randomness: bigint;
}

/**
 * Witness for a withdrawal (shielded -> transparent)
 */
export interface WithdrawalWitness {
  // Input note being spent
  inputNote: SpendableNote;
  inputMerkleProof: MerkleProof;
  
  // Owner's secret key
  secretKey: bigint;
  
  // Destination address (public)
  recipientAddress: string;
  
  // Amount being withdrawn (public)
  amount: bigint;
  
  // Change note if not spending exact amount
  changeNote?: Note;
  
  // Public inputs
  merkleRoot: bigint;
  nullifier: bigint;
  changeCommitment?: bigint;
}

/**
 * Circuit public signals for verification
 */
export interface PublicSignals {
  merkleRoot: bigint;
  nullifiers: bigint[];
  commitments: bigint[];
  externalAmount?: bigint; // For deposits/withdrawals
  externalAddress?: bigint; // Hash of external address
}

/**
 * Generate witness for a shielded transfer
 */
export function generateTransferWitness(
  inputNotes: SpendableNote[],
  inputMerkleProofs: MerkleProof[],
  outputNotes: Note[],
  secretKey: bigint,
  feeAmount: bigint = 0n
): TransferWitness {
  // Validate inputs
  if (inputNotes.length !== inputMerkleProofs.length) {
    throw new Error('Mismatch between input notes and proofs');
  }
  
  if (inputNotes.length === 0) {
    throw new Error('Must have at least one input note');
  }
  
  if (outputNotes.length === 0) {
    throw new Error('Must have at least one output note');
  }
  
  // Verify conservation of value
  const inputSum = inputNotes.reduce((sum, n) => sum + n.value, 0n);
  const outputSum = outputNotes.reduce((sum, n) => sum + n.value, 0n);
  
  if (inputSum !== outputSum + feeAmount) {
    throw new Error(`Value mismatch: inputs=${inputSum}, outputs=${outputSum}, fee=${feeAmount}`);
  }
  
  // Extract public signals
  const merkleRoot = inputMerkleProofs[0].root;
  const nullifiers = inputNotes.map(n => n.nullifier);
  const outputCommitments = outputNotes.map(n => n.commitment);
  
  // Verify all proofs use same root
  for (const proof of inputMerkleProofs) {
    if (proof.root !== merkleRoot) {
      throw new Error('All inputs must be from the same Merkle root');
    }
  }
  
  return {
    inputNotes,
    inputMerkleProofs,
    outputNotes,
    secretKey,
    merkleRoot,
    nullifiers,
    outputCommitments,
    feeAmount,
  };
}

/**
 * Generate witness for a deposit
 */
export function generateDepositWitness(
  outputNote: Note,
  sourceAddress: string,
  amount: bigint,
  assetMint?: string
): DepositWitness {
  if (outputNote.value !== amount) {
    throw new Error('Note value must match deposit amount');
  }
  
  return {
    outputNote,
    sourceAddress,
    amount,
    assetMint,
    randomness: outputNote.randomness,
  };
}

/**
 * Generate witness for a withdrawal
 */
export function generateWithdrawalWitness(
  inputNote: SpendableNote,
  inputMerkleProof: MerkleProof,
  secretKey: bigint,
  recipientAddress: string,
  amount: bigint,
  changeNote?: Note
): WithdrawalWitness {
  // Verify amounts
  if (changeNote) {
    if (inputNote.value !== amount + changeNote.value) {
      throw new Error('Input value must equal withdrawal + change');
    }
  } else {
    if (inputNote.value !== amount) {
      throw new Error('Input value must equal withdrawal amount');
    }
  }
  
  return {
    inputNote,
    inputMerkleProof,
    secretKey,
    recipientAddress,
    amount,
    changeNote,
    merkleRoot: inputMerkleProof.root,
    nullifier: inputNote.nullifier,
    changeCommitment: changeNote?.commitment,
  };
}

/**
 * Extract public signals from a transfer witness
 */
export function extractTransferPublicSignals(witness: TransferWitness): PublicSignals {
  return {
    merkleRoot: witness.merkleRoot,
    nullifiers: witness.nullifiers,
    commitments: witness.outputCommitments,
  };
}

/**
 * Extract public signals from a withdrawal witness
 */
export function extractWithdrawalPublicSignals(
  witness: WithdrawalWitness,
  recipientHash: bigint
): PublicSignals {
  const commitments = witness.changeCommitment 
    ? [witness.changeCommitment]
    : [];
  
  return {
    merkleRoot: witness.merkleRoot,
    nullifiers: [witness.nullifier],
    commitments,
    externalAmount: witness.amount,
    externalAddress: recipientHash,
  };
}

/**
 * Serialize witness for transmission to prover
 */
export function serializeWitness(witness: TransferWitness | WithdrawalWitness | DepositWitness): string {
  return JSON.stringify(witness, (_, value) =>
    typeof value === 'bigint' ? value.toString() + 'n' : value
  );
}

/**
 * Deserialize witness from string
 */
export function deserializeWitness<T>(data: string): T {
  return JSON.parse(data, (_, value) => {
    if (typeof value === 'string' && value.endsWith('n')) {
      return BigInt(value.slice(0, -1));
    }
    return value;
  });
}
