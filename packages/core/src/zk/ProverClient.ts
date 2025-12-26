/**
 * Prover client abstraction (placeholder)
 * Provides interfaces for generating zero-knowledge proofs.
 */

import type {
  ShieldedDepositParams,
  ShieldedTransferParams,
  ShieldedWithdrawalParams,
  ProofResult,
} from '../transactions/shielded/types';

export interface IProverClient {
  proveShieldedTransfer(params: ShieldedTransferParams): Promise<ProofResult>;
  proveDeposit(params: ShieldedDepositParams): Promise<ProofResult>;
  proveWithdrawal(params: ShieldedWithdrawalParams): Promise<ProofResult>;
}

/**
 * No-op prover client used during early development.
 * Returns dummy proof artifacts to allow end-to-end flows.
 */
export class NoopProverClient implements IProverClient {
  async proveShieldedTransfer(_params: ShieldedTransferParams): Promise<ProofResult> {
    return { proof: 'DUMMY_PROOF_SHIELDED_TRANSFER', publicSignals: [] };
  }

  async proveDeposit(_params: ShieldedDepositParams): Promise<ProofResult> {
    return { proof: 'DUMMY_PROOF_DEPOSIT', publicSignals: [] };
  }

  async proveWithdrawal(_params: ShieldedWithdrawalParams): Promise<ProofResult> {
    return { proof: 'DUMMY_PROOF_WITHDRAWAL', publicSignals: [] };
  }
}
