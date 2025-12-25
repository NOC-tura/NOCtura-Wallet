/**
 * Token Metadata Interface
 */

export interface TokenMetadata {
  mint: string;
  name: string;
  symbol: string;
  decimals: number;
  logoURI?: string;
  verified: boolean;
  tags?: string[];
  extensions?: {
    coingeckoId?: string;
    website?: string;
    twitter?: string;
  };
}

export interface TokenListSource {
  name: string;
  url: string;
  priority: number;
}

export interface TokenBalance {
  mint: string;
  amount: bigint;
  decimals: number;
  symbol: string;
  name: string;
  uiAmount: number;
  usdValue?: number;
}
