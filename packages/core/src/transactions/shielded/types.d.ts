/**
 * Shielded transaction types
 */
export interface ShieldedNote {
    commitment: string;
    nullifier?: string;
    value: bigint;
    assetMint?: string;
    memo?: string;
}
export interface ProofResult {
    proof: string;
    publicSignals: string[];
}
export interface ShieldedTransferParams {
    recipientAddress: string;
    amount: bigint;
    assetMint?: string;
    feeLevel?: 'low' | 'medium' | 'high';
    memo?: string;
}
export interface ShieldedDepositParams {
    sourceAddress: string;
    amount: bigint;
    assetMint?: string;
    feeLevel?: 'low' | 'medium' | 'high';
    memo?: string;
}
export interface ShieldedWithdrawalParams {
    recipientAddress: string;
    amount: bigint;
    assetMint?: string;
    feeLevel?: 'low' | 'medium' | 'high';
    memo?: string;
}
