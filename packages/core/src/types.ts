/**
 * Core types and interfaces for Noctura Wallet
 */

/**
 * Wallet modes for transaction creation
 */
export enum WalletMode {
  TRANSPARENT = 'transparent',
  SHIELDED = 'shielded',
}

/**
 * Account types supported by Noctura
 */
export enum AccountType {
  TRANSPARENT = 'transparent',
  SHIELDED = 'shielded',
  MULTISIG = 'multisig',
}

/**
 * Wallet account interface
 */
export interface WalletAccount {
  address: string;
  publicKey: string;
  type: AccountType;
  name: string;
  balance: bigint;
  lamports: number;
  createdAt: Date;
  tokens: TokenBalance[];
}

/**
 * Token balance information
 */
export interface TokenBalance {
  mint: string;
  amount: bigint;
  decimals: number;
  symbol: string;
  name: string;
  uiAmount: number;
}

/**
 * Transaction status
 */
export enum TransactionStatus {
  PENDING = 'pending',
  CONFIRMED = 'confirmed',
  FINALIZED = 'finalized',
  FAILED = 'failed',
  CANCELLED = 'cancelled',
}

/**
 * Base transaction interface
 */
export interface BaseTransaction {
  signature: string;
  status: TransactionStatus;
  timestamp: Date;
  fee: number;
  blockNumber?: number;
  confirmations?: number;
}

/**
 * Transparent transaction
 */
export interface TransparentTransaction extends BaseTransaction {
  mode: WalletMode.TRANSPARENT;
  from: string;
  to: string;
  amount: bigint;
  token: string;
}

/**
 * Shielded transaction
 */
export interface ShieldedTransaction extends BaseTransaction {
  mode: WalletMode.SHIELDED;
  commitment: string;
  nullifier: string;
  proof: string;
  amount?: bigint;
}

/**
 * Union type for all transactions
 */
export type Transaction = TransparentTransaction | ShieldedTransaction;

/**
 * Keypair interface
 */
export interface Keypair {
  publicKey: string;
  secretKey: string;
}

/**
 * Wallet configuration
 */
export interface WalletConfig {
  rpcEndpoint: string;
  wsEndpoint?: string;
  commitment?: 'processed' | 'confirmed' | 'finalized';
  derivationPath?: string;
  network?: 'devnet' | 'testnet' | 'mainnet';
}

/**
 * Error types for wallet operations
 */
export class NocturaError extends Error {
  constructor(
    public code: string,
    message: string,
    public details?: Record<string, unknown>
  ) {
    super(message);
    this.name = 'NocturaError';
  }
}

export class InsufficientFundsError extends NocturaError {
  constructor(message: string) {
    super('INSUFFICIENT_FUNDS', message);
  }
}

export class InvalidAddressError extends NocturaError {
  constructor(message: string) {
    super('INVALID_ADDRESS', message);
  }
}

export class TransactionFailedError extends NocturaError {
  constructor(message: string, details?: Record<string, unknown>) {
    super('TRANSACTION_FAILED', message, details);
  }
}

export class ProofGenerationError extends NocturaError {
  constructor(message: string) {
    super('PROOF_GENERATION_FAILED', message);
  }
}
