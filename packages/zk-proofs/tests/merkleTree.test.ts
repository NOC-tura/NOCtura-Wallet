/**
 * Unit tests for Merkle Tree
 */

import {
  MerkleTree,
  SparseMerkleTree,
  EMPTY_LEAF,
  type MerkleProof,
} from '../src/circuits/merkleTree';
import { computeMerkleNode } from '../src/circuits/poseidon';

describe('MerkleTree', () => {
  describe('constructor', () => {
    it('should create tree with specified depth', () => {
      const tree = new MerkleTree(10);
      expect(tree.capacity).toBe(2 ** 10);
      expect(tree.size).toBe(0);
    });

    it('should throw for invalid depth', () => {
      expect(() => new MerkleTree(0)).toThrow();
      expect(() => new MerkleTree(33)).toThrow();
    });

    it('should have zero values root when empty', () => {
      const tree = new MerkleTree(5);
      const emptyRoot = tree.root;
      expect(typeof emptyRoot).toBe('bigint');
    });
  });

  describe('insert', () => {
    it('should insert leaves and update root', () => {
      const tree = new MerkleTree(5);
      const initialRoot = tree.root;
      
      tree.insert(12345n);
      
      expect(tree.size).toBe(1);
      expect(tree.root).not.toBe(initialRoot);
    });

    it('should return correct indices', () => {
      const tree = new MerkleTree(5);
      
      const idx0 = tree.insert(100n);
      const idx1 = tree.insert(200n);
      const idx2 = tree.insert(300n);
      
      expect(idx0).toBe(0);
      expect(idx1).toBe(1);
      expect(idx2).toBe(2);
    });

    it('should throw when full', () => {
      const tree = new MerkleTree(2); // capacity = 4
      
      tree.insert(1n);
      tree.insert(2n);
      tree.insert(3n);
      tree.insert(4n);
      
      expect(() => tree.insert(5n)).toThrow('full');
    });
  });

  describe('generateProof', () => {
    it('should generate valid proof for leaf', () => {
      const tree = new MerkleTree(5);
      const leaf = 12345n;
      const index = tree.insert(leaf);
      
      const proof = tree.generateProof(index);
      
      expect(proof.leaf).toBe(leaf);
      expect(proof.leafIndex).toBe(index);
      expect(proof.root).toBe(tree.root);
      expect(proof.pathElements.length).toBe(5);
      expect(proof.pathIndices.length).toBe(5);
    });

    it('should generate verifiable proofs', () => {
      const tree = new MerkleTree(5);
      
      tree.insert(100n);
      tree.insert(200n);
      const idx = tree.insert(300n);
      tree.insert(400n);
      
      const proof = tree.generateProof(idx);
      
      expect(MerkleTree.verifyProof(proof)).toBe(true);
    });

    it('should throw for invalid index', () => {
      const tree = new MerkleTree(5);
      tree.insert(100n);
      
      expect(() => tree.generateProof(-1)).toThrow();
      expect(() => tree.generateProof(5)).toThrow();
    });
  });

  describe('verifyProof', () => {
    it('should verify valid proof', () => {
      const tree = new MerkleTree(10);
      
      for (let i = 0; i < 10; i++) {
        tree.insert(BigInt(i * 1000));
      }
      
      const proof = tree.generateProof(5);
      expect(MerkleTree.verifyProof(proof)).toBe(true);
    });

    it('should reject proof with wrong root', () => {
      const tree = new MerkleTree(5);
      tree.insert(100n);
      
      const proof = tree.generateProof(0);
      const modifiedProof = { ...proof, root: 999999n };
      
      expect(MerkleTree.verifyProof(modifiedProof)).toBe(false);
    });

    it('should reject proof with wrong leaf', () => {
      const tree = new MerkleTree(5);
      tree.insert(100n);
      
      const proof = tree.generateProof(0);
      const modifiedProof = { ...proof, leaf: 999999n };
      
      expect(MerkleTree.verifyProof(modifiedProof)).toBe(false);
    });
  });

  describe('getLeaves', () => {
    it('should return all inserted leaves', () => {
      const tree = new MerkleTree(5);
      const values = [100n, 200n, 300n, 400n];
      
      for (const v of values) {
        tree.insert(v);
      }
      
      expect(tree.getLeaves()).toEqual(values);
    });
  });

  describe('serialization', () => {
    it('should serialize and deserialize correctly', () => {
      const tree = new MerkleTree(5);
      tree.insert(100n);
      tree.insert(200n);
      tree.insert(300n);
      
      const serialized = tree.serialize();
      const restored = MerkleTree.deserialize(serialized);
      
      expect(restored.root).toBe(tree.root);
      expect(restored.size).toBe(tree.size);
      expect(restored.getLeaves()).toEqual(tree.getLeaves());
    });
  });
});

describe('SparseMerkleTree', () => {
  describe('update and get', () => {
    it('should update and retrieve leaves', () => {
      const tree = new SparseMerkleTree(20);
      
      tree.update(0n, 100n);
      tree.update(1000n, 200n);
      tree.update(999999n, 300n);
      
      expect(tree.get(0n)).toBe(100n);
      expect(tree.get(1000n)).toBe(200n);
      expect(tree.get(999999n)).toBe(300n);
    });

    it('should return EMPTY_LEAF for unset indices', () => {
      const tree = new SparseMerkleTree(20);
      
      expect(tree.get(12345n)).toBe(EMPTY_LEAF);
    });
  });

  describe('generateProof', () => {
    it('should generate valid proofs', () => {
      const tree = new SparseMerkleTree(10);
      
      tree.update(5n, 500n);
      
      const proof = tree.generateProof(5n);
      
      expect(proof.leaf).toBe(500n);
      expect(proof.root).toBe(tree.root);
      expect(MerkleTree.verifyProof(proof)).toBe(true);
    });
  });
});
