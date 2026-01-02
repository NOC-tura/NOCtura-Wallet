/**
 * Prover client abstraction (placeholder)
 * Provides interfaces for generating zero-knowledge proofs.
 */
/**
 * No-op prover client used during early development.
 * Returns dummy proof artifacts to allow end-to-end flows.
 */
export class NoopProverClient {
    async proveShieldedTransfer(_params) {
        return { proof: 'DUMMY_PROOF_SHIELDED_TRANSFER', publicSignals: [] };
    }
    async proveDeposit(_params) {
        return { proof: 'DUMMY_PROOF_DEPOSIT', publicSignals: [] };
    }
    async proveWithdrawal(_params) {
        return { proof: 'DUMMY_PROOF_WITHDRAWAL', publicSignals: [] };
    }
}
