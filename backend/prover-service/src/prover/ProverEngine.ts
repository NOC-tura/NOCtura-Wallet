/**
 * Prover Engine
 * 
 * Core proof generation logic using ZK circuits.
 */

import {
  LocalProver,
  generateTransferWitness,
  generateDepositWitness,
  generateWithdrawalWitness,
  createNote,
  makeSpendable,
  MerkleTree,
  bufferToBigInt,
  type ProofBundle,
  type SpendableNote,
} from '@noctura/zk-proofs';

export interface ProverEngineConfig {
  maxConcurrentProofs: number;
  proofTimeout: number;
}

export interface TransferProofRequest {
  recipientAddress: string;
  amount: string;
  assetMint?: string;
  senderSecretKey?: string;
  inputNotes?: Array<{
    commitment: string;
    value: string;
    randomness: string;
    leafIndex: number;
  }>;
}

export interface DepositProofRequest {
  sourceAddress: string;
  amount: string;
  assetMint?: string;
  recipientPublicKey?: string;
}

export interface WithdrawalProofRequest {
  recipientAddress: string;
  amount: string;
  assetMint?: string;
  inputNote?: {
    commitment: string;
    value: string;
    randomness: string;
    leafIndex: number;
  };
  secretKey?: string;
}

export interface ProofResponse {
  proof: string;
  publicSignals: string[];
  proofTime: number;
}

export class ProverEngine {
  private config: ProverEngineConfig;
  private prover: LocalProver;
  private activeProofs: number = 0;
  private totalProofsGenerated: number = 0;
  private totalProofTime: number = 0;
  private initialized: boolean = false;
  
  // In-memory Merkle tree for demo purposes
  // In production, this would be synced with on-chain state
  private merkleTree: MerkleTree;

  constructor(config: ProverEngineConfig) {
    this.config = config;
    this.prover = new LocalProver();
    this.merkleTree = new MerkleTree(20);
  }

  async initialize(): Promise<void> {
    await this.prover.initialize();
    this.initialized = true;
  }

  get isInitialized(): boolean {
    return this.initialized;
  }

  get currentLoad(): number {
    return this.activeProofs;
  }

  get maxLoad(): number {
    return this.config.maxConcurrentProofs;
  }

  get stats(): {
    totalProofs: number;
    averageProofTime: number;
    activeProofs: number;
  } {
    return {
      totalProofs: this.totalProofsGenerated,
      averageProofTime: this.totalProofsGenerated > 0 
        ? this.totalProofTime / this.totalProofsGenerated 
        : 0,
      activeProofs: this.activeProofs,
    };
  }

  async proveTransfer(request: TransferProofRequest): Promise<ProofResponse> {
    this.ensureCapacity();
    this.activeProofs++;
    const startTime = Date.now();

    try {
      // For demo, create synthetic notes if not provided
      const secretKey = request.senderSecretKey 
        ? BigInt(request.senderSecretKey)
        : BigInt('0x' + 'a'.repeat(64));
      
      const ownerPubkey = secretKey; // Simplified - use proper key derivation
      const amount = BigInt(request.amount);
      
      // Create input note
      const inputNote = createNote(ownerPubkey, amount, request.assetMint);
      const leafIndex = this.merkleTree.insert(inputNote.commitment);
      const spendableNote = makeSpendable(inputNote, secretKey, leafIndex);
      
      // Create output note for recipient
      const recipientPubkey = bufferToBigInt(
        new TextEncoder().encode(request.recipientAddress)
      );
      const outputNote = createNote(recipientPubkey, amount, request.assetMint);
      
      // Generate Merkle proof
      const merkleProof = this.merkleTree.generateProof(leafIndex);
      
      // Generate witness
      const witness = generateTransferWitness(
        [spendableNote],
        [merkleProof],
        [outputNote],
        secretKey
      );
      
      // Generate proof
      const bundle = await this.prover.proveTransfer(witness);
      
      const proofTime = Date.now() - startTime;
      this.recordProof(proofTime);
      
      // Insert new commitment into tree
      this.merkleTree.insert(outputNote.commitment);
      
      return {
        proof: JSON.stringify(bundle.proof),
        publicSignals: bundle.publicSignals,
        proofTime,
      };
    } finally {
      this.activeProofs--;
    }
  }

  async proveDeposit(request: DepositProofRequest): Promise<ProofResponse> {
    this.ensureCapacity();
    this.activeProofs++;
    const startTime = Date.now();

    try {
      const amount = BigInt(request.amount);
      const recipientPubkey = request.recipientPublicKey
        ? BigInt(request.recipientPublicKey)
        : bufferToBigInt(new TextEncoder().encode(request.sourceAddress));
      
      // Create output note
      const outputNote = createNote(recipientPubkey, amount, request.assetMint);
      
      // Generate witness
      const witness = generateDepositWitness(
        outputNote,
        request.sourceAddress,
        amount,
        request.assetMint
      );
      
      // Generate proof
      const bundle = await this.prover.proveDeposit(witness);
      
      const proofTime = Date.now() - startTime;
      this.recordProof(proofTime);
      
      // Insert commitment into tree
      this.merkleTree.insert(outputNote.commitment);
      
      return {
        proof: JSON.stringify(bundle.proof),
        publicSignals: bundle.publicSignals,
        proofTime,
      };
    } finally {
      this.activeProofs--;
    }
  }

  async proveWithdrawal(request: WithdrawalProofRequest): Promise<ProofResponse> {
    this.ensureCapacity();
    this.activeProofs++;
    const startTime = Date.now();

    try {
      const amount = BigInt(request.amount);
      const secretKey = request.secretKey 
        ? BigInt(request.secretKey)
        : BigInt('0x' + 'a'.repeat(64));
      
      const ownerPubkey = secretKey;
      
      // Create input note
      const inputNote = createNote(ownerPubkey, amount, request.assetMint);
      const leafIndex = this.merkleTree.insert(inputNote.commitment);
      const spendableNote = makeSpendable(inputNote, secretKey, leafIndex);
      
      // Generate Merkle proof
      const merkleProof = this.merkleTree.generateProof(leafIndex);
      
      // Generate witness
      const witness = generateWithdrawalWitness(
        spendableNote,
        merkleProof,
        secretKey,
        request.recipientAddress,
        amount
      );
      
      // Generate proof
      const bundle = await this.prover.proveWithdrawal(witness);
      
      const proofTime = Date.now() - startTime;
      this.recordProof(proofTime);
      
      return {
        proof: JSON.stringify(bundle.proof),
        publicSignals: bundle.publicSignals,
        proofTime,
      };
    } finally {
      this.activeProofs--;
    }
  }

  private ensureCapacity(): void {
    if (!this.initialized) {
      throw new Error('Prover engine not initialized');
    }
    if (this.activeProofs >= this.config.maxConcurrentProofs) {
      throw new Error('Prover at capacity');
    }
  }

  private recordProof(proofTime: number): void {
    this.totalProofsGenerated++;
    this.totalProofTime += proofTime;
  }
}
