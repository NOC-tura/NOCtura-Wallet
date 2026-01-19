/**
 * Unit tests for ZK Proof Circuits
 */

import {
  poseidonHash2,
  poseidonHash3,
  poseidonHash4,
  computeNoteCommitment,
  computeNullifier,
  computeMerkleNode,
  bufferToBigInt,
  bigIntToBuffer,
  generateRandomness,
} from '../src/circuits/poseidon';

describe('Poseidon Hash Functions', () => {
  describe('poseidonHash2', () => {
    it('should produce consistent hash for same inputs', () => {
      const a = 123n;
      const b = 456n;
      
      const hash1 = poseidonHash2(a, b);
      const hash2 = poseidonHash2(a, b);
      
      expect(hash1).toBe(hash2);
    });

    it('should produce different hashes for different inputs', () => {
      const hash1 = poseidonHash2(1n, 2n);
      const hash2 = poseidonHash2(1n, 3n);
      const hash3 = poseidonHash2(2n, 2n);
      
      expect(hash1).not.toBe(hash2);
      expect(hash1).not.toBe(hash3);
    });

    it('should handle large numbers', () => {
      const a = 2n ** 200n;
      const b = 2n ** 250n;
      
      const hash = poseidonHash2(a, b);
      expect(typeof hash).toBe('bigint');
      expect(hash).toBeGreaterThan(0n);
    });
  });

  describe('poseidonHash3', () => {
    it('should hash three elements', () => {
      const hash = poseidonHash3(1n, 2n, 3n);
      expect(typeof hash).toBe('bigint');
      expect(hash).toBeGreaterThan(0n);
    });
  });

  describe('poseidonHash4', () => {
    it('should hash four elements', () => {
      const hash = poseidonHash4(1n, 2n, 3n, 4n);
      expect(typeof hash).toBe('bigint');
      expect(hash).toBeGreaterThan(0n);
    });
  });

  describe('computeNoteCommitment', () => {
    it('should compute deterministic commitment', () => {
      const owner = 12345n;
      const value = 1000000n;
      const randomness = 99999n;
      const assetType = 0n;
      
      const commitment1 = computeNoteCommitment(owner, value, randomness, assetType);
      const commitment2 = computeNoteCommitment(owner, value, randomness, assetType);
      
      expect(commitment1).toBe(commitment2);
    });

    it('should produce different commitments for different randomness', () => {
      const owner = 12345n;
      const value = 1000000n;
      
      const commitment1 = computeNoteCommitment(owner, value, 1n, 0n);
      const commitment2 = computeNoteCommitment(owner, value, 2n, 0n);
      
      expect(commitment1).not.toBe(commitment2);
    });
  });

  describe('computeNullifier', () => {
    it('should compute deterministic nullifier', () => {
      const commitment = 12345n;
      const secretKey = 67890n;
      const leafIndex = 42n;
      
      const nullifier1 = computeNullifier(commitment, secretKey, leafIndex);
      const nullifier2 = computeNullifier(commitment, secretKey, leafIndex);
      
      expect(nullifier1).toBe(nullifier2);
    });

    it('should produce different nullifiers for different leaf indices', () => {
      const commitment = 12345n;
      const secretKey = 67890n;
      
      const nullifier1 = computeNullifier(commitment, secretKey, 1n);
      const nullifier2 = computeNullifier(commitment, secretKey, 2n);
      
      expect(nullifier1).not.toBe(nullifier2);
    });
  });

  describe('computeMerkleNode', () => {
    it('should compute parent node from children', () => {
      const left = 100n;
      const right = 200n;
      
      const parent = computeMerkleNode(left, right);
      
      expect(typeof parent).toBe('bigint');
      expect(parent).toBeGreaterThan(0n);
    });

    it('should be consistent', () => {
      const left = 100n;
      const right = 200n;
      
      const parent1 = computeMerkleNode(left, right);
      const parent2 = computeMerkleNode(left, right);
      
      expect(parent1).toBe(parent2);
    });
  });

  describe('bufferToBigInt / bigIntToBuffer', () => {
    it('should round-trip correctly', () => {
      const original = new Uint8Array([1, 2, 3, 4, 5, 6, 7, 8]);
      
      const bigInt = bufferToBigInt(original);
      const buffer = bigIntToBuffer(bigInt, 8);
      
      expect(Array.from(buffer)).toEqual(Array.from(original));
    });

    it('should handle 32-byte values', () => {
      const original = new Uint8Array(32);
      original[0] = 0xff;
      original[31] = 0x01;
      
      const bigInt = bufferToBigInt(original);
      const buffer = bigIntToBuffer(bigInt, 32);
      
      expect(Array.from(buffer)).toEqual(Array.from(original));
    });
  });

  describe('generateRandomness', () => {
    it('should generate 256-bit randomness', () => {
      const random = generateRandomness();
      
      expect(typeof random).toBe('bigint');
      expect(random).toBeGreaterThan(0n);
    });

    it('should generate different values each time', () => {
      const random1 = generateRandomness();
      const random2 = generateRandomness();
      
      expect(random1).not.toBe(random2);
    });
  });
});
