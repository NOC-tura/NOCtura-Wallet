/**
 * Shielded transaction types
 */

/**
 * Shielded transaction types
 */
import type { PriorityLevel } from '../../types';

export interface ShieldedNote {
  commitment: string;
  nullifier?: string;
  value: bigint;
  assetMint?: string; // optional for SPL tokens
  memo?: string;
}

export interface ProofResult {
  proof: string;
  publicSignals: string[];
}

export interface ShieldedTransferParams {
  recipientAddress: string;
  amount: bigint; // in lamports (or smallest unit of token)
  assetMint?: string; // undefined implies native SOL
  feeLevel?: PriorityLevel;
  memo?: string;
}

export interface ShieldedDepositParams {
  sourceAddress: string; // transparent source
  amount: bigint;
  assetMint?: string;
  feeLevel?: PriorityLevel;
  memo?: string;
}

export interface ShieldedWithdrawalParams {
  recipientAddress: string; // transparent destination
  amount: bigint;
  assetMint?: string;
  feeLevel?: PriorityLevel;
  memo?: string;
}
