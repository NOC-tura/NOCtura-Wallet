/**
 * Merkle Tree Implementation for Commitment Trees
 * 
 * Uses Poseidon hash for ZK-friendly proofs.
 * Supports incremental insertion and proof generation.
 */

import { computeMerkleNode, type PoseidonHash } from './poseidon';

// BN254 scalar field prime (for snarkjs compatibility)
export const FIELD_PRIME = 21888242871839275222246405745257275088548364400416034343698204186575808495617n;

// Default empty leaf value
export const EMPTY_LEAF = 0n;

export interface MerkleProof {
  root: bigint;
  leaf: bigint;
  leafIndex: number;
  pathElements: bigint[];
  pathIndices: number[]; // 0 for left, 1 for right
}

export class MerkleTree {
  private readonly depth: number;
  private readonly zeroValues: bigint[];
  private leaves: bigint[];
  private layers: bigint[][];
  private nextIndex: number;

  constructor(depth: number = 20) {
    if (depth < 1 || depth > 32) {
      throw new Error('Tree depth must be between 1 and 32');
    }
    
    this.depth = depth;
    this.leaves = [];
    this.nextIndex = 0;
    
    // Pre-compute zero values for each level
    this.zeroValues = this.computeZeroValues(depth);
    
    // Initialize layers
    this.layers = Array.from({ length: depth + 1 }, () => []);
    this.layers[0] = [];
  }

  /**
   * Compute zero values for empty subtrees at each level
   */
  private computeZeroValues(depth: number): bigint[] {
    const zeros: bigint[] = [EMPTY_LEAF];
    for (let i = 1; i <= depth; i++) {
      zeros[i] = computeMerkleNode(zeros[i - 1], zeros[i - 1]);
    }
    return zeros;
  }

  /**
   * Get the current Merkle root
   */
  get root(): bigint {
    if (this.leaves.length === 0) {
      return this.zeroValues[this.depth];
    }
    return this.layers[this.depth][0] ?? this.zeroValues[this.depth];
  }

  /**
   * Get the number of leaves inserted
   */
  get size(): number {
    return this.nextIndex;
  }

  /**
   * Get maximum capacity of the tree
   */
  get capacity(): number {
    return 2 ** this.depth;
  }

  /**
   * Insert a new leaf into the tree
   * @returns The index of the inserted leaf
   */
  insert(leaf: bigint): number {
    if (this.nextIndex >= this.capacity) {
      throw new Error('Merkle tree is full');
    }

    const index = this.nextIndex;
    this.leaves.push(leaf);
    this.layers[0].push(leaf);
    
    // Update path from leaf to root
    this.updatePath(index);
    
    this.nextIndex++;
    return index;
  }

  /**
   * Update the Merkle path after insertion
   */
  private updatePath(leafIndex: number): void {
    let currentIndex = leafIndex;
    
    for (let level = 0; level < this.depth; level++) {
      const isRightNode = currentIndex % 2 === 1;
      const siblingIndex = isRightNode ? currentIndex - 1 : currentIndex + 1;
      
      const left = isRightNode 
        ? (this.layers[level][siblingIndex] ?? this.zeroValues[level])
        : (this.layers[level][currentIndex] ?? this.zeroValues[level]);
      
      const right = isRightNode
        ? (this.layers[level][currentIndex] ?? this.zeroValues[level])
        : (this.layers[level][siblingIndex] ?? this.zeroValues[level]);
      
      const parentIndex = Math.floor(currentIndex / 2);
      const parentHash = computeMerkleNode(left, right);
      
      // Ensure layer exists
      if (!this.layers[level + 1]) {
        this.layers[level + 1] = [];
      }
      this.layers[level + 1][parentIndex] = parentHash;
      
      currentIndex = parentIndex;
    }
  }

  /**
   * Generate a Merkle proof for a leaf at a given index
   */
  generateProof(leafIndex: number): MerkleProof {
    if (leafIndex < 0 || leafIndex >= this.nextIndex) {
      throw new Error('Invalid leaf index');
    }

    const pathElements: bigint[] = [];
    const pathIndices: number[] = [];
    let currentIndex = leafIndex;

    for (let level = 0; level < this.depth; level++) {
      const isRightNode = currentIndex % 2 === 1;
      const siblingIndex = isRightNode ? currentIndex - 1 : currentIndex + 1;
      
      const sibling = this.layers[level][siblingIndex] ?? this.zeroValues[level];
      pathElements.push(sibling);
      pathIndices.push(isRightNode ? 0 : 1);
      
      currentIndex = Math.floor(currentIndex / 2);
    }

    return {
      root: this.root,
      leaf: this.leaves[leafIndex],
      leafIndex,
      pathElements,
      pathIndices,
    };
  }

