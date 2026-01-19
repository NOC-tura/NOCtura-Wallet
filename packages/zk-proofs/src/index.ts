/**
 * ZK-Proofs Package Entry Point
 * 
 * Provides ZK-SNARK proof generation and verification for private transactions.
 * Built on Poseidon hash for ZK-friendly operations.
 */

export const ZK_PROOFS_VERSION = '0.1.0';

// Re-export all circuit modules
export * from './circuits';

// Legacy interfaces for backward compatibility
export interface Circuit {
  name: string;
  version: string;
}

export interface ProofGenerationOptions {
  circuit: string;
  witness: unknown;
}
