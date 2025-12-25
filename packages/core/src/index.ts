/**
 * Core package entry point
 */

export * from './types';
export * from './wallet/WalletManager';

// Re-export commonly used types
export {
  WalletMode,
  AccountType,
  TransactionStatus,
  Transaction,
  TransparentTransaction,
  ShieldedTransaction,
  WalletAccount,
  TokenBalance,
  Keypair,
  WalletConfig,
  NocturaError,
  InsufficientFundsError,
  InvalidAddressError,
  TransactionFailedError,
  ProofGenerationError,
} from './types';
