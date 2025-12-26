/**
 * Core package entry point
 */

export * from './types';
export * from './wallet/WalletManager';
export * from './wallet/AccountManager';
export * from './network/NetworkManager';
export * from './tokens/TokenRegistry';
export * from './tokens/types';
export * from './transactions/transparent/TransparentTxBuilder';
export * from './transactions/shielded/ShieldedTxBuilder';
export * from './transactions/shielded/types';
export * from './transactions/fee/FeeEstimator';
export * from './utils/Constants';
export * from './utils/Validation';
export * from './zk/ProverClient';

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
