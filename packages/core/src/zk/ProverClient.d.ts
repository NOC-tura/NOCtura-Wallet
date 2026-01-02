/**
 * Prover client abstraction (placeholder)
 * Provides interfaces for generating zero-knowledge proofs.
 */
import type { ShieldedDepositParams, ShieldedTransferParams, ShieldedWithdrawalParams, ProofResult } from '../transactions/shielded/types';
export interface IProverClient {
    proveShieldedTransfer(params: ShieldedTransferParams): Promise<ProofResult>;
    proveDeposit(params: ShieldedDepositParams): Promise<ProofResult>;
    proveWithdrawal(params: ShieldedWithdrawalParams): Promise<ProofResult>;
}
/**
 * No-op prover client used during early development.
 * Returns dummy proof artifacts to allow end-to-end flows.
 */
export declare class NoopProverClient implements IProverClient {
    proveShieldedTransfer(_params: ShieldedTransferParams): Promise<ProofResult>;
    proveDeposit(_params: ShieldedDepositParams): Promise<ProofResult>;
    proveWithdrawal(_params: ShieldedWithdrawalParams): Promise<ProofResult>;
}
