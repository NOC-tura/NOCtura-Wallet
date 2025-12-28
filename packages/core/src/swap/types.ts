/**
 * Swap types and interfaces
 */

export interface SwapQuote {
  inputMint: string;
  outputMint: string;
  inAmount: bigint;
  outAmount: bigint;
  otherAmountThreshold: bigint;
  swapMode: 'ExactIn' | 'ExactOut';
  slippageBps: number;
  priceImpactPct: number;
  routePlan: RoutePlan[];
  contextSlot?: number;
  timeTaken?: number;
}

export interface RoutePlan {
  swapInfo: SwapInfo;
  percent: number;
}

export interface SwapInfo {
  ammKey: string;
  label?: string;
  inputMint: string;
  outputMint: string;
  inAmount: bigint;
  outAmount: bigint;
  feeAmount: bigint;
  feeMint: string;
}

export interface SwapConfig {
  slippageBps: number; // Slippage tolerance in basis points (50 = 0.5%)
  priorityFee?: number; // Priority fee in lamports
  autoSlippage?: boolean; // Auto-adjust slippage based on volatility
  maxAccounts?: number; // Max accounts in transaction
  useSharedAccounts?: boolean; // Use shared token accounts
}

export interface SwapResult {
  txid: string;
  inputAddress: string;
  outputAddress: string;
  inputAmount: bigint;
  outputAmount: bigint;
  fee: number;
}

export interface ShieldedSwapParams {
  inputMint: string;
  outputMint: string;
  amount: bigint;
  minOutputAmount: bigint;
  slippageBps: number;
  useShielded: boolean;
}

export interface ShieldedSwapResult extends SwapResult {
  commitment: string;
  nullifier: string;
  proof: string;
}

export enum SwapStatus {
  PENDING = 'pending',
  PROCESSING = 'processing',
  COMPLETED = 'completed',
  FAILED = 'failed',
  CANCELLED = 'cancelled',
}

export interface SwapTransaction {
  id: string;
  status: SwapStatus;
  inputMint: string;
  outputMint: string;
  inputAmount: bigint;
  outputAmount: bigint;
  priceImpact: number;
  fee: number;
  timestamp: Date;
  signature?: string;
  error?: string;
}

export interface PriceInfo {
  mint: string;
  price: number; // in USD
  priceChange24h: number; // percentage
  volume24h: number;
  marketCap: number;
  lastUpdated: Date;
}

export interface PoolInfo {
  address: string;
  tokenAMint: string;
  tokenBMint: string;
  tokenAReserve: bigint;
  tokenBReserve: bigint;
  lpMint: string;
  lpSupply: bigint;
  fee: number; // in basis points
  tvl: number; // Total value locked in USD
}
