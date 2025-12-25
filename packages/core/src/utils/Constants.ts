/**
 * Constants for Noctura Wallet
 */

// BIP44 Derivation Paths
export const DERIVATION_PATH = {
  SOLANA: "m/44'/501'/0'/0'",
  SOLANA_ACCOUNT: (accountIndex: number) => `m/44'/501'/${accountIndex}'/0'`,
  SHIELDED: (accountIndex: number) => `m/44'/501'/${accountIndex}'/1'`,
} as const;

// Network Configuration
export const NETWORK = {
  DEVNET: 'devnet',
  TESTNET: 'testnet',
  MAINNET: 'mainnet-beta',
} as const;

// Commitment Levels
export const COMMITMENT = {
  PROCESSED: 'processed',
  CONFIRMED: 'confirmed',
  FINALIZED: 'finalized',
} as const;

// Transaction Limits
export const LIMITS = {
  MAX_TRANSACTION_SIZE: 1232, // bytes
  MAX_ACCOUNTS_PER_TX: 64,
  MAX_RETRIES: 3,
  RETRY_DELAY: 2000, // ms
  CONFIRMATION_TIMEOUT: 60000, // 60 seconds
} as const;

// Security Settings
export const SECURITY = {
  AUTO_LOCK_TIME: 300000, // 5 minutes
  MAX_AUTH_ATTEMPTS: 5,
  MIN_PASSWORD_LENGTH: 6,
  LOCKOUT_DURATION: 1800000, // 30 minutes
} as const;

// Token Standards
export const TOKEN_PROGRAM_IDS = {
  TOKEN_PROGRAM: 'TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA',
  TOKEN_2022_PROGRAM: 'TokenzQdBNbLqP5VEhdkAS6EPFLC1PHnBqCXEpPxuEb',
  ASSOCIATED_TOKEN_PROGRAM: 'ATokenGPvbdGVxr1b2hvZbsiqW5xWH25efTNsLJA8knL',
} as const;

// Fee Configuration
export const FEES = {
  PRIORITY_FEE: {
    LOW: 0,
    MEDIUM: 1000,
    HIGH: 10000,
  },
  SIGNATURE_FEE: 5000, // lamports per signature
} as const;

// Swap Configuration
export const SWAP = {
  MIN_SLIPPAGE: 0.1, // 0.1%
  MAX_SLIPPAGE: 5.0, // 5%
  DEFAULT_SLIPPAGE: 0.5, // 0.5%
  PRICE_IMPACT_WARNING: 2.0, // Warn if > 2%
  PRICE_IMPACT_BLOCK: 5.0, // Block if > 5%
} as const;

// Compliance Thresholds
export const COMPLIANCE = {
  NO_KYC_DAILY_LIMIT: 1000, // USD
  BASIC_KYC_DAILY_LIMIT: 10000, // USD
  ADVANCED_KYC_DAILY_LIMIT: Infinity,
  THRESHOLD_WARNING: 0.8, // Warn at 80% of limit
} as const;

// Staking Configuration
export const STAKING = {
  MIN_LOCK_PERIOD: 10 * 24 * 60 * 60 * 1000, // 10 days in ms
  INITIAL_APY: 256, // 256% APY
} as const;

// Mixing Protocol
export const MIXING = {
  MIN_ANONYMITY_SET: 5,
  MAX_BATCH_SIZE: 50,
  TIMING_RANDOMIZATION: 5000, // ±5 seconds
} as const;

// API Endpoints (placeholders - will be configured)
export const API_ENDPOINTS = {
  PROVER_SERVICE: process.env.PROVER_SERVICE_URL || 'http://localhost:3002',
  RELAYER_SERVICE: process.env.RELAYER_SERVICE_URL || 'http://localhost:3003',
  PRICE_ORACLE: process.env.PRICE_ORACLE_URL || 'http://localhost:3004',
} as const;

// Error Codes
export const ERROR_CODES = {
  INSUFFICIENT_FUNDS: 'INSUFFICIENT_FUNDS',
  INVALID_ADDRESS: 'INVALID_ADDRESS',
  TRANSACTION_FAILED: 'TRANSACTION_FAILED',
  PROOF_GENERATION_FAILED: 'PROOF_GENERATION_FAILED',
  NETWORK_ERROR: 'NETWORK_ERROR',
  TIMEOUT: 'TIMEOUT',
  INVALID_SIGNATURE: 'INVALID_SIGNATURE',
  ACCOUNT_NOT_FOUND: 'ACCOUNT_NOT_FOUND',
  UNAUTHORIZED: 'UNAUTHORIZED',
  THRESHOLD_EXCEEDED: 'THRESHOLD_EXCEEDED',
} as const;

// Cache TTL
export const CACHE_TTL = {
  BALANCE: 10000, // 10 seconds
  TOKEN_METADATA: 3600000, // 1 hour
  PRICE_DATA: 30000, // 30 seconds
  TRANSACTION_HISTORY: 60000, // 1 minute
} as const;
