/**
 * ZK-Proofs Package - Circuit Implementations
 * 
 * Exports all circuit-related modules for ZK proof generation and verification.
 */

// Cryptographic primitives
export {
  poseidonHash2,
  poseidonHash3,
  poseidonHash4,
  computeNoteCommitment,
  computeNullifier,
  computeMerkleNode,
  bufferToBigInt,
  bigIntToBuffer,
  generateRandomness,
  type PoseidonHash,
} from './poseidon';

// Merkle tree implementation
export {
  MerkleTree,
  SparseMerkleTree,
  FIELD_PRIME,
  EMPTY_LEAF,
  type MerkleProof,
} from './merkleTree';

// Note structures
export {
  AssetType,
  createNote,
  recomputeCommitment,
  verifyNoteIntegrity,
  computeNoteNullifier,
  makeSpendable,
  serializeNote,
  deserializeNote,
  encryptNoteData,
  decryptNoteData,
  selectNotesForSpending,
  computeTotalValue,
  filterNotesByAsset,
  type Note,
  type SerializedNote,
  type SpendableNote,
} from './note';

// Witness generation
export {
  generateTransferWitness,
  generateDepositWitness,
  generateWithdrawalWitness,
  extractTransferPublicSignals,
  extractWithdrawalPublicSignals,
  serializeWitness,
  deserializeWitness,
  type TransferWitness,
  type DepositWitness,
  type WithdrawalWitness,
  type PublicSignals,
} from './witness';

// Proof generation and verification
export {
  LocalProver,
  ProofVerifier,
  encodeProofForSolana,
  decodeProofFromSolana,
  type Groth16Proof,
  type ProofBundle,
  type ProverConfig,
} from './prover';
