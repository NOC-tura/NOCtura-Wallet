/**
 * Poseidon Hash Implementation for ZK Proofs
 * 
 * Poseidon is a ZK-friendly hash function designed for efficient SNARK proving.
 * This implementation uses poseidon-lite for browser/node compatibility.
 */

import { poseidon2, poseidon3, poseidon4 } from 'poseidon-lite';

export type PoseidonHash = bigint;

/**
 * Hash two field elements using Poseidon
 */
export function poseidonHash2(a: bigint, b: bigint): PoseidonHash {
  return poseidon2([a, b]);
}

/**
 * Hash three field elements using Poseidon
 */
export function poseidonHash3(a: bigint, b: bigint, c: bigint): PoseidonHash {
  return poseidon3([a, b, c]);
}

/**
 * Hash four field elements using Poseidon
 */
export function poseidonHash4(a: bigint, b: bigint, c: bigint, d: bigint): PoseidonHash {
  return poseidon4([a, b, c, d]);
}

/**
 * Generate a note commitment
 * commitment = Poseidon(owner, value, randomness, assetType)
 * 
 * @param owner - Owner's public key as bigint
 * @param value - Note value in lamports
 * @param randomness - Random blinding factor
 * @param assetType - Asset type identifier (0 for SOL, mint pubkey hash for SPL tokens)
 */
export function computeNoteCommitment(
  owner: bigint,
  value: bigint,
  randomness: bigint,
  assetType: bigint = 0n
): PoseidonHash {
  return poseidon4([owner, value, randomness, assetType]);
}

/**
 * Generate a nullifier for a note
 * nullifier = Poseidon(commitment, secretKey, leafIndex)
 * 
 * The nullifier uniquely identifies when a note is spent without revealing which note.
 * 
 * @param commitment - The note commitment
 * @param secretKey - Owner's secret key
 * @param leafIndex - Position in the Merkle tree
 */
export function computeNullifier(
  commitment: bigint,
  secretKey: bigint,
  leafIndex: bigint
): PoseidonHash {
  return poseidon3([commitment, secretKey, leafIndex]);
}

/**
 * Compute Merkle tree node hash
 * node = Poseidon(left, right)
 */
export function computeMerkleNode(left: bigint, right: bigint): PoseidonHash {
  return poseidon2([left, right]);
}

/**
 * Convert a buffer to a bigint (for hashing public keys, etc.)
 */
export function bufferToBigInt(buffer: Uint8Array): bigint {
  let result = 0n;
  for (let i = 0; i < buffer.length; i++) {
    result = (result << 8n) | BigInt(buffer[i]);
  }
  return result;
}

/**
 * Convert a bigint to a fixed-size buffer
 */
export function bigIntToBuffer(value: bigint, length: number = 32): Uint8Array {
  const buffer = new Uint8Array(length);
  let remaining = value;
  for (let i = length - 1; i >= 0; i--) {
    buffer[i] = Number(remaining & 0xffn);
    remaining >>= 8n;
  }
  return buffer;
}

/**
 * Generate cryptographic randomness as bigint
 */
export function generateRandomness(): bigint {
  const bytes = new Uint8Array(32);
  if (typeof globalThis.crypto !== 'undefined') {
    globalThis.crypto.getRandomValues(bytes);
  } else {
    // Fallback for environments without crypto
    for (let i = 0; i < bytes.length; i++) {
      bytes[i] = Math.floor(Math.random() * 256);
    }
  }
  return bufferToBigInt(bytes);
}