  /**
   * Verify a Merkle proof
   */
  static verifyProof(proof: MerkleProof): boolean {
    let currentHash = proof.leaf;

    for (let i = 0; i < proof.pathElements.length; i++) {
      const sibling = proof.pathElements[i];
      const isRight = proof.pathIndices[i] === 1;
      
      if (isRight) {
        currentHash = computeMerkleNode(currentHash, sibling);
      } else {
        currentHash = computeMerkleNode(sibling, currentHash);
      }
    }

    return currentHash === proof.root;
  }

  /**
   * Get all leaves (for debugging/testing)
   */
  getLeaves(): bigint[] {
    return [...this.leaves];
  }

  /**
   * Serialize tree state for persistence
   */
  serialize(): string {
    return JSON.stringify({
      depth: this.depth,
      leaves: this.leaves.map(l => l.toString()),
      nextIndex: this.nextIndex,
    });
  }

  /**
   * Deserialize tree state
   */
  static deserialize(data: string): MerkleTree {
    const parsed = JSON.parse(data);
    const tree = new MerkleTree(parsed.depth);
    
    for (const leafStr of parsed.leaves) {
      tree.insert(BigInt(leafStr));
    }
    
    return tree;
  }
}

/**
 * Sparse Merkle Tree for efficient storage
 * Only stores non-empty leaves and computes paths on demand
 */
export class SparseMerkleTree {
  private readonly depth: number;
  private readonly zeroValues: bigint[];
  private nodes: Map<string, bigint>;

  constructor(depth: number = 32) {
    this.depth = depth;
    this.zeroValues = this.computeZeroValues(depth);
    this.nodes = new Map();
  }

  private computeZeroValues(depth: number): bigint[] {
    const zeros: bigint[] = [EMPTY_LEAF];
    for (let i = 1; i <= depth; i++) {
      zeros[i] = computeMerkleNode(zeros[i - 1], zeros[i - 1]);
    }
    return zeros;
  }

  private nodeKey(level: number, index: bigint): string {
    return `${level}:${index.toString()}`;
  }

  get root(): bigint {
    return this.nodes.get(this.nodeKey(this.depth, 0n)) ?? this.zeroValues[this.depth];
  }

  /**
   * Update a leaf at a specific index
   */
  update(index: bigint, leaf: bigint): void {
    if (index < 0n || index >= 2n ** BigInt(this.depth)) {
      throw new Error('Index out of bounds');
    }

    let currentIndex = index;
    let currentValue = leaf;
    this.nodes.set(this.nodeKey(0, currentIndex), currentValue);

    for (let level = 0; level < this.depth; level++) {
      const isRight = currentIndex % 2n === 1n;
      const siblingIndex = isRight ? currentIndex - 1n : currentIndex + 1n;
      
      const sibling = this.nodes.get(this.nodeKey(level, siblingIndex)) ?? this.zeroValues[level];
      
      const left = isRight ? sibling : currentValue;
      const right = isRight ? currentValue : sibling;
      
      currentIndex = currentIndex / 2n;
      currentValue = computeMerkleNode(left, right);
      this.nodes.set(this.nodeKey(level + 1, currentIndex), currentValue);
    }
  }

  /**
   * Get value at a leaf index
   */
  get(index: bigint): bigint {
    return this.nodes.get(this.nodeKey(0, index)) ?? EMPTY_LEAF;
  }

  /**
   * Generate proof for a leaf
   */
  generateProof(index: bigint): MerkleProof {
    const pathElements: bigint[] = [];
    const pathIndices: number[] = [];
    let currentIndex = index;

    for (let level = 0; level < this.depth; level++) {
      const isRight = currentIndex % 2n === 1n;
      const siblingIndex = isRight ? currentIndex - 1n : currentIndex + 1n;
      
      const sibling = this.nodes.get(this.nodeKey(level, siblingIndex)) ?? this.zeroValues[level];
      pathElements.push(sibling);
      pathIndices.push(isRight ? 0 : 1);
      
      currentIndex = currentIndex / 2n;
    }

    return {
      root: this.root,
      leaf: this.get(index),
      leafIndex: Number(index),
      pathElements,
      pathIndices,
    };
  }
}
