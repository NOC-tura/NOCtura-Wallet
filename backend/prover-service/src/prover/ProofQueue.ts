/**
 * Proof Queue
 * 
 * Manages queued proof generation requests with priority and rate limiting.
 */

import { ProverEngine, ProofResponse } from './ProverEngine';
import { EventEmitter } from 'events';

export interface QueuedProof {
  id: string;
  type: 'transfer' | 'deposit' | 'withdrawal';
  request: unknown;
  priority: number;
  createdAt: number;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  result?: ProofResponse;
  error?: string;
}

export interface ProofQueueConfig {
  maxQueueSize: number;
}

export class ProofQueue extends EventEmitter {
  private queue: QueuedProof[] = [];
  private processing: Map<string, QueuedProof> = new Map();
  private completed: Map<string, QueuedProof> = new Map();
  private config: ProofQueueConfig;
  private proverEngine: ProverEngine;
  private isProcessing: boolean = false;

  constructor(proverEngine: ProverEngine, config: ProofQueueConfig) {
    super();
    this.proverEngine = proverEngine;
    this.config = config;
  }

  get stats() {
    return {
      queueLength: this.queue.length,
      processing: this.processing.size,
      completed: this.completed.size,
      maxQueueSize: this.config.maxQueueSize,
    };
  }

  /**
   * Add a proof request to the queue
   */
  async enqueue(
    type: QueuedProof['type'],
    request: unknown,
    priority: number = 0
  ): Promise<string> {
    if (this.queue.length >= this.config.maxQueueSize) {
      throw new Error('Proof queue is full');
    }

    const id = this.generateId();
    const queuedProof: QueuedProof = {
      id,
      type,
      request,
      priority,
      createdAt: Date.now(),
      status: 'pending',
    };

    // Insert in priority order (higher priority first)
    const insertIndex = this.queue.findIndex(p => p.priority < priority);
    if (insertIndex === -1) {
      this.queue.push(queuedProof);
    } else {
      this.queue.splice(insertIndex, 0, queuedProof);
    }

    this.emit('enqueued', queuedProof);
    this.processQueue();

    return id;
  }

  /**
   * Get proof status and result
   */
  getProof(id: string): QueuedProof | undefined {
    // Check completed first
    if (this.completed.has(id)) {
      return this.completed.get(id);
    }
    
    // Check processing
    if (this.processing.has(id)) {
      return this.processing.get(id);
    }
    
    // Check queue
    return this.queue.find(p => p.id === id);
  }

  /**
   * Wait for a proof to complete
   */
  async waitForProof(id: string, timeout: number = 60000): Promise<QueuedProof> {
    const startTime = Date.now();
    
    while (Date.now() - startTime < timeout) {
      const proof = this.getProof(id);
      
      if (!proof) {
        throw new Error(`Proof ${id} not found`);
      }
      
      if (proof.status === 'completed' || proof.status === 'failed') {
        return proof;
      }
      
      // Wait a bit before checking again
      await new Promise(resolve => setTimeout(resolve, 100));
    }
    
    throw new Error(`Timeout waiting for proof ${id}`);
  }

  /**
   * Process queued proofs
   */
  private async processQueue(): Promise<void> {
    if (this.isProcessing) return;
    this.isProcessing = true;

    try {
      while (
        this.queue.length > 0 &&
        this.proverEngine.currentLoad < this.proverEngine.maxLoad
      ) {
        const proof = this.queue.shift();
        if (!proof) break;

        proof.status = 'processing';
        this.processing.set(proof.id, proof);
        
        // Process asynchronously
        this.generateProof(proof).catch(console.error);
      }
    } finally {
      this.isProcessing = false;
    }
  }

  /**
   * Generate a single proof
   */
  private async generateProof(proof: QueuedProof): Promise<void> {
    try {
      let result: ProofResponse;
      
      switch (proof.type) {
        case 'transfer':
          result = await this.proverEngine.proveTransfer(proof.request as any);
          break;
        case 'deposit':
          result = await this.proverEngine.proveDeposit(proof.request as any);
          break;
        case 'withdrawal':
          result = await this.proverEngine.proveWithdrawal(proof.request as any);
          break;
        default:
          throw new Error(`Unknown proof type: ${proof.type}`);
      }

      proof.status = 'completed';
      proof.result = result;
      this.emit('completed', proof);
    } catch (error) {
      proof.status = 'failed';
      proof.error = error instanceof Error ? error.message : 'Unknown error';
      this.emit('failed', proof);
    } finally {
      this.processing.delete(proof.id);
      this.completed.set(proof.id, proof);
      
      // Clean up old completed proofs (keep last 1000)
      if (this.completed.size > 1000) {
        const oldest = Array.from(this.completed.entries())
          .sort((a, b) => a[1].createdAt - b[1].createdAt)
          .slice(0, this.completed.size - 1000);
        
        for (const [id] of oldest) {
          this.completed.delete(id);
        }
      }
      
      // Process more from queue
      this.processQueue();
    }
  }

  private generateId(): string {
    return `proof_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
  }
}
